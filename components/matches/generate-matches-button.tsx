"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";

export function GenerateMatchesButton() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/matches/generate", { method: "POST" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to generate matches" }));
        throw new Error(data.error ?? "Failed to generate matches");
      }
      return response.json();
    },
    onSuccess: () => {
      setMessage("Fresh matches are ready.");
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
    onError: (error: unknown) => {
      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Unable to generate matches right now.");
      }
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => {
          setMessage(null);
          mutation.mutate();
        }}
        disabled={mutation.isPending}
        className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-75"
      >
        {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Generate matches
      </button>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}
