'use client';

import { DisplaysTabLauncher } from '@/components/displays/DisplaysTabLauncher';
import type { Settings } from '@/components/providers/SettingsProvider';

type AdminDisplaysTabProps = {
  schoolId: string;
  schoolLogoUrl?: string | null;
  settings?: Settings;
  updateSettings?: (updates: Partial<Settings>) => void;
};

/** Admin/teacher tab — launcher only. Full Displays UI lives in /displays-realm (new tab). */
export function AdminDisplaysTab({ schoolId }: AdminDisplaysTabProps) {
  return <DisplaysTabLauncher schoolId={schoolId} />;
}
