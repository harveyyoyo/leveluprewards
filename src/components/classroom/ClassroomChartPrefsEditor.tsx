'use client';

/**
 * Legacy wrapper — award source settings were removed; classroom always uses quick-award categories.
 * Kept so Class Awards settings layout stays stable.
 */
export function ClassroomChartPrefsEditor(_props: {
  schoolId: string;
  scope: string;
  disabled?: boolean;
  rewardsPillarOn?: boolean;
  embedded?: boolean;
}) {
  return null;
}
