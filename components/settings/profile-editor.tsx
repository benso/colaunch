"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { type ProfilePayload } from "@/lib/validations";

interface DatabaseProfile {
  product_type: string | null;
  product_name: string;
  product_description: string;
  website_url: string | null;
  partner_types: string[] | null;
  audience_size: string | null;
  industry_tags: string[] | null;
  what_i_offer: string[] | null;
  what_i_want: string[] | null;
}

interface ProfileEditorProps {
  profile: DatabaseProfile;
}

export function ProfileEditor({ profile }: ProfileEditorProps) {
  // Convert database profile to ProfilePayload format expected by OnboardingWizard
  const initialProfile: ProfilePayload = {
    productType: profile.product_type || "",
    productName: profile.product_name || "",
    productDescription: profile.product_description || "",
    websiteUrl: profile.website_url || "",
    partnerTypes: profile.partner_types || [],
    audienceSize: profile.audience_size || "",
    industryTags: profile.industry_tags || [],
    whatIOffer: profile.what_i_offer || [],
    whatIWant: profile.what_i_want || [],
  };

  return (
    <div className="relative">
      {/* Back Button */}
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      {/* Reuse OnboardingWizard for editing */}
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <OnboardingWizard initialProfile={initialProfile} />
      </div>

      {/* Note about re-matching */}
      <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50 p-4">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> Updating your profile will regenerate your AI embedding. You may
          want to generate new matches after saving to see updated recommendations.
        </p>
      </div>
    </div>
  );
}

