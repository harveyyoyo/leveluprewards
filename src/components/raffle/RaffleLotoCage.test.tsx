import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RaffleLotoCage, type LotoPoolEntry } from './RaffleLotoCage';

const pool: LotoPoolEntry[] = [
  { id: 'ada', name: 'Ada' },
  { id: 'grace', name: 'Grace' },
  { id: 'katherine', name: 'Katherine' },
];

describe('RaffleLotoCage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('keeps motion enabled under legacy mode overrides', () => {
    const { container } = render(<RaffleLotoCage pool={pool} pickWinner={() => pool[1]} embedded />);

    expect(container.querySelector('[data-raffle-loto-cage]')).toHaveAttribute(
      'data-legacy-motion-root',
      'jackpot',
    );
  });

  it('announces the selected winner after drawing', async () => {
    const onSpinFinished = vi.fn();
    render(
      <RaffleLotoCage
        pool={pool}
        pickWinner={() => pool[1]}
        onSpinFinished={onSpinFinished}
        embedded
      />,
    );

    fireEvent.click(screen.getByLabelText('Mute'));
    fireEvent.click(screen.getByRole('button', { name: 'DRAW!' }));

    expect(screen.getByRole('button', { name: 'DRAWING…' })).toBeDisabled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4500);
    });

    expect(screen.getByText(/GRACE/)).toBeInTheDocument();
    expect(onSpinFinished).toHaveBeenCalledWith(pool[1]);
  });
});
