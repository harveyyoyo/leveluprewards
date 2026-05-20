'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { signInWithCustomToken } from 'firebase/auth';
import { useAppContext } from '@/components/AppProvider';
import { useFirebase } from '@/firebase';
import { verifyOfficeHandoffMetaClient } from '@/lib/auth/officeHandoffClient';
import { syncFirebaseSessionCookie, syncSchoolGateCookie } from '@/lib/auth/syncFirebaseSessionCookie';

/**
 * Consumes one-time query params from portal → office handoff and restores Firebase + local session.
 */
export function OfficeHandoffBootstrap() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { auth } = useFirebase();
  const { schoolId } = useAppContext();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    if (searchParams?.get('officeHandoff') !== '1') return;

    const metaToken = searchParams.get('meta')?.trim() || '';
    const customToken = searchParams.get('ct')?.trim() || '';
    if (!metaToken || !customToken || !auth) return;

    started.current = true;

    const run = async () => {
      try {
        const meta = await verifyOfficeHandoffMetaClient(metaToken);
        if (!meta) return;

        await signInWithCustomToken(auth, customToken);
        await syncFirebaseSessionCookie(auth);
        if (meta.schoolId) {
          await syncSchoolGateCookie(auth, meta.schoolId);
        }

        localStorage.setItem('loginState', meta.loginState);
        localStorage.setItem('schoolId', meta.schoolId);
        localStorage.setItem('userName', meta.userName);

        const clean = new URL(pathname || '/', window.location.origin);
        clean.searchParams.delete('officeHandoff');
        clean.searchParams.delete('meta');
        clean.searchParams.delete('ct');
        window.location.replace(clean.pathname + (clean.search || ''));
      } catch (e) {
        console.error('[OfficeHandoffBootstrap]', e);
      }
    };

    void run();
  }, [auth, pathname, searchParams, schoolId]);

  return null;
}
