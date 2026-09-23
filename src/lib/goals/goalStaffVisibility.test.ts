import { describe, expect, it } from 'vitest';
import type { Goal } from '@/lib/types';
import { canManageGoal, canSeeStaffGoal } from './goalStaffVisibility';

const base: Goal = { id: 'goal', title: 'School target', type: 'school', targetPoints: 100, status: 'active', createdAt: 1, assignedByStaffId: 'teacher:one', assignedByName: 'Teacher One', staffVisibility: 'creator' };
const teacher = { staffId: 'teacher:one', teacherId: 'one', isAdmin: false };
const other = { staffId: 'teacher:two', teacherId: 'two', isAdmin: false };
const admin = { staffId: 'admin:one', isAdmin: true };
const office = { staffId: 'staff:one', isAdmin: false, seeAll: true };

describe('staff goal lists', () => {
  it('shows an unshared goal to its assigner and admins, not to other teachers', () => {
    expect(canSeeStaffGoal(base, teacher)).toBe(true);
    expect(canSeeStaffGoal(base, other)).toBe(false);
    expect(canSeeStaffGoal(base, admin)).toBe(true);
  });
  it('lets admins manage any goal', () => {
    expect(canManageGoal(base, admin)).toBe(true);
    expect(canManageGoal({ ...base, assignedByStaffId: 'admin:two' }, admin)).toBe(true);
  });
  it('lets office staff see every goal without managing other people’s goals', () => {
    expect(canSeeStaffGoal(base, office)).toBe(true);
    expect(canManageGoal(base, office)).toBe(false);
  });
  it('shares a goal for viewing while keeping its assigner in charge', () => {
    const shared = { ...base, staffVisibility: 'all' as const };
    expect(canSeeStaffGoal(shared, other)).toBe(true);
    expect(canManageGoal(shared, other)).toBe(false);
    expect(canManageGoal(shared, teacher)).toBe(true);
  });
  it('recognizes legacy teacher ownership without claiming ownerless goals', () => {
    const legacy = { ...base, assignedByStaffId: undefined, teacherId: 'one' };
    expect(canSeeStaffGoal(legacy, teacher)).toBe(true);
    expect(canSeeStaffGoal(legacy, other)).toBe(false);
    const unknown = { ...legacy, teacherId: undefined };
    expect(canSeeStaffGoal(unknown, teacher)).toBe(false);
    expect(canSeeStaffGoal(unknown, admin)).toBe(true);
    expect(canManageGoal(unknown, admin)).toBe(true);
  });
  it('shares a goal with specific staff members while hiding from others', () => {
    const specific = { ...base, staffVisibility: 'specific' as const, sharedStaffIds: ['two'] };
    const third = { staffId: 'teacher:three', teacherId: 'three', isAdmin: false };
    expect(canSeeStaffGoal(specific, other)).toBe(true);
    expect(canManageGoal(specific, other)).toBe(false);
    expect(canSeeStaffGoal(specific, third)).toBe(false);
    expect(canSeeStaffGoal(specific, teacher)).toBe(true);
    expect(canManageGoal(specific, teacher)).toBe(true);
    expect(canSeeStaffGoal(specific, admin)).toBe(true);
    expect(canSeeStaffGoal(specific, office)).toBe(true);
  });
  it('recognizes staffId with teacher prefix in sharedStaffIds', () => {
    const specific = { ...base, staffVisibility: 'specific' as const, sharedStaffIds: ['teacher:two'] };
    expect(canSeeStaffGoal(specific, other)).toBe(true);
  });
});
