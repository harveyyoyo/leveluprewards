import { NextRequest, NextResponse } from 'next/server';
import { firebaseConfig } from '@/firebase/config';

/**
 * Lightweight API auth + abuse controls for Next.js route handlers that call
 * paid AI providers. The AI endpoints are not meant to be public — only
 * school staff (admin, teacher, secretary, prize clerk, reports) may use them
 * when `requireSchoolStaff` is set.
 *
 * Controls applied:
 *  1. Same-origin check via Origin/Referer header (basic CSRF / direct-curl gate).
 *  2. Firebase ID token required (Authorization: Bearer <token>) and verified
 *     against Google's Identity Toolkit REST API using the project's Web API key.
 *  3. When `requireSchoolStaff` is set, the body must include a `schoolId` and
 *     the caller must have a staff role doc (admin, teacher, secretary,
 *     prizeClerk, or reports) under that school, or be listed in
 *     `appConfig/global.developerUids` (same anonymous Firebase
 *     UID added by dev login + `addDeveloperMe`). Verified via the Firestore
 *     REST API with the caller's ID token so security rules apply.
 *  4. Per-user + per-IP rate limits (sliding window).
 *  5. Payload size cap on the JSON body.
 *
 * This is intentionally dependency-free. For stronger guarantees (signature
 * verification without a network round trip, distributed rate limits) migrate
 * to firebase-admin + a shared store (e.g. Firestore or Redis) later.
 */

type Ok<T> = { ok: true; value: T };
type Err = { ok: false; response: NextResponse };

const TOKEN_CACHE_MS = 60_000;
const tokenCache = new Map<string, { uid: string; expiresAt: number }>();

const ROLE_CACHE_MS = 60_000;
const roleCache = new Map<string, { allowed: boolean; expiresAt: number }>();
const developerUidCache = new Map<string, { allowed: boolean; expiresAt: number }>();

interface Bucket {
  count: number;
  windowStart: number;
}
const rateLimitBuckets = new Map<string, Bucket>();

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 10;
const DEFAULT_MAX_BODY_BYTES = 32 * 1024;

function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]?.trim() || 'unknown';
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return req.ip || 'unknown';
}

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');

  // On Firebase Hosting / Cloud Run, the inbound `Host` header is the
  // internal run.app domain, while the browser's `Origin` is the public
  // hosting domain (e.g. <site>.web.app). Trust the forwarded-host header
  // set by the Firebase Hosting proxy so the origin check still passes in
  // production. Locally, `X-Forwarded-Host` is absent and we fall back to
  // the regular `Host` header which matches `Origin` already.
  const forwardedHost = req.headers.get('x-fh-requested-host') || req.headers.get('x-forwarded-host');
  const host = forwardedHost || req.headers.get('host');
  if (!host) return false;

  // Both `Host` and `X-Forwarded-Host` can contain a comma-separated list
  // when multiple proxies are chained. Accept a match against any entry.
  const hostCandidates = host.split(',').map((h) => h.trim()).filter(Boolean);
  const matches = (candidate: string): boolean => {
    try {
      const target = new URL(candidate).host;
      return hostCandidates.includes(target);
    } catch {
      return false;
    }
  };

  if (origin) return matches(origin);
  if (referer) return matches(referer);
  return false;
}

async function verifyIdToken(idToken: string): Promise<{ uid: string } | null> {
  const cached = tokenCache.get(idToken);
  if (cached && cached.expiresAt > Date.now()) {
    return { uid: cached.uid };
  }

  const apiKey = firebaseConfig.apiKey;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!res.ok) return null;

    const data = (await res.json()) as { users?: Array<{ localId?: string }> };
    const uid = data.users?.[0]?.localId;
    if (!uid) return null;

    tokenCache.set(idToken, { uid, expiresAt: Date.now() + TOKEN_CACHE_MS });
    return { uid };
  } catch {
    return null;
  }
}

