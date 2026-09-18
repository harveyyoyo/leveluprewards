import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  CLASSROOM_LIVE_SIDEBAR_COLLAPSED_PX,
  CLASSROOM_LIVE_SIDEBAR_EXPANDED_PX,
  ClassroomLiveHoverSidebar,
} from './ClassroomLiveHoverSidebar';

describe('ClassroomLiveHoverSidebar', () => {
  it('starts collapsed and expands on hover', () => {
    const { container } = render(
      <ClassroomLiveHoverSidebar design="aurora" onOpenSetup={vi.fn()}>
        <p>Teaching tools panel</p>
      </ClassroomLiveHoverSidebar>,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.style.width).toBe(`${CLASSROOM_LIVE_SIDEBAR_COLLAPSED_PX}px`);
    expect(screen.queryByText('Teaching tools panel')).toBeNull();

    fireEvent.mouseEnter(root.querySelector('aside')!);
    expect(root.style.width).toBe(`${CLASSROOM_LIVE_SIDEBAR_EXPANDED_PX}px`);
    expect(screen.getByText('Teaching tools panel')).toBeDefined();
  });

  it('opens setup from the collapsed gear without blocking the board width', () => {
    const onOpenSetup = vi.fn();
    render(
      <ClassroomLiveHoverSidebar design="aurora" onOpenSetup={onOpenSetup}>
        <p>Teaching tools panel</p>
      </ClassroomLiveHoverSidebar>,
    );

    fireEvent.click(screen.getByRole('button', { name: /setup and settings/i }));
    expect(onOpenSetup).toHaveBeenCalledTimes(1);
  });
});
