'use client';

import { useCallback, useEffect, useState } from 'react';

export type OfficeLayoutMode = 'standard' | 'wide';

const STORAGE_KEY = 'school-office-layout-mode';

function readStoredMode(): OfficeLayoutMode {
  if (typeof window === 'undefined') return 'standard';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'wide' ? 'wide' : 'standard';
}

export function useOfficeLayoutMode() {
  const [mode, setMode] = useState<OfficeLayoutMode>('standard');

  useEffect(() => {
    setMode(readStoredMode());
  }, []);

  const setLayoutMode = useCallback((next: OfficeLayoutMode) => {
    setMode(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const toggleLayoutMode = useCallback(() => {
    setMode((prev) => {
      const next: OfficeLayoutMode = prev === 'wide' ? 'standard' : 'wide';
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
