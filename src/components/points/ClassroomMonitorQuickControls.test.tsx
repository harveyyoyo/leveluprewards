import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ClassroomMonitorQuickControls } from './ClassroomMonitorQuickControls';
import { DEFAULT_CLASSROOM_PREFS } from '@/lib/classroomSeatingChart';
import { classroomTokenAccent } from '@/lib/classroom/classroomTokenTheme';

const classes = [{ id: 'g10', name: 'Grade 10' }];

const leftProps = {
  design: 'aurora' as const,
  prefs: DEFAULT_CLASSROOM_PREFS,
  classes: [...classes],
  classId: 'g10',
  isFullscreen: true,
  placement: 'left' as const,
  onChange: vi.fn(),
  onClassChange: vi.fn(),
  onToggleEditMode: vi.fn(),
  interactionMode: 'award' as const,
  onInteractionModeChange: vi.fn(),
  attendanceEnabled: true,
  attendanceSource: 'card-scan' as const,
  onAttendanceSourceChange: vi.fn(),
  notesEnabled: true,
  onRandomPick: vi.fn(),
  shortcutHint: {
    prefs: DEFAULT_CLASSROOM_PREFS,
    editMode: false,
    attendanceEnabled: true,
    bathroomEnabled: true,
  },
};

describe('ClassroomMonitorQuickControls', () => {
  it('keeps the class picker out of the left sidebar', () => {
    render(<ClassroomMonitorQuickControls {...leftProps} />);

    expect(screen.queryByRole('button', { name: /grade 10/i })).toBeNull();
  });

  it('keeps attendance as its own button, not a three-way tap mode', () => {
    render(<ClassroomMonitorQuickControls {...leftProps} />);

    expect(screen.getByRole('button', { name: /badge reader active/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /arrange seats/i }).style.backgroundColor).toBe(
      classroomTokenAccent(2).border,
    );
    expect(screen.getByRole('button', { name: /random student/i }).style.backgroundColor).toBe(
      classroomTokenAccent(0).border,
    );
    expect(screen.getByRole('button', { name: /turn award sounds off/i }).style.backgroundColor).toBe(
      classroomTokenAccent(4).border,
    );
    expect(screen.queryByText(/tap a desk = \+5 points/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /undo last award/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^undo$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^redo$/i })).toBeNull();
    expect(screen.queryByRole('radio', { name: /award points/i })).toBeNull();
    expect(screen.queryByRole('radio', { name: /add note/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /add note/i })).toBeNull();
  });

  it('shows everyday classroom tools without Toolbar options or look menus', () => {
    render(<ClassroomMonitorQuickControls {...leftProps} />);

    expect(screen.getByRole('button', { name: /random student/i })).toBeDefined();
    expect(screen.getByText(/group timer/i)).toBeDefined();
    expect(screen.queryByRole('button', { name: /toolbar options/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /chart style/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /desk display/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /layout settings/i })).toBeNull();
    expect(screen.queryByText(/^default points$/i)).toBeNull();
    expect(screen.queryByText(/^tap awards$/i)).toBeNull();
    expect(screen.queryByText(/^fly-up$/i)).toBeNull();
    expect(screen.queryByText(/^celebration$/i)).toBeNull();
  });

  it('hides extra classroom tools while arranging seats', () => {
    render(
      <ClassroomMonitorQuickControls
        {...leftProps}
        editMode
        onToggleEditMode={vi.fn()}
        onSeatEveryone={vi.fn()}
        liveAwardActions={<button type="button">Class +5</button>}
      />,
    );

    expect(screen.getByText(/arrange classroom/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /done arranging/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /seat everyone/i })).toBeDefined();
    expect(screen.queryByRole('button', { name: /undo/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /redo/i })).toBeNull();
    expect(screen.queryByText(/live actions/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /take attendance/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /sound effects/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /random student/i })).toBeNull();
    expect(screen.queryByText(/group timer/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /class \+5/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /keyboard tips/i })).toBeNull();
  });

  it('restores classroom tools after arranging', () => {
    render(<ClassroomMonitorQuickControls {...leftProps} onToggleEditMode={vi.fn()} />);

    expect(screen.getByRole('button', { name: /arrange seats/i })).toBeDefined();
    expect(screen.queryByRole('button', { name: /^undo$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^redo$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /seat everyone/i })).toBeNull();
    expect(screen.getByRole('button', { name: /badge reader active/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /random student/i })).toBeDefined();
    expect(screen.getByText(/group timer/i)).toBeDefined();
    expect(screen.queryByRole('button', { name: /show keyboard tips/i })).toBeNull();
  });

  it('offers setup and more at the bottom of the sidebar', () => {
    const onOpenSetup = vi.fn();
    render(<ClassroomMonitorQuickControls {...leftProps} onOpenSetup={onOpenSetup} />);

    fireEvent.click(screen.getByRole('button', { name: /setup and settings/i }));
    expect(onOpenSetup).toHaveBeenCalledTimes(1);
  });

  it('offers raffle and behavior as live tools', () => {
    render(
      <ClassroomMonitorQuickControls
        {...leftProps}
        showRaffle
        onOpenRaffle={vi.fn()}
        onOpenBehavior={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /^raffle$/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /^raffle$/i }).style.backgroundColor).toBe(
      classroomTokenAccent(6).border,
    );
    expect(screen.getByRole('button', { name: /^behavior$/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /^behavior$/i }).style.backgroundColor).toBe(
      classroomTokenAccent(1).border,
    );
    expect(screen.getByText(/group timer/i).closest('[data-look]')?.getAttribute('style')).toContain(
      classroomTokenAccent(6).border,
    );
  });

  it('renders a full labeled panel outside the hover rail (not a clipped half panel)', () => {
    render(<ClassroomMonitorQuickControls {...leftProps} onOpenSetup={vi.fn()} />);

    expect(screen.getByTestId('classroom-monitor-full-panel')).toBeDefined();
    expect(screen.queryByTestId('classroom-monitor-icon-rail')).toBeNull();
    expect(screen.getByText('Arrange seats')).toBeDefined();
  });
});
