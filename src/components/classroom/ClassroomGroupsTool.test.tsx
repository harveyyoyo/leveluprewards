import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ClassroomGroupsTool } from './ClassroomGroupsTool';

describe('ClassroomGroupsTool', () => {
  it('lets the teacher pick 2 through 6 groups without a squeezed dropdown', () => {
    const onAssign = vi.fn();
    render(
      <ClassroomGroupsTool
        triggerClassName="bg-cyan-500 text-white rounded-xl"
        onAssign={onAssign}
        onClear={vi.fn()}
      />,
    );

    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByRole('radiogroup', { name: /number of groups/i })).toBeDefined();
    expect(screen.getByRole('radio', { name: '2 groups' })).toBeDefined();
    expect(screen.getByRole('radio', { name: '6 groups' })).toBeDefined();
    fireEvent.click(screen.getByRole('radio', { name: '3 groups' }));
    expect(screen.getByText('3 groups')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /split into groups/i }));
    expect(onAssign).toHaveBeenCalledWith(3);
  });
});
