import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/validations";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, product_type, product_name, product_description, website_url, audience_size, partner_types, industry_tags, what_i_offer, what_i_want, ai_analysis, user_id, created_at, updated_at",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return NextResponse.json({ profile: data });
  } catch (error) {
    console.error("Failed to fetch profile", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("📝 Received profile data:", JSON.stringify(body, null, 2));
    
    const parsed = profileSchema.safeParse(body);

    if (!parsed.success) {
      console.error("❌ VALIDATION ERROR:", parsed.error.issues);
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 },
      );
    }
    
    console.log("✅ Validation passed");

    const payload = parsed.data;
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const normalizedPartnerTypes = Array.from(new Set(payload.partnerTypes.map((type) => type.trim())));
    const normalizedTags = Array.from(new Set(payload.industryTags.map((tag) => tag.trim())));
    const normalizedOffers = Array.from(new Set(payload.whatIOffer.map((offer) => offer.trim())));
    const normalizedRequests = Array.from(new Set(payload.whatIWant.map((item) => item.trim())));

    const { data: existingProfile, error: fetchError } = await supabase
      .from("profiles")
      .select("id, embedding_id, ai_analysis")
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError) {
      console.error("❌ PROFILE FETCH ERROR:", {
        message: fetchError.message,
        details: fetchError.details,
        hint: fetchError.hint,
        code: fetchError.code,
      });
      throw fetchError;
    }

    const { data: upsertedProfile, error: upsertError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: existingProfile?.id,
          user_id: user.id,
          product_type: payload.productType,
          product_name: payload.productName,
          product_description: payload.productDescription,
          website_url: payload.websiteUrl ?? null,
          audience_size: payload.audienceSize,
          partner_types: normalizedPartnerTypes,
          industry_tags: normalizedTags,
          what_i_offer: normalizedOffers,
          what_i_want: normalizedRequests,
          embedding_id: existingProfile?.embedding_id ?? null,
          ai_analysis: existingProfile?.ai_analysis ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select()
      .single();

    if (upsertError) {
      console.error("❌ PROFILE UPSERT ERROR:", {
        message: upsertError.message,
        details: upsertError.details,
        hint: upsertError.hint,
        code: upsertError.code,
      });
      throw upsertError;
    }

    const { error: userUpdateError } = await supabase
      .from("users")
      .update({ onboarding_completed: true, last_active_at: new Date().toISOString() })
      .eq("id", user.id);

    if (userUpdateError) {
      console.error("Failed to update user onboarding flag", userUpdateError);
    }

    return NextResponse.json({ profile: upsertedProfile });
  } catch (error) {
    console.error("Failed to upsert profile", error);
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }
}
