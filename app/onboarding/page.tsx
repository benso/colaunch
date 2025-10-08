import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { requireAuthentication } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ProfilePayload } from "@/lib/validations";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await requireAuthentication("/onboarding");
  const supabase = await getSupabaseServerClient();

  const { data: profileData, error } = await supabase
    .from("profiles")
    .select(
      "product_type, product_name, product_description, website_url, partner_types, audience_size, industry_tags, what_i_offer, what_i_want",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load profile", error);
  }

  const initialProfile: ProfilePayload | undefined = profileData
    ? {
        productType: (profileData.product_type ?? "Other") as ProfilePayload["productType"],
        productName: profileData.product_name ?? "",
        productDescription: profileData.product_description ?? "",
        websiteUrl: profileData.website_url ?? undefined,
        partnerTypes: (profileData.partner_types ?? []) as ProfilePayload["partnerTypes"],
        audienceSize: (profileData.audience_size ?? "<1K") as ProfilePayload["audienceSize"],
        industryTags: profileData.industry_tags ?? [],
        whatIOffer: profileData.what_i_offer ?? [],
        whatIWant: profileData.what_i_want ?? [],
      }
    : undefined;

  return (
    <main className="min-h-screen bg-slate-950 bg-[radial-gradient(circle_at_top,_rgba(30,100,255,0.2),_transparent_55%)] py-12 text-white">
      <div className="mx-auto w-full max-w-6xl px-6">
        <OnboardingWizard initialProfile={initialProfile} />
      </div>
    </main>
  );
}
