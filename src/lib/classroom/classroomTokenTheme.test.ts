import { describe, expect, it } from 'vitest';
import {
  CLASSROOM_TOKEN_ACCENTS,
  classroomSidebarToolAppearance,
  classroomTokenAccent,
  classroomTokenDeskStyle,
  isClassroomTokenDesign,
} from './classroomTokenTheme';

describe('classroomTokenTheme', () => {
  it('cycles seven token accents', () => {
    expect(CLASSROOM_TOKEN_ACCENTS.map((token) => token.id)).toEqual([
      'blue',
      'red',
      'yellow',
      'green',
      'orange',
      'teal',
      'violet',
    ]);
    expect(classroomTokenAccent(0).id).toBe('blue');
    expect(classroomTokenAccent(7).id).toBe('blue');
  });

  it('applies token desk shadow and marks aurora as the token look', () => {
    expect(isClassroomTokenDesign('aurora')).toBe(true);
    expect(isClassroomTokenDesign('minimal')).toBe(false);
    expect(classroomTokenDeskStyle(0).boxShadow).toContain('4px 6px 0 0');
  });

  it('paints sidebar tools from the same desk outline colors', () => {
    expect(classroomSidebarToolAppearance('aurora', 'arrange').style.backgroundColor).toBe(
      classroomTokenAccent(2).border,
    );
    expect(classroomSidebarToolAppearance('minimal', 'random').style.backgroundColor).toBe(
      classroomTokenAccent(0).fill,
    );
    expect(classroomSidebarToolAppearance('midnight', 'raffle').style.backgroundColor).toBe(
      classroomTokenAccent(6).border,
    );
    expect(classroomSidebarToolAppearance('aurora', 'sound').style.backgroundColor).toBe(
      classroomTokenAccent(4).border,
    );
    expect(classroomSidebarToolAppearance('aurora', 'timer').style.backgroundColor).toBe(
      classroomTokenAccent(6).border,
    );
    expect(classroomSidebarToolAppearance('aurora', 'sound').style.backgroundColor).not.toMatch(/#000|slate/);
    expect(classroomSidebarToolAppearance('aurora', 'timer').style.backgroundColor).not.toMatch(/#000|slate/);
  });
});
