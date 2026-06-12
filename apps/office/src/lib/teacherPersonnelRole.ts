import type { Teacher, TeacherPersonnelRole } from '@/lib/types';

export function normalizeTeacherPersonnelRole(
  role: TeacherPersonnelRole | string | null | undefined,
): TeacherPersonnelRole {
  if (role === 'principal' || role === 'divisionHead') return role;
  return 'teacher';
}

export function isLeadershipPersonnel(
  teacher: Pick<Teacher, 'personnelRole'> | null | undefined,
): boolean {
  if (!teacher) return false;
  const role = normalizeTeacherPersonnelRole(teacher.personnelRole);
  return role === 'principal' || role === 'divisionHead';
}

export function leadershipPersonnelLabel(role: TeacherPersonnelRole): string {
  if (role === 'principal') return 'Principal';
  if (role === 'divisionHead') return 'Division head';
  return 'Teacher';
}

export function staffPortalPersonnelLabel(
  option: Pick<Teacher, 'personnelRole'> & { type?: string },
): string {
  if (option.type && option.type !== 'teacher') return option.type;
  return leadershipPersonnelLabel(normalizeTeacherPersonnelRole(option.personnelRole));
}
