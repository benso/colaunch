"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { OnboardingWizard } from "./onboarding-wizard";
import type { ProfilePayload } from "@/lib/validations";

interface DemoOnboardingWizardProps {
  initialProfile?: ProfilePayload;
  onComplete: () => void;
}

/**
 * Demo wrapper for OnboardingWizard that intercepts the completion
 * and calls onComplete instead of submitting to API or redirecting
 */
export function DemoOnboardingWizard({ initialProfile, onComplete }: DemoOnboardingWizardProps) {
  const completionTriggered = useRef(false);
  const router = useRouter();

  useEffect(() => {
    // Intercept fetch calls to /api/profile to prevent actual submission
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const url = typeof args[0] === "string" ? args[0] : args[0].url;
      
      // If it's a profile submission, trigger completion instead
      if (url.includes("/api/profile") && args[1]?.method === "POST") {
        if (!completionTriggered.current) {
          completionTriggered.current = true;
          setTimeout(() => {
            onComplete();
          }, 500); // Small delay to show loading state
        }
        // Return a mock successful response
        return Promise.resolve(
          new Response(
            JSON.stringify({
              profile: {
                id: "demo-profile-id",
                user_id: "demo-user-id",
                product_name: initialProfile?.productName || "ProductivityOS",
                product_type: initialProfile?.productType || "SaaS",
                product_description: initialProfile?.productDescription || "",
              },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          )
        );
      }
      
      // For embedding generation, also mock it
      if (url.includes("/api/ai/generate-embedding")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ embeddingId: "demo-embedding-id" }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          )
        );
      }
      
      // For all other requests, use original fetch
      return originalFetch(...args);
    };

    // Intercept router.push to prevent navigation to /dashboard
    const originalPush = router.push;
    router.push = ((path: string) => {
      if (path === "/dashboard" && completionTriggered.current) {
        // Don't navigate, just trigger completion
        onComplete();
        return Promise.resolve();
      }
      return originalPush(path);
    }) as typeof router.push;

    return () => {
      window.fetch = originalFetch;
      router.push = originalPush;
    };
  }, [onComplete, initialProfile, router]);

  return <OnboardingWizard initialProfile={initialProfile} />;
}

