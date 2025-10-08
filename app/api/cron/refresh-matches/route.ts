import { NextResponse, type NextRequest } from "next/server";

import { getOpenAIClient } from "@/lib/openai";
import { getPineconeClient } from "@/lib/pinecone";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { calculateMatchScore } from "@/lib/matching";
import type { Tables } from "@/types/database";

/**
 * Cron job to refresh matches for all active users
 * Runs daily at 10 AM UTC (configured in vercel.json)
 * 
 * This endpoint should be protected by CRON_SECRET in production
 */

const TOP_K_RESULTS = 50;
const MINIMUM_MATCH_SCORE = 60;
const MAX_MATCHES_PER_USER = 5;
const DAYS_SINCE_LAST_ACTIVE = 30;

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

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Cron] Starting daily match refresh...");

    const supabase = await getSupabaseServerClient();

    // Get all active users with complete profiles
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DAYS_SINCE_LAST_ACTIVE);

    const { data: activeUsers, error: usersError } = await supabase
      .from("users")
      .select("id, email, name, last_active_at, onboarding_completed")
      .eq("onboarding_completed", true)
      .gte("last_active_at", cutoffDate.toISOString());

    if (usersError) {
      throw usersError;
    }

    if (!activeUsers || activeUsers.length === 0) {
      console.log("[Cron] No active users found");
      return NextResponse.json({ 
        success: true, 
        message: "No active users to refresh",
        processed: 0 
      });
    }

    console.log(`[Cron] Processing ${activeUsers.length} active users`);

    const pineconeApiKey = process.env.PINECONE_API_KEY;
    const pineconeIndexName = process.env.PINECONE_INDEX_NAME;

    if (!pineconeApiKey || !pineconeIndexName) {
      throw new Error("Pinecone configuration missing");
    }

    const pinecone = getPineconeClient();
    const index = pinecone.index(pineconeIndexName);
    const openai = getOpenAIClient();

    let processedCount = 0;
    let errorCount = 0;

    // Process users in batches to avoid overwhelming the system
    for (const user of activeUsers) {
      try {
        // Get user's profile with embedding
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileError || !profile || !(profile as Tables<"profiles">).embedding_id) {
          console.log(`[Cron] Skipping user ${user.id} - no valid profile/embedding`);
          continue;
        }

        const typedProfile = profile as Tables<"profiles">;

        // Query Pinecone for similar profiles
        const queryResponse = await index.query({
          id: typedProfile.embedding_id!,
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
          console.log(`[Cron] No candidates found for user ${user.id}`);
          continue;
        }

        // Get existing matches to avoid duplicates
        const { data: existingMatches } = await supabase
          .from("matches")
          .select("partner_id, status")
          .eq("user_id", user.id);

        const blockedPartners = new Set(
          (existingMatches ?? [])
            .filter((match) => match.status && match.status !== "suggested")
            .map((match) => match.partner_id as string),
        );

        // Fetch candidate profiles and users
        const { data: partnerProfiles } = await supabase
          .from("profiles")
          .select("*")
          .in(
            "user_id",
            candidateIds.map((c) => c.userId),
          );

        const { data: partnerUsers } = await supabase
          .from("users")
          .select("id, name, email, avatar_url, created_at, is_verified, last_active_at, referral_count, onboarding_completed")
          .in(
            "id",
            candidateIds.map((c) => c.userId),
          );

        const partnerProfileMap = new Map(
          (partnerProfiles ?? []).map((item) => [(item as Tables<"profiles">).user_id ?? "", item]),
        );
        const partnerUserMap = new Map((partnerUsers ?? []).map((item) => [item.id, item]));

        const candidates: CandidateProfile[] = [];

        for (const candidate of candidateIds) {
          if (blockedPartners.has(candidate.userId)) continue;

          const partnerProfile = partnerProfileMap.get(candidate.userId);
          const partnerUser = partnerUserMap.get(candidate.userId);

          if (!partnerProfile || !partnerUser || !partnerUser.onboarding_completed) continue;

          candidates.push({
            user: partnerUser,
            profile: partnerProfile as CandidateProfile["profile"],
            similarity: candidate.score,
          });
        }

        if (candidates.length === 0) {
          console.log(`[Cron] No valid candidates for user ${user.id}`);
          continue;
        }

        // Calculate match scores
        const scoredCandidates = candidates
          .map((candidate) => {
            const breakdown = calculateMatchScore({
              similarityScore: candidate.similarity,
              userProfile: {
                productType: typedProfile.product_type,
                industryTags: typedProfile.industry_tags,
                audienceSize: typedProfile.audience_size,
                whatIOffer: typedProfile.what_i_offer,
                whatIWant: typedProfile.what_i_want,
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
          .slice(0, MAX_MATCHES_PER_USER);

        if (scoredCandidates.length === 0) {
          console.log(`[Cron] No high-quality matches for user ${user.id}`);
          continue;
        }

        // Generate AI explanations for top matches
        const explanationPromises = scoredCandidates.map(async (candidate) => {
          try {
            const response = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: "You are an expert at pairing founders for growth collaborations.",
                },
                {
                  role: "user",
                  content: `Explain why these two founders are a strong match.\n\nFOUNDER A:\nProduct: ${typedProfile.product_name}\nType: ${typedProfile.product_type ?? "Unknown"}\nAudience size: ${typedProfile.audience_size}\nDescription: ${typedProfile.product_description}\n\nFOUNDER B:\nProduct: ${candidate.profile.product_name}\nType: ${candidate.profile.product_type ?? "Unknown"}\nAudience size: ${candidate.profile.audience_size}\nDescription: ${candidate.profile.product_description}\n\nProvide 2-3 reasons and 2 collaboration ideas.`,
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
                        maxItems: 3,
                      },
                      collaboration_ideas: {
                        type: "array",
                        items: { type: "string" },
                        minItems: 2,
                        maxItems: 2,
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
              max_tokens: 600,
            });

            const content = response.choices[0]?.message?.content;
            return content ? JSON.parse(content) : null;
          } catch (error) {
            console.error(`[Cron] Failed to generate explanation:`, error);
            return {
              reasons: ["Strong product and audience alignment", "Complementary partnership opportunities"],
              collaboration_ideas: ["Co-host a webinar", "Run a joint email campaign"],
              potential_value: "High potential for mutual growth",
            };
          }
        });

        const explanations = await Promise.all(explanationPromises);

        // Upsert matches
        const rowsToUpsert = scoredCandidates.map((candidate, index) => ({
          user_id: user.id,
          partner_id: candidate.user.id,
          match_score: candidate.score,
          match_reasons: explanations[index] ?? null,
          status: "suggested",
          last_interaction: new Date().toISOString(),
        }));

        const { error: upsertError } = await supabase
          .from("matches")
          .upsert(rowsToUpsert, { onConflict: "user_id,partner_id" });

        if (upsertError) {
          console.error(`[Cron] Failed to upsert matches for user ${user.id}:`, upsertError);
          errorCount++;
        } else {
          console.log(`[Cron] Created ${scoredCandidates.length} matches for user ${user.id}`);
          processedCount++;
        }
      } catch (error) {
        console.error(`[Cron] Error processing user ${user.id}:`, error);
        errorCount++;
      }
    }

    console.log(`[Cron] Completed: ${processedCount} users processed, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      processed: processedCount,
      errors: errorCount,
      totalUsers: activeUsers.length,
    });
  } catch (error) {
    console.error("[Cron] Match refresh failed:", error);
    return NextResponse.json(
      { error: "Match refresh failed", details: String(error) },
      { status: 500 },
    );
  }
}
