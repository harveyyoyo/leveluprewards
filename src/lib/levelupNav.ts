// LevelUp pillars: shared rules for deep-linking and teacher tab validation.

export type LevelUpPillarId = 'rewards' | 'attendance' | 'homework' | 'library';

export type TeacherPortalTabContext = {
  enableAttendance: boolean;
  enableHomework: boolean;
  enableGoals: boolean;
  goalsAllowed: boolean;
};

const BASE_TEACHER_TABS = ['coupons', 'award', 'roster', 'prizes', 'redemptions', 'reports'] as const;

/** Returns a valid teacher portal tab, falling back to coupons. */
export function sanitizeTeacherPortalTab(tab: string, ctx: TeacherPortalTabContext): string {
  const allowed = new Set<string>([...BASE_TEACHER_TABS]);
  if (ctx.enableAttendance) allowed.add('attendance');
  if (ctx.enableHomework) allowed.add('homework');
  if (ctx.enableGoals && ctx.goalsAllowed) allowed.add('goals');
  if (allowed.has(tab)) return tab;
  return 'coupons';
}
