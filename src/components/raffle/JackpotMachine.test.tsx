import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JackpotMachine, type JackpotPoolEntry } from './JackpotMachine';

const pool: JackpotPoolEntry[] = [
  { id: 'ada', name: 'Ada' },
  { id: 'grace', name: 'Grace' },
  { id: 'katherine', name: 'Katherine' },
];

describe('JackpotMachine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      window.setTimeout(() => cb(performance.now()), 0);
      return 1;
    });
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('keeps reel motion enabled under legacy mode overrides', () => {
    const { container } = render(
      <JackpotMachine pool={pool} pickWinner={() => pool[1]} embedded />,
    );

    expect(container.querySelector('[data-jackpot-machine]')).toHaveAttribute(
      'data-legacy-motion-root',
      'jackpot',
    );
  });

  it('lands on the selected winner after spinning', async () => {
    const onSpinFinished = vi.fn();
    render(
      <JackpotMachine
        pool={pool}
        pickWinner={() => pool[1]}
        onSpinFinished={onSpinFinished}
        embedded
      />,
    );

    fireEvent.click(screen.getByLabelText('Mute'));
    fireEvent.click(screen.getByRole('button', { name: 'PULL!' }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(screen.getByRole('button', { name: 'SPINNING…' })).toBeDisabled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });

    expect(screen.getByText(/GRACE/)).toBeInTheDocument();
    expect(onSpinFinished).toHaveBeenCalledWith(pool[1]);
  });
});
