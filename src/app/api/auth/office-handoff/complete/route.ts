import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { resolveSchoolGateScopes } from '@/lib/server/resolveSchoolGateScopes';
import {
  getAuthGateSecret,
  SCHOOL_GATE_COOKIE_NAME,
  SCHOOL_GATE_JWT_ISS,
} from '@/lib/auth/schoolGateCookie';
import { authCookieFlags } from '@/lib/auth/authCookieOptions';
import { verifyOfficeHandoffMeta } from '@/lib/auth/officeHandoff';
import { jsonError } from '@/lib/server/apiSecurity';

const SCHOOL_ID_RE = /^[\w-]{1,128}$/;

/** GET: finish office handoff on office subdomain; set gate cookie and send user to workspace. */
export async function GET(req: NextRequest) {
  const schoolRaw = req.nextUrl.searchParams.get('school')?.trim().toLowerCase() || '';
  const metaToken = req.nextUrl.searchParams.get('meta')?.trim() || '';
  const customToken = req.nextUrl.searchParams.get('ct')?.trim() || '';

  if (!SCHOOL_ID_RE.test(schoolRaw) || !metaToken || !customToken) {
    return jsonError(400, 'Invalid handoff.');
  }

  const meta = await verifyOfficeHandoffMeta(metaToken);
  if (!meta || meta.schoolId !== schoolRaw) {
    return jsonError(403, 'Handoff expired or invalid.');
  }

  const secret = getAuthGateSecret();
  const target = new URL(`/${schoolRaw}`, req.nextUrl.origin);
  target.searchParams.set('officeHandoff', '1');
  target.searchParams.set('meta', metaToken);
  target.searchParams.set('ct', customToken);

  const res = NextResponse.redirect(target);

  if (secret) {
    try {
      const scopesArr = await resolveSchoolGateScopes(meta.uid, schoolRaw);
      if (scopesArr.length > 0) {
        const gateJwt = await new SignJWT({
          v: 1,
          sch: schoolRaw,
          uid: meta.uid,
          scp: scopesArr,
        })
          .setProtectedHeader({ alg: 'HS256' })
          .setIssuer(SCHOOL_GATE_JWT_ISS)
          .setIssuedAt()
          .setExpirationTime('12h')
          .sign(secret);

        res.cookies.set({
          name: SCHOOL_GATE_COOKIE_NAME,
          value: gateJwt,
          maxAge: 60 * 60 * 12,
          ...authCookieFlags(),
        });
      }
    } catch (e) {
      console.error('[office-handoff/complete] school gate cookie failed:', e);
    }
  }

  return res;
}
