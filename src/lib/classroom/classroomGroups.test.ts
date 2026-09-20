import { describe, expect, it } from 'vitest';
import { assignClassroomGroups, clampClassroomGroupCount, classroomGroupTone } from './classroomGroups';

describe('classroomGroups', () => {
  it('splits students evenly across the chosen number of groups', () => {
    const assigned = assignClassroomGroups(['a', 'b', 'c', 'd', 'e', 'f'], 3, () => 0);
    expect(assigned?.count).toBe(3);
    const counts = [0, 0, 0];
    for (const group of Object.values(assigned!.byStudent)) {
      counts[group - 1] += 1;
    }
    expect(counts).toEqual([2, 2, 2]);
  });

  it('does not make more groups than students', () => {
    const assigned = assignClassroomGroups(['maya', 'leo'], 6, () => 0.2);
    expect(assigned?.count).toBe(2);
    expect(new Set(Object.values(assigned!.byStudent)).size).toBe(2);
  });

  it('keeps group colors high contrast', () => {
    expect(clampClassroomGroupCount(1)).toBe(2);
    expect(clampClassroomGroupCount(9)).toBe(6);
    expect(classroomGroupTone(1).fg).toBe('#ffffff');
    expect(classroomGroupTone(2).bg).not.toBe(classroomGroupTone(1).bg);
  });
});
