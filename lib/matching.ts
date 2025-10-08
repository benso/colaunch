import type { Tables } from "@/types/database";

const AUDIENCE_TIERS = ["<1K", "1K-10K", "10K-50K", "50K+"] as const;

interface ScoreInput {
  similarityScore: number; // 0-1 cosine similarity
  userProfile: ProfileSnapshot;
  partnerProfile: ProfileSnapshot;
  partnerUser: UserSnapshot;
}

interface ProfileSnapshot {
  productType: string | null;
  industryTags: string[];
  audienceSize: string | null;
  whatIOffer: string[];
  whatIWant: string[];
}

interface UserSnapshot {
  createdAt: string | null;
  isVerified: boolean | null;
  referralCount: number | null;
  lastActiveAt: string | null;
}

export interface MatchScoreBreakdown {
  total: number;
  similarity: number;
  tagOverlap: number;
  sizeCompatibility: number;
  offerAlignment: number;
  trust: number;
}

export function calculateMatchScore(input: ScoreInput): MatchScoreBreakdown {
  const similarity = Math.max(0, Math.min(1, input.similarityScore)) * 100;
  const tagOverlap = computeTagOverlap(input.userProfile.industryTags, input.partnerProfile.industryTags);
  const sizeCompatibility = computeAudienceCompatibility(
    input.userProfile.audienceSize,
    input.partnerProfile.audienceSize,
  );
  const offerAlignment = computeOfferAlignment(
    input.userProfile.whatIWant,
    input.partnerProfile.whatIOffer,
  );
  const trust = computeTrustScore(input.partnerUser);

  // MVP scoring weights: similarity (50%), tags (25%), size (15%), offer (10%)
  // Trust score is calculated but not included in MVP total
  const total = Math.round(
    similarity * 0.50 +
      tagOverlap * 0.25 +
      sizeCompatibility * 0.15 +
      offerAlignment * 0.10,
  );

  return {
    total,
    similarity: Math.round(similarity),
    tagOverlap: Math.round(tagOverlap),
    sizeCompatibility: Math.round(sizeCompatibility),
    offerAlignment: Math.round(offerAlignment),
    trust: Math.round(trust),
  };
}

function computeTagOverlap(userTags: string[], partnerTags: string[]) {
  if (!userTags.length || !partnerTags.length) {
    return 60;
  }

  const userSet = new Set(userTags.map((tag) => tag.toLowerCase()));
  const partnerSet = new Set(partnerTags.map((tag) => tag.toLowerCase()));
  let shared = 0;

  for (const tag of userSet) {
    if (partnerSet.has(tag)) {
      shared += 1;
    }
  }

  const denominator = Math.max(userSet.size, partnerSet.size);
  if (denominator === 0) return 60;

  return (shared / denominator) * 100;
}

function computeAudienceCompatibility(a: string | null, b: string | null) {
  if (!a || !b) {
    return 70;
  }

  const indexA = AUDIENCE_TIERS.indexOf(a as (typeof AUDIENCE_TIERS)[number]);
  const indexB = AUDIENCE_TIERS.indexOf(b as (typeof AUDIENCE_TIERS)[number]);

  if (indexA === -1 || indexB === -1) {
    return 70;
  }

  const difference = Math.abs(indexA - indexB);

  if (difference === 0) return 100;
  if (difference === 1) return 75;
  return 50;
}

function computeOfferAlignment(userWants: string[], partnerOffers: string[]) {
  if (!userWants.length) {
    return 100;
  }

  if (!partnerOffers.length) {
    return 40;
  }

  const wantsSet = new Set(userWants.map((item) => item.toLowerCase()));
  const offersSet = new Set(partnerOffers.map((item) => item.toLowerCase()));

  let overlaps = 0;
  wantsSet.forEach((want) => {
    if (offersSet.has(want)) {
      overlaps += 1;
    }
  });

  if (overlaps === 0) {
    return 40;
  }

  return (overlaps / wantsSet.size) * 100;
}

function computeTrustScore(user: UserSnapshot) {
  const now = Date.now();
  let score = 0;

  if (user.createdAt) {
    const created = new Date(user.createdAt).getTime();
    if (!Number.isNaN(created)) {
      const ageDays = Math.max(0, Math.floor((now - created) / (1000 * 60 * 60 * 24)));
      score += Math.min(ageDays, 30);
    }
  }

  if (user.isVerified) {
    score += 20;
  }

  const referralCount = user.referralCount ?? 0;
  if (referralCount > 0) {
    score += Math.min(referralCount * 10, 50);
  }

  if (user.lastActiveAt) {
    const lastActive = new Date(user.lastActiveAt).getTime();
    if (!Number.isNaN(lastActive)) {
      const daysSinceActive = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24));
      if (daysSinceActive <= 7) {
        score += 20;
      }
    }
  }

  return Math.min(score, 100);
}

export function isUserActive(lastActiveAt: string | null) {
  if (!lastActiveAt) return false;
  const lastActive = new Date(lastActiveAt).getTime();
  if (Number.isNaN(lastActive)) return false;
  const diffDays = (Date.now() - lastActive) / (1000 * 60 * 60 * 24);
  return diffDays <= 7;
}

export type MatchRow = Tables<"matches"> & {
  partner: Tables<"users"> | null;
  partner_profile: Tables<"profiles"> | null;
};
