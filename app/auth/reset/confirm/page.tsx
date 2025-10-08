import type { Metadata } from "next";
import Link from "next/link";

import { PasswordResetConfirmForm } from "@/components/auth/password-reset-confirm";

export const metadata: Metadata = {
  title: "Set new password | CoLaunch",
  description: "Choose a new password to secure your CoLaunch account.",
};

export default function PasswordResetConfirmPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 py-16">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.1),_transparent_60%)]" />
      <div className="relative z-10 w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-10 text-white backdrop-blur">
        <div className="mb-6">
          <Link href="/" className="text-sm font-semibold uppercase tracking-[0.4em] text-white/60">
            CoLaunch
          </Link>
          <h1 className="mt-4 text-3xl font-semibold">Choose a new password</h1>
          <p className="mt-2 text-sm text-white/70">
            Enter and confirm a new password to secure your account. For your safety, choose a
            unique password you haven&apos;t used before.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/90 p-6 text-gray-900 shadow-lg">
          <PasswordResetConfirmForm />
        </div>
      </div>
    </div>
  );
}
