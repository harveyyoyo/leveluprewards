import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  ClassroomWholeClassAwardControl,
  clampClassAwardPoints,
} from './ClassroomWholeClassAwardControl';

describe('ClassroomWholeClassAwardControl', () => {
  it('puts Give everyone on one row with minus, the award, and plus', () => {
    const onPointsChange = vi.fn();
    const onAward = vi.fn();
    render(
      <ClassroomWholeClassAwardControl
        points={6}
        onPointsChange={onPointsChange}
        onAward={onAward}
      />,
    );

    const award = screen.getAllByRole('button', { name: /give everyone \+6/i })[0]!;
    expect(screen.getByText('to Class')).toBeDefined();
    expect(award.innerHTML).not.toContain('truncate');
    fireEvent.click(award);
    expect(onAward).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /more points for everyone/i }));
    expect(onPointsChange).toHaveBeenCalledWith(7);
  });

  it('lets the teacher tap a quick amount', () => {
    const onPointsChange = vi.fn();
    render(
      <ClassroomWholeClassAwardControl
        points={6}
        onPointsChange={onPointsChange}
        onAward={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '+10' }));
    expect(onPointsChange).toHaveBeenCalledWith(10);
  });

  it('lets the teacher type an amount and press Enter', () => {
    const onPointsChange = vi.fn();
    render(
      <ClassroomWholeClassAwardControl
        points={6}
        onPointsChange={onPointsChange}
        onAward={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /change class points amount/i }));
    const input = screen.getByRole('textbox', { name: /type points for everyone/i });
    fireEvent.change(input, { target: { value: '12' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onPointsChange).toHaveBeenCalledWith(12);
  });

  it('keeps class award amounts between 1 and 99', () => {
    expect(clampClassAwardPoints(0)).toBe(1);
    expect(clampClassAwardPoints(5)).toBe(5);
    expect(clampClassAwardPoints(120)).toBe(99);
  });
});
