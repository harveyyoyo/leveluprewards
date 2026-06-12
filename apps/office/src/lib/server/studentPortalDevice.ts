import { randomBytes } from 'crypto';
import type { NextRequest, NextResponse } from 'next/server';

export const STUDENT_PORTAL_DEVICE_COOKIE = 'student_portal_device';

const DEVICE_ID_RE = /^[a-f0-9]{32}$/;

export function generatePortalDeviceId(): string {
  return randomBytes(16).toString('hex');
}

export function readPortalDeviceId(req: NextRequest): string | null {
  const raw = req.cookies.get(STUDENT_PORTAL_DEVICE_COOKIE)?.value?.trim() ?? '';
  return DEVICE_ID_RE.test(raw) ? raw : null;
}

export function cookieFlags() {
  const secure = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true as const,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 400,
  };
}

export function setPortalDeviceCookie(res: NextResponse, deviceId: string) {
  res.cookies.set({
    name: STUDENT_PORTAL_DEVICE_COOKIE,
    value: deviceId,
    ...cookieFlags(),
  });
}

export function clearPortalDeviceCookie(res: NextResponse) {
  res.cookies.set({
    name: STUDENT_PORTAL_DEVICE_COOKIE,
    value: '',
    maxAge: 0,
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
}
