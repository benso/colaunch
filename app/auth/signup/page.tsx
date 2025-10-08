import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getAuthenticatedUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Create account | CoLaunch",
  description: "Join CoLaunch and discover high-impact founder partnerships in minutes.",
};

export const dynamic = "force-dynamic";

interface SignupPageProps {
  searchParams: { redirectTo?: string };
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const user = await getAuthenticatedUser();

  if (user) {
    const redirectTo = searchParams?.redirectTo ?? "/dashboard";
    return redirectTo.startsWith("/")
      ? redirect(redirectTo)
      : redirect("/dashboard");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-700 via-emerald-900 to-slate-950 px-6 py-16">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.12),_transparent_55%)]" />
      <div className="relative z-10 flex w-full max-w-6xl flex-col gap-12 lg:flex-row lg:items-center">
        <div className="mx-auto max-w-xl text-center lg:text-left">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-white/80"
          >
            <span className="inline-block h-2 w-2 rounded-full bg-white" />
            CoLaunch
          </Link>
          <h1 className="mt-6 text-4xl font-semibold text-white sm:text-5xl">
            Find your perfect launch partner.
          </h1>
          <p className="mt-4 text-lg text-white/70">
            Create a free account to get AI-curated partnership matches, personalized outreach, and
            a viral growth loop designed for bootstrapped founders.
          </p>
        </div>
        <AuthForm mode="signup" />
      </div>
    </div>
  );
}
