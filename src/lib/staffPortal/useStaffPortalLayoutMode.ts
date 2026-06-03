'use client';

import { useCallback, useSyncExternalStore } from 'react';

export type StaffPortalLayoutMode = 'standard' | 'wide';

const STORAGE_KEY = 'staff-portal-layout-mode';

/** @deprecated Use `useStaffPortalLayoutMode()`; kept for any external listeners. */
export const STAFF_PORTAL_LAYOUT_CHANGE_EVENT = 'staff-portal-layout-change';

type Listener = () => void;
const listeners = new Set<Listener>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(STAFF_PORTAL_LAYOUT_CHANGE_EVENT));
  }
}

function readStoredMode(): StaffPortalLayoutMode {
  if (typeof window === 'undefined') return 'standard';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'wide' ? 'wide' : 'standard';
}

function writeStoredMode(next: StaffPortalLayoutMode) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, next);
  document.documentElement.dataset.staffPortalLayout = next;
  emitChange();
}

function subscribe(callback: Listener) {
  listeners.add(callback);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) callback();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', onStorage);
  };
}

function getSnapshot(): StaffPortalLayoutMode {
  return readStoredMode();
}

function getServerSnapshot(): StaffPortalLayoutMode {
  return 'standard';
}

/** Shared staff-portal layout preference (standard centered vs wide full width). */
export function useStaffPortalLayoutMode() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isWide = mode === 'wide';

  const setLayoutMode = useCallback((next: StaffPortalLayoutMode) => {
    writeStoredMode(next);
  }, []);

  const toggleLayoutMode = useCallback(() => {
    writeStoredMode(isWide ? 'standard' : 'wide');
  }, [isWide]);

  return {
    mode,
    isWide,
    setLayoutMode,
    toggleLayoutMode,
  };
}
