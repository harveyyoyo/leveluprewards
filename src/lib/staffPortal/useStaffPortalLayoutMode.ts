'use client';

import { useCallback, useEffect, useState } from 'react';

export type StaffPortalLayoutMode = 'standard' | 'wide';

const STORAGE_KEY = 'staff-portal-layout-mode';

function readStoredMode(): StaffPortalLayoutMode {
  if (typeof window === 'undefined') return 'wide';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'standard' ? 'standard' : 'wide';
}

export function useStaffPortalLayoutMode() {
  const [mode, setMode] = useState<StaffPortalLayoutMode>('wide');

  useEffect(() => {
    setMode(readStoredMode());
  }, []);

  const setLayoutMode = useCallback((next: StaffPortalLayoutMode) => {
    setMode(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const toggleLayoutMode = useCallback(() => {
    setMode((prev) => {
      const next: StaffPortalLayoutMode = prev === 'wide' ? 'standard' : 'wide';
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, next);
      }
      return next;
    });
  }, []);

  return {
    mode,
    isWide: mode === 'wide',
    setLayoutMode,
    toggleLayoutMode,
  };
}
