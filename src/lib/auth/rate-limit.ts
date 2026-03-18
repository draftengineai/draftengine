import { Ratelimit } from '@upstash/ratelimit';
import { NextRequest, NextResponse } from 'next/server';

// In-memory fallback for local dev (no KV)
const memoryStore = new Map<string, { count: number; reset: number }>();

function hasKV(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function createLimiter(maxRequests: number, window: `${number} ${'s' | 'm' | 'h' | 'd'}`) {
  if (hasKV()) {
    // Dynamic import to avoid @vercel/kv throwing when env vars are missing
    const { kv } = await import('@vercel/kv');
    return new Ratelimit({
      redis: kv,
      limiter: Ratelimit.slidingWindow(maxRequests, window),
      prefix: 'ratelimit',
    });
  }
  return null;
}

// Rate limiters — created lazily on first use
let authLimiter: Ratelimit | null | undefined;
let aiLimiter: Ratelimit | null | undefined;

async function getAuthLimiter() {
  if (authLimiter === undefined) authLimiter = await createLimiter(5, '1 m');
  return authLimiter;
}

async function getAILimiter() {
  if (aiLimiter === undefined) aiLimiter = await createLimiter(10, '1 h');
  return aiLimiter;
}

function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || '127.0.0.1';
}

/**
 * In-memory rate limiter for local development without KV.
 */
function checkMemoryLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = memoryStore.get(key);
  if (!entry || now > entry.reset) {
    memoryStore.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

/**
 * Check rate limit. Returns null if allowed, or a 429 response if rate-limited.
 */
export async function checkAuthRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const ip = getClientIP(request);
  const limiter = await getAuthLimiter();

  if (limiter) {
    const { success } = await limiter.limit(`auth:${ip}`);
    if (!success) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }
  } else {
    // In-memory fallback: 5 per minute
    if (!checkMemoryLimit(`auth:${ip}`, 5, 60_000)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }
  }
  return null;
}

/**
 * Check rate limit for AI endpoints (generate, scan). Returns null if allowed, or a 429 response.
 */
export async function checkAIRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const ip = getClientIP(request);
  const limiter = await getAILimiter();

  if (limiter) {
    const { success } = await limiter.limit(`ai:${ip}`);
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }
  } else {
    // In-memory fallback: 10 per hour
    if (!checkMemoryLimit(`ai:${ip}`, 10, 3_600_000)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }
  }
  return null;
}
