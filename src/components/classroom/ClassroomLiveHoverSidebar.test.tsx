import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  CLASSROOM_LIVE_SIDEBAR_COLLAPSED_PX,
  CLASSROOM_LIVE_SIDEBAR_EXPANDED_PX,
  ClassroomLiveHoverSidebar,
} from './ClassroomLiveHoverSidebar';
import { ClassroomMonitorQuickControls } from '@/components/points/ClassroomMonitorQuickControls';
import { DEFAULT_CLASSROOM_PREFS } from '@/lib/classroomSeatingChart';

const toolProps = {
  design: 'aurora' as const,
  prefs: DEFAULT_CLASSROOM_PREFS,
  isFullscreen: true,
  placement: 'left' as const,
  onChange: vi.fn(),
  onToggleEditMode: vi.fn(),
  onRandomPick: vi.fn(),
  attendanceEnabled: true,
  attendanceSource: 'card-scan' as const,
  onAttendanceSourceChange: vi.fn(),
  showRaffle: true,
  onOpenRaffle: vi.fn(),
  onOpenBehavior: vi.fn(),
  onOpenSetup: vi.fn(),
};

describe('ClassroomLiveHoverSidebar', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts as a narrow icon rail, not a half-open panel', () => {
    const { container } = render(
      <ClassroomLiveHoverSidebar design="aurora">
        <ClassroomMonitorQuickControls {...toolProps} />
      </ClassroomLiveHoverSidebar>,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.style.width).toBe(`${CLASSROOM_LIVE_SIDEBAR_COLLAPSED_PX}px`);
    expect(screen.getByTestId('classroom-monitor-icon-rail')).toBeDefined();
    expect(screen.queryByTestId('classroom-monitor-full-panel')).toBeNull();
    // Labels stay out of the DOM while collapsed — no clipped “Arrange seats” text.
    expect(screen.queryByText('Arrange seats')).toBeNull();
    expect(screen.queryByText('Random student')).toBeNull();
    expect(screen.getByRole('button', { name: /arrange seats/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /random student picker/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /setup and settings/i })).toBeDefined();
  });

  it('expands to the full labeled panel after hover, then collapses back to icons', async () => {
    const { container } = render(
      <ClassroomLiveHoverSidebar design="aurora">
        <ClassroomMonitorQuickControls {...toolProps} />
      </ClassroomLiveHoverSidebar>,
    );

    const root = container.firstElementChild as HTMLElement;
    const aside = root.querySelector('aside')!;

    fireEvent.mouseEnter(aside);
    expect(root.style.width).toBe(`${CLASSROOM_LIVE_SIDEBAR_EXPANDED_PX}px`);
    // Still icons while the width spring runs — avoids a half-cut label look.
    expect(screen.getByTestId('classroom-monitor-icon-rail')).toBeDefined();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });

    await waitFor(() => {
      expect(screen.getByTestId('classroom-monitor-full-panel')).toBeDefined();
    });
    expect(screen.queryByTestId('classroom-monitor-icon-rail')).toBeNull();
    expect(screen.getByText('Arrange seats')).toBeDefined();
    expect(screen.getByText('Random student')).toBeDefined();

    fireEvent.mouseLeave(aside);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });

    expect(root.style.width).toBe(`${CLASSROOM_LIVE_SIDEBAR_COLLAPSED_PX}px`);
    expect(screen.getByTestId('classroom-monitor-icon-rail')).toBeDefined();
    expect(screen.queryByText('Arrange seats')).toBeNull();
  });

  it('opens setup from the collapsed gear icon', () => {
    const onOpenSetup = vi.fn();
    render(
      <ClassroomLiveHoverSidebar design="aurora" onOpenSetup={onOpenSetup}>
        <ClassroomMonitorQuickControls {...toolProps} onOpenSetup={onOpenSetup} />
      </ClassroomLiveHoverSidebar>,
    );

    fireEvent.click(screen.getByRole('button', { name: /setup and settings/i }));
    expect(onOpenSetup).toHaveBeenCalledTimes(1);
  });
});
