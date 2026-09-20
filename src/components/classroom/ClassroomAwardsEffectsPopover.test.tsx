import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ClassroomAwardsEffectsPopover } from './ClassroomAwardsEffectsPopover';
import { DEFAULT_CLASSROOM_PREFS } from '@/lib/classroomSeatingChart';

describe('ClassroomAwardsEffectsPopover', () => {
  it('opens Awards & effects with points, tap, fly-up, and celebration', () => {
    render(
      <ClassroomAwardsEffectsPopover prefs={DEFAULT_CLASSROOM_PREFS} onChange={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /awards & effects/i }));
    expect(screen.getByText(/awards & effects/i)).toBeDefined();
    expect(screen.getByLabelText('Default points')).toBeDefined();
    expect(screen.getByText(/one tap/i)).toBeDefined();
    expect(screen.getByText(/show menu/i)).toBeDefined();
    expect(screen.getByText(/^fly-up$/i)).toBeDefined();
    expect(screen.getByRole('radio', { name: /fly-up off/i })).toBeDefined();
    expect(screen.getByText(/^celebration$/i)).toBeDefined();
    expect(screen.getByRole('radio', { name: /^flash$/i })).toBeDefined();
    expect(screen.getByRole('radio', { name: /^confetti$/i })).toBeDefined();
    expect(screen.getByRole('radio', { name: /^fireworks$/i })).toBeDefined();
  });
});
