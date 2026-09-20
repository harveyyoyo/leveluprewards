'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useAppContext } from '@/components/AppProvider';
import { useFirebase } from '@/firebase';
import { canBypassSchoolAdminPasscode, hasGoogleAuthProvider, loginSchoolAdmin } from '@/lib/adminGoogleAccess';
import { refreshGoogleIdToken } from '@/lib/google/googleAuthSession';
import { isPublicSampleSchoolId, SAMPLE_SCHOOL_ACCESS_PASSCODE } from '@/lib/sampleSchools';

type UseAdminGooglePasscodeBypassOptions = {
  schoolId: string | null | undefined;
  /** When false, skips auto-login (e.g. while a passcode dialog is open). Default true. */
  autoLogin?: boolean;
  onSuccess?: () => void;
  onError?: (message: string) => void;
};

/**
 * Google sign-in can open school admin without a passcode when the server confirms allowlist access.
 * Demo schools (the public sample schools) use the same known seeded passcode every time, so they
 * auto-login too instead of asking the visitor to type it in.
 */
export function useAdminGooglePasscodeBypass({
  schoolId,
  autoLogin = true,
  onSuccess,
  onError,
}: UseAdminGooglePasscodeBypassOptions) {
  const { login, isAdmin, isInitialized } = useAppContext();
  const { user, isUserLoading } = useFirebase();
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(false);
  const [googleAutoLoginExhausted, setGoogleAutoLoginExhausted] = useState(false);
  const attemptedRef = useRef(false);

  const isDemoSchool = isPublicSampleSchoolId(schoolId);
  const canBypassAdminPasscode =
    canBypassSchoolAdminPasscode(user) || hasGoogleAuthProvider(user) || isDemoSchool;


  const loginAsAdminViaGoogle = useCallback(async (): Promise<boolean> => {
    const sid = schoolId?.trim().toLowerCase();
    if (!sid || !canBypassAdminPasscode) return false;
    setIsAutoLoggingIn(true);
    try {
      if (isDemoSchool && !canBypassSchoolAdminPasscode(user)) {
        const result = await loginSchoolAdmin(login, user, sid, SAMPLE_SCHOOL_ACCESS_PASSCODE);
        if (result.ok) {
          onSuccess?.();
          return true;
        }
        onError?.(result.message);
        return false;
      }
      // ID token can briefly omit Google identities right after popup/redirect link.
      const maxAttempts = 3;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        await refreshGoogleIdToken(user);
        const result = await loginSchoolAdmin(login, user, sid, '');
        if (result.ok) {
          onSuccess?.();
          return true;
        }
        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
        } else {
          onError?.(result.message);
        }
      }
      return false;
    } finally {
      setIsAutoLoggingIn(false);
    }
  }, [canBypassAdminPasscode, isDemoSchool, login, onError, onSuccess, schoolId, user]);

  useEffect(() => {
    if (!autoLogin || attemptedRef.current) return;
    if (!isInitialized || isUserLoading || isAdmin || !schoolId || !canBypassAdminPasscode) return;
    void loginAsAdminViaGoogle().then((ok) => {
      attemptedRef.current = true;
      if (!ok) setGoogleAutoLoginExhausted(true);
    });
  }, [
    autoLogin,
    canBypassAdminPasscode,
    isAdmin,
    isInitialized,
    isUserLoading,
    loginAsAdminViaGoogle,
    schoolId,
  ]);

  return {
    canBypassAdminPasscode,
    isAutoLoggingIn,
    googleAutoLoginExhausted,
    loginAsAdminViaGoogle,
  };
}
