import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClassroomArrangeToolbar } from './ClassroomArrangeToolbar';

describe('ClassroomArrangeToolbar', () => {
  it('shows one arrange bar with seat and done controls', () => {
    render(
      <ClassroomArrangeToolbar
        design="aurora"
        frontAtBottom={false}
        rows={4}
        cols={5}
        canUndo
        canRedo={false}
        onFrontChange={vi.fn()}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onRowsChange={vi.fn()}
        onColsChange={vi.fn()}
        onSeatEveryone={vi.fn()}
        onDone={vi.fn()}
      />,
    );

    expect(screen.getByRole('toolbar', { name: /arrange classroom/i })).toBeDefined();
    expect(screen.getAllByRole('button', { name: /^undo$/i })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /^redo$/i })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /seat everyone/i })).toHaveLength(1);
    expect(screen.getByRole('button', { name: /done arranging/i })).toBeDefined();
    expect(screen.getByText('5 columns')).toBeDefined();
    expect(screen.getByText('4 rows')).toBeDefined();
    const gridGroup = screen.getByRole('group', { name: /grid size/i });
    expect(gridGroup.textContent).toMatch(/4 rows/);
    expect(gridGroup.textContent).toMatch(/5 columns/);
    expect(gridGroup.className).toContain('flex-nowrap');
    expect(screen.queryByText('5 cols')).toBeNull();
    const seatEveryone = screen.getByRole('button', { name: /seat everyone/i });
    const doneArranging = screen.getByRole('button', { name: /done arranging/i });
    expect(seatEveryone.className).toContain('bg-emerald-600');
    expect(seatEveryone.className).toContain('border-emerald-700');
    expect(seatEveryone.className).toContain('text-white');
    expect(doneArranging.className).toContain('bg-emerald-600');
    expect(seatEveryone.className).not.toContain('bg-[#f5c518]');
    expect(screen.queryByText(/drag desks to match your room/i)).toBeNull();
  });
});
