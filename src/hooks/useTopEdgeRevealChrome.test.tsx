import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useTopEdgeRevealChrome } from './useTopEdgeRevealChrome';

describe('kiosk header reveal', () => {
  it('closes login chrome when the student signs in', () => {
    const { result, rerender } = renderHook(({ signedIn }) => useTopEdgeRevealChrome(true, { revealOnAnyPointerMove: !signedIn }), { initialProps: { signedIn: false } });
    act(() => window.dispatchEvent(new MouseEvent('mousemove', { clientY: 300 })));
    expect(result.current).toBe(true);
    rerender({ signedIn: true });
    expect(result.current).toBe(false);
  });

  it('does not show the school header for ordinary signed-in screen taps', () => {
    const { result } = renderHook(() => useTopEdgeRevealChrome(true));
    const touch = (y: number) => {
      const event = new Event('touchstart');
      Object.defineProperty(event, 'touches', { value: [{ clientY: y }] });
      act(() => window.dispatchEvent(event));
    };
    touch(300);
    expect(result.current).toBe(false);
    touch(5);
    expect(result.current).toBe(true);
  });
});
