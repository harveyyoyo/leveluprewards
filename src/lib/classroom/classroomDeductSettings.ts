import type { Settings } from '@/components/providers/SettingsProvider';

export type ClassroomDeductConfig = {
  enabled: boolean;
  points: number;
  label: string;
  description: string;
};

export function resolveClassroomDeduct(settings: Settings): ClassroomDeductConfig {
  const points = Math.max(0, Math.round(Number(settings.classroomDeductPoints) || 0));
  const enabled = settings.classroomDeductEnabled === true && points > 0;
  const label = settings.classroomDeductLabel?.trim() || 'Deduct';
  const description = settings.classroomDeductDescription?.trim() || 'Point deduction';
  return { enabled, points, label, description };
}
