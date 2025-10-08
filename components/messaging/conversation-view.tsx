"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, SendHorizonal, Sparkles } from "lucide-react";

type Message = {
  id: string;
  content: string;
  sender_id: string | null;
  recipient_id: string | null;
  sent_at: string | null;
  is_ai_generated: boolean | null;
};

interface ProfileSnapshot {
  product_name: string;
  product_type: string | null;
  product_description: string;
  audience_size: string | null;
  what_i_offer: string[] | null;
  what_i_want: string[] | null;
  industry_tags?: string[] | null;
  website_url?: string | null;
}

interface ConversationViewProps {
  matchId: string;
  currentUserId: string;
  partner: {
    id: string;
    name: string | null;
    email: string;
    productName: string;
    productType: string | null;
  };
  profiles: {
    current: ProfileSnapshot;
    partner: ProfileSnapshot;
  };
}

export function ConversationView({ matchId, currentUserId, partner, profiles }: ConversationViewProps) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [tone, setTone] = useState("friendly");
  const [callToAction, setCallToAction] = useState("Schedule a 20-minute intro call next week");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isAiDraft, setIsAiDraft] = useState(false);

  const messagesQuery = useQuery({
    queryKey: ["messages", matchId],
    queryFn: async () => {
      const response = await fetch(`/api/messages?matchId=${matchId}`);
      if (!response.ok) {
        throw new Error("Unable to load messages");
      }
      const result = (await response.json()) as { messages: Message[] };
      return result.messages;
    },
    refetchInterval: 15000,
  });

  const sortedMessages = useMemo(() => {
    return (messagesQuery.data ?? []).slice().sort((a, b) => {
      const aTime = a.sent_at ? new Date(a.sent_at).getTime() : 0;
      const bTime = b.sent_at ? new Date(b.sent_at).getTime() : 0;
      return aTime - bTime;
    });
  }, [messagesQuery.data]);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sortedMessages.length]);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, content, isAiGenerated: isAiDraft }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to send message" }));
        throw new Error(data.error ?? "Failed to send message");
      }
      return response.json();
    },
    onSuccess: () => {
      setDraft("");
      setIsAiDraft(false);
      setStatusMessage("Message sent");
      queryClient.invalidateQueries({ queryKey: ["messages", matchId] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
    onError: (error: unknown) => {
      if (error instanceof Error) {
        setStatusMessage(error.message);
      } else {
        setStatusMessage("Failed to send message");
      }
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/messages/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, tone, callToAction }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to generate message" }));
        throw new Error(data.error ?? "Failed to generate message");
      }
      return response.json() as Promise<{ body: string } & Record<string, string>>;
    },
    onSuccess: (data) => {
      setDraft(data.body ?? "");
      setIsAiDraft(true);
      setStatusMessage("AI draft ready");
    },
    onError: (error: unknown) => {
      if (error instanceof Error) {
        setStatusMessage(error.message);
      } else {
        setStatusMessage("Unable to generate intro message");
      }
    },
  });

  const canSend = draft.trim().length >= 20 && !sendMutation.isPending;

  return (
    <section className="flex flex-1 flex-col gap-4 rounded-3xl border border-border/60 bg-card/70 p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Partner</p>
          <p className="text-sm font-semibold text-foreground">
            {partner.name ? partner.name : partner.productName} ({partner.productType ?? "Founder"})
          </p>
          <p className="text-xs text-muted-foreground">{partner.email}</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <select
            value={tone}
            onChange={(event) => setTone(event.target.value)}
            className="rounded-full border border-border/70 bg-transparent px-3 py-1.5"
          >
            <option value="friendly">Friendly</option>
            <option value="professional">Professional</option>
            <option value="bold">Bold</option>
            <option value="warm">Warm</option>
          </select>
          <button
            type="button"
            onClick={() => {
              setStatusMessage(null);
              generateMutation.mutate();
            }}
            disabled={generateMutation.isPending}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-600 px-4 py-1.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate intro
          </button>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-border/60 bg-background/60 p-4 text-xs text-muted-foreground sm:grid-cols-2">
        <div>
          <p className="font-semibold uppercase tracking-wide text-foreground/80">Your product</p>
          <p className="mt-1 leading-relaxed">
            {profiles.current.product_name} ({profiles.current.product_type ?? "Product"}) serving audiences around {profiles.current.audience_size ?? "Unknown"}.
            Key offers: {(profiles.current.what_i_offer ?? []).slice(0, 3).join(", ") || "Add offers in onboarding"}.
          </p>
        </div>
        <div>
          <p className="font-semibold uppercase tracking-wide text-foreground/80">Partner focus</p>
          <p className="mt-1 leading-relaxed">
            {profiles.partner.product_name} ({profiles.partner.product_type ?? "Product"}) with audience {profiles.partner.audience_size ?? "Unknown"}.
            Offers include {(profiles.partner.what_i_offer ?? []).slice(0, 3).join(", ") || "Not specified"}.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-background/60 p-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="cta-input">
          Call to action
        </label>
        <input
          id="cta-input"
          value={callToAction}
          onChange={(event) => setCallToAction(event.target.value)}
          className="mt-1 w-full rounded-xl border border-border/60 bg-transparent px-3 py-2 text-sm"
          placeholder="Propose a next step"
        />
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-2xl border border-border/40 bg-background/60 p-4"
      >
        {messagesQuery.isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : null}

        {!messagesQuery.isLoading && sortedMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <p>No messages yet.</p>
            <p>Generate an intro above to kick things off.</p>
          </div>
        ) : null}

        <div className="space-y-3">
          {sortedMessages.map((message) => {
            const isSender = message.sender_id === currentUserId;
            const timestamp = message.sent_at
              ? new Date(message.sent_at).toLocaleString()
              : "";

            return (
              <div
                key={message.id}
                className={`flex ${isSender ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                    isSender
                      ? "bg-emerald-600 text-white"
                      : "bg-white text-foreground dark:bg-slate-900 dark:text-slate-100"
                  }`}
                >
                  <p className="whitespace-pre-line">{message.content}</p>
                  <div className="mt-2 flex items-center justify-between gap-3 text-[10px] uppercase tracking-wide opacity-80">
                    <span>{timestamp}</span>
                    {message.is_ai_generated ? <span>AI draft</span> : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <textarea
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setIsAiDraft(false);
          }}
          placeholder="Write your message..."
          className="min-h-[120px] w-full rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Suggest customizing the AI draft before sending. Minimum 20 characters.
          </p>
          <button
            type="button"
            disabled={!canSend}
            onClick={() => {
              setStatusMessage(null);
              sendMutation.mutate(draft.trim());
            }}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
            Send message
          </button>
        </div>
        {statusMessage ? <p className="text-xs text-muted-foreground">{statusMessage}</p> : null}
      </div>
    </section>
  );
}
