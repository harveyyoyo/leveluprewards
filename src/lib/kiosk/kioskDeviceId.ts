const STORAGE_KEY = 'arcade:kioskDeviceId:v1';

function randomDeviceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `kiosk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Stable per-browser kiosk device id for snapshot uploads. */
export function getOrCreateKioskDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY)?.trim();
    if (existing) return existing;
    const next = randomDeviceId();
    window.localStorage.setItem(STORAGE_KEY, next);
    return next;
  } catch {
    return randomDeviceId();
  }
}
