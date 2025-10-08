import { NextResponse } from "next/server";

/**
 * Health check endpoint for monitoring and uptime checks
 * Returns 200 OK if the service is running
 */
export async function GET() {
  try {
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "CoLaunch API",
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0",
      environment: process.env.NODE_ENV ?? "development",
      checks: {
        supabase: !!process.env.SUPABASE_URL && !!process.env.SUPABASE_ANON_KEY,
        openai: !!process.env.OPENAI_API_KEY,
        pinecone: !!process.env.PINECONE_API_KEY && !!process.env.PINECONE_INDEX_NAME,
        resend: !!process.env.RESEND_API_KEY,
        posthog: !!process.env.NEXT_PUBLIC_POSTHOG_KEY,
      },
    };

    return NextResponse.json(health, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: String(error),
      },
      { status: 500 },
    );
  }
}
