import { describe, expect, it } from 'vitest';
import { buildRafflePool } from '@/lib/rafflePool';
import type { Student } from '@/lib/types';

const baseStudent = (id: string, points: number): Student =>
  ({
    id,
    firstName: id,
    lastName: 'Test',
    points,
    classroomPoints: 0,
  }) as Student;

describe('buildRafflePool', () => {
  const settings = {
    payRewards: true,
    rafflePointsPerTicket: 25,
  };

  it('excludes manually removed students', () => {
    const rows = buildRafflePool({
      students: [baseStudent('a', 50), baseStudent('b', 50)],
      settings,
      rafflePointsPerTicket: 25,
      raffleOneEntryPerStudent: false,
      poolScope: 'eligible',
      manualExcludeIds: new Set(['a']),
    });
    expect(rows.map((r) => r.id)).toEqual(['a', 'b'].filter((id) => id !== 'a'));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe('b');
  });

  it('includes manually added students below ticket threshold', () => {
    const rows = buildRafflePool({
      students: [baseStudent('a', 5), baseStudent('b', 50)],
      settings,
      rafflePointsPerTicket: 25,
      raffleOneEntryPerStudent: false,
      poolScope: 'eligible',
      manualIncludeIds: new Set(['a']),
    });
    expect(rows.map((r) => r.id).sort()).toEqual(['a', 'b']);
    const manual = rows.find((r) => r.id === 'a');
    expect(manual?.manualInclude).toBe(true);
    expect(manual?.tickets).toBe(1);
  });

  it('filters to on-time today when scope is onTimeToday', () => {
    const rows = buildRafflePool({
      students: [baseStudent('a', 50), baseStudent('b', 50)],
      settings,
      rafflePointsPerTicket: 25,
      raffleOneEntryPerStudent: false,
      poolScope: 'onTimeToday',
      onTimeTodayIds: new Set(['b']),
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe('b');
  });
});
