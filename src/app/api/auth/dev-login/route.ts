import { NextRequest, NextResponse } from 'next/server';

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 8;
const MAX_BODY_BYTES = 1024;
const buckets = new Map<string, { count: number; windowStart: number }>();

function jsonError(status: number) {
  return NextResponse.json({ success: false }, { status });
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]?.trim() || 'unknown';
  return req.headers.get('x-real-ip')?.trim() || req.ip || 'unknown';
}

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const forwardedHost = req.headers.get('x-forwarded-host');
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

function rateLimit(key: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (bucket.count >= MAX_ATTEMPTS) return false;
  bucket.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    if (!sameOrigin(req)) {
      return jsonError(403);
    }

    if (!rateLimit(clientIp(req))) {
      return jsonError(429);
    }

    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return jsonError(413);
    }

    const { passcode } = await req.json();

    if (!passcode || typeof passcode !== 'string') {
      return jsonError(400);
    }

    const isValid = passcode === process.env.DEV_PASSCODE;

    return NextResponse.json({ success: isValid });
  } catch {
    return jsonError(500);
  }
}
