import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isUserActive, type MatchRow } from "@/lib/matching";
import type { Tables } from "@/types/database";

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const statusParam = searchParams.get("status");
    const categoryParam = searchParams.get("category");
    const minScoreParam = searchParams.get("minScore");
    const activeThisWeekParam = searchParams.get("activeThisWeek");
    const sortParam = searchParams.get("sort") ?? "score";

    let query = supabase
      .from("matches")
      .select(
        `id, user_id, partner_id, match_score, match_reasons, status, created_at, last_interaction, contacted_at,
        partner:users!matches_partner_id_fkey (
          id, name, email, avatar_url, is_verified, last_active_at, referral_count, created_at
        ),
        partner_profile:profiles!profiles_user_id_fkey (*)`,
      )
      .eq("user_id", user.id);

    if (statusParam && statusParam !== "all") {
      query = query.eq("status", statusParam);
    }

    if (categoryParam && categoryParam !== "all") {
      query = query.eq("partner_profile.product_type", categoryParam);
    }

    if (minScoreParam) {
      const minScore = Number.parseInt(minScoreParam, 10);
      if (!Number.isNaN(minScore)) {
        query = query.gte("match_score", minScore);
      }
    }

    switch (sortParam) {
      case "date":
        query = query.order("created_at", { ascending: false });
        break;
      case "activity":
        query = query.order("last_interaction", { ascending: false });
        break;
      case "score":
      default:
        query = query.order("match_score", { ascending: false });
        break;
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const matches = (data ?? []).map((row) => {
      const partnerProfile =
        row.partner_profile && "error" in row.partner_profile
          ? null
          : (row.partner_profile as Tables<"profiles"> | null);

      return {
        ...row,
        partner_profile: partnerProfile,
      } as MatchRow;
    });

    const missingProfileUserIds = matches
      .filter((match) => !match.partner_profile && match.partner?.id)
      .map((match) => match.partner!.id);

    if (missingProfileUserIds.length > 0) {
      const { data: partnerProfiles, error: partnerProfilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", missingProfileUserIds);

      if (partnerProfilesError) {
        throw partnerProfilesError;
      }

      const partnerProfileMap = new Map<string, Tables<"profiles">>();
      (partnerProfiles ?? []).forEach((profile) => {
        const typedProfile = profile as Tables<"profiles">;
        if (typedProfile.user_id) {
          partnerProfileMap.set(typedProfile.user_id, typedProfile);
        }
      });

      matches.forEach((match) => {
        if (!match.partner_profile && match.partner?.id) {
          match.partner_profile = partnerProfileMap.get(match.partner.id) ?? null;
        }
      });
    }

    const filtered = matches.filter((match) => {
      if (!match.partner || !match.partner_profile) {
        return false;
      }

      if (activeThisWeekParam === "true") {
        return isUserActive(match.partner.last_active_at);
      }

      return true;
    });

    if (sortParam === "activity") {
      filtered.sort((a, b) => {
        const aTime = a.partner?.last_active_at ? new Date(a.partner.last_active_at).getTime() : 0;
        const bTime = b.partner?.last_active_at ? new Date(b.partner.last_active_at).getTime() : 0;
        return bTime - aTime;
      });
    }

    const responseMatches = filtered.map((match) => ({
      ...match,
      match_score: match.match_score ?? 0,
      match_reasons: (match.match_reasons ?? null) as MatchRow["match_reasons"],
    }));

    return NextResponse.json({ matches: responseMatches });
  } catch (error) {
    console.error("Failed to fetch matches", error);
    return NextResponse.json({ error: "Failed to load matches" }, { status: 500 });
  }
}
