'use client';

import { useCallback, useEffect, useState } from 'react';
import type { OfficeNavId } from '@/lib/office/officeNav';

const STORAGE_KEY = 'school-office-page-tips-seen';
const CHANGE_EVENT = 'school-office-page-tips-change';

function readSeen(): OfficeNavId[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? (parsed.filter((v) => typeof v === 'string') as OfficeNavId[]) : [];
  } catch {
    return [];
  }
}

function writeSeen(next: OfficeNavId[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can be blocked (private mode); tips then show again next visit.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Which one-line page tips this person has dismissed on this device ("Got it"). */
export function useOfficePageTips() {
  // Start as "all seen" so a tip never flashes before stored choices are read.
  const [seen, setSeen] = useState<OfficeNavId[] | null>(null);

  useEffect(() => {
    setSeen(readSeen());
    const sync = () => setSeen(readSeen());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const dismiss = useCallback((id: OfficeNavId) => {
    const next = Array.from(new Set([...readSeen(), id]));
    setSeen(next);
    writeSeen(next);
  }, []);

  const showAllAgain = useCallback(() => {
    setSeen([]);
    writeSeen([]);
  }, []);

  return {
    isTipVisible: (id: OfficeNavId) => seen !== null && !seen.includes(id),
    dismiss,
    showAllAgain,
  };
}
