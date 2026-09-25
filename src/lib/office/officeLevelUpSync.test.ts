import { describe, expect, it } from 'vitest';
import { planStudentSync, type SyncLevelUpStudent, type SyncOfficeStudent } from '@/lib/office/officeLevelUpSync';

const officeClasses = [{ id: 'oc5', name: 'Grade 5' }];
const levelUpClasses = [{ id: 'lc5', name: 'grade 5 ' }];

const o = (over: Partial<SyncOfficeStudent> & { id: string }): SyncOfficeStudent => ({
  firstName: 'Ann',
  lastName: 'Lee',
  classId: 'oc5',
  updatedAt: 10,
  ...over,
});
const l = (over: Partial<SyncLevelUpStudent> & { id: string }): SyncLevelUpStudent => ({
  firstName: 'Ann',
  lastName: 'Lee',
  classId: 'lc5',
  updatedAt: 10,
  ...over,
});

const plan = (mode: Parameters<typeof planStudentSync>[0]['mode'], officeStudents: SyncOfficeStudent[], levelUpStudents: SyncLevelUpStudent[]) =>
  planStudentSync({ mode, officeStudents, levelUpStudents, officeClasses, levelUpClasses });

describe('planStudentSync', () => {
  it('links students already in both apps by name, and translates the class by name', () => {
    const p = plan('toLevelUp', [o({ id: 'o1' })], [l({ id: 'l1', firstName: ' ann ' })]);
    expect(p.links).toEqual([{ officeId: 'o1', levelUpId: 'l1' }]);
    expect(p.createInLevelUp).toEqual([]);
    // The name spacing differs only in case/space for matching, but the office spelling wins.
    expect(p.updateLevelUp).toEqual([{ levelUpId: 'l1', fields: { firstName: 'Ann', lastName: 'Lee', nickname: null, classId: 'lc5' } }]);
  });

  it('does not guess when a name appears twice', () => {
    const p = plan('toLevelUp', [o({ id: 'o1' }), o({ id: 'o2' })], [l({ id: 'l1' })]);
    expect(p.links).toEqual([]);
    expect(p.createInLevelUp.map((c) => c.officeId)).toEqual(['o1', 'o2']);
  });

  it('only copies in the chosen direction', () => {
    const office = [o({ id: 'o1', firstName: 'Bo' })];
    const levelUp = [l({ id: 'l1', firstName: 'Cy' })];
    expect(plan('toLevelUp', office, levelUp).createInOffice).toEqual([]);
    expect(plan('toLevelUp', office, levelUp).createInLevelUp).toHaveLength(1);
    expect(plan('fromLevelUp', office, levelUp).createInLevelUp).toEqual([]);
    expect(plan('fromLevelUp', office, levelUp).createInOffice).toHaveLength(1);
    const both = plan('both', office, levelUp);
    expect([both.createInLevelUp.length, both.createInOffice.length]).toEqual([1, 1]);
    expect(plan('off', office, levelUp)).toEqual({ links: [], createInLevelUp: [], createInOffice: [], updateLevelUp: [], updateOffice: [] });
  });

  it('both ways: the newer change wins', () => {
    const office = [o({ id: 'o1', levelUpId: 'l1', nickname: 'Annie', updatedAt: 20 })];
    const levelUp = [l({ id: 'l1', officeId: 'o1', nickname: 'A', updatedAt: 30 })];
    const p = plan('both', office, levelUp);
    expect(p.updateLevelUp).toEqual([]);
    expect(p.updateOffice).toEqual([{ officeId: 'o1', fields: { firstName: 'Ann', lastName: 'Lee', nickname: 'A', classId: 'oc5' } }]);
  });

  it('never brings back a student removed on the other side, and skips withdrawn or removed office students', () => {
    const p = plan(
      'toLevelUp',
      [o({ id: 'o1', levelUpId: 'gone' }), o({ id: 'o2', firstName: 'W', status: 'withdrawn' }), o({ id: 'o3', firstName: 'X', archived: true })],
      [],
    );
    expect(p.createInLevelUp).toEqual([]);
  });

  it('keeps the other side’s class when the source class has no match there', () => {
    const p = plan('toLevelUp', [o({ id: 'o1', levelUpId: 'l1', classId: 'unmatched', nickname: 'Z' })], [l({ id: 'l1', officeId: 'o1' })]);
    expect(p.updateLevelUp[0]?.fields.classId).toBe('lc5');
  });

  it('writes nothing when everything already matches', () => {
    const p = plan('both', [o({ id: 'o1', levelUpId: 'l1' })], [l({ id: 'l1', officeId: 'o1' })]);
    expect(p).toEqual({ links: [], createInLevelUp: [], createInOffice: [], updateLevelUp: [], updateOffice: [] });
  });
});
