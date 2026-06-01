import { describe, expect, it } from 'vitest';
import { buildBalancedDemoRoster, seededInt } from './demoSampleRosterBuilder';

const CLASSES = [
  { id: 'yc1', name: 'Shiur Aleph' },
  { id: 'yc2', name: 'Shiur Bet' },
] as const;

describe('buildBalancedDemoRoster', () => {
  it('assigns 20-25 students per class deterministically', () => {
    const students = buildBalancedDemoRoster({
      classes: CLASSES,
      minStudentsPerClass: 20,
      maxStudentsPerClass: 25,
      firstNames: ['Avi', 'Moshe'],
      lastNames: ['Cohen', 'Levi'],
    });

    const counts = Object.fromEntries(CLASSES.map((c) => [c.id, 0]));
    for (const s of students) {
      const classId = s.classId;
      if (!classId) continue;
      counts[classId] = (counts[classId] ?? 0) + 1;
    }

    for (const cls of CLASSES) {
      const n = counts[cls.id] ?? 0;
      expect(n).toBeGreaterThanOrEqual(20);
      expect(n).toBeLessThanOrEqual(25);
    }

    const again = buildBalancedDemoRoster({
      classes: CLASSES,
      minStudentsPerClass: 20,
      maxStudentsPerClass: 25,
      firstNames: ['Avi', 'Moshe'],
      lastNames: ['Cohen', 'Levi'],
    });
    expect(again).toEqual(students);
  });

  it('seededInt stays within bounds', () => {
    for (let i = 0; i < 50; i += 1) {
      const v = seededInt(i, 20, 25);
      expect(v).toBeGreaterThanOrEqual(20);
      expect(v).toBeLessThanOrEqual(25);
    }
  });
});
