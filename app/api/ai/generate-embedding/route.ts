import { NextResponse } from "next/server";
import { z } from "zod";

import { getOpenAIClient } from "@/lib/openai";
import { getPineconeClient } from "@/lib/pinecone";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  profileId: z.string().uuid(),
  userId: z.string().uuid(),
  text: z.string().min(20).max(4000),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 },
      );
    }

    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || user.id !== parsed.data.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const openai = getOpenAIClient();
    const pinecone = getPineconeClient();

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: parsed.data.text,
    });

    const [embedding] = embeddingResponse.data;

    if (!embedding?.embedding) {
      throw new Error("Embedding generation failed");
    }

    const vectorId = `${parsed.data.profileId}`;
    const metadata = {
      profile_id: parsed.data.profileId,
      user_id: parsed.data.userId,
    } satisfies Record<string, unknown>;

    const indexName = process.env.PINECONE_INDEX_NAME;

    if (!indexName) {
      throw new Error("Pinecone index not configured");
    }

    const index = pinecone.index(indexName);

    await index.upsert([
      {
        id: vectorId,
        values: embedding.embedding,
        metadata,
      },
    ]);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ embedding_id: vectorId })
      .eq("id", parsed.data.profileId)
      .eq("user_id", parsed.data.userId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ embeddingId: vectorId });
  } catch (error) {
    console.error("Embedding generation failed", error);
    return NextResponse.json({ error: "Failed to generate embedding" }, { status: 500 });
  }
}
