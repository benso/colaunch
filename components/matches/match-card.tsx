"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, ChevronDown, ChevronUp, MessageCircle } from "lucide-react";

import { toTitleCase } from "@/lib/utils";

interface MatchReasons {
  reasons?: string[];
  collaboration_ideas?: string[];
  potential_value?: string;
}

export interface MatchCardProps {
  match: {
    id?: string;
    match_score: number;
    status?: string | null;
    match_reasons: MatchReasons | string | null;
    partner: {
      id: string;
      name: string | null;
      email: string;
      avatar_url: string | null;
      is_verified: boolean | null;
      last_active_at: string | null;
      referral_count: number | null;
      created_at: string | null;
    } | null;
    partner_profile: {
      product_type: string | null;
      product_name: string;
      product_description: string;
      audience_size: string | null;
      industry_tags: string[] | null;
      what_i_offer: string[] | null;
      what_i_want: string[] | null;
      website_url: string | null;
    } | null;
  };
}

export function MatchCard({ match }: MatchCardProps) {
  const [expanded, setExpanded] = useState(false);

  const partner = match.partner;
  const profile = match.partner_profile;

  const parsedReasons = useMemo<MatchReasons>(() => {
    if (!match.match_reasons) return {};
    if (typeof match.match_reasons === "string") {
      try {
        return JSON.parse(match.match_reasons) as MatchReasons;
      } catch (error) {
        console.error("Failed to parse match reasons", error);
        return {};
      }
    }
    return match.match_reasons;
  }, [match.match_reasons]);

  if (!partner || !profile) {
    return null;
  }

  const activityText = partner.last_active_at
    ? new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
      }).format(new Date(partner.last_active_at))
    : "Unknown";

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-border/70 bg-white/90 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <span>{profile.product_type ? toTitleCase(profile.product_type) : "Founder"}</span>
            <span>•</span>
            <span>Audience {profile.audience_size ?? "Unknown"}</span>
          </div>
          <h3 className="mt-2 text-xl font-semibold text-foreground">
            {partner.name ?? profile.product_name}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {profile.product_description}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Match score</p>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-300">{match.match_score}</p>
          <p className="mt-1 text-xs text-muted-foreground">Last active {activityText}</p>
        </div>
      </div>

      {profile.industry_tags && profile.industry_tags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {profile.industry_tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-transparent bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {toTitleCase(tag)}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {parsedReasons.reasons && parsedReasons.reasons.length > 0 ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Why this works</p>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              {parsedReasons.reasons.map((reason) => (
                <li key={reason} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {parsedReasons.collaboration_ideas && parsedReasons.collaboration_ideas.length > 0 ? (
          <div>
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-emerald-600 transition hover:text-emerald-700 dark:text-emerald-300"
            >
              Collaboration ideas
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {expanded ? (
              <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                {parsedReasons.collaboration_ideas.map((idea) => (
                  <li key={idea} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400" />
                    <span>{idea}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {partner.is_verified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200">
              Verified
            </span>
          ) : null}
          {partner.referral_count && partner.referral_count > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800/60 dark:text-slate-200">
              {partner.referral_count} referrals
            </span>
          ) : null}
        </div>

        <div className="flex gap-2">
          {match.id ? (
            <Link
              href={`/matches/${match.id}`}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
            >
              Start intro
              <MessageCircle className="h-4 w-4" />
            </Link>
          ) : null}

          <a
            href={profile.website_url ?? `mailto:${partner.email}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            View profile
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </article>
  );
}
