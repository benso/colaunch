"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";

import {
  audienceSizes,
  offerOptions,
  onboardingStepSchemas,
  productCategories,
  profileSchema,
  type ProfilePayload,
} from "@/lib/validations";
import { cn, toTitleCase } from "@/lib/utils";

type WizardFormState = {
  productType: string;
  productName: string;
  productDescription: string;
  websiteUrl: string;
  partnerTypes: string[];
  audienceSize: string;
  industryTags: string[];
  whatIOffer: string[];
  whatIWant: string[];
};

type AnalysisState = {
  status: "idle" | "loading" | "success" | "error";
  tags: string[];
  summary?: string;
  error?: string;
};

const STEP_CONFIG = [
  { title: "Product Category", description: "Tell us what type of product you're building." },
  {
    title: "Product Description",
    description: "Describe your product so we can understand your positioning and audience.",
  },
  {
    title: "Ideal Partner",
    description: "Define who you want to collaborate with and which industries you care about.",
  },
  {
    title: "What You Offer",
    description: "Share the value you can bring to partners to make collaboration irresistible.",
  },
  {
    title: "What You Want",
    description: "Let us know what you'd love from your ideal partner and review your profile.",
  },
] as const;

const DRAFT_STORAGE_KEY = "colaunch:onboarding-draft";

function createDefaultState(): WizardFormState {
  return {
    productType: "",
    productName: "",
    productDescription: "",
    websiteUrl: "",
    partnerTypes: [],
    audienceSize: "",
    industryTags: [],
    whatIOffer: [],
    whatIWant: [],
  };
}

function mapProfileToState(profile: ProfilePayload): WizardFormState {
  return {
    productType: profile.productType,
    productName: profile.productName,
    productDescription: profile.productDescription,
    websiteUrl: profile.websiteUrl ?? "",
    partnerTypes: profile.partnerTypes,
    audienceSize: profile.audienceSize,
    industryTags: profile.industryTags,
    whatIOffer: profile.whatIOffer,
    whatIWant: profile.whatIWant,
  };
}

type DraftPayload = {
  step: number;
  form: WizardFormState;
  updatedAt: string;
};

interface OnboardingWizardProps {
  initialProfile?: ProfilePayload;
}

