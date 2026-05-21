import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseAuthJwt } from '@/lib/auth/verifyFirebaseAuthJwt';
import { FIREBASE_SESSION_COOKIE_NAME } from '@/lib/auth/firebaseSessionCookie';
import {
  getAuthGateSecret,
  SCHOOL_GATE_COOKIE_NAME,
} from '@/lib/auth/schoolGateCookie';
import { verifySchoolGateJwt } from '@/lib/auth/verifySchoolGateJwt';
import { canonicalOfficeHost } from '@/lib/officeRouting';
import { canonicalPortalHost } from '@/lib/portalRouting';
import { signOfficeHandoffMeta } from '@/lib/auth/officeHandoff';
import { getFirebaseAdminAuth } from '@/lib/server/firebaseAdminAuth';
import { authCookieFlags } from '@/lib/auth/authCookieOptions';
import { jsonError } from '@/lib/server/apiSecurity';

const SCHOOL_ID_RE = /^[\w-]{1,128}$/;

/** GET: mint office handoff and redirect to office subdomain (portal → office). */
export async function GET(req: NextRequest) {
  const officeHost = canonicalOfficeHost();
  if (!officeHost) {
    return jsonError(503, 'Office subdomain is not configured.');
  }

  const schoolRaw = req.nextUrl.searchParams.get('school')?.trim().toLowerCase() || '';
  if (!SCHOOL_ID_RE.test(schoolRaw)) {
    return jsonError(400, 'Invalid school id.');
  }

  const fbRaw = req.cookies.get(FIREBASE_SESSION_COOKIE_NAME)?.value;
  if (!fbRaw) {
    const handoffPath = `/api/auth/office-handoff/redirect?school=${encodeURIComponent(schoolRaw)}`;
    const portalHost = canonicalPortalHost();
    const scheme = req.nextUrl.protocol || 'https:';
    const loginBase = portalHost
      ? new URL(`${scheme}//${portalHost}/login`)
      : new URL('/login', req.nextUrl.origin);
    loginBase.searchParams.set('school', schoolRaw);
    loginBase.searchParams.set('next', handoffPath);
    return NextResponse.redirect(loginBase);
  }

  const verified = await verifyFirebaseAuthJwt(fbRaw);
  const uid = verified?.sub;
  if (!uid) {
    return jsonError(401, 'Invalid session.');
  }

  const gateSecret = getAuthGateSecret();
  const gateRaw = req.cookies.get(SCHOOL_GATE_COOKIE_NAME)?.value;
  const gate = gateSecret && gateRaw ? await verifySchoolGateJwt(gateRaw, gateSecret) : null;

  const isAdmin =
    gate &&
    gate.uid === uid &&
    gate.schoolId === schoolRaw &&
    (gate.scopes.has('admin') || gate.scopes.has('dev'));
  const isOffice =
    gate &&
    gate.uid === uid &&
    gate.schoolId === schoolRaw &&
    (gate.scopes.has('office') || gate.scopes.has('admin') || gate.scopes.has('dev'));

  if (!isAdmin && !isOffice) {
    return jsonError(403, 'Office access is not enabled for this account.');
  }

  const loginState = isAdmin ? 'admin' : 'office';
  const userName = isAdmin ? 'Admin' : 'Office staff';

  const meta = await signOfficeHandoffMeta({
    uid,
    schoolId: schoolRaw,
    loginState,
    userName,
  });
  if (!meta) {
    return jsonError(503, 'Office handoff is not configured (AUTH_GATE_SIGNING_SECRET).');
  }

  let customToken = '';
  try {
    const auth = await getFirebaseAdminAuth();
    customToken = await auth.createCustomToken(uid);
  } catch (e) {
    console.error('[office-handoff/redirect] createCustomToken failed:', e);
    return jsonError(503, 'Could not start office session.');
  }

  const scheme = officeHost.includes('localhost') ? 'http' : 'https';
  const target = new URL(`${scheme}://${officeHost}/api/auth/office-handoff/complete`);
  target.searchParams.set('school', schoolRaw);
  target.searchParams.set('meta', meta);
  target.searchParams.set('ct', customToken);

  const res = NextResponse.redirect(target);
  const maxAge = 60 * 60 * 24 * 5;
  res.cookies.set({
    name: FIREBASE_SESSION_COOKIE_NAME,
    value: fbRaw,
    maxAge,
    ...authCookieFlags(),
  });
  return res;
}
