import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getOpenAIClient } from "@/lib/openai";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  productName: z.string().min(2).max(120),
  productDescription: z.string().min(50).max(2000),
  productType: z.string().min(2).max(40).optional(),
});

export async function POST(request: NextRequest) {
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

    const openai = getOpenAIClient();

    const prompt = `You are an expert growth strategist that understands startup positioning, audience alignment, and collaborative partnerships.

Analyze the following founder profile and extract:
1. 6-8 concise industry or audience tags that will help match them with complementary products.
2. A short summary highlighting their differentiation and ideal partner.

Respond in JSON with the shape:
{
  "tags": ["tag1", "tag2", ...],
  "summary": "Short summary"
}

Profile:
Name: ${parsed.data.productName}
Type: ${parsed.data.productType ?? "Unknown"}
Description: ${parsed.data.productDescription}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert growth strategist that understands startup positioning, audience alignment, and collaborative partnerships.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "profile_analysis",
          schema: {
            type: "object",
            properties: {
              tags: {
                type: "array",
                items: { type: "string" },
              },
              summary: { type: "string" },
            },
            required: ["tags", "summary"],
            additionalProperties: false,
          },
          strict: true,
        },
      },
      temperature: 0.6,
      max_tokens: 600,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    const json = JSON.parse(content) as {
      tags?: string[];
      summary?: string;
    };

    return NextResponse.json({
      tags: Array.isArray(json.tags) ? json.tags.slice(0, 8) : [],
      summary: json.summary ?? null,
    });
  } catch (error) {
    console.error("AI profile analysis failed", error);
    return NextResponse.json({ error: "Failed to analyze profile" }, { status: 500 });
  }
}
