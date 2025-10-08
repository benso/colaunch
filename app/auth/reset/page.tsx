import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PasswordResetRequestForm } from "@/components/auth/password-reset-request";
import { getAuthenticatedUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Reset password | CoLaunch",
  description: "Recover access to your CoLaunch account with a secure password reset link.",
};

export const dynamic = "force-dynamic";

export default async function PasswordResetPage() {
  const user = await getAuthenticatedUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 py-16">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.08),_transparent_60%)]" />
      <div className="relative z-10 w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-10 text-white backdrop-blur">
        <div className="mb-6">
          <Link href="/" className="text-sm font-semibold uppercase tracking-[0.4em] text-white/60">
            CoLaunch
          </Link>
          <h1 className="mt-4 text-3xl font-semibold">Reset your password</h1>
          <p className="mt-2 text-sm text-white/70">
            Enter the email tied to your CoLaunch account. We&apos;ll send a secure link so you can set
            a new password.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/90 p-6 text-gray-900 shadow-lg">
          <PasswordResetRequestForm />
        </div>
        <p className="mt-4 text-center text-sm text-white/70">
          Remembered your password?{" "}
          <Link href="/auth/login" className="font-semibold text-white hover:underline">
            Return to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
