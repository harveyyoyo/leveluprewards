import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ClassroomLiveBehaviorPanel } from './ClassroomLiveBehaviorPanel';

vi.mock('@/components/classroom/BehaviorTimelinePanel', () => ({
  BehaviorTimelinePanel: () => <div>Today&apos;s Notes (0)</div>,
}));

describe('ClassroomLiveBehaviorPanel', () => {
  it('shows tag chips and today’s notes, not a how-to card', () => {
    const onPickKey = vi.fn();
    render(
      <ClassroomLiveBehaviorPanel open onClose={vi.fn()} schoolId="schoolabc" pickKey={null} onPickKey={onPickKey} />,
    );

    expect(screen.getByText(/behavior log/i)).toBeDefined();
    expect(screen.getByText(/select type, then click a desk/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /positive/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /warning/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /highlight/i })).toBeDefined();
    expect(screen.getByText(/today's notes/i)).toBeDefined();
    expect(screen.queryByText(/how teachers add a note/i)).toBeNull();
    expect(screen.queryByText(/notes you add from/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /warning/i }));
    expect(onPickKey).toHaveBeenCalledWith('w');
  });
});
