import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  ClassroomDeskVisual,
  ClassroomEmptyDeskLabel,
  ClassroomSessionBadge,
  classroomArrangeBarClass,
  classroomDesignShellClass,
  classroomStudentDeskClass,
} from './classroomVisualTheme';

describe('classroomDesignShellClass', () => {
  it('keeps dark readable ink on light seating looks', () => {
    expect(classroomDesignShellClass('playful', false)).toContain('classroom-light-ink');
    expect(classroomDesignShellClass('aurora', false)).toContain('classroom-light-ink');
    expect(classroomDesignShellClass('aurora', false)).toContain('bg-[radial-gradient');
    expect(classroomDesignShellClass('brutalist', false)).toContain('classroom-light-ink');
    expect(classroomDesignShellClass('minimal', false)).toContain('classroom-light-ink');
  });

  it('gives desk cards even padding so names sit above the points pill', () => {
    expect(classroomStudentDeskClass('aurora', { hasStudent: true })).toContain('gap-2');
    expect(classroomStudentDeskClass('aurora', { hasStudent: true })).toContain('p-2');
  });

  it('keeps token desk points as light text on a dark pill', () => {
    const { container } = render(
      <ClassroomDeskVisual
        design="aurora"
        display={{ id: 's1', name: 'Ada', initials: 'AL', points: 12 }}
        index={0}
        accentColor="#111"
        sessionPts={0}
        showBalance
        showSession={false}
      />,
    );
    const pill = Array.from(container.querySelectorAll('.classroom-on-dark')).find((el) =>
      /12/.test(el.textContent || ''),
    );
    expect(pill?.textContent).toMatch(/12/);
    expect(pill?.getAttribute('style') || '').toMatch(/#fff|rgb\(255,\s*255,\s*255\)/i);
  });

  it('keeps empty seats quiet so filled desks stand out', () => {
    const empty = classroomStudentDeskClass('aurora', { hasStudent: false, editMode: true });
    expect(empty).not.toMatch(/dashed/);
    expect(empty).not.toMatch(/border-primary/);
    expect(empty).not.toMatch(/bg-yellow/);

    const { rerender } = render(<ClassroomEmptyDeskLabel design="aurora" />);
    expect(screen.queryByText(/empty/i)).toBeNull();
    rerender(<ClassroomEmptyDeskLabel design="aurora" editMode />);
    expect(screen.getByText('empty').className).toMatch(/text-black\/25/);
  });

  it('gives the arrange bar a high-contrast strip', () => {
    expect(classroomArrangeBarClass('aurora')).toMatch(/#f7f4ee/);
    expect(classroomArrangeBarClass('aurora')).toMatch(/#102033/);
  });

  it('keeps the midnight look on a dark shell', () => {
    expect(classroomDesignShellClass('midnight', false)).toContain('text-white');
    expect(classroomDesignShellClass('midnight', false)).not.toContain('classroom-light-ink');
  });

  it('hides last-award phrases after five seconds and keeps the session total', () => {
    const { rerender } = render(
      <ClassroomSessionBadge sessionPts={5} lastAwardLabel="Good job" lastAwardAt={Date.now()} />,
    );
    expect(screen.getByText('Good job')).toBeDefined();
    expect(screen.getByText('+5')).toBeDefined();

    rerender(
      <ClassroomSessionBadge
        sessionPts={5}
        lastAwardLabel="Good job"
        lastAwardAt={Date.now() - 6000}
      />,
    );
    expect(screen.getByText('+5')).toBeDefined();
    expect(screen.getByText('Good job').getAttribute('style') ?? '').toMatch(/opacity:\s*0/);
  });

  it('keeps session points as an inline chip so a group badge can sit above it', () => {
    const { container } = render(<ClassroomSessionBadge sessionPts={15} />);
    const wrap = container.firstElementChild as HTMLElement;
    expect(wrap.className).not.toContain('absolute');
    expect(wrap.className).toContain('flex-col');
    expect(screen.getByText('+15')).toBeDefined();
  });
});
