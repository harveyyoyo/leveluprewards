export type RecessKioskSettings = {
  enableRecess?: boolean;
  /** When on, signed-in students see a checkout card on the rewards kiosk. */
  recessStudentKioskEnabled?: boolean;
  /** Minutes before a trip is flagged as over limit (kiosk + admin). */
  recessMaxMinutes?: number;
};

export function isRecessFeatureEnabled(settings: RecessKioskSettings): boolean {
  return settings.enableRecess !== false;
}

export function isRecessStudentKioskEnabled(settings: RecessKioskSettings): boolean {
  if (!isRecessFeatureEnabled(settings)) return false;
  return settings.recessStudentKioskEnabled !== false;
}

export function resolveRecessMaxMinutes(settings: RecessKioskSettings): number {
  const raw = settings.recessMaxMinutes;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return Math.round(raw);
  return 10;
}
