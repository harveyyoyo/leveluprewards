'use client';

export type KioskLoginTabId = 'nfc' | 'manual' | 'camera' | 'face';

const STORAGE_PREFIX = 'levelup:kiosk-login-tab:';

export function kioskLoginTabStorageKey(schoolId: string): string {
  return `${STORAGE_PREFIX}${schoolId.trim().toLowerCase()}`;
}

export function readKioskLoginTab(schoolId: string | undefined | null): KioskLoginTabId | null {
  if (!schoolId?.trim() || typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(kioskLoginTabStorageKey(schoolId));
    if (raw === 'nfc' || raw === 'manual' || raw === 'camera' || raw === 'face') return raw;
    return null;
  } catch {
    return null;
  }
}

export function persistKioskLoginTab(schoolId: string | undefined | null, tab: string): void {
  if (!schoolId?.trim() || typeof sessionStorage === 'undefined') return;
  if (tab !== 'nfc' && tab !== 'manual' && tab !== 'camera' && tab !== 'face') return;
  try {
    sessionStorage.setItem(kioskLoginTabStorageKey(schoolId), tab);
  } catch {
    // private mode / quota
  }
}

export function resolveKioskLoginTab(
  schoolId: string | undefined | null,
  availableTabs: string[],
  fallback: KioskLoginTabId = 'nfc',
): KioskLoginTabId {
  const stored = readKioskLoginTab(schoolId);
  if (stored && availableTabs.includes(stored)) return stored;
  const first = availableTabs[0];
  if (first === 'nfc' || first === 'manual' || first === 'camera' || first === 'face') return first;
  return fallback;
}

/** Drop a saved Scan-tab preference (e.g. kiosk switched back to Card). */
export function clearKioskCameraLoginTabPref(schoolId: string | undefined | null): void {
  if (!schoolId?.trim() || typeof sessionStorage === 'undefined') return;
  try {
    if (readKioskLoginTab(schoolId) === 'camera') {
      sessionStorage.removeItem(kioskLoginTabStorageKey(schoolId));
    }
  } catch {
    // ignore
  }
}
