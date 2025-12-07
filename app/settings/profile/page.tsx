import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ProfileEditor } from "@/components/settings/profile-editor";

export const metadata = {
  title: "Edit Profile | CoLaunch",
  description: "Update your profile and partnership preferences",
};

export default async function ProfileSettingsPage() {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  // Fetch user's current profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Failed to fetch profile:", profileError);
  }

  // If no profile exists, redirect to onboarding
  if (!profile) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Edit Your Profile</h1>
          <p className="mt-2 text-gray-600">
            Update your product details and partnership preferences. Changes will regenerate your
            AI matches.
          </p>
        </div>

        {/* Profile Editor */}
        <ProfileEditor profile={profile} />
      </div>
    </div>
  );
}

