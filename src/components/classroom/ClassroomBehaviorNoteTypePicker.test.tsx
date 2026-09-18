import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ClassroomBehaviorNoteTypePicker } from './ClassroomBehaviorNoteTypePicker';

describe('ClassroomBehaviorNoteTypePicker', () => {
  it('lets the teacher pick P, C, I, W, or H', () => {
    const onPick = vi.fn();
    render(
      <ClassroomBehaviorNoteTypePicker studentLabel="Maya" onPick={onPick} onClose={vi.fn()} />,
    );

    expect(screen.getByText(/note for maya/i)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /positive note/i }));
    expect(onPick).toHaveBeenCalledWith('p');
  });
});
