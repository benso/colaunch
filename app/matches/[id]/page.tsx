import { redirect } from "next/navigation";

import { requireAuthentication } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { toTitleCase } from "@/lib/utils";
import { ConversationView } from "@/components/messaging/conversation-view";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function MatchConversationPage({ params }: RouteParams) {
  const { id } = await params;

  if (!id) {
    redirect("/dashboard");
  }

  const user = await requireAuthentication(`/matches/${id}`);
  const supabase = await getSupabaseServerClient();

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id, user_id, partner_id, match_score, match_reasons, status, created_at, last_interaction")
    .eq("id", id)
    .maybeSingle();

  if (matchError) {
    console.error("Failed to load match", matchError);
    redirect("/dashboard");
  }

  if (!match || (match.user_id !== user.id && match.partner_id !== user.id)) {
    redirect("/dashboard");
  }

  const partnerId = match.user_id === user.id ? match.partner_id : match.user_id;

  if (!partnerId) {
    redirect("/dashboard");
  }

  const [partnerUserResult, partnerProfileResult, userProfileResult] = await Promise.all([
    supabase
      .from("users")
      .select("id, name, email, avatar_url, is_verified, last_active_at, referral_count")
      .eq("id", partnerId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select(
        "user_id, product_name, product_type, product_description, audience_size, what_i_offer, what_i_want, website_url",
      )
      .eq("user_id", partnerId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select(
        "product_name, product_type, product_description, audience_size, what_i_offer, what_i_want, industry_tags",
      )
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (partnerUserResult.error) {
    console.error("Failed to load partner user", partnerUserResult.error);
    redirect("/dashboard");
  }

  if (partnerProfileResult.error) {
    console.error("Failed to load partner profile", partnerProfileResult.error);
    redirect("/dashboard");
  }

  if (userProfileResult.error) {
    console.error("Failed to load current profile", userProfileResult.error);
    redirect("/dashboard");
  }

  if (!partnerUserResult.data || !partnerProfileResult.data || !userProfileResult.data) {
    redirect("/dashboard");
  }

  const reasons = (match.match_reasons as { reasons?: string[]; collaboration_ideas?: string[] } | null) ?? null;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Conversation</p>
            <h1 className="mt-1 text-2xl font-semibold text-foreground">
              {partnerUserResult.data.name ? toTitleCase(partnerUserResult.data.name) : partnerProfileResult.data.product_name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {partnerProfileResult.data.product_type ? toTitleCase(partnerProfileResult.data.product_type) : "Founder"} • Audience {partnerProfileResult.data.audience_size ?? "Unknown"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Match score</p>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-300">{match.match_score ?? "–"}</p>
          </div>
        </div>
        {reasons?.reasons && reasons.reasons.length > 0 ? (
          <ul className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            {reasons.reasons.map((reason) => (
              <li key={reason} className="rounded-xl border border-border/60 bg-background/60 px-3 py-2">
                {reason}
              </li>
            ))}
          </ul>
        ) : null}
      </header>

      <ConversationView
        matchId={match.id}
        currentUserId={user.id}
        partner={{
          id: partnerUserResult.data.id,
          name: partnerUserResult.data.name,
          email: partnerUserResult.data.email,
          productName: partnerProfileResult.data.product_name,
          productType: partnerProfileResult.data.product_type,
        }}
        profiles={{
          current: userProfileResult.data,
          partner: partnerProfileResult.data,
        }}
      />
    </div>
  );
}
