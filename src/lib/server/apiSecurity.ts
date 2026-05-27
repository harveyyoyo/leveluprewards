/**
 * Shared security utilities for Next.js API route handlers.
 *
 * Consolidates rate-limiting, same-origin validation, and IP extraction
 * that were previously duplicated across session and school-gate
 * route files.
 */
import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// IP extraction
// ---------------------------------------------------------------------------

/** Best-effort client IP from proxy headers or direct connection. */
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]?.trim() || 'unknown';
  return req.headers.get('x-real-ip')?.trim() || req.ip || 'unknown';
}

// ---------------------------------------------------------------------------
// Same-origin validation (CSRF protection)
// ---------------------------------------------------------------------------

/**
 * Validates that the request originates from the same host by comparing the
 * `Origin` or `Referer` header against the `Host` / `X-Forwarded-Host`.
 */
export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const forwardedHost = req.headers.get('x-fh-requested-host') || req.headers.get('x-forwarded-host');
  const host = forwardedHost || req.headers.get('host');
  if (!host) return false;

  const hosts = host.split(',').map((h) => h.trim()).filter(Boolean);
  const matches = (value: string) => {
    try {
      return hosts.includes(new URL(value).host);
    } catch {
      return false;
    }
  };

  if (origin) return matches(origin);
  if (referer) return matches(referer);
  return false;
}

// ---------------------------------------------------------------------------
// In-memory rate limiter with TTL sweep
// ---------------------------------------------------------------------------

interface Bucket {
  count: number;
  windowStart: number;
}

/** Stores per-key rate limit buckets. Pruned periodically to prevent memory leaks. */
const buckets = new Map<string, Bucket>();

const DEFAULT_WINDOW_MS = 60_000;

/** Interval between automatic sweeps of stale rate-limit entries (5 min). */
const SWEEP_INTERVAL_MS = 5 * 60_000;

let sweepTimerId: ReturnType<typeof setInterval> | null = null;

/** Remove buckets whose window has fully expired. */
function sweepStaleBuckets() {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart >= DEFAULT_WINDOW_MS * 2) {
      buckets.delete(key);
    }
  }
}

function ensureSweepTimer() {
  if (sweepTimerId !== null) return;
  sweepTimerId = setInterval(sweepStaleBuckets, SWEEP_INTERVAL_MS);
  // Prevent the timer from keeping the process alive (important for Cloud Run / SSR cold starts).
  if (typeof sweepTimerId === 'object' && 'unref' in sweepTimerId) {
    (sweepTimerId as NodeJS.Timeout).unref();
  }
}

/**
 * In-memory sliding-window rate limiter.
 *
 * Returns `true` if the request is allowed, `false` if the limit is exceeded.
 *
 * **Note:** This resets on cold starts (by design — stateless serverless).
 * For stronger guarantees, layer an external store (Redis, Firestore) on top.
 */
export function rateLimit(
  key: string,
  max: number,
  windowMs: number = DEFAULT_WINDOW_MS,
): boolean {
  ensureSweepTimer();
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count += 1;
  return true;
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

/** Convenience: return a JSON error response with `{ ok: false, error }`. */
export function jsonError(status: number, message: string) {
  return NextResponse.json({ ok: false, error: message }, { status });
}
