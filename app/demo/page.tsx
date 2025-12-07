"use client";

import { useState } from "react";
import { DemoOnboardingWizard } from "@/components/onboarding/demo-onboarding-wizard";
import { MatchFeed } from "@/components/matches/match-feed";
import { GenerateMatchesButton } from "@/components/matches/generate-matches-button";
import { InvitePanel } from "@/components/invitations/invite-panel";
import { Settings } from "lucide-react";
import Link from "next/link";
import type { ProfilePayload } from "@/lib/validations";

export default function DemoPage() {
  const [view, setView] = useState<"onboarding" | "dashboard">("onboarding");
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  
  // Pre-fill demo data so user can navigate through steps
  // Note: websiteUrl is omitted (not included) to make it truly optional
  const demoProfile: Omit<ProfilePayload, "websiteUrl"> & { websiteUrl?: undefined } = {
    productType: "SaaS",
    productName: "ProductivityOS",
    productDescription: "ProductivityOS is a comprehensive task management and team collaboration platform designed for remote teams. We help teams stay organized, communicate effectively, and deliver projects on time. Our platform combines task tracking, real-time collaboration, automated workflows, and insightful analytics in one intuitive interface.",
    partnerTypes: ["Newsletter", "SaaS"],
    audienceSize: "10K-50K",
    industryTags: ["Productivity", "SaaS", "Remote Work"],
    whatIOffer: ["Feature in my newsletter", "Co-host webinar", "Guest post on blog"],
    whatIWant: ["Access to developer audience", "Technical content", "API partnerships"],
  };
  
  // Handle onboarding completion in demo mode
  const handleDemoComplete = () => {
    setOnboardingComplete(true);
    setView("dashboard");
  };

  // Mock data for dashboard preview
  const mockProfile = {
    product_name: "TaskFlow",
    product_type: "SaaS",
    audience_size: "10k-100k",
    ai_analysis: {
      tags: ["project-management", "productivity", "saas"],
      summary: "TaskFlow is a modern project management tool designed for remote teams. It combines task tracking, team collaboration, and workflow automation in one intuitive platform.",
    },
    what_i_offer: ["Co-marketing opportunities", "Product integrations", "Content partnerships"],
    what_i_want: ["Access to developer audience", "Technical content", "API partnerships"],
    industry_tags: ["SaaS", "Developer Tools", "Productivity"],
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Demo Navigation */}
      <div className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400"></span>
            <span className="text-sm font-semibold uppercase tracking-widest">CoLaunch Demo</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setView("onboarding")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                view === "onboarding"
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Onboarding
            </button>
            <button
              onClick={() => setView("dashboard")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                view === "dashboard"
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Onboarding View */}
      {view === "onboarding" && !onboardingComplete && (
        <main className="min-h-screen bg-slate-950 bg-[radial-gradient(circle_at_top,_rgba(30,100,255,0.2),_transparent_55%)] py-12 text-white">
          <div className="mx-auto w-full max-w-6xl px-6">
            <DemoOnboardingWizard 
              initialProfile={demoProfile} 
              onComplete={handleDemoComplete}
            />
          </div>
        </main>
      )}
      
      {/* Show completion message */}
      {view === "onboarding" && onboardingComplete && (
        <main className="min-h-screen bg-slate-950 bg-[radial-gradient(circle_at_top,_rgba(30,100,255,0.2),_transparent_55%)] py-12 text-white">
          <div className="mx-auto w-full max-w-2xl px-6 text-center">
            <div className="rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-12">
              <div className="mb-6 text-6xl">🎉</div>
              <h2 className="mb-4 text-3xl font-bold text-white">Profile Complete!</h2>
              <p className="mb-8 text-lg text-white/70">
                In the real app, you&apos;d be redirected to your dashboard where you can generate matches.
              </p>
              <button
                onClick={() => setView("dashboard")}
                className="rounded-full bg-emerald-400 px-8 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
              >
                View Dashboard →
              </button>
            </div>
          </div>
        </main>
      )}

      {/* Dashboard View */}
      {view === "dashboard" && (
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-8">
          <section className="grid gap-6 rounded-3xl border border-emerald-200 bg-emerald-50/60 p-6 shadow-sm sm:grid-cols-[1.15fr_1fr] sm:p-10 dark:border-emerald-900/50 dark:bg-emerald-950/40">
            <div className="space-y-4">
              <p className="text-sm font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                Overview
              </p>
              <h1 className="text-3xl font-semibold text-emerald-900 dark:text-emerald-100">
                Welcome back, Sarah
              </h1>
              <p className="text-sm text-muted-foreground">
                We searched our network for founders who can unlock a viral partnership for your
                product. Review your suggested matches or generate a fresh batch.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <GenerateMatchesButton />
                <span className="text-xs text-muted-foreground">
                  Last active: {new Date().toLocaleString()}
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-white/80 p-6 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/40">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Your product
                  </p>
                  <h2 className="text-lg font-semibold text-foreground">{mockProfile.product_name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {mockProfile.product_type} • {mockProfile.audience_size}
                  </p>
                </div>
                <Link
                  href="/settings/profile"
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  title="Edit Profile"
                >
                  <Settings className="h-4 w-4" />
                  Edit
                </Link>
              </div>
              {mockProfile.ai_analysis?.summary && (
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {mockProfile.ai_analysis.summary}
                </p>
              )}
              {mockProfile.ai_analysis?.tags && mockProfile.ai_analysis.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {mockProfile.ai_analysis.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              <header className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">Suggested Matches</h2>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Live updates
                </span>
              </header>
              <MatchFeed />
            </div>

            <aside className="space-y-6 rounded-3xl border border-border bg-card/80 p-6 shadow-sm backdrop-blur">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  What you offer
                </h3>
                <ul className="mt-3 flex flex-col gap-2 text-sm">
                  {mockProfile.what_i_offer.map((offer) => (
                    <li
                      key={offer}
                      className="rounded-lg border border-emerald-200/60 bg-emerald-50 px-3 py-2 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"
                    >
                      {offer}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  What you need
                </h3>
                <ul className="mt-3 flex flex-col gap-2 text-sm">
                  {mockProfile.what_i_want.map((item) => (
                    <li
                      key={item}
                      className="rounded-lg border border-slate-200/70 bg-slate-50 px-3 py-2 text-slate-800 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Industry tags
                </h3>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {mockProfile.industry_tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border/60 px-3 py-1 text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <InvitePanel />
            </aside>
          </section>
        </div>
      )}
    </div>
  );
}

