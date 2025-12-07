import { NextResponse, type NextRequest } from "next/server";
import OpenAI from "openai";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getPineconeClient } from "@/lib/pinecone";
import { calculateMatchScore } from "@/lib/matching";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Vercel Cron endpoint to automatically generate matches for active users daily
 * Schedule: Daily at 10am UTC (configured in vercel.json)
 * 
 * Security: Requires CRON_SECRET header to prevent unauthorized access
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.error("❌ Unauthorized cron request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🚀 Starting automated match generation...");

    const supabase = await getSupabaseServerClient();
    const pinecone = getPineconeClient();
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

    // Get all active users (active in last 30 days, have completed profiles)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: activeProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, embedding_id, product_name")
      .gte("last_active_at", thirtyDaysAgo.toISOString())
      .not("embedding_id", "is", null)
      .order("last_active_at", { ascending: false });

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    if (!activeProfiles || activeProfiles.length === 0) {
      console.log("ℹ️ No active profiles to process");
      return NextResponse.json({ 
        success: true, 
        message: "No active profiles",
        processed: 0,
        succeeded: 0,
        failed: 0,
        skipped: 0,
      });
    }

    console.log(`📊 Found ${activeProfiles.length} active profiles`);

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Process each user
    for (const profile of activeProfiles) {
      results.processed++;

      // Skip if no user_id (shouldn't happen, but TypeScript safety)
      if (!profile.user_id) {
        results.skipped++;
        continue;
      }

      try {
        // Check if user already generated matches in last 24 hours
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const { data: recentMatches } = await supabase
          .from("matches")
          .select("id")
          .eq("user_id", profile.user_id)
          .gte("created_at", yesterday.toISOString())
          .limit(1);

        if (recentMatches && recentMatches.length > 0) {
          console.log(`⏭️ Skipping ${profile.product_name} - generated matches in last 24h`);
          results.skipped++;
          continue;
        }

        // Get user's full profile data
        const { data: fullProfile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", profile.user_id)
          .single();

        if (profileError || !fullProfile) {
          console.error(`❌ Failed to fetch profile for ${profile.user_id}`);
          results.failed++;
          results.errors.push(`Profile ${profile.user_id}: ${profileError?.message}`);
          continue;
        }

        // Query Pinecone for similar profiles
        const queryResponse = await index.namespace("profiles").query({
          id: fullProfile.embedding_id,
          topK: 50,
          includeMetadata: true,
          filter: {
            user_id: { $ne: profile.user_id },
          },
        });

        if (!queryResponse.matches || queryResponse.matches.length === 0) {
          console.log(`ℹ️ No matches found for ${profile.product_name}`);
          results.skipped++;
          continue;
        }

        // Get partner profiles from database
        const partnerIds = queryResponse.matches
          .map((match) => match.metadata?.user_id as string)
          .filter(Boolean);

        const { data: partnerProfiles, error: partnersError } = await supabase
          .from("profiles")
          .select("*")
          .in("user_id", partnerIds);

        if (partnersError || !partnerProfiles) {
          console.error(`❌ Failed to fetch partner profiles for ${profile.user_id}`);
          results.failed++;
          results.errors.push(`Partners ${profile.user_id}: ${partnersError?.message}`);
          continue;
        }

        // Calculate match scores
        const scoredMatches = partnerProfiles
          .map((partner) => {
            const pineconeMatch = queryResponse.matches.find(
              (m) => m.metadata?.user_id === partner.user_id,
            );

            if (!pineconeMatch) return null;

            const score = calculateMatchScore(
              fullProfile,
              partner,
              pineconeMatch.score ?? 0,
            );

            return {
              partner,
              score,
              similarity: pineconeMatch.score ?? 0,
            };
          })
          .filter((m): m is NonNullable<typeof m> => m !== null && m.score >= 60)
          .sort((a, b) => b.score - a.score)
          .slice(0, 10); // Top 10 matches

        if (scoredMatches.length === 0) {
          console.log(`ℹ️ No high-quality matches (score >= 60) for ${profile.product_name}`);
          results.skipped++;
          continue;
        }

        // Generate AI reasons and ideas for each match
        const matchesWithAI = await Promise.all(
          scoredMatches.map(async ({ partner, score, similarity }) => {
            try {
              const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                  {
                    role: "system",
                    content:
                      "You are an expert at identifying partnership synergies. Generate specific, actionable reasons why two products should partner.",
                  },
                  {
                    role: "user",
                    content: `Product A: ${fullProfile.product_name}\nDescription: ${fullProfile.product_description}\nAudience: ${fullProfile.audience_size}\nOffers: ${fullProfile.partnership_offers?.join(", ")}\nWants: ${fullProfile.partnership_wants?.join(", ")}\n\nProduct B: ${partner.product_name}\nDescription: ${partner.product_description}\nAudience: ${partner.audience_size}\nOffers: ${partner.partnership_offers?.join(", ")}\nWants: ${partner.partnership_wants?.join(", ")}\n\nGenerate:\n1. 3-4 specific reasons why they should partner (focus on concrete benefits)\n2. 2-3 collaboration ideas (be creative and actionable)`,
                  },
                ],
                response_format: {
                  type: "json_schema",
                  json_schema: {
                    name: "match_analysis",
                    strict: true,
                    schema: {
                      type: "object",
                      properties: {
                        reasons: {
                          type: "array",
                          items: { type: "string" },
                        },
                        ideas: {
                          type: "array",
                          items: { type: "string" },
                        },
                      },
                      required: ["reasons", "ideas"],
                      additionalProperties: false,
                    },
                  },
                },
                max_tokens: 500,
              });

              const result = JSON.parse(completion.choices[0]?.message?.content ?? "{}");

              return {
                user_id: fullProfile.user_id,
                partner_id: partner.user_id,
                score,
                similarity_score: Math.round(similarity * 100),
                reasons: result.reasons ?? [],
                collaboration_ideas: result.ideas ?? [],
                status: "suggested" as const,
              };
            } catch (aiError) {
              console.error(`AI generation failed for match:`, aiError);
              return {
                user_id: fullProfile.user_id,
                partner_id: partner.user_id,
                score,
                similarity_score: Math.round(similarity * 100),
                reasons: ["AI-generated reasons temporarily unavailable"],
                collaboration_ideas: ["Contact this founder to discuss partnership opportunities"],
                status: "suggested" as const,
              };
            }
          }),
        );

        // Insert matches into database
        const { error: insertError } = await supabase
          .from("matches")
          .insert(matchesWithAI);

        if (insertError) {
          console.error(`❌ Failed to insert matches for ${profile.user_id}:`, insertError);
          results.failed++;
          results.errors.push(`Insert ${profile.user_id}: ${insertError.message}`);
          continue;
        }

        console.log(`✅ Generated ${matchesWithAI.length} matches for ${profile.product_name}`);
        results.succeeded++;

        // Small delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ Error processing ${profile.user_id}:`, error);
        results.failed++;
        results.errors.push(
          `${profile.user_id}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    console.log("✅ Automated match generation complete");
    console.log(`📊 Results:`, results);

    return NextResponse.json({
      success: true,
      message: "Match generation complete",
      ...results,
    });
  } catch (error) {
    console.error("❌ Cron job failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
