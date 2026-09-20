import { describe, expect, it } from 'vitest';
import { buildClassroomRandomPickSequence, classroomRandomPickStepDelayMs } from './classroomRandomPick';

describe('classroomRandomPick', () => {
  it('returns null when nobody is on a desk', () => {
    expect(buildClassroomRandomPickSequence([])).toBeNull();
  });

  it('cycles through desks and lands on one student', () => {
    let i = 0;
    const values = [0.1, 0.4, 0.7, 0.2, 0.9, 0.3, 0.6, 0.8, 0.15, 0.55];
    const pick = buildClassroomRandomPickSequence(['a', 'b', 'c'], () => values[i++ % values.length]!);
    expect(pick).not.toBeNull();
    expect(pick!.steps.length).toBeGreaterThan(3);
    expect(pick!.steps.at(-1)).toBe(pick!.winner);
    expect(['a', 'b', 'c']).toContain(pick!.winner);
  });

  it('slows the last hops so the landing is easy to see', () => {
    expect(classroomRandomPickStepDelayMs(10, 12)).toBeGreaterThan(classroomRandomPickStepDelayMs(1, 12));
  });
});
