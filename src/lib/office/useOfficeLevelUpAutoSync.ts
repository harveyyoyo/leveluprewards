'use client';

import { useEffect, useRef } from 'react';
import { useAuthFetch } from '@/lib/authFetch';
import type { OfficeLevelUpSyncSettings } from '@/lib/office/officeLevelUpSync';

type AuthFetch = ReturnType<typeof useAuthFetch>;

/** Brings everything that's shared with levelUp up to date. Returns what changed, or null. */
export async function runOfficeLevelUpSync(
  authFetch: AuthFetch,
  schoolId: string,
): Promise<{ ran: boolean; lines?: string[] } | null> {
  try {
    const res = await authFetch('/api/office/levelup-sync', {
      method: 'POST',
      body: JSON.stringify({ schoolId, action: 'run' }),
    });
    if (!res.ok) return null;
    return (await res.json()) as { ran: boolean; lines?: string[] };
  } catch {
    return null;
  }
}

/** While the Office is open, catch up this often (picks up changes made in levelUp). */
const EVERY_MS = 5 * 60_000;
/** After the Office's own records change, wait this long so a burst of edits is one run. */
const AFTER_CHANGE_MS = 4_000;

/**
 * Page frame: keeps what's shared with levelUp up to date while the Office is open — when it
 * opens, shortly after its students change, and every few minutes (for changes made in levelUp).
 */
export function useOfficeLevelUpAutoSync(
  schoolId: string | null,
  sync: OfficeLevelUpSyncSettings | null | undefined,
  /** Changes whenever the Office's own students change (e.g. the loaded list). */
  officeChangeKey: unknown,
) {
  const authFetch = useAuthFetch();
  const enabled = !!schoolId && Object.values(sync ?? {}).some((mode) => mode && mode !== 'off');
  const firstChange = useRef(true);

  useEffect(() => {
    if (!enabled || !schoolId) return;
    void runOfficeLevelUpSync(authFetch, schoolId);
    const timer = window.setInterval(() => void runOfficeLevelUpSync(authFetch, schoolId), EVERY_MS);
    return () => window.clearInterval(timer);
  }, [enabled, schoolId, authFetch]);

  useEffect(() => {
    if (!enabled || !schoolId) return;
    // The first list is just the page loading; the run above already covers it.
    if (firstChange.current) {
      firstChange.current = false;
      return;
    }
    const timer = window.setTimeout(() => void runOfficeLevelUpSync(authFetch, schoolId), AFTER_CHANGE_MS);
    return () => window.clearTimeout(timer);
  }, [officeChangeKey, enabled, schoolId, authFetch]);
}
