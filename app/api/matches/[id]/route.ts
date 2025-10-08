import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Match ID required" }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("matches")
      .select(
        `id, user_id, partner_id, match_score, match_reasons, status, created_at, last_interaction, contacted_at,
        partner:users!matches_partner_id_fkey (
          id, name, email, avatar_url, is_verified, last_active_at, referral_count, created_at
        ),
        partner_profile:profiles!profiles_user_id_fkey (*)`,
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    if (data.user_id !== user.id && data.partner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let partnerProfileData: Tables<"profiles"> | null =
      data.partner_profile && "error" in data.partner_profile
        ? null
        : (data.partner_profile as Tables<"profiles"> | null);

    if (!partnerProfileData && data.partner?.id) {
      const { data: partnerProfile, error: partnerProfileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", data.partner.id)
        .maybeSingle();

      if (partnerProfileError) {
        throw partnerProfileError;
      }

      if (partnerProfile) {
        partnerProfileData = partnerProfile as Tables<"profiles">;
      }
    }

    const match = {
      ...data,
      partner_profile: partnerProfileData,
    };

    return NextResponse.json({ match });
  } catch (error) {
    console.error("Failed to fetch match details", error);
    return NextResponse.json({ error: "Failed to load match details" }, { status: 500 });
  }
}
