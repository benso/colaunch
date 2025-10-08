"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Filter, Loader2 } from "lucide-react";

import { productCategories } from "@/lib/validations";

import { MatchCard, type MatchCardProps } from "./match-card";

type MatchStatus =
  | "suggested"
  | "contacted"
  | "in_discussion"
  | "partnered"
  | "archived"
  | "all";

interface MatchResponse {
  matches: Array<MatchCardProps["match"] & { id: string }>;
}

export function MatchFeed() {
  const [status, setStatus] = useState<MatchStatus>("suggested");
  const [category, setCategory] = useState<string>("all");
  const [minScore, setMinScore] = useState<number>(70);
  const [activeOnly, setActiveOnly] = useState<boolean>(false);
  const [sort, setSort] = useState<"score" | "activity" | "date">("score");

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["matches", { status, category, minScore, activeOnly, sort }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status && status !== "all") params.set("status", status);
      if (category && category !== "all") params.set("category", category);
      if (minScore) params.set("minScore", String(minScore));
      if (activeOnly) params.set("activeThisWeek", "true");
      if (sort) params.set("sort", sort);

      const response = await fetch(`/api/matches?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to load matches");
      }
      return (await response.json()) as MatchResponse;
    },
  });

  const availableCategories = useMemo(() => {
    const fromData = new Set(
      (data?.matches ?? [])
        .map((match) => match.partner_profile?.product_type)
        .filter((item): item is string => !!item),
    );

    return ["all", ...productCategories.filter((item) => fromData.has(item))];
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>Filter matches</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as MatchStatus)}
            className="rounded-full border border-border/70 bg-transparent px-3 py-1.5 text-xs font-medium"
          >
            <option value="suggested">Suggested</option>
            <option value="contacted">Contacted</option>
            <option value="in_discussion">In discussion</option>
            <option value="partnered">Partnered</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </select>

          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="rounded-full border border-border/70 bg-transparent px-3 py-1.5 text-xs font-medium"
          >
            {availableCategories.map((option) => (
              <option key={option} value={option}>
                {option === "all" ? "All categories" : option}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold uppercase tracking-wide">Min score</label>
            <input
              type="range"
              min={50}
              max={100}
              step={5}
              value={minScore}
              onChange={(event) => setMinScore(Number.parseInt(event.target.value, 10))}
            />
            <span className="w-8 text-right text-xs font-semibold">{minScore}</span>
          </div>

          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(event) => setActiveOnly(event.target.checked)}
              className="h-4 w-4 rounded border-border/70"
            />
            <span>Active this week</span>
          </label>

          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as typeof sort)}
            className="rounded-full border border-border/70 bg-transparent px-3 py-1.5 text-xs font-medium"
          >
            <option value="score">Top score</option>
            <option value="activity">Recent activity</option>
            <option value="date">Newest</option>
          </select>

          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-full border border-border/70 px-3 py-1.5 text-xs font-semibold"
          >
            Refresh
            {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-[220px] items-center justify-center rounded-3xl border border-border/70 bg-card/70">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      {isError ? (
        <div className="rounded-3xl border border-red-200 bg-red-50/80 p-6 text-sm text-red-700">
          Unable to load matches. Please try again.
        </div>
      ) : null}

      {!isLoading && !isError ? (
        data?.matches && data.matches.length > 0 ? (
          <div className="grid gap-6">
            {data.matches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border/80 bg-muted/30 p-10 text-center">
            <p className="text-lg font-semibold text-foreground">No matches yet</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Generate a fresh batch of matches to discover founders with complementary audiences and offers.
            </p>
          </div>
        )
      ) : null}
    </div>
  );
}
