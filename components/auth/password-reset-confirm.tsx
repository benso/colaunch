"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const confirmSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be under 128 characters"),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

export function PasswordResetConfirmForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSessionValid, setIsSessionValid] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    supabase.auth.getSession().then(({ data }) => {
      setIsSessionValid(Boolean(data.session));
      if (!data.session) {
        setError("This reset link has expired or was already used. Request a new one.");
      }
    });
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      setError(null);
      setSuccess(null);

      const parsed = confirmSchema.safeParse({ password, confirmPassword });

      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Invalid password");
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();

        const { error: updateError } = await supabase.auth.updateUser({
          password: parsed.data.password,
        });

        if (updateError) {
          setError(updateError.message);
          return;
        }

        setSuccess("Password updated. You can now sign in with your new credentials.");
        setPassword("");
        setConfirmPassword("");

        setTimeout(() => {
          router.push("/auth/login");
        }, 2000);
      } catch (caughtError) {
        console.error("Password update failed", caughtError);
        setError("Unable to update password. Please try again.");
      }
    });
  };

  const isDisabled = isPending || isSessionValid === false;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          New password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
          placeholder="Enter a strong password"
          disabled={isDisabled}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
          placeholder="Re-enter password"
          disabled={isDisabled}
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
          isDisabled && "pointer-events-none opacity-70",
        )}
        disabled={isDisabled}
      >
        {isPending ? "Updating..." : "Update password"}
      </button>
    </form>
  );
}
