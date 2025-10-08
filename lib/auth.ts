import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function getAuthenticatedUser() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("Failed to fetch user from Supabase", error);
    return null;
  }

  return user;
}

export async function requireAuthentication(pathname: string) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(`/auth/login?redirectTo=${encodeURIComponent(pathname)}`);
  }

  return user;
}

export async function signOutUser() {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Failed to sign out user", error);
    throw error;
  }
}

export async function upsertUserRecord(user: User) {
  try {
    const supabase = await getSupabaseServerClient();

    const metadata = user.user_metadata as Record<string, unknown> | undefined;
    const derivedName =
      (metadata?.name as string | undefined) ??
      (metadata?.full_name as string | undefined) ??
      (metadata?.user_name as string | undefined) ??
      null;

    const { error } = await supabase
      .from("users")
      .upsert(
        {
          id: user.id,
          email: user.email ?? "",
          name: derivedName,
          avatar_url: (metadata?.avatar_url as string | undefined) ?? null,
          last_active_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );

    if (error && error.code !== "23505") {
      console.error("Unable to upsert user profile", error);
    }
  } catch (error) {
    console.error("Unexpected error while upserting user record", error);
  }
}
