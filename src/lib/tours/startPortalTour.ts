import type { Settings } from '@/components/providers/SettingsProvider';

export type PortalTourId = 'admin' | 'teacher' | 'student';

const PORTAL_TOUR_AREA: Record<PortalTourId, string> = {
  admin: 'admin',
  teacher: 'print',
  student: 'redeem',
};

export function portalTourAreaId(tourId: PortalTourId): string {
  return PORTAL_TOUR_AREA[tourId];
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
