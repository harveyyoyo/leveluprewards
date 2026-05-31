import { NextResponse } from 'next/server';
import { authCookieFlags } from '@/lib/auth/authCookieOptions';
import { PARENT_PORTAL_COOKIE_NAME } from '@/lib/parentPortal/parentPortalSession';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PARENT_PORTAL_COOKIE_NAME, '', { ...authCookieFlags(), maxAge: 0 });
  return res;
}
