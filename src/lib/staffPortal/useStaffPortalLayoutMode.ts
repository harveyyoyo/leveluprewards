'use client';

import { useCallback, useEffect, useState } from 'react';

export type StaffPortalLayoutMode = 'standard' | 'wide';

const STORAGE_KEY = 'staff-portal-layout-mode';
export const STAFF_PORTAL_LAYOUT_CHANGE_EVENT = 'staff-portal-layout-change';

function readStoredMode(): StaffPortalLayoutMode {
  if (typeof window === 'undefined') return 'wide';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'standard' ? 'standard' : 'wide';
}

function writeStoredMode(next: StaffPortalLayoutMode) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, next);
  document.documentElement.dataset.staffPortalLayout = next;
  window.dispatchEvent(new Event(STAFF_PORTAL_LAYOUT_CHANGE_EVENT));
}

export function useStaffPortalLayoutMode() {
  const [mode, setMode] = useState<StaffPortalLayoutMode>('wide');

  useEffect(() => {
    const stored = readStoredMode();
    setMode(stored);
    document.documentElement.dataset.staffPortalLayout = stored;
  }, []);

  useEffect(() => {
    const sync = () => setMode(readStoredMode());
    window.addEventListener(STAFF_PORTAL_LAYOUT_CHANGE_EVENT, sync);
    return () => window.removeEventListener(STAFF_PORTAL_LAYOUT_CHANGE_EVENT, sync);
  }, []);

  const setLayoutMode = useCallback((next: StaffPortalLayoutMode) => {
    setMode(next);
    writeStoredMode(next);
  }, []);

  const toggleLayoutMode = useCallback(() => {
    setMode((prev) => {
      const next: StaffPortalLayoutMode = prev === 'wide' ? 'standard' : 'wide';
      writeStoredMode(next);
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
