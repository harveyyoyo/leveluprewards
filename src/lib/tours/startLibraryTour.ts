import type { Settings } from '@/components/providers/SettingsProvider';

export function activateLibraryTour(
  updateSettings: (updates: Partial<Settings>) => void,
): void {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('arcade_tour_progress_library');
  }
  updateSettings({ activeTourId: null });
  window.setTimeout(() => {
    updateSettings({ activeTourId: 'library' });
  }, 50);
}
