"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const signupSchema = loginSchema.extend({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(120, "Name must be under 120 characters"),
});

type FormMode = "login" | "signup";

interface AuthFormProps {
  mode: FormMode;
}

interface FormState {
  email: string;
  password: string;
  name?: string;
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTo = searchParams?.get("redirectTo") ?? "/onboarding";

  const [form, setForm] = useState<FormState>({
    email: "",
    password: "",
    name: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isLoading = isPending || isGoogleLoading;

  const handleChange = (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((previous) => ({ ...previous, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isLoading) return;

    startTransition(async () => {
      try {
        setError(null);
        setSuccess(null);

        const supabase = getSupabaseBrowserClient();

        if (mode === "signup") {
          const parsed = signupSchema.safeParse(form);

          if (!parsed.success) {
            setError(parsed.error.issues[0]?.message ?? "Invalid input");
            return;
          }

          const { email, password, name } = parsed.data;

          const callbackUrl = new URL("/auth/callback", window.location.origin);
          callbackUrl.searchParams.set("redirectTo", redirectTo);

          const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: callbackUrl.toString(),
              data: { name },
            },
          });

          if (signUpError) {
            setError(signUpError.message);
            return;
          }

          const user = data.user;

          if (user) {
            const { error: insertError } = await supabase
              .from("users")
              .upsert(
                {
                  id: user.id,
                  email: user.email ?? email,
                  name,
                  avatar_url: user.user_metadata?.avatar_url ?? null,
                },
                { onConflict: "id" },
              );

            if (insertError && insertError.code !== "23505") {
              console.error("Failed to upsert user row", insertError);
            }
          }

          if (data.session) {
            router.refresh();
            router.push("/onboarding");
          } else {
            setSuccess(
              "Check your inbox to confirm your email. Once verified, sign in to continue onboarding.",
            );
          }
          return;
        }

        const parsed = loginSchema.safeParse(form);

        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? "Invalid input");
          return;
        }

        const { email, password } = parsed.data;

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(signInError.message);
          return;
        }

        router.refresh();
        router.push(redirectTo);
      } catch (caughtError) {
        console.error("Authentication error", caughtError);
        setError("Unable to complete authentication. Please try again.");
      }
    });
  };

  const handleGoogleSignIn = async () => {
    if (isLoading) return;

    try {
      setError(null);
      setIsGoogleLoading(true);

      const supabase = getSupabaseBrowserClient();
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("redirectTo", redirectTo);

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        setIsGoogleLoading(false);
      }
    } catch (caughtError) {
      console.error("Google sign-in error", caughtError);
      setError("Failed to start Google sign-in. Please try again.");
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-black/10 bg-white/80 p-8 shadow-lg shadow-black/5 backdrop-blur">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">
          {mode === "signup" ? "Create your CoLaunch account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {mode === "signup"
            ? "Start finding high-quality partnership matches in minutes."
            : "Sign in to manage your matches and collaborations."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Full name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              value={form.name ?? ""}
              onChange={handleChange("name")}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              placeholder="Sarah Kumar"
              required
              disabled={isLoading}
            />
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange("email")}
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
            placeholder="you@startup.com"
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            {mode === "login" && (
              <Link
                href="/auth/reset"
                className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
              >
                Forgot password?
              </Link>
            )}
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={form.password}
            onChange={handleChange("password")}
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
            placeholder="Enter a secure password"
            required
            disabled={isLoading}
          />
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {success && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
            {success}
          </p>
        )}

        <button
          type="submit"
          className={cn(
            "w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition",
            "hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900",
            isLoading && "pointer-events-none opacity-70",
          )}
          disabled={isLoading}
        >
          {mode === "signup"
            ? isLoading
              ? "Creating account..."
              : "Create account"
            : isLoading
              ? "Signing in..."
              : "Sign in"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-4 text-sm text-gray-500">
        <div className="h-px flex-1 bg-gray-200" />
        or continue with
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <button
        onClick={handleGoogleSignIn}
        className={cn(
          "flex w-full items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 transition",
          "hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900",
          isLoading && "pointer-events-none opacity-70",
        )}
        disabled={isLoading}
      >
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white">
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-5 w-5"
          >
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.22 3.31v2.77h3.59c2.1-1.94 3.27-4.79 3.27-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.59-2.77c-.99.66-2.25 1.05-3.69 1.05-2.84 0-5.24-1.92-6.1-4.5H2.18v2.82C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.9 14.12c-.22-.66-.35-1.36-.35-2.12 0-.74.13-1.46.35-2.12V6.94H2.18C1.43 8.38 1 9.94 1 11.75s.43 3.37 1.18 4.81l3.72-2.44z"
            />
            <path
              fill="#EA4335"
              d="M12 4.88c1.62 0 3.07.56 4.21 1.64l3.15-3.15C17.45 1.59 14.97.5 12 .5 7.7.5 3.99 3 2.18 6.94l3.72 2.94c.86-2.58 3.26-4.5 6.1-4.5z"
            />
          </svg>
        </span>
        {isGoogleLoading ? "Redirecting..." : "Continue with Google"}
      </button>

      <p className="mt-6 text-center text-sm text-gray-600">
        {mode === "signup" ? "Already have an account?" : "Need an account?"}{" "}
        <Link
          href={mode === "signup" ? "/auth/login" : "/auth/signup"}
          className="font-semibold text-gray-900 hover:underline"
        >
          {mode === "signup" ? "Sign in" : "Create one"}
        </Link>
      </p>
    </div>
  );
}
