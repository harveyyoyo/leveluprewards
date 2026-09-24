import type { RecessReason } from '@/lib/types';

export type RecessKioskSettings = {
  enableRecess?: boolean;
  /** When on, signed-in students see a checkout card on the rewards kiosk. */
  recessStudentKioskEnabled?: boolean;
  /** Minutes before a trip is flagged as over limit (kiosk + admin). Used for any pass without its own limit. */
  recessMaxMinutes?: number;
  /** Per-pass limits (e.g. Water 3, Nurse 20). A missing pass uses `recessMaxMinutes`. */
  recessMaxMinutesByReason?: Partial<Record<RecessReason, number>>;
};

/**
 * A room-pass time limit: one number for every pass, or a lookup by pass type.
 * Lets code that only knows "the limit" keep working while each pass can differ.
 */
export type RecessLimit = number | ((reason?: RecessReason | null) => number);

export function isRecessFeatureEnabled(settings: RecessKioskSettings): boolean {
  return settings.enableRecess !== false;
}

export function isRecessStudentKioskEnabled(settings: RecessKioskSettings): boolean {
  if (!isRecessFeatureEnabled(settings)) return false;
  return settings.recessStudentKioskEnabled !== false;
}

function validMinutes(raw: unknown): number | null {
  return typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? Math.round(raw) : null;
}

/** Limit in minutes for one pass type, or the school-wide limit when no type is given. */
export function resolveRecessMaxMinutes(settings: RecessKioskSettings, reason?: RecessReason | null): number {
  if (reason) {
    const own = validMinutes(settings.recessMaxMinutesByReason?.[reason]);
    if (own != null) return own;
  }
  return validMinutes(settings.recessMaxMinutes) ?? 10;
}

/** True when this pass type has its own limit (not just the school-wide one). */
export function recessReasonHasOwnLimit(settings: RecessKioskSettings, reason: RecessReason): boolean {
  return validMinutes(settings.recessMaxMinutesByReason?.[reason]) != null;
}

/** Lookup to hand to trip timers and check-in code: minutes for whichever pass the student took. */
export function recessLimitFor(settings: RecessKioskSettings): (reason?: RecessReason | null) => number {
  return (reason) => resolveRecessMaxMinutes(settings, reason);
}

export function recessLimitMinutes(limit: RecessLimit, reason?: RecessReason | null): number {
  return typeof limit === 'function' ? limit(reason) : limit;
}
