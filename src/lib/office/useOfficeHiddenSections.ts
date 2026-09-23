'use client';

import { useCallback, useEffect, useState } from 'react';
import type { OfficeNavId } from '@/lib/office/officeNav';

const STORAGE_KEY = 'school-office-hidden-sections';
const CHANGE_EVENT = 'school-office-hidden-sections-change';

function readHidden(): OfficeNavId[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? (parsed.filter((v) => typeof v === 'string') as OfficeNavId[]) : [];
  } catch {
    return [];
  }
}

/**
 * Per-device list of menu sections this person has chosen to hide (Interface sheet).
 * Hiding only declutters the menu — the page itself stays reachable.
 */
export function useOfficeHiddenSections() {
  const [hidden, setHidden] = useState<OfficeNavId[]>([]);

  useEffect(() => {
    setHidden(readHidden());
    const sync = () => setHidden(readHidden());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const setSectionHidden = useCallback((id: OfficeNavId, hide: boolean) => {
    const current = readHidden();
    const next = hide ? Array.from(new Set([...current, id])) : current.filter((x) => x !== id);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage can be blocked (private mode); the menu just stays as is.
    }
    setHidden(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { hidden, setSectionHidden };
}
