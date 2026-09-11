import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClassroomWhosOutPulse } from './ClassroomWhosOutPulse';

describe('ClassroomWhosOutPulse', () => {
  it('always shows an in-class message when nobody is out', () => {
    render(<ClassroomWhosOutPulse passes={[]} />);
    expect(screen.getByText(/everyone is in class/i)).toBeDefined();
  });

  it('lists students who are out and offers a return button', () => {
    render(
      <ClassroomWhosOutPulse
        passes={[{ studentId: 's1', studentName: 'Maya', startedAt: Date.now() }]}
        onReturn={vi.fn()}
      />,
    );
    expect(screen.getByText(/Who's out/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Return Maya/i })).toBeDefined();
  });
});
