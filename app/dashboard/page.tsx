import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings } from "lucide-react";

import { requireAuthentication } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { toTitleCase } from "@/lib/utils";
import { InvitePanel } from "@/components/invitations/invite-panel";
import { MatchFeed } from "@/components/matches/match-feed";
import { GenerateMatchesButton } from "@/components/matches/generate-matches-button";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireAuthentication("/dashboard");
  const supabase = await getSupabaseServerClient();

  const [{ data: userProfile }, { data: profileData }] = await Promise.all([
    supabase
      .from("users")
      .select("name, onboarding_completed, last_active_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select(
        "product_name, product_type, product_description, website_url, audience_size, industry_tags, what_i_offer, what_i_want, ai_analysis",
      )
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!userProfile?.onboarding_completed) {
    redirect("/onboarding");
  }

  if (!profileData) {
    redirect("/onboarding");
  }

  const analysis = (profileData.ai_analysis as { tags?: string[]; summary?: string } | null) ?? null;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-8">
      <section className="grid gap-6 rounded-3xl border border-emerald-200 bg-emerald-50/60 p-6 shadow-sm sm:grid-cols-[1.15fr_1fr] sm:p-10 dark:border-emerald-900/50 dark:bg-emerald-950/40">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Overview</p>
          <h1 className="text-3xl font-semibold text-emerald-900 dark:text-emerald-100">
            Welcome back{userProfile?.name ? `, ${toTitleCase(userProfile.name)}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            We searched our network for founders who can unlock a viral partnership for your product. Review your suggested matches or generate a fresh batch.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <GenerateMatchesButton />
            <span className="text-xs text-muted-foreground">
              Last active: {userProfile?.last_active_at ? new Date(userProfile.last_active_at).toLocaleString() : "–"}
            </span>
          </div>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-white/80 p-6 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/40">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Your product</p>
              <h2 className="text-lg font-semibold text-foreground">{profileData.product_name}</h2>
              <p className="text-sm text-muted-foreground">
                {profileData.product_type ? toTitleCase(profileData.product_type) : "Product"} • {profileData.audience_size ?? "Audience TBD"}
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
          {analysis?.summary ? (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {analysis.summary}
            </p>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Add more product details to receive an AI positioning summary.
            </p>
          )}
          {analysis?.tags && analysis.tags.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {analysis.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200"
                >
                  {toTitleCase(tag)}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <header className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Suggested Matches</h2>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Live updates</span>
          </header>
          <MatchFeed />
        </div>

        <aside className="space-y-6 rounded-3xl border border-border bg-card/80 p-6 shadow-sm backdrop-blur">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">What you offer</h3>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {(profileData.what_i_offer ?? []).map((offer) => (
                <li key={offer} className="rounded-lg border border-emerald-200/60 bg-emerald-50 px-3 py-2 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
                  {offer}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">What you need</h3>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {(profileData.what_i_want ?? []).map((item) => (
                <li key={item} className="rounded-lg border border-slate-200/70 bg-slate-50 px-3 py-2 text-slate-800 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Industry tags</h3>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {(profileData.industry_tags ?? []).map((tag) => (
                <span key={tag} className="rounded-full border border-border/60 px-3 py-1 text-muted-foreground">
                  {toTitleCase(tag)}
                </span>
              ))}
            </div>
          </div>

          <InvitePanel />
        </aside>
      </section>
    </div>
  );
}
