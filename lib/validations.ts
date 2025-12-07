import { z } from "zod";

export const productCategories = [
  "SaaS",
  "Newsletter",
  "Course",
  "Community",
  "Podcast",
  "App",
  "Other",
] as const;

export const audienceSizes = ["<1K", "1K-10K", "10K-50K", "50K+"] as const;

export const offerOptions = [
  "Feature in my newsletter",
  "Give audience discount",
  "Co-host webinar",
  "Guest post on blog",
  "Affiliate commission",
  "Bundle our products",
  "Cross-promote on social",
] as const;

const urlSchema = z
  .union([
    z.string().url("Enter a valid URL").max(200, "URL should be under 200 characters"),
    z.literal(""),
  ])
  .transform((val) => (val === "" ? undefined : val))
  .optional();

export const profileSchema = z.object({
  productType: z.enum(productCategories),
  productName: z
    .string()
    .min(2, "Product name must be at least 2 characters")
    .max(120, "Product name must be under 120 characters"),
  productDescription: z
    .string()
    .min(50, "Description must be at least 50 characters")
    .max(2000, "Description must be under 2000 characters"),
  websiteUrl: urlSchema,
  partnerTypes: z
    .array(z.enum(productCategories))
    .min(1, "Select at least one ideal partner type"),
  audienceSize: z.enum(audienceSizes),
  industryTags: z
    .array(
      z
        .string()
        .min(2, "Tags must be at least 2 characters")
        .max(40, "Tags must be under 40 characters"),
    )
    .min(1, "Add at least one industry tag"),
  whatIOffer: z
    .array(
      z
        .string()
        .min(2, "Offer entries must be at least 2 characters")
        .max(120, "Offer entries must be under 120 characters"),
    )
    .min(1, "Select at least one offer"),
  whatIWant: z
    .array(
      z
        .string()
        .min(2, "Request entries must be at least 2 characters")
        .max(120, "Request entries must be under 120 characters"),
    )
    .min(1, "Select at least one request"),
});

export type ProfilePayload = z.infer<typeof profileSchema>;

export const onboardingStepSchemas = {
  step1: profileSchema.pick({ productType: true }),
  step2: profileSchema.pick({ productName: true, productDescription: true }).extend({
    websiteUrl: z.union([z.string().url("Enter a valid URL").max(200), z.literal(""), z.undefined()]).transform((val) => (val === "" ? undefined : val)).optional(),
  }),
  step3: profileSchema.pick({ partnerTypes: true, audienceSize: true, industryTags: true }),
  step4: profileSchema.pick({ whatIOffer: true }),
  step5: profileSchema.pick({ whatIWant: true }),
};
