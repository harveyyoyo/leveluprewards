'use client';

import { getReadableErrorMessage } from '@/lib/errorMessage';

export function isEmulatorRuntimeConnected(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as { __SCHOOL_ARCADE_FIREBASE_EMULATORS__?: boolean })
    .__SCHOOL_ARCADE_FIREBASE_EMULATORS__;
}

/** Extra context when Cloud Function call fails (often confused with firewall when emulator is wired). */
export function callableToastDescription(error: unknown, fallback: string): string {
  const core = getReadableErrorMessage(error, fallback);
  if (!isEmulatorRuntimeConnected()) {
    return core;
  }
  return `${core} If you intend to hit live Cloud Functions instead, unset NEXT_PUBLIC_FIREBASE_EMULATORS and restart Next. Otherwise keep firebase emulators:start running with Functions enabled.`;
}
