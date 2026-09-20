import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ClassroomKeyboardTipsDock } from './ClassroomKeyboardTipsDock';
import { DEFAULT_CLASSROOM_PREFS } from '@/lib/classroomSeatingChart';

const hint = {
  prefs: DEFAULT_CLASSROOM_PREFS,
  editMode: false,
  attendanceEnabled: true,
  bathroomEnabled: true,
};

describe('ClassroomKeyboardTipsDock', () => {
  it('sits in the empty space beside the teacher desk, not on the seating grid', () => {
    const onOpenChange = vi.fn();
    const { container } = render(
      <ClassroomKeyboardTipsDock open={false} onOpenChange={onOpenChange} hint={hint} />,
    );

    const wrap = container.firstElementChild as HTMLElement;
    expect(wrap.className).toContain('justify-end');
    expect(wrap.className).not.toContain('right-2');
    expect(wrap.className).not.toContain('top-2');
    expect(wrap.className).not.toContain('inset-y-0');

    const tab = screen.getByRole('button', { name: /show keyboard tips/i });
    expect(tab.className).toContain('pointer-events-auto');
    expect(screen.queryByRole('button', { name: /hide keyboard tips/i })).toBeNull();

    fireEvent.click(tab);
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('opens the tip list in that same teacher-desk space', () => {
    render(<ClassroomKeyboardTipsDock open onOpenChange={vi.fn()} hint={hint} />);
    expect(screen.getByRole('complementary', { name: /^keyboard tips$/i }).className).toContain('pointer-events-auto');
    expect(screen.getByRole('button', { name: /hide keyboard tips/i })).toBeDefined();
    expect(screen.getByText(/behavior notes/i)).toBeDefined();
  });
});
