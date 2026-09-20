import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ClassroomWhosOutPulse } from './ClassroomWhosOutPulse';

describe('ClassroomWhosOutPulse', () => {
  it('always shows an in-class message when nobody is out', () => {
    render(<ClassroomWhosOutPulse passes={[]} />);
    expect(screen.getByText(/everyone is in class/i)).toBeDefined();
  });

  it('lists students who are out and offers a return button', () => {
    render(
      <ClassroomWhosOutPulse
        passes={[
          {
            studentId: 's1',
            studentName: 'Maya',
            startedAt: Date.now(),
            passLabel: 'Bathroom',
            source: 'bathroom',
            maxMinutes: 5,
          },
        ]}
        onReturn={vi.fn()}
      />,
    );
    expect(screen.getByText(/Who's out/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Return Maya/i })).toBeDefined();
  });

  it('names the pass type when someone is out for more than the bathroom', () => {
    render(
      <ClassroomWhosOutPulse
        passes={[
          {
            studentId: 's1',
            studentName: 'Maya',
            startedAt: Date.now(),
            passLabel: 'Nurse',
            source: 'recess',
            maxMinutes: 10,
          },
        ]}
        onReturn={vi.fn()}
      />,
    );
    expect(screen.getAllByText(/Maya — Nurse/).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Return Maya — Nurse/i })).toBeDefined();
  });

  it('shows a compact hall chip for the live header', () => {
    const { rerender } = render(<ClassroomWhosOutPulse variant="chip" passes={[]} />);
    const clearChip = screen.getByRole('button', { name: /hall: all clear/i });
    expect((clearChip.textContent || '').replace(/\s+/g, ' ').trim()).toBe('Hall: All Clear');
    expect(clearChip.className).toContain('whitespace-nowrap');
    expect(clearChip.className).toContain('min-w-0');
    expect(clearChip.className).toContain('overflow-hidden');
    expect(clearChip.className).not.toContain('shrink-0');
    expect(clearChip.className).toContain('px-3');
    expect(clearChip.className).toContain('bg-emerald-100');

    rerender(
      <ClassroomWhosOutPulse
        variant="chip"
        passes={[
          {
            studentId: 's1',
            studentName: 'Leo Diaz',
            startedAt: Date.now() - 134_000,
            passLabel: 'Bathroom',
            source: 'bathroom',
            maxMinutes: 5,
          },
        ]}
        onReturn={vi.fn()}
      />,
    );
    const outChip = screen.getByRole('button', { name: /who is out: leo · bathroom \(02:\d{2}\)/i });
    expect(outChip.className).toContain('bg-amber-100');
    expect(outChip.className).toContain('whitespace-nowrap');
  });

  it('lists every pass type in the hall chip popover and offers Return', () => {
    render(
      <ClassroomWhosOutPulse
        variant="chip"
        passes={[
          {
            studentId: 's1',
            studentName: 'Leo Diaz',
            startedAt: Date.now() - 134_000,
            passLabel: 'Bathroom',
            source: 'bathroom',
            maxMinutes: 5,
          },
          {
            studentId: 's2',
            studentName: 'Maya Chen',
            startedAt: Date.now() - 60_000,
            passLabel: 'Nurse',
            source: 'recess',
            maxMinutes: 10,
          },
        ]}
        onReturn={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /who is out: 2 out/i })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /who is out: 2 out/i }));
    expect(screen.getByText("Who's out")).toBeDefined();
    expect(screen.getByText('Leo · Bathroom')).toBeDefined();
    expect(screen.getByText('Maya · Nurse')).toBeDefined();
    expect(screen.getByText(/02:\d{2}/)).toBeDefined();
    expect(screen.getByRole('button', { name: /return leo/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /return maya/i })).toBeDefined();
    expect(screen.queryByText(/Leo Diaz — Bathroom/i)).toBeNull();
  });
});
