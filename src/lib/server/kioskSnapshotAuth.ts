import { NextRequest } from 'next/server';
import { firebaseConfig } from '@/firebase/config';

const TOKEN_CACHE_MS = 60_000;
const tokenCache = new Map<string, { uid: string; expiresAt: number }>();
const ROLE_CACHE_MS = 60_000;
const roleCache = new Map<string, { allowed: boolean; expiresAt: number }>();
const developerUidCache = new Map<string, { allowed: boolean; expiresAt: number }>();

export async function verifyIdToken(idToken: string): Promise<{ uid: string } | null> {
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
      },
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

export function sameOriginCheck(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const forwardedHost = req.headers.get('x-fh-requested-host') || req.headers.get('x-forwarded-host');
  const host = forwardedHost || req.headers.get('host');
  if (!host) return false;

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

export async function checkSchoolRole(
  idToken: string,
  uid: string,
  schoolId: string,
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
    const results = await Promise.all(
      urls.map((url) =>
        fetch(url, {
          headers: { Authorization: `Bearer ${idToken}` },
          cache: 'no-store',
        }).then(async (r) => (r.ok ? ((await r.json()) as unknown) : null)),
      ),
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

export async function checkDeveloperAllowlist(idToken: string, uid: string): Promise<boolean> {
  const cached = developerUidCache.get(uid);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.allowed;
  }

  const projectId = firebaseConfig.projectId;
  if (!projectId) return false;

  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId,
  )}/databases/(default)/documents/appConfig/developerAllowlist`;

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
        uids?: {
          arrayValue?: { values?: Array<{ stringValue?: string }> };
        };
      };
    };
    const values = body.fields?.uids?.arrayValue?.values;
    if (Array.isArray(values)) {
      allowed = values.some((v) => v?.stringValue === uid);
    }
  } catch {
    allowed = false;
  }

  developerUidCache.set(uid, { allowed, expiresAt: Date.now() + ROLE_CACHE_MS });
  return allowed;
}
