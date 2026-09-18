import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClassroomArrangeOverflowTray } from './ClassroomArrangeOverflowTray';

describe('ClassroomArrangeOverflowTray', () => {
  it('lists students waiting for a seat beside the room', () => {
    render(
      <ClassroomArrangeOverflowTray
        students={[
          { id: 's1', label: 'Maya M.' },
          { id: 's2', label: 'Leo L.' },
        ]}
        onDragStudent={vi.fn()}
        onPlaceStudent={vi.fn()}
      />,
    );

    expect(screen.getByText(/this room is too small for everyone/i)).toBeDefined();
    expect(screen.getByText('Maya M.')).toBeDefined();
    expect(screen.getByText('Leo L.')).toBeDefined();
  });
});
