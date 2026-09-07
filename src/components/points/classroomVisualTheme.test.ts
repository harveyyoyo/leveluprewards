import { describe, expect, it } from 'vitest';
import { classroomDesignShellClass } from './classroomVisualTheme';

describe('classroomDesignShellClass', () => {
  it('keeps dark readable ink on light seating looks', () => {
    expect(classroomDesignShellClass('playful', false)).toContain('classroom-light-ink');
    expect(classroomDesignShellClass('aurora', false)).toContain('classroom-light-ink');
    expect(classroomDesignShellClass('brutalist', false)).toContain('classroom-light-ink');
    expect(classroomDesignShellClass('minimal', false)).toContain('classroom-light-ink');
  });

  it('keeps the midnight look on a dark shell', () => {
    expect(classroomDesignShellClass('midnight', false)).toContain('text-white');
    expect(classroomDesignShellClass('midnight', false)).not.toContain('classroom-light-ink');
  });
});
