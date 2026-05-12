import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RaffleSpinWheel } from './RaffleSpinWheel';

const slices = [
  { id: 'a', name: 'Ada', weight: 2 },
  { id: 'b', name: 'Bob', weight: 1 },
];

describe('RaffleSpinWheel', () => {
  it('renders spin control when embedded', () => {
    render(<RaffleSpinWheel slices={slices} pickWinner={() => slices[0]!} embedded />);
    expect(screen.getByRole('button', { name: 'SPIN!' })).toBeInTheDocument();
  });
});
