import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ClassroomAppearancePopover } from './ClassroomAppearancePopover';
import { DEFAULT_CLASSROOM_PREFS } from '@/lib/classroomSeatingChart';

describe('ClassroomAppearancePopover', () => {
  it('opens Appearance with theme swatches and desk options', () => {
    render(
      <ClassroomAppearancePopover
        prefs={DEFAULT_CLASSROOM_PREFS}
        onChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /appearance/i }));
    expect(screen.getByText('Vibrant / Playful')).toBeDefined();
    expect(screen.getByText('Colorful token desks')).toBeDefined();
    expect(screen.getByText('Focus / Clean')).toBeDefined();
    expect(screen.getByText('Night / Dark')).toBeDefined();
    expect(screen.getByText('Retro / Bold')).toBeDefined();
    expect(screen.getByText('Student photos')).toBeDefined();
    expect(screen.queryByText(/^default points$/i)).toBeNull();
    expect(screen.queryByText(/^tap awards$/i)).toBeNull();
    expect(screen.queryByText(/^fly-up$/i)).toBeNull();
    expect(screen.queryByText(/^celebration$/i)).toBeNull();
  });
});
