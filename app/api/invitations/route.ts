import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getSupabaseServerClient } from "@/lib/supabase/server";

const postSchema = z.object({
  email: z.string().email("Enter a valid email"),
  matchId: z.string().uuid().optional(),
});

function generateReferralCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let index = 0; index < 8; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

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

    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select("referral_code, referral_count")
      .eq("id", user.id)
      .maybeSingle();

    if (userError) {
      throw userError;
    }

    let referralCode = userRow?.referral_code ?? null;

    if (!referralCode) {
      referralCode = generateReferralCode();
      const { error: updateError } = await supabase
        .from("users")
        .update({ referral_code: referralCode })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }
    }

    const { data: invitations, error: invitationsError } = await supabase
      .from("invitations")
      .select("id, invitee_email, status, sent_at, opened_at, joined_at, match_id")
      .eq("inviter_id", user.id)
      .order("sent_at", { ascending: false });

    if (invitationsError) {
      throw invitationsError;
    }

    const origin = request.headers.get("origin");

    const referralLink = origin
      ? `${origin}/auth/signup?ref=${referralCode}`
      : `/auth/signup?ref=${referralCode}`;

    return NextResponse.json({
      referralCode,
      referralCount: userRow?.referral_count ?? 0,
      referralLink,
      invitations: invitations ?? [],
    });
  } catch (error) {
    console.error("Failed to fetch invitations", error);
    return NextResponse.json({ error: "Failed to load invitations" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = postSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }

    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (parsed.data.matchId) {
      const { data: match, error: matchError } = await supabase
        .from("matches")
        .select("id, user_id, partner_id")
        .eq("id", parsed.data.matchId)
        .maybeSingle();

      if (matchError) {
        throw matchError;
      }

      if (!match || (match.user_id !== user.id && match.partner_id !== user.id)) {
        return NextResponse.json({ error: "Match not found" }, { status: 404 });
      }
    }

    const existingInvitation = await supabase
      .from("invitations")
      .select("id, status")
      .eq("inviter_id", user.id)
      .eq("invitee_email", parsed.data.email.toLowerCase())
      .maybeSingle();

    if (existingInvitation.data && existingInvitation.data.status !== "joined") {
      return NextResponse.json(
        { error: "You have already invited this founder" },
        { status: 409 },
      );
    }

    const { data: inviter } = await supabase
      .from("users")
      .select("referral_code")
      .eq("id", user.id)
      .maybeSingle();

    let referralCode = inviter?.referral_code ?? null;

    if (!referralCode) {
      referralCode = generateReferralCode();
      const { error: referralUpdateError } = await supabase
        .from("users")
        .update({ referral_code: referralCode })
        .eq("id", user.id);

      if (referralUpdateError) {
        throw referralUpdateError;
      }
    }

    const invitationPayload = {
      inviter_id: user.id,
      invitee_email: parsed.data.email.toLowerCase(),
      match_id: parsed.data.matchId ?? null,
      status: "sent",
      sent_at: new Date().toISOString(),
    } as const;

    const { data: invitation, error: insertError } = await supabase
      .from("invitations")
      .insert(invitationPayload)
      .select("id, invitee_email, status, sent_at, opened_at, joined_at, match_id")
      .single();

    if (insertError) {
      throw insertError;
    }

    await supabase
      .from("users")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", user.id);

    const origin = request.headers.get("origin");
    const referralLink = origin
      ? `${origin}/auth/signup?ref=${referralCode}`
      : `/auth/signup?ref=${referralCode}`;

    return NextResponse.json({ invitation, referralCode, referralLink });
  } catch (error) {
    console.error("Failed to create invitation", error);
    return NextResponse.json({ error: "Failed to create invitation" }, { status: 500 });
  }
}
