import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { getFirebaseAdminAuth } from '@/lib/server/firebaseAdminAuth';
import { resolveSchoolGateScopes } from '@/lib/server/resolveSchoolGateScopes';
import {
  getAuthGateSecret,
  SCHOOL_GATE_COOKIE_NAME,
  SCHOOL_GATE_JWT_ISS,
} from '@/lib/auth/schoolGateCookie';

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 20;
const MAX_BODY_BYTES = 32 * 1024;
const buckets = new Map<string, { count: number; windowStart: number }>();

const SCHOOL_ID_RE = /^[\w-]{1,128}$/;

function jsonError(status: number, message: string) {
  return NextResponse.json({ ok: false, error: message }, { status });
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

function rateLimit(key: string, max: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count += 1;
  return true;
}

function cookieFlags() {
  const secure = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true as const,
    secure,
    sameSite: 'lax' as const,
    path: '/',
  };
}

/** POST: mint signed school gate cookie (scopes from Firestore + optional portal session doc). */
export async function POST(req: NextRequest) {
  try {
    if (!sameOrigin(req)) {
      return jsonError(403, 'Forbidden');
    }
    if (!rateLimit(`school-gate:post:${clientIp(req)}`, MAX_ATTEMPTS)) {
      return jsonError(429, 'Too many requests');
    }

    const secret = getAuthGateSecret();
    if (!secret) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return jsonError(413, 'Body too large');
    }

    const body = await req.json();
    const idToken = typeof body?.idToken === 'string' ? body.idToken : '';
    const schoolId = typeof body?.schoolId === 'string' ? body.schoolId.trim().toLowerCase() : '';
    if (!idToken || !schoolId || !SCHOOL_ID_RE.test(schoolId)) {
      return jsonError(400, 'idToken and schoolId are required.');
    }

    const auth = await getFirebaseAdminAuth();
    const decoded = await auth.verifyIdToken(idToken, true);
    const uid = decoded.uid;

    const scopesArr = await resolveSchoolGateScopes(uid, schoolId);
    if (scopesArr.length === 0) {
      return jsonError(403, 'No school access for this account.');
    }

    const token = await new SignJWT({
      v: 1,
      sch: schoolId,
      uid,
      scp: scopesArr,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(SCHOOL_GATE_JWT_ISS)
      .setIssuedAt()
      .setExpirationTime('12h')
      .sign(secret);

    const maxAgeSec = 60 * 60 * 12;
    const res = NextResponse.json({ ok: true });
    res.cookies.set({
      name: SCHOOL_GATE_COOKIE_NAME,
      value: token,
      maxAge: maxAgeSec,
      ...cookieFlags(),
    });
    return res;
  } catch (e) {
    console.error('[api/auth/school-gate] POST failed:', e);
    return jsonError(503, 'Could not mint school gate. Check Firebase Admin credentials.');
  }
}

/** DELETE: clear school gate cookie only (session DELETE clears both). */
export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) {
    return jsonError(403, 'Forbidden');
  }
  if (!rateLimit(`school-gate:del:${clientIp(req)}`, MAX_ATTEMPTS)) {
    return jsonError(429, 'Too many requests');
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: SCHOOL_GATE_COOKIE_NAME,
    value: '',
    maxAge: 0,
    ...cookieFlags(),
  });
  return res;
}
