"use client";

import { useState, useTransition } from "react";
import { z } from "zod";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const resetSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export function PasswordResetRequestForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      setError(null);
      setSuccess(null);

      const parsed = resetSchema.safeParse({ email });

      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Invalid email address");
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();
        const redirectTo = `${window.location.origin}/auth/reset/confirm`;

        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          parsed.data.email,
          { redirectTo },
        );

        if (resetError) {
          setError(resetError.message);
          return;
        }

        setSuccess(
          "Success! Please check your inbox for a secure reset link. The link expires in 60 minutes.",
        );
        setEmail("");
      } catch (caughtError) {
        console.error("Password reset request failed", caughtError);
        setError("Something went wrong. Please try again in a moment.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email address
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
          placeholder="you@startup.com"
          disabled={isPending}
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
          isPending && "pointer-events-none opacity-70",
        )}
        disabled={isPending}
      >
        {isPending ? "Sending reset link..." : "Send reset link"}
      </button>
    </form>
  );
}
