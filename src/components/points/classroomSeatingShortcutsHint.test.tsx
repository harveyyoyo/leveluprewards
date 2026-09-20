import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClassroomSeatingShortcutsHint } from './classroomSeatingShortcutsHint';
import { DEFAULT_CLASSROOM_PREFS } from '@/lib/classroomSeatingChart';

describe('ClassroomSeatingShortcutsHint', () => {
  it('lists live keyboard tips for notes and bathroom', () => {
    render(
      <ClassroomSeatingShortcutsHint
        prefs={DEFAULT_CLASSROOM_PREFS}
        editMode={false}
        attendanceEnabled
        bathroomEnabled
        monitorDisplay
      />,
    );

    expect(screen.getByText(/keyboard quick settings/i)).toBeDefined();
    expect(screen.getByText(/tap a desk/i)).toBeDefined();
    expect(screen.getByText(/right-click = menu/i)).toBeDefined();
    expect(screen.getByText(/behavior notes/i)).toBeDefined();
    expect(screen.getByText(/bathroom pass/i)).toBeDefined();
    expect(screen.queryByText(/undo last award/i)).toBeNull();
    expect(screen.getByText(/not signed in/i)).toBeDefined();
  });
});
