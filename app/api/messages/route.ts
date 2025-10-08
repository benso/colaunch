import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getSupabaseServerClient } from "@/lib/supabase/server";

const getSchema = z.object({
  matchId: z.string().uuid(),
});

const postSchema = z.object({
  matchId: z.string().uuid(),
  content: z.string().min(20, "Message must be at least 20 characters").max(1800),
  isAiGenerated: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const params = getSchema.safeParse({
      matchId: request.nextUrl.searchParams.get("matchId"),
    });

    if (!params.success) {
      return NextResponse.json({ error: "Invalid match id" }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("id, user_id, partner_id")
      .eq("id", params.data.matchId)
      .maybeSingle();

    if (matchError) {
      throw matchError;
    }

    if (!match || (match.user_id !== user.id && match.partner_id !== user.id)) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("id, content, sender_id, recipient_id, is_ai_generated, sent_at, read_at, edited_at")
      .eq("match_id", match.id)
      .order("sent_at", { ascending: true });

    if (messagesError) {
      throw messagesError;
    }

    return NextResponse.json({ messages: messages ?? [] });
  } catch (error) {
    console.error("Failed to fetch messages", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = postSchema.safeParse(body);

    if (!payload.success) {
      return NextResponse.json(
        { error: payload.error.issues[0]?.message ?? "Invalid request" },
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

    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("id, user_id, partner_id, status")
      .eq("id", payload.data.matchId)
      .maybeSingle();

    if (matchError) {
      throw matchError;
    }

    if (!match || (match.user_id !== user.id && match.partner_id !== user.id)) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const recipientId = match.user_id === user.id ? match.partner_id : match.user_id;

    if (!recipientId) {
      return NextResponse.json({ error: "Partner unavailable" }, { status: 409 });
    }

    const message = {
      match_id: match.id,
      sender_id: user.id,
      recipient_id: recipientId,
      content: payload.data.content.trim(),
      is_ai_generated: payload.data.isAiGenerated ?? false,
      sent_at: new Date().toISOString(),
    } as const;

    const { data: inserted, error: insertError } = await supabase
      .from("messages")
      .insert(message)
      .select("id, content, sender_id, recipient_id, is_ai_generated, sent_at, read_at, edited_at")
      .single();

    if (insertError) {
      throw insertError;
    }

    const updates: Record<string, unknown> = {
      last_interaction: new Date().toISOString(),
    };

    if (!match.status || match.status === "suggested") {
      updates.status = "contacted";
      updates.contacted_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from("matches")
      .update(updates)
      .eq("id", match.id);

    if (updateError) {
      console.error("Failed to update match after message", updateError);
    }

    return NextResponse.json({ message: inserted });
  } catch (error) {
    console.error("Failed to send message", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
