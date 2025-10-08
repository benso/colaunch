/**
 * Simple in-memory rate limiter for API routes
 * For production, consider using Redis or a dedicated rate limiting service
 */

interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per interval
}

interface RequestRecord {
  count: number;
  resetAt: number;
}

const requestMap = new Map<string, RequestRecord>();

// Cleanup old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestMap.entries()) {
    if (now > record.resetAt) {
      requestMap.delete(key);
    }
  }
}, 10 * 60 * 1000);

/**
 * Rate limit check for a given identifier
 * @param identifier - Unique identifier (e.g., user ID, IP address)
 * @param config - Rate limit configuration
 * @returns Object with allowed status and remaining requests
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const record = requestMap.get(identifier);

  // No existing record or expired - create new one
  if (!record || now > record.resetAt) {
    const newRecord: RequestRecord = {
      count: 1,
      resetAt: now + config.interval,
    };
    requestMap.set(identifier, newRecord);

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: newRecord.resetAt,
    };
  }

  // Existing record within time window
  if (record.count < config.maxRequests) {
    record.count++;
    return {
      allowed: true,
      remaining: config.maxRequests - record.count,
      resetAt: record.resetAt,
    };
  }

  // Rate limit exceeded
  return {
    allowed: false,
    remaining: 0,
    resetAt: record.resetAt,
  };
}

/**
 * Common rate limit configurations
 */
export const RATE_LIMITS = {
  // Strict limits for expensive operations
  AI_GENERATION: {
    interval: 60 * 1000, // 1 minute
    maxRequests: 5,
  },
  MATCH_GENERATION: {
    interval: 5 * 60 * 1000, // 5 minutes
    maxRequests: 1,
  },
  // Standard API limits
  API_STANDARD: {
    interval: 60 * 1000, // 1 minute
    maxRequests: 30,
  },
  API_STRICT: {
    interval: 60 * 1000, // 1 minute
    maxRequests: 10,
  },
  // Auth endpoints
  AUTH_LOGIN: {
    interval: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
  },
  AUTH_SIGNUP: {
    interval: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
  },
} as const;

/**
 * Get client identifier from request (IP address or user ID)
 */
export function getClientIdentifier(
  request: Request,
  userId?: string | null,
): string {
  if (userId) {
    return `user:${userId}`;
  }

  // Try to get real IP from headers (works with most proxy/CDN setups)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return `ip:${forwardedFor.split(",")[0]?.trim()}`;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return `ip:${realIp}`;
  }

  // Fallback to a generic identifier
  return "ip:unknown";
}

/**
 * Helper to create rate limit response
 */
export function createRateLimitResponse(resetAt: number) {
  const headers = new Headers();
  headers.set("X-RateLimit-Reset", new Date(resetAt).toISOString());
  headers.set("Retry-After", Math.ceil((resetAt - Date.now()) / 1000).toString());

  return new Response(
    JSON.stringify({
      error: "Rate limit exceeded",
      message: "Too many requests. Please try again later.",
      resetAt: new Date(resetAt).toISOString(),
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        ...Object.fromEntries(headers),
      },
    },
  );
}
