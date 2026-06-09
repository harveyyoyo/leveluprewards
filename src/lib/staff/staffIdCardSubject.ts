import type { StaffAccount, StaffAccountRole, Teacher } from '@/lib/types';
import { leadershipPersonnelLabel, normalizeTeacherPersonnelRole } from '@/lib/teacherPersonnelRole';
import { prizeCardColorForId } from '@/lib/prizes/prizeCardColor';

export type StaffIdCardSubject =
  | { kind: 'teacher'; teacher: Teacher }
  | { kind: 'staffAccount'; account: StaffAccount };

function deskStaffRoleLabel(role: StaffAccountRole): string {
  if (role === 'secretary') return 'Coupon printing';
  if (role === 'prizeClerk') return 'Prize desk';
  if (role === 'librarian') return 'Library only';
  if (role === 'office') return 'School Office';
  if (role === 'houseCoordinator') return 'Houses only';
  return 'Reports';
}

export function staffIdCardKey(subject: StaffIdCardSubject): string {
  return subject.kind === 'teacher' ? `teacher:${subject.teacher.id}` : `staff:${subject.account.id}`;
}

export function staffIdCardDisplayName(subject: StaffIdCardSubject): string {
  return subject.kind === 'teacher' ? subject.teacher.name : subject.account.displayName;
}

export function staffIdCardRoleLabel(subject: StaffIdCardSubject): string {
  if (subject.kind === 'teacher') {
    return leadershipPersonnelLabel(normalizeTeacherPersonnelRole(subject.teacher.personnelRole));
  }
  const roles = subject.account.roles?.length ? subject.account.roles : [subject.account.role];
  return roles.map(deskStaffRoleLabel).join(' · ');
}

/** Stable scan value for staff badges (prefixed so it does not collide with student NFC ids). */
export function staffIdCardScanCode(subject: StaffIdCardSubject): string {
  if (subject.kind === 'teacher') return `STF-${subject.teacher.id}`;
  return `STF-${subject.account.id}`;
}

export function staffIdCardAccentColor(subject: StaffIdCardSubject): string {
  const id = subject.kind === 'teacher' ? subject.teacher.id : subject.account.id;
  return prizeCardColorForId(id);
}

export function staffIdCardInitials(subject: StaffIdCardSubject): string {
  const name = staffIdCardDisplayName(subject).trim();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) || 'ST').toUpperCase();
}

export function teachersToStaffIdSubjects(teachers: Teacher[]): StaffIdCardSubject[] {
  return teachers.map((teacher) => ({ kind: 'teacher', teacher }));
}

export function staffAccountsToStaffIdSubjects(accounts: StaffAccount[]): StaffIdCardSubject[] {
  return accounts.map((account) => ({ kind: 'staffAccount', account }));
}

export function allStaffIdCardSubjects(
  teachers: Teacher[] | null | undefined,
  staffAccounts: StaffAccount[] | null | undefined,
): StaffIdCardSubject[] {
  return [
    ...teachersToStaffIdSubjects(teachers ?? []),
    ...staffAccountsToStaffIdSubjects(staffAccounts ?? []),
  ];
}