export function OnboardingWizard({ initialProfile }: OnboardingWizardProps) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState<number>(1);
  const [formState, setFormState] = useState<WizardFormState>(() =>
    initialProfile ? mapProfileToState(initialProfile) : createDefaultState(),
  );
  const [analysis, setAnalysis] = useState<AnalysisState>({
    status: initialProfile ? "success" : "idle",
    tags: initialProfile?.industryTags ?? [],
    summary: undefined,
    error: undefined,
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [stepError, setStepError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [customOffer, setCustomOffer] = useState("");
  const [customWant, setCustomWant] = useState("");
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (initialProfile) return;
    if (!hasHydrated) return;

    try {
      const stored = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!stored) return;

      const parsed = JSON.parse(stored) as DraftPayload;
      if (parsed?.form) {
        setFormState(parsed.form);
        if (parsed.step && parsed.step >= 1 && parsed.step <= STEP_CONFIG.length) {
          setActiveStep(parsed.step);
        }
      }
    } catch (error) {
      console.error("Failed to restore onboarding draft", error);
    }
  }, [initialProfile, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    try {
      const payload: DraftPayload = {
        step: activeStep,
        form: formState,
        updatedAt: new Date().toISOString(),
      };
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.error("Failed to persist onboarding draft", error);
    }
  }, [formState, activeStep, hasHydrated]);

  const progress = useMemo(
    () => Math.round((activeStep / STEP_CONFIG.length) * 100),
    [activeStep],
  );

  const sanitizeForValidation = () => ({
    productType: formState.productType || undefined,
    productName: formState.productName.trim(),
    productDescription: formState.productDescription.trim(),
    websiteUrl: formState.websiteUrl.trim() || undefined,
    partnerTypes: formState.partnerTypes,
    audienceSize: formState.audienceSize || undefined,
    industryTags: formState.industryTags,
    whatIOffer: formState.whatIOffer,
    whatIWant: formState.whatIWant,
  });

  const handleToggleArrayValue = (key: keyof Pick<WizardFormState, "partnerTypes" | "whatIOffer" | "whatIWant">, value: string) => {
    setFormState((previous) => {
      const current = new Set(previous[key]);
      if (current.has(value)) {
        current.delete(value);
      } else {
        current.add(value);
      }
      return { ...previous, [key]: Array.from(current) };
    });
  };

  const handleRemoveTag = (tag: string) => {
    setFormState((previous) => ({
      ...previous,
      industryTags: previous.industryTags.filter((item) => item.toLowerCase() !== tag.toLowerCase()),
    }));
  };

  const handleAddTag = (tag: string) => {
    const cleaned = toTitleCase(tag.trim());
    if (!cleaned) return;
    setFormState((previous) => {
      if (previous.industryTags.some((item) => item.toLowerCase() === cleaned.toLowerCase())) {
        return previous;
      }
      return { ...previous, industryTags: [...previous.industryTags, cleaned] };
    });
    setTagInput("");
  };

  const handleAddCustomOffer = () => {
    const cleaned = customOffer.trim();
    if (!cleaned) return;
    handleToggleArrayValue("whatIOffer", toTitleCase(cleaned));
    setCustomOffer("");
  };

  const handleAddCustomWant = () => {
    const cleaned = customWant.trim();
    if (!cleaned) return;
    handleToggleArrayValue("whatIWant", toTitleCase(cleaned));
    setCustomWant("");
  };

  const runAnalysis = async () => {
    if (analysis.status === "loading" || analysis.status === "success" || isAnalyzing) return;
    const payload = sanitizeForValidation();
    if (!payload.productName || !payload.productDescription) return;

    try {
      setIsAnalyzing(true);
      setAnalysis((previous) => ({ ...previous, status: "loading", error: undefined }));

      const response = await fetch("/api/ai/analyze-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: payload.productName,
          productDescription: payload.productDescription,
          productType: payload.productType,
        }),
      });

      if (!response.ok) {
        throw new Error("Analysis request failed");
      }

      const data = await response.json();
      const suggestedTags: string[] = Array.isArray(data?.tags)
        ? data.tags.map((tag: unknown) =>
            typeof tag === "string" ? toTitleCase(tag) : "",
          )
        : [];

      setAnalysis({
        status: "success",
        tags: suggestedTags.filter(Boolean),
        summary: typeof data?.summary === "string" ? data.summary : undefined,
        error: undefined,
      });
    } catch (error) {
      console.error("AI analysis failed", error);
      setAnalysis({
        status: "error",
        tags: [],
        summary: undefined,
        error: "We couldn't analyze your product automatically. Add tags manually, or retry later.",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNext = async () => {
    setStepError(null);
    const currentInput = sanitizeForValidation();

    const validationMap = {
      1: onboardingStepSchemas.step1,
      2: onboardingStepSchemas.step2,
      3: onboardingStepSchemas.step3,
      4: onboardingStepSchemas.step4,
    } as const;

    const schema = validationMap[activeStep as keyof typeof validationMap];
    if (schema) {
      const validation = schema.safeParse(currentInput);
      if (!validation.success) {
        setStepError(validation.error.issues[0]?.message ?? "Please complete this step before continuing.");
        return;
      }
    }

    if (activeStep === 2) {
      await runAnalysis();
    }

    setActiveStep((previous) => Math.min(previous + 1, STEP_CONFIG.length));
  };

  const handleBack = () => {
    setStepError(null);
    setActiveStep((previous) => Math.max(previous - 1, 1));
  };

  const handleComplete = () => {
    setStepError(null);
    setGlobalError(null);

    const finalInput = sanitizeForValidation();
    const result = profileSchema.safeParse(finalInput);

    if (!result.success) {
      setStepError(result.error.issues[0]?.message ?? "Please review your answers");
      return;
    }

    const payload = result.data;

    startSubmitTransition(async () => {
      try {
        const response = await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: "Failed to save profile" }));
          throw new Error(typeof data.error === "string" ? data.error : "Failed to save profile");
        }

        const json = (await response.json()) as { profile?: { id: string; user_id: string; product_description: string; product_name: string; product_type: string | null } };

        if (json.profile) {
          const combinedText = [
            json.profile.product_name,
            json.profile.product_type ?? "",
            json.profile.product_description,
            payload.industryTags.join(", "),
            payload.whatIOffer.join(", "),
            payload.whatIWant.join(", "),
          ]
            .filter(Boolean)
            .join(" \n ");

          await fetch("/api/ai/generate-embedding", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              profileId: json.profile.id,
              userId: json.profile.user_id,
              text: combinedText,
            }),
          }).catch((error) => {
            console.error("Embedding generation failed", error);
          });
        }

        if (hasHydrated) {
          window.localStorage.removeItem(DRAFT_STORAGE_KEY);
        }

        router.push("/dashboard");
        router.refresh();
      } catch (error) {
        console.error("Failed to submit onboarding profile", error);
        setGlobalError(
          error instanceof Error ? error.message : "Unexpected error while saving your profile.",
        );
      }
    });
  };

  const renderCategoryOptions = () => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {productCategories.map((category) => {
        const isSelected = formState.productType === category;
        return (
          <button
            key={category}
            type="button"
            onClick={() => setFormState((previous) => ({ ...previous, productType: category }))}
            className={cn(
              "rounded-2xl border p-4 text-left transition",
              "border-white/10 bg-white/5 hover:border-white/40 hover:bg-white/10",
              isSelected && "border-emerald-400 bg-emerald-400/10 text-emerald-200",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">{category}</span>
              {isSelected && <Check className="h-5 w-5" />}
            </div>
            <p className="mt-2 text-sm text-white/70">
              {category === "Other"
                ? "Something unique or hybrid? Tell us more in the next step."
                : `Founders building ${category.toLowerCase()} products.`}
            </p>
          </button>
        );
      })}
    </div>
  );

  const renderProductDetails = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm font-semibold uppercase tracking-wide text-white/60">
            Product name
          </label>
          <input
            type="text"
            value={formState.productName}
            onChange={(event) => {
              setFormState((previous) => ({ ...previous, productName: event.target.value }));
              setAnalysis((previous) =>
                previous.status === "idle"
                  ? previous
                  : { status: "idle", tags: [], summary: undefined, error: undefined },
              );
            }}
            placeholder="ProductivityOS"
            className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-base text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-semibold uppercase tracking-wide text-white/60">
            Website URL (optional)
          </label>
          <input
            type="url"
            value={formState.websiteUrl}
            onChange={(event) =>
              setFormState((previous) => ({ ...previous, websiteUrl: event.target.value }))
            }
            placeholder="https://yourproduct.com"
            className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-base text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-white/60">
          <span className="font-semibold uppercase tracking-wide">Product description</span>
          <span>{formState.productDescription.length}/2000</span>
        </div>
        <textarea
          value={formState.productDescription}
          onChange={(event) => {
            setFormState((previous) => ({ ...previous, productDescription: event.target.value }));
            setAnalysis((previous) =>
              previous.status === "idle"
                ? previous
                : { status: "idle", tags: [], summary: undefined, error: undefined },
            );
          }}
          placeholder="Explain what you do, who you serve, and the transformation you deliver."
          rows={8}
          className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-base text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
        <p className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 flex-none text-emerald-400" />
          We’ll use this description to suggest relevant tags and partner matches.
        </p>
      </div>
    </div>
  );

  const renderPartnerDefinition = () => (
    <div className="space-y-8">
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Partner types</h3>
        <p className="text-sm text-white/70">
          Select the types of founders whose audiences align with yours. Choose all that apply.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {productCategories.map((category) => {
            const isSelected = formState.partnerTypes.includes(category);
            return (
              <button
                key={category}
                type="button"
                onClick={() => handleToggleArrayValue("partnerTypes", category)}
                className={cn(
                  "rounded-2xl border px-4 py-3 text-left transition",
                  "border-white/10 bg-white/5 hover:border-white/40 hover:bg-white/10",
                  isSelected && "border-emerald-400 bg-emerald-400/10 text-emerald-200",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{category}</span>
                  {isSelected && <Check className="h-4 w-4" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Audience size</h3>
        <div className="flex flex-wrap gap-3">
          {audienceSizes.map((size) => {
            const isSelected = formState.audienceSize === size;
            return (
              <button
                key={size}
                type="button"
                onClick={() => setFormState((previous) => ({ ...previous, audienceSize: size }))}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm transition",
                  "border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10",
                  isSelected && "border-emerald-400 bg-emerald-400/10 text-emerald-200",
                )}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Industry tags</h3>
            <p className="text-sm text-white/70">
              These help our matching engine understand where you operate. Add at least one.
            </p>
          </div>
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              handleAddTag(tagInput);
            }}
          >
            <input
              type="text"
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              placeholder="Add tag"
              className="w-40 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-full border border-emerald-400/60 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-100"
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          </form>
        </div>

        {analysis.status === "loading" && (
          <p className="flex items-center gap-2 text-sm text-white/70">
            <Loader2 className="h-4 w-4 animate-spin" /> Analyzing your product description...
          </p>
        )}

        {analysis.status === "error" && analysis.error && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-sm text-amber-200">
            <p>{analysis.error}</p>
            <button
              type="button"
              onClick={runAnalysis}
              className="inline-flex items-center gap-1 rounded-full border border-amber-200/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-100"
              disabled={isAnalyzing}
            >
              {isAnalyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Retry
            </button>
          </div>
        )}

        {analysis.status === "success" && analysis.tags.length > 0 && (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">
            <p className="font-semibold">Suggested tags from AI</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {analysis.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleAddTag(tag)}
                  className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:bg-emerald-300/20"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {formState.industryTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="text-white/70 transition hover:text-red-300"
                aria-label={`Remove tag ${tag}`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  const renderOffers = () => (
    <div className="space-y-6">
      <p className="text-sm text-white/70">
        Pick the ways you can deliver value in a collaboration. Strong offers lead to higher match
        scores.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {offerOptions.map((offer) => {
          const isSelected = formState.whatIOffer.includes(offer);
          return (
            <button
              key={offer}
              type="button"
              onClick={() => handleToggleArrayValue("whatIOffer", offer)}
              className={cn(
                "rounded-2xl border px-4 py-3 text-left transition",
                "border-white/10 bg-white/5 hover:border-white/40 hover:bg-white/10",
                isSelected && "border-emerald-400 bg-emerald-400/10 text-emerald-200",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{offer}</span>
                {isSelected && <Check className="h-4 w-4" />}
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-white/60">
          Add a custom offer
        </h3>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={customOffer}
            onChange={(event) => setCustomOffer(event.target.value)}
            placeholder="e.g. Exclusive onboarding concierge"
            className="flex-1 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
          />
          <button
            type="button"
            onClick={handleAddCustomOffer}
            className="inline-flex items-center gap-1 rounded-full border border-emerald-400/60 bg-emerald-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-100"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
      </div>

      {formState.whatIOffer.length > 0 && (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">
          <p className="font-semibold">Current offers</p>
          <ul className="mt-3 space-y-2">
            {formState.whatIOffer.map((offer) => (
              <li key={offer} className="flex items-center justify-between">
                <span>{offer}</span>
                <button
                  type="button"
                  onClick={() => handleToggleArrayValue("whatIOffer", offer)}
                  className="text-xs uppercase tracking-wide text-emerald-200/80 underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const renderRequests = () => (
    <div className="space-y-6">
      <p className="text-sm text-white/70">
        Share what you want from a partner so our matching engine can optimize for mutual value.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {offerOptions.map((item) => {
          const isSelected = formState.whatIWant.includes(item);
          return (
            <button
              key={item}
              type="button"
              onClick={() => handleToggleArrayValue("whatIWant", item)}
              className={cn(
                "rounded-2xl border px-4 py-3 text-left transition",
                "border-white/10 bg-white/5 hover:border-white/40 hover:bg-white/10",
                isSelected && "border-emerald-400 bg-emerald-400/10 text-emerald-200",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{item}</span>
                {isSelected && <Check className="h-4 w-4" />}
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-white/60">
          Add a custom request
        </h3>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={customWant}
            onChange={(event) => setCustomWant(event.target.value)}
            placeholder="e.g. Joint product bundle launch"
            className="flex-1 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
          />
          <button
            type="button"
            onClick={handleAddCustomWant}
            className="inline-flex items-center gap-1 rounded-full border border-emerald-400/60 bg-emerald-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-100"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
      </div>

      {formState.whatIWant.length > 0 && (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">
          <p className="font-semibold">What you’re asking for</p>
          <ul className="mt-3 space-y-2">
            {formState.whatIWant.map((item) => (
              <li key={item} className="flex items-center justify-between">
                <span>{item}</span>
                <button
                  type="button"
                  onClick={() => handleToggleArrayValue("whatIWant", item)}
                  className="text-xs uppercase tracking-wide text-emerald-200/80 underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const renderSummary = () => {
    const summaryData = sanitizeForValidation();
    return (
      <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-xl font-semibold text-white">Profile overview</h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-white/50">
              Product
            </dt>
            <dd className="mt-1 text-base text-white">{summaryData.productName}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-white/50">
              Category
            </dt>
            <dd className="mt-1 text-base text-white">{summaryData.productType}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-white/50">
              Description
            </dt>
            <dd className="mt-1 text-sm leading-relaxed text-white/80">
              {summaryData.productDescription}
            </dd>
          </div>
          {summaryData.websiteUrl && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-white/50">
                Website
              </dt>
              <dd className="mt-1 text-sm text-emerald-200">{summaryData.websiteUrl}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h4 className="text-lg font-semibold text-white">Ideal partners</h4>
          <p className="mt-2 text-sm text-white/70">{summaryData.audienceSize} audiences</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {summaryData.partnerTypes.map((item) => (
              <span key={item} className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase">
                {item}
              </span>
            ))}
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Tags</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {summaryData.industryTags.map((tag) => (
                <span key={tag} className="rounded-full border border-white/15 px-3 py-1 text-xs">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h4 className="text-lg font-semibold text-white">Collaboration preferences</h4>
          <div className="mt-3 space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                What you offer
              </p>
              <ul className="mt-2 space-y-1 text-sm text-white/80">
                {summaryData.whatIOffer.map((offer) => (
                  <li key={offer}>• {offer}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                What you want
              </p>
              <ul className="mt-2 space-y-1 text-sm text-white/80">
                {summaryData.whatIWant.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      </div>
    );
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 1:
        return renderCategoryOptions();
      case 2:
        return renderProductDetails();
      case 3:
        return renderPartnerDefinition();
      case 4:
        return renderOffers();
      case 5:
      default:
        return (
          <div className="space-y-10">
            {renderRequests()}
            {renderSummary()}
          </div>
        );
    }
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white shadow-[0_40px_120px_rgba(15,25,50,0.6)] backdrop-blur">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="w-full lg:w-1/3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-3 flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-200">
              <span>⏱️</span>
              <span>~4 minutes to complete</span>
            </div>
            <div className="flex items-center justify-between text-sm text-white/60">
              <span className="font-semibold uppercase tracking-wide">Step {activeStep}</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-300 to-sky-300 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-6 space-y-4">
              {STEP_CONFIG.map((step, index) => {
                const stepNumber = index + 1;
                const isActive = stepNumber === activeStep;
                const isComplete = stepNumber < activeStep;
                return (
                  <div key={step.title} className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-8 w-8 flex-none items-center justify-center rounded-full border text-sm font-semibold",
                        isActive && "border-emerald-400 bg-emerald-400/10 text-emerald-100",
                        isComplete && "border-emerald-400 bg-emerald-400 text-slate-950",
                        !isActive && !isComplete && "border-white/20 bg-white/5 text-white/60",
                      )}
                    >
                      {isComplete ? <Check className="h-4 w-4" /> : stepNumber}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{step.title}</p>
                      <p className="text-xs text-white/60">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-2/3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">{STEP_CONFIG[activeStep - 1].title}</h2>
              <p className="text-sm text-white/70">{STEP_CONFIG[activeStep - 1].description}</p>
            </div>

            <div className="mt-6 space-y-6">{renderStepContent()}</div>

            {stepError && (
              <p className="mt-6 rounded-xl border border-amber-400/50 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                {stepError}
              </p>
            )}

            {globalError && (
              <p className="mt-6 rounded-xl border border-red-400/50 bg-red-400/10 px-4 py-3 text-sm text-red-100">
                {globalError}
              </p>
            )}

            <div className="mt-8 flex flex-wrap justify-between gap-3">
              {activeStep > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-6 py-2 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/10"
                  disabled={isAnalyzing || isSubmitting}
                >
                  Back
                </button>
              ) : (
                <span />
              )}

              {activeStep < STEP_CONFIG.length ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center justify-center rounded-full bg-emerald-400 px-6 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200"
                  disabled={isAnalyzing || isSubmitting}
                >
                  {activeStep === 2 && isAnalyzing ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Analyzing...
                    </span>
                  ) : (
                    "Next"
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleComplete}
                  className="inline-flex items-center justify-center rounded-full bg-emerald-400 px-6 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Completing...
                    </span>
                  ) : (
                    "Complete profile"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
