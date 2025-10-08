import { NextResponse } from "next/server";

import { getOpenAIClient } from "@/lib/openai";
import { getPineconeClient } from "@/lib/pinecone";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { calculateMatchScore } from "@/lib/matching";

const MIN_GENERATION_INTERVAL_MS = 5 * 60 * 1000;
const TOP_K_RESULTS = 50;
const MINIMUM_MATCH_SCORE = 60;
const MAX_MATCHES_RETURNED = 10;

interface CandidateProfile {
  user: {
    id: string;
    name: string | null;
    email: string;
    avatar_url: string | null;
    created_at: string | null;
    is_verified: boolean | null;
    last_active_at: string | null;
    referral_count: number | null;
    onboarding_completed: boolean | null;
  };
  profile: {
    id: string;
    user_id: string | null;
    product_name: string;
    product_type: string | null;
    product_description: string;
    website_url: string | null;
    audience_size: string;
    industry_tags: string[];
    what_i_offer: string[];
    what_i_want: string[];
  };
  similarity: number;
}

export async function POST() {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitWindow = new Date(Date.now() - MIN_GENERATION_INTERVAL_MS).toISOString();
    const { data: recentMatches, error: recentMatchesError } = await supabase
      .from("matches")
      .select("id")
      .eq("user_id", user.id)
      .gte("created_at", rateLimitWindow)
      .limit(1);

    if (recentMatchesError) {
      throw recentMatchesError;
    }

    if (recentMatches && recentMatches.length > 0) {
      return NextResponse.json(
        { error: "You can generate new matches every 5 minutes. Try again soon." },
        { status: 429 },
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(
        "id, user_id, product_name, product_type, product_description, website_url, audience_size, industry_tags, what_i_offer, what_i_want, embedding_id",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (!profile) {
      return NextResponse.json(
        { error: "Complete your onboarding profile before generating matches." },
        { status: 400 },
      );
    }

    if (!profile.embedding_id) {
      return NextResponse.json(
        { error: "Profile embedding unavailable. Re-run onboarding or contact support." },
        { status: 409 },
      );
    }

    const pineconeApiKey = process.env.PINECONE_API_KEY;
    const pineconeIndexName = process.env.PINECONE_INDEX_NAME;

    if (!pineconeApiKey || !pineconeIndexName) {
      return NextResponse.json(
        {
          error:
            "Pinecone is not configured. Add PINECONE_API_KEY and PINECONE_INDEX_NAME to enable matching.",
        },
        { status: 503 },
      );
    }

    const pinecone = getPineconeClient();
    const index = pinecone.index(pineconeIndexName);

    const queryResponse = await index.query({
      id: profile.embedding_id,
      topK: TOP_K_RESULTS,
      includeMetadata: true,
      filter: {
        user_id: { $ne: user.id },
      },
    });

    const candidateIds = (queryResponse.matches ?? [])
      .filter((match) => match.metadata?.user_id && match.metadata.profile_id)
      .map((match) => ({
        userId: String(match.metadata!.user_id),
        profileId: String(match.metadata!.profile_id),
        score: match.score ?? 0,
      }));

    if (candidateIds.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    const existingMatchesPromise = supabase
      .from("matches")
      .select("partner_id, status")
      .eq("user_id", user.id);

    const partnerProfilesPromise = supabase
      .from("profiles")
      .select(
        "id, user_id, product_name, product_type, product_description, website_url, audience_size, industry_tags, what_i_offer, what_i_want",
      )
      .in(
        "user_id",
        candidateIds.map((candidate) => candidate.userId),
      );

    const partnerUsersPromise = supabase
      .from("users")
      .select(
        "id, name, email, avatar_url, created_at, is_verified, last_active_at, referral_count, onboarding_completed",
      )
      .in(
        "id",
        candidateIds.map((candidate) => candidate.userId),
      );

    const [{ data: existingMatches, error: existingMatchesError }, { data: partnerProfiles, error: partnerProfilesError }, { data: partnerUsers, error: partnerUsersError }] =
      await Promise.all([existingMatchesPromise, partnerProfilesPromise, partnerUsersPromise]);

    if (existingMatchesError) throw existingMatchesError;
    if (partnerProfilesError) throw partnerProfilesError;
    if (partnerUsersError) throw partnerUsersError;

    const blockedPartners = new Set(
      (existingMatches ?? [])
        .filter((match) => match.status && match.status !== "suggested")
        .map((match) => match.partner_id as string),
    );

    const existingSuggested = new Set(
      (existingMatches ?? [])
        .filter((match) => match.status === "suggested")
        .map((match) => match.partner_id as string),
    );

    const partnerProfileMap = new Map(
      (partnerProfiles ?? []).map((item) => [item.user_id ?? "", item]),
    );
    const partnerUserMap = new Map((partnerUsers ?? []).map((item) => [item.id, item]));

    const candidates: CandidateProfile[] = [];

    for (const candidate of candidateIds) {
      if (blockedPartners.has(candidate.userId)) continue;

      const partnerProfile = partnerProfileMap.get(candidate.userId);
      const partnerUser = partnerUserMap.get(candidate.userId);

      if (!partnerProfile || !partnerUser) continue;
      if (!partnerUser.onboarding_completed) continue;

      candidates.push({
        user: partnerUser,
        profile: partnerProfile,
        similarity: candidate.score,
      });
    }

    if (candidates.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    const scoredCandidates = candidates
      .map((candidate) => {
        const breakdown = calculateMatchScore({
          similarityScore: candidate.similarity,
          userProfile: {
            productType: profile.product_type,
            industryTags: profile.industry_tags ?? [],
            audienceSize: profile.audience_size,
            whatIOffer: profile.what_i_offer ?? [],
            whatIWant: profile.what_i_want ?? [],
          },
          partnerProfile: {
            productType: candidate.profile.product_type,
            industryTags: candidate.profile.industry_tags ?? [],
            audienceSize: candidate.profile.audience_size,
            whatIOffer: candidate.profile.what_i_offer ?? [],
            whatIWant: candidate.profile.what_i_want ?? [],
          },
          partnerUser: {
            createdAt: candidate.user.created_at,
            isVerified: candidate.user.is_verified,
            lastActiveAt: candidate.user.last_active_at,
            referralCount: candidate.user.referral_count,
          },
        });

        return {
          user: candidate.user,
          profile: candidate.profile,
          score: breakdown.total,
          breakdown,
        };
      })
      .filter((candidate) => candidate.score >= MINIMUM_MATCH_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_MATCHES_RETURNED);

    if (scoredCandidates.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    const openai = getOpenAIClient();

    const explanationPromises = scoredCandidates.map(async (candidate) => {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are an expert at pairing founders for growth collaborations. Explain why matches work based on their real products and audiences.",
            },
            {
              role: "user",
              content: `Explain why these two founders are a strong match.

FOUNDER A:
Product: ${profile.product_name}
Type: ${profile.product_type ?? "Unknown"}
Audience size: ${profile.audience_size}
Description: ${profile.product_description}
Tags: ${(profile.industry_tags ?? []).join(", ")}
Offers: ${(profile.what_i_offer ?? []).join(", ")}
Wants: ${(profile.what_i_want ?? []).join(", ")}

FOUNDER B:
Name: ${candidate.user.name ?? "Unknown"}
Product: ${candidate.profile.product_name}
Type: ${candidate.profile.product_type ?? "Unknown"}
Audience size: ${candidate.profile.audience_size}
Description: ${candidate.profile.product_description}
Tags: ${(candidate.profile.industry_tags ?? []).join(", ")}
Offers: ${(candidate.profile.what_i_offer ?? []).join(", ")}
Wants: ${(candidate.profile.what_i_want ?? []).join(", ")}

Match score: ${candidate.score}

Provide 3-4 reasons grounded in their real products and audiences, plus 2-3 concrete collaboration ideas.`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "match_explanation",
              schema: {
                type: "object",
                properties: {
                  reasons: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 2,
                    maxItems: 4,
                  },
                  collaboration_ideas: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 2,
                    maxItems: 3,
                  },
                  potential_value: { type: "string" },
                },
                required: ["reasons", "collaboration_ideas", "potential_value"],
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

        return JSON.parse(content) as {
          reasons?: string[];
          collaboration_ideas?: string[];
          potential_value?: string;
        };
      } catch (error) {
        console.error("Failed to generate match explanation", error);
        return {
          reasons: [
            "Strong overlap in target audiences and product themes",
            "Complementary offers that can create mutual value",
          ],
          collaboration_ideas: [
            "Co-host a webinar highlighting both products",
            "Run a joint email sequence introducing each product to existing audiences",
          ],
          potential_value: "High potential reach through combined communities",
        };
      }
    });

    const explanations = await Promise.all(explanationPromises);

    const rowsToUpsert = scoredCandidates.map((candidate, index) => ({
      user_id: user.id,
      partner_id: candidate.user.id,
      match_score: candidate.score,
      match_reasons: explanations[index] ?? null,
      status: "suggested",
      last_interaction: new Date().toISOString(),
    }));

    const upsertCandidates = rowsToUpsert.filter(
      (row) => !existingSuggested.has(row.partner_id),
    );

    if (upsertCandidates.length > 0) {
      const { error: upsertError } = await supabase
        .from("matches")
        .upsert(upsertCandidates, { onConflict: "user_id,partner_id" });

      if (upsertError) {
        throw upsertError;
      }
    }

    const responseMatches = scoredCandidates.map((candidate, index) => ({
      partner: candidate.user,
      partner_profile: candidate.profile,
      match_score: candidate.score,
      match_reasons: explanations[index] ?? null,
    }));

    return NextResponse.json({ matches: responseMatches });
  } catch (error) {
    console.error("Match generation failed", error);
    return NextResponse.json({ error: "Failed to generate matches" }, { status: 500 });
  }
}
