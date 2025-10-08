import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

import type { Database } from "@/types/database";

/**
 * Auth callback route for handling OAuth redirects
 * This route exchanges the auth code for a session and redirects to the appropriate page
 */
export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const next = requestUrl.searchParams.get("next") ?? "/dashboard";
    const error = requestUrl.searchParams.get("error");
    const errorDescription = requestUrl.searchParams.get("error_description");

    // Handle OAuth errors
    if (error) {
      console.error("OAuth error:", error, errorDescription);
      return NextResponse.redirect(
        new URL(
          `/auth/login?error=${encodeURIComponent(errorDescription ?? error)}`,
          requestUrl.origin,
        ),
      );
    }

    if (!code) {
      console.error("No code provided in callback");
      return NextResponse.redirect(
        new URL("/auth/login?error=missing_code", requestUrl.origin),
      );
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Supabase environment variables not configured");
      return NextResponse.redirect(
        new URL("/auth/login?error=server_configuration", requestUrl.origin),
      );
    }

    const response = NextResponse.redirect(new URL(next, requestUrl.origin));

    const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    });

    // Exchange the code for a session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("Failed to exchange code for session:", exchangeError);
      return NextResponse.redirect(
        new URL(
          `/auth/login?error=${encodeURIComponent(exchangeError.message)}`,
          requestUrl.origin,
        ),
      );
    }

    if (!data.session) {
      console.error("No session returned after code exchange");
      return NextResponse.redirect(
        new URL("/auth/login?error=session_creation_failed", requestUrl.origin),
      );
    }

    // Check if user record exists in our users table
    const { data: user } = await supabase
      .from("users")
      .select("id, onboarding_completed")
      .eq("id", data.session.user.id)
      .maybeSingle();

    // If user doesn't exist in our users table, create it
    if (!user) {
      const { error: insertError } = await supabase.from("users").insert({
        id: data.session.user.id,
        email: data.session.user.email ?? "",
        name: data.session.user.user_metadata?.full_name ?? null,
        avatar_url: data.session.user.user_metadata?.avatar_url ?? null,
        onboarding_completed: false,
      });

      if (insertError) {
        console.error("Failed to create user record:", insertError);
        // Don't fail the auth flow, just log it
      }

      // Redirect new users to onboarding
      return NextResponse.redirect(new URL("/onboarding", requestUrl.origin));
    }

    // If user hasn't completed onboarding, redirect there
    if (!user.onboarding_completed) {
      return NextResponse.redirect(new URL("/onboarding", requestUrl.origin));
    }

    // Update last_active_at
    await supabase
      .from("users")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", data.session.user.id);

    // Successfully authenticated, redirect to intended destination
    return response;
  } catch (error) {
    console.error("Unexpected error in auth callback:", error);
    return NextResponse.redirect(
      new URL("/auth/login?error=unexpected_error", request.url),
    );
  }
}