async function checkSchoolRole(
  idToken: string,
  uid: string,
  schoolId: string
): Promise<boolean> {
  const cacheKey = `${uid}:${schoolId}`;
  const cached = roleCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.allowed;
  }

  const projectId = firebaseConfig.projectId;
  if (!projectId) return false;

  const base = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/schools/${encodeURIComponent(schoolId)}`;
  const urls = [
    `${base}/roles_admin/${encodeURIComponent(uid)}`,
    `${base}/roles_teacher/${encodeURIComponent(uid)}`,
    `${base}/roles_secretary/${encodeURIComponent(uid)}`,
    `${base}/roles_prizeClerk/${encodeURIComponent(uid)}`,
    `${base}/roles_reports/${encodeURIComponent(uid)}`,
    `${base}/roles_librarian/${encodeURIComponent(uid)}`,
    `${base}/roles_office/${encodeURIComponent(uid)}`,
    `${base}/roles_houseCoordinator/${encodeURIComponent(uid)}`,
  ];

  const STAFF_ROLES = new Set([
    'admin',
    'teacher',
    'secretary',
    'prizeClerk',
    'reports',
    'librarian',
    'office',
    'houseCoordinator',
  ]);

  let allowed = false;
  try {
    // Run role lookups in parallel using the user's ID token, so
    // Firestore rules (not a service account) decide whether the read is
    // permitted. A 200 with a 'fields.role' string value = authorized.
    const results = await Promise.all(
      urls.map((url) =>
        fetch(url, {
          headers: { Authorization: `Bearer ${idToken}` },
          cache: 'no-store',
        }).then(async (r) => (r.ok ? ((await r.json()) as unknown) : null))
      )
    );

    for (const body of results) {
      if (!body || typeof body !== 'object') continue;
      const fields = (body as { fields?: { role?: { stringValue?: string } } }).fields;
      const role = fields?.role?.stringValue;
      if (role && STAFF_ROLES.has(role)) {
        allowed = true;
        break;
      }
    }
  } catch {
    allowed = false;
  }

  roleCache.set(cacheKey, { allowed, expiresAt: Date.now() + ROLE_CACHE_MS });
  return allowed;
}

async function checkDeveloperAllowlist(idToken: string, uid: string): Promise<boolean> {
  const cached = developerUidCache.get(uid);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.allowed;
  }

  const projectId = firebaseConfig.projectId;
  if (!projectId) return false;

  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId
  )}/databases/(default)/documents/appConfig/global`;

  let allowed = false;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${idToken}` },
      cache: 'no-store',
    });
    if (!res.ok) {
      developerUidCache.set(uid, { allowed: false, expiresAt: Date.now() + ROLE_CACHE_MS });
      return false;
    }
    const body = (await res.json()) as {
      fields?: {
        developerUids?: {
          arrayValue?: { values?: Array<{ stringValue?: string }> };
        };
      };
    };
    const values = body.fields?.developerUids?.arrayValue?.values;
    if (Array.isArray(values)) {
      allowed = values.some((v) => v?.stringValue === uid);
    }
  } catch {
    allowed = false;
  }

  developerUidCache.set(uid, { allowed, expiresAt: Date.now() + ROLE_CACHE_MS });
  return allowed;
}

function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || now - bucket.windowStart >= windowMs) {
    rateLimitBuckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (bucket.count >= maxRequests) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((windowMs - (now - bucket.windowStart)) / 1000)
    );
    return { allowed: false, retryAfterSec };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

function sweepBuckets(): void {
  if (rateLimitBuckets.size < 1000) return;
  const now = Date.now();
  for (const [k, v] of rateLimitBuckets.entries()) {
    if (now - v.windowStart > DEFAULT_WINDOW_MS * 5) rateLimitBuckets.delete(k);
  }
}

export interface GuardOptions {
  windowMs?: number;
  maxRequests?: number;
  maxBodyBytes?: number;
  /**
   * When true, the request body must include a `schoolId` string and the
   * authenticated user must have a staff role doc (admin, teacher, secretary,
   * prizeClerk, or reports) under that school, or appear in
   * `appConfig/global.developerUids`. Enforced via the Firestore REST API with
   * the caller's ID token.
   */
  requireSchoolStaff?: boolean;
}

export interface GuardContext {
  uid: string;
  body: Record<string, unknown>;
  schoolId: string | null;
}

/**
 * Verify Authorization Bearer + school staff (or developer allowlist) without reading a JSON body.
 * Use for multipart routes (file upload) after reading `schoolId` from form fields.
 */
export async function verifyBearerSchoolStaff(
  req: NextRequest,
  schoolId: string,
  options: Pick<GuardOptions, 'maxRequests' | 'windowMs'> = {},
): Promise<{ ok: true; uid: string } | { ok: false; response: NextResponse }> {
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const maxRequests = options.maxRequests ?? DEFAULT_MAX_REQUESTS;

  if (!sameOrigin(req)) {
    return { ok: false, response: jsonError(403, 'Cross-origin requests are not allowed.') };
  }

  const authHeader = req.headers.get('authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(authHeader);
  if (!match) {
    return { ok: false, response: jsonError(401, 'Authentication required.') };
  }
  const idToken = match[1]!;

  const verified = await verifyIdToken(idToken);
  if (!verified) {
    return { ok: false, response: jsonError(401, 'Invalid or expired session.') };
  }

  sweepBuckets();
  const userLimit = checkRateLimit(`uid:${verified.uid}`, maxRequests, windowMs);
  if (!userLimit.allowed) {
    const res = jsonError(429, 'Too many requests. Please slow down.');
    res.headers.set('Retry-After', String(userLimit.retryAfterSec));
    return { ok: false, response: res };
  }

  const ipLimit = checkRateLimit(`ip:${getClientIp(req)}`, maxRequests * 3, windowMs);
  if (!ipLimit.allowed) {
    const res = jsonError(429, 'Too many requests from this network.');
    res.headers.set('Retry-After', String(ipLimit.retryAfterSec));
    return { ok: false, response: res };
  }

  const sid = schoolId.trim().toLowerCase();
  if (!sid) {
    return { ok: false, response: jsonError(400, 'schoolId is required.') };
  }

  const staff = await checkSchoolRole(idToken, verified.uid, sid);
  const developer = staff ? false : await checkDeveloperAllowlist(idToken, verified.uid);
  if (!staff && !developer) {
    return {
      ok: false,
      response: jsonError(403, 'You do not have permission to use this feature.'),
    };
  }

  return { ok: true, uid: verified.uid };
}

export async function guardAiRoute(
  req: NextRequest,
  options: GuardOptions = {}
): Promise<Ok<GuardContext> | Err> {
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const maxRequests = options.maxRequests ?? DEFAULT_MAX_REQUESTS;
  const maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;

  if (!sameOrigin(req)) {
    return { ok: false, response: jsonError(403, 'Cross-origin requests are not allowed.') };
  }

  const authHeader = req.headers.get('authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(authHeader);
  if (!match) {
    return { ok: false, response: jsonError(401, 'Authentication required.') };
  }
  const idToken = match[1]!;

  const verified = await verifyIdToken(idToken);
  if (!verified) {
    return { ok: false, response: jsonError(401, 'Invalid or expired session.') };
  }

  sweepBuckets();
  const userLimit = checkRateLimit(
    `uid:${verified.uid}`,
    maxRequests,
    windowMs
  );
  if (!userLimit.allowed) {
    const res = jsonError(429, 'Too many requests. Please slow down.');
    res.headers.set('Retry-After', String(userLimit.retryAfterSec));
    return { ok: false, response: res };
  }

  const ipLimit = checkRateLimit(
    `ip:${getClientIp(req)}`,
    maxRequests * 3,
    windowMs
  );
  if (!ipLimit.allowed) {
    const res = jsonError(429, 'Too many requests from this network.');
    res.headers.set('Retry-After', String(ipLimit.retryAfterSec));
    return { ok: false, response: res };
  }

  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > maxBodyBytes) {
    return { ok: false, response: jsonError(413, 'Request body too large.') };
  }

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return { ok: false, response: jsonError(400, 'Could not read request body.') };
  }

  if (raw.length > maxBodyBytes) {
    return { ok: false, response: jsonError(413, 'Request body too large.') };
  }

  let body: Record<string, unknown>;
  try {
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, response: jsonError(400, 'Invalid JSON body.') };
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return { ok: false, response: jsonError(400, 'Invalid JSON body.') };
  }

  let schoolId: string | null = null;
  if (options.requireSchoolStaff) {
    const raw = body.schoolId;
    if (typeof raw !== 'string' || !raw.trim()) {
      return { ok: false, response: jsonError(400, 'schoolId is required.') };
    }
    schoolId = raw.trim().toLowerCase();

    const staff = await checkSchoolRole(idToken, verified.uid, schoolId);
    const developer = staff ? false : await checkDeveloperAllowlist(idToken, verified.uid);
    if (!staff && !developer) {
      return {
        ok: false,
        response: jsonError(403, 'You do not have permission to use this feature.'),
      };
    }
  }

  return { ok: true, value: { uid: verified.uid, body, schoolId } };
}

/**
 * Developer console AI routes — Bearer token + `appConfig/global.developerUids` only.
 */
export async function guardDeveloperRoute(
  req: NextRequest,
  options: Pick<GuardOptions, 'maxRequests' | 'windowMs' | 'maxBodyBytes'> = {},
): Promise<Ok<{ uid: string; body: Record<string, unknown> }> | Err> {
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const maxRequests = options.maxRequests ?? 6;
  const maxBodyBytes = options.maxBodyBytes ?? 48 * 1024;

  if (!sameOrigin(req)) {
    return { ok: false, response: jsonError(403, 'Cross-origin requests are not allowed.') };
  }

  const authHeader = req.headers.get('authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(authHeader);
  if (!match) {
    return { ok: false, response: jsonError(401, 'Authentication required.') };
  }
  const idToken = match[1]!;

  const verified = await verifyIdToken(idToken);
  if (!verified) {
    return { ok: false, response: jsonError(401, 'Invalid or expired session.') };
  }

  sweepBuckets();
  const userLimit = checkRateLimit(`dev-ai:uid:${verified.uid}`, maxRequests, windowMs);
  if (!userLimit.allowed) {
    const res = jsonError(429, 'Too many requests. Please slow down.');
    res.headers.set('Retry-After', String(userLimit.retryAfterSec));
    return { ok: false, response: res };
  }

  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > maxBodyBytes) {
    return { ok: false, response: jsonError(413, 'Request body too large.') };
  }

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return { ok: false, response: jsonError(400, 'Could not read request body.') };
  }
  if (raw.length > maxBodyBytes) {
    return { ok: false, response: jsonError(413, 'Request body too large.') };
  }

  let body: Record<string, unknown>;
  try {
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, response: jsonError(400, 'Invalid JSON body.') };
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return { ok: false, response: jsonError(400, 'Invalid JSON body.') };
  }

  const developer = await checkDeveloperAllowlist(idToken, verified.uid);
  if (!developer) {
    return { ok: false, response: jsonError(403, 'Developer access is required.') };
  }

  return { ok: true, value: { uid: verified.uid, body } };
}
