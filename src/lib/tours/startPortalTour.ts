import type { Settings } from '@/components/providers/SettingsProvider';

export type PortalTourId = 'admin' | 'teacher' | 'student';

const PORTAL_TOUR_AREA: Record<PortalTourId, string> = {
  admin: 'admin',
  teacher: 'print',
  student: 'redeem',
};

const PORTAL_AREA_TO_TOUR: Partial<Record<string, PortalTourId>> = {
  admin: 'admin',
  print: 'teacher',
  redeem: 'student',
};

export function portalTourAreaId(tourId: PortalTourId): string {
  return PORTAL_TOUR_AREA[tourId];
}

export function portalTourIdForArea(areaId: string): PortalTourId | undefined {
  return PORTAL_AREA_TO_TOUR[areaId];
}

export function isPortalTourLaunchArea(areaId: string): boolean {
  return areaId in PORTAL_AREA_TO_TOUR;
}

const PORTAL_TOUR_LABEL: Record<PortalTourId, string> = {
  admin: 'Admin Tour',
  teacher: 'Teacher Tour',
  student: 'Student Tour',
};

export function portalTourLabelForArea(areaId: string): string | undefined {
  const tourId = portalTourIdForArea(areaId);
  return tourId ? PORTAL_TOUR_LABEL[tourId] : undefined;
}

export function clearPortalTourProgress(tourId: PortalTourId): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(`arcade_tour_progress_${tourId}`);
}

export function activatePortalTour(
  tourId: PortalTourId,
  updateSettings: (updates: Partial<Settings>) => void,
): void {
  clearPortalTourProgress(tourId);
  updateSettings({ activeTourId: null });
  window.setTimeout(() => {
    updateSettings({ activeTourId: tourId });
  }, 50);
}

export function activateWelcomeTour(
  updateSettings: (updates: Partial<Settings>) => void,
): void {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('arcade_tour_progress_welcome');
  }
  updateSettings({ activeTourId: null });
  window.setTimeout(() => {
    updateSettings({ activeTourId: 'welcome' });
  }, 50);
}
