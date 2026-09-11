'use client';

import { DisplaysTabLauncher } from '@/components/displays/DisplaysTabLauncher';
import type { Settings } from '@/components/providers/SettingsProvider';

/** Rewards admin tab — launcher only. Full Displays studio lives in /displays-realm. */
export function AdminDisplaysTab({
  schoolId,
}: {
  schoolId: string;
  schoolLogoUrl?: string | null;
  settings?: Settings;
  updateSettings?: (updates: Partial<Settings>) => void;
}) {
  if (!schoolId) return null;
  return <DisplaysTabLauncher schoolId={schoolId} />;
}
