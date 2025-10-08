import { NextResponse } from "next/server";
import { z } from "zod";

import { getOpenAIClient } from "@/lib/openai";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

const requestSchema = z.object({
  matchId: z.string().uuid(),
  tone: z.enum(["friendly", "professional", "bold", "warm"]).optional(),
  callToAction: z
    .string()
    .min(6)
    .max(200)
    .optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

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

    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select(
        `id, user_id, partner_id, match_reasons,
        partner:users!matches_partner_id_fkey ( id, name, email ),
        partner_profile:profiles!profiles_user_id_fkey (*)`,
      )
      .eq("id", parsed.data.matchId)
      .maybeSingle();

    if (matchError) {
      throw matchError;
    }

    if (!match || (match.user_id !== user.id && match.partner_id !== user.id)) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const partnerId = match.user_id === user.id ? match.partner_id : match.user_id;
    const partnerProfileResult = match.partner_profile;
    const partnerProfile =
      partnerProfileResult && "error" in partnerProfileResult
        ? null
        : (partnerProfileResult as Tables<"profiles"> | null);

    if (!partnerId || !partnerProfile) {
      return NextResponse.json({ error: "Partner profile unavailable" }, { status: 409 });
    }

    const { data: userProfile, error: profileError } = await supabase
      .from("profiles")
      .select(
        "product_name, product_type, product_description, audience_size, what_i_offer, what_i_want, industry_tags",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (!userProfile) {
      return NextResponse.json({ error: "Complete your profile first" }, { status: 400 });
    }

    const tone = parsed.data.tone ?? "friendly";
    const callToAction = parsed.data.callToAction ?? "Explore a quick co-marketing collaboration";

    const reasons = match.match_reasons as
      | {
          reasons?: string[];
          collaboration_ideas?: string[];
          potential_value?: string;
        }
      | null;

    const openai = getOpenAIClient();

    const prompt = `You are the outreach assistant for a founder seeking a partnership.

Write the first outreach message introducing their product and proposing a collaboration with the partner. Keep it under 180 words, adopt a ${tone} tone, and include a clear, specific call-to-action: "${callToAction}".

Sender product:
- Name: ${userProfile.product_name}
- Type: ${userProfile.product_type}
- Audience: ${userProfile.audience_size}
- Offers: ${(userProfile.what_i_offer ?? []).join(", ")}
- Needs: ${(userProfile.what_i_want ?? []).join(", ")}
- Summary: ${userProfile.product_description}

Partner product:
- Name: ${partnerProfile.product_name}
- Type: ${partnerProfile.product_type}
- Audience: ${partnerProfile.audience_size}
- Offers: ${(partnerProfile.what_i_offer ?? []).join(", ")}
- Needs: ${(partnerProfile.what_i_want ?? []).join(", ")}
- Summary: ${partnerProfile.product_description}

Matching rationale:
${reasons?.reasons?.join("\n") ?? ""}
Collaboration ideas:
${reasons?.collaboration_ideas?.join("\n") ?? ""}

Return JSON with a subject line and the email body. Keep the body conversational, value-oriented, and end with the specified call-to-action.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an outreach assistant helping founders propose partnerships. Write compelling, value-oriented messages that lead to collaboration.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "message_suggestion",
          schema: {
            type: "object",
            properties: {
              subject: { type: "string" },
              body: { type: "string" },
            },
            required: ["subject", "body"],
            additionalProperties: false,
          },
          strict: true,
        },
      },
      temperature: 0.7,
      max_tokens: 900,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    const suggestion = JSON.parse(content) as { subject?: string; body?: string };

    return NextResponse.json({
      subject: suggestion.subject ?? `CoLaunch partnership idea with ${partnerProfile.product_name}`,
      body: suggestion.body ?? "Hi there!",
    });
  } catch (error) {
    console.error("Failed to generate intro message", error);
    return NextResponse.json({ error: "Failed to generate message" }, { status: 500 });
  }
}
