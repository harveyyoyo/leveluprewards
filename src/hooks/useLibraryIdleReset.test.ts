import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLibraryIdleReset } from './useLibraryIdleReset';

describe('useLibraryIdleReset', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resets the countdown when the mouse moves', () => {
    const onReset = vi.fn();
    const { result } = renderHook(() => useLibraryIdleReset(true, onReset, 8));

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current).toBeLessThanOrEqual(5);

    act(() => {
      window.dispatchEvent(new Event('mousemove'));
    });
    expect(result.current).toBe(8);
    expect(onReset).not.toHaveBeenCalled();
  });

  it('fires onReset after the idle window if nothing happens', () => {
    const onReset = vi.fn();
    renderHook(() => useLibraryIdleReset(true, onReset, 2));

    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
