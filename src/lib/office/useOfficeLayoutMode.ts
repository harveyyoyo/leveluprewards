'use client';

import { useCallback, useEffect, useState } from 'react';

export type OfficeLayoutMode = 'standard' | 'wide';

const STORAGE_KEY = 'school-office-layout-mode';
const CHANGE_EVENT = 'school-office-layout-mode-change';

function readStoredMode(): OfficeLayoutMode {
  if (typeof window === 'undefined') return 'wide';
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'standard' ? 'standard' : 'wide';
  } catch {
    return 'wide';
  }
}

function storeMode(next: OfficeLayoutMode) {
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Storage can be blocked (private mode); the choice then lasts for this page only.
  }
  // Every user of this hook (page frame, Interface switch) follows the change right away.
  window.dispatchEvent(new CustomEvent<OfficeLayoutMode>(CHANGE_EVENT, { detail: next }));
}

export function useOfficeLayoutMode() {
  const [mode, setMode] = useState<OfficeLayoutMode>('wide');

  useEffect(() => {
    setMode(readStoredMode());
    const onChange = (e: Event) => setMode((e as CustomEvent<OfficeLayoutMode>).detail ?? readStoredMode());
    const onStorage = () => setMode(readStoredMode());
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const setLayoutMode = useCallback((next: OfficeLayoutMode) => {
    setMode(next);
    storeMode(next);
  }, []);

  const toggleLayoutMode = useCallback(() => {
    setLayoutMode(readStoredMode() === 'wide' ? 'standard' : 'wide');
  }, [setLayoutMode]);

  return {
    mode,
    isWide: mode === 'wide',
    setLayoutMode,
    toggleLayoutMode,
  };
}
