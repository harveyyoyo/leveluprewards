import { describe, expect, it } from 'vitest';
import { buildTeacherPrizeListItems } from './prizes/prizeUtils';
import type { Prize } from '@/lib/types';

function prize(overrides: Partial<Prize> & { id: string }): Prize {
  return {
    name: 'Test',
    points: 10,
    inStock: true,
    icon: 'Gift',
    ...overrides,
  } as Prize;
}

describe('buildTeacherPrizeListItems', () => {
  it('lists teacher-created prizes before school-wide', () => {
    const teacherId = 't1';
    const mine = prize({ id: 'a', points: 5, createdByTeacherId: teacherId });
    const school = prize({ id: 'b', points: 1, teacherIds: undefined });
    const items = buildTeacherPrizeListItems([school, mine], teacherId);

    expect(items[0]).toMatchObject({ kind: 'section', id: 'yours' });
    expect(items[1]).toMatchObject({ kind: 'prize', prize: mine });
    expect(items[2]).toMatchObject({ kind: 'section', id: 'school-wide' });
    expect(items[3]).toMatchObject({ kind: 'prize', prize: school });
  });
});
