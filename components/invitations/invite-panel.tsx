"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCopy, Loader2, Mails, Share2 } from "lucide-react";

interface Invitation {
  id: string;
  invitee_email: string;
  status: string | null;
  sent_at: string | null;
  opened_at: string | null;
  joined_at: string | null;
  match_id: string | null;
}

interface InvitationResponse {
  referralCode: string;
  referralCount: number;
  referralLink: string;
  invitations: Invitation[];
}

export function InvitePanel() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const invitationsQuery = useQuery({
    queryKey: ["invitations"],
    queryFn: async () => {
      const response = await fetch("/api/invitations");
      if (!response.ok) {
        throw new Error("Failed to load invitations");
      }
      return (await response.json()) as InvitationResponse;
    },
  });

  const createInvitation = useMutation({
    mutationFn: async (payload: { email: string }) => {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to create invite" }));
        throw new Error(data.error ?? "Failed to create invite");
      }
      return response.json();
    },
    onSuccess: () => {
      setFeedback("Invitation sent");
      setEmail("");
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },
    onError: (error: unknown) => {
      if (error instanceof Error) {
        setFeedback(error.message);
      } else {
        setFeedback("Unable to send invite right now");
      }
    },
  });

  const referralLink = invitationsQuery.data?.referralLink ?? "";

  const copyReferralLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setFeedback("Referral link copied");
    } catch (error) {
      console.error("Failed to copy referral link", error);
      setFeedback("Unable to copy link");
    }
  };

  return (
    <div className="space-y-4 rounded-3xl border border-amber-200/70 bg-amber-50/70 p-6 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/30">
      <div className="flex items-center gap-3">
        <Share2 className="h-5 w-5 text-amber-600" />
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-200">
            Invite founders
          </h3>
          <p className="text-xs text-amber-700/80 dark:text-amber-100/80">
            Share your referral link or send a targeted invite.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200/70 bg-white/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Referral link</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={referralLink}
            readOnly
            className="flex-1 rounded-xl border border-amber-200/60 bg-transparent px-3 py-2 text-sm text-foreground"
          />
          <button
            type="button"
            onClick={copyReferralLink}
            className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
          >
            <ClipboardCopy className="h-4 w-4" /> Copy link
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {invitationsQuery.data?.referralCount ?? 0} founders joined via your link.
        </p>
      </div>

      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          setFeedback(null);
          if (!email) return;
          createInvitation.mutate({ email });
        }}
      >
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Email invite
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            value={email}
            required
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Choose a founder to invite"
            className="flex-1 rounded-xl border border-amber-200/70 bg-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-amber-900/50 dark:bg-amber-950/20"
          />
          <button
            type="submit"
            disabled={createInvitation.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {createInvitation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mails className="h-4 w-4" />}
            Send invite
          </button>
        </div>
      </form>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent invites</p>
        {invitationsQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading invites…
          </div>
        ) : null}

        {!invitationsQuery.isLoading && invitationsQuery.data?.invitations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No invitations sent yet.</p>
        ) : null}

        <ul className="space-y-2">
          {invitationsQuery.data?.invitations.map((invitation) => {
            const status = invitation.status ?? "sent";
            const timestamp = invitation.sent_at
              ? new Date(invitation.sent_at).toLocaleDateString()
              : "Pending";

            return (
              <li
                key={invitation.id}
                className="rounded-2xl border border-amber-200/70 bg-white/70 px-3 py-3 text-sm shadow-sm dark:border-amber-900/40 dark:bg-amber-950/30"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{invitation.invitee_email}</span>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">{timestamp}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Status: {status}</p>
              </li>
            );
          })}
        </ul>
      </div>

      {feedback ? <p className="text-xs text-muted-foreground">{feedback}</p> : null}
    </div>
  );
}
