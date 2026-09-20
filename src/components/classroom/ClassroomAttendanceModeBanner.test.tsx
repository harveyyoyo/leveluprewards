import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClassroomAttendanceModeBanner } from './ClassroomAttendanceModeBanner';

describe('ClassroomAttendanceModeBanner', () => {
  it('shows large attendance instructions and a dark Done / Save button', () => {
    render(
      <ClassroomAttendanceModeBanner
        onMarkAllPresent={vi.fn()}
        onDone={vi.fn()}
        onStartNewClass={vi.fn()}
      />,
    );

    expect(
      screen.getByText('Attendance Mode · Tap = Present/Absent · Hold = Late'),
    ).toBeDefined();
    expect(screen.getByText('Right-click also works with a mouse.')).toBeDefined();
    expect(screen.queryByRole('button', { name: /^late$/i })).toBeNull();
    expect(screen.getByRole('button', { name: /start new class/i })).toBeDefined();

    const markAll = screen.getByRole('button', { name: /mark all present/i });
    const done = screen.getByRole('button', { name: /done \/ save/i });
    expect(markAll.className).toContain('bg-white');
    expect(done.className).toContain('bg-[#0F172A]');
    expect(done.className).toContain('classroom-on-dark');
    expect(done.className).not.toContain('bg-[#f5c518]');
    expect(done.getAttribute('style') ?? '').toMatch(/#fff|#0F172A|rgb\(15,\s*23,\s*42\)|rgb\(255,\s*255,\s*255\)/);
  });
});
