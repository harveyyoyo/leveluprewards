import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClassroomLiveRaffleProjectorOverlay } from './ClassroomLiveRaffleProjectorOverlay';

describe('ClassroomLiveRaffleProjectorOverlay', () => {
  it('hides when the teacher has the class screen off', () => {
    const { container } = render(
      <ClassroomLiveRaffleProjectorOverlay
        raffle={{ show: false, mode: 'jackpot', pool: [{ id: 'a', name: 'Ada' }] }}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a raffle overlay without taking a layout slot', () => {
    render(
      <ClassroomLiveRaffleProjectorOverlay
        raffle={{
          show: true,
          mode: 'jackpot',
          pool: [{ id: 'a', name: 'Ada' }],
          winnerName: 'Ada',
        }}
      />,
    );
    expect(screen.getByText(/class raffle/i)).toBeDefined();
    expect(screen.getByText(/winner: ada/i)).toBeDefined();
  });
});
