import { describe, expect, it } from 'vitest';
import {
  classroomAwardDisplayLabel,
  replaceForbiddenQuickTapLabel,
  sanitizeClassroomDeskAwardLabel,
} from './classroomAwardLabel';

describe('sanitizeClassroomDeskAwardLabel', () => {
  it('hides Quick tap wording on student desks', () => {
    expect(sanitizeClassroomDeskAwardLabel('Quick tap')).toBeNull();
    expect(sanitizeClassroomDeskAwardLabel('Quicktap')).toBeNull();
    expect(sanitizeClassroomDeskAwardLabel('  quick tap  ')).toBeNull();
  });

  it('keeps other award phrases', () => {
    expect(sanitizeClassroomDeskAwardLabel('Great job')).toBe('Great job');
  });

  it('renames Quick tap in toasts and award buttons', () => {
    expect(replaceForbiddenQuickTapLabel('Quick tap')).toBe('Good job');
    expect(
      classroomAwardDisplayLabel('Quick tap', {
        defaultPoints: 5,
        correctionDescription: 'Reminder',
        correctionLabel: 'Reminder',
        quickAwards: [{ id: 'quick', label: 'Quick tap', points: 5, description: 'Quick tap' }],
        quickTapDescription: 'Quick tap',
      }),
    ).toBe('Good job');
  });
});
