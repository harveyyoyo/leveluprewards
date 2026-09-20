import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ClassroomAwardPicker } from './ClassroomAwardPicker';
import { DEFAULT_CLASSROOM_PREFS } from '@/lib/classroomSeatingChart';
import type { Student } from '@/lib/types';

const student = { id: 's1', firstName: 'Ada', lastName: 'Lovelace' } as Student;

describe('ClassroomAwardPicker', () => {
  it('shows a small Quick chip and colorful picks, with no auto-award countdown', () => {
    const onPick = vi.fn();
    render(
      <ClassroomAwardPicker
        student={student}
        prefs={DEFAULT_CLASSROOM_PREFS}
        onPick={onPick}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText('Ada')).toBeDefined();
    expect(screen.getByText('Pick an award')).toBeDefined();
    expect(screen.getByRole('button', { name: /quick \+5/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /good question/i })).toBeDefined();
    expect(screen.queryByText(/auto \+/i)).toBeNull();
    expect(screen.queryByText(/in \d+s/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /quick \+5/i }));
    expect(onPick).toHaveBeenCalledWith(5, expect.any(String));
  });
});
