'use client';

import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase';
import { authFetch } from '@/lib/authFetch';
import { isAllowedDeveloperGoogleUser } from '@/lib/developerAccess';

/** Demo school id → key. */
export type DemoShareKeys = Partial<Record<string, string>>;

/** Fetched once per page load for the owner; the keys never change unless the secret does. */
let cachedKeys: { uid: string; keys: DemoShareKeys } | null = null;

/**
 * Keys for the owner's no-passcode demo links. Only requested while the owner's Google account
 * is signed in (the server refuses everyone else too).
 */
export function useDemoShareKeys(enabled = true): { keys: DemoShareKeys | null; error: string | null } {
  const { auth, user } = useFirebase();
  const uid = user && enabled && isAllowedDeveloperGoogleUser(user) ? user.uid : '';
  const [keys, setKeys] = useState<DemoShareKeys | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    if (!uid) {
      setKeys(null);
      return;
    }
    if (cachedKeys?.uid === uid) {
      setKeys(cachedKeys.keys);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await authFetch(auth, '/api/developer/demo-share-keys');
        const data = (await res.json().catch(() => ({}))) as { keys?: DemoShareKeys; error?: string };
        if (cancelled) return;
        if (!res.ok || !data.keys) {
          setError(data.error || 'Could not get your share links. Refresh the page and try again.');
          return;
        }
        cachedKeys = { uid, keys: data.keys };
        setKeys(data.keys);
      } catch {
        if (!cancelled) setError('Could not get your share links. Check your connection and try again.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth, uid]);

  return { keys, error };
}
