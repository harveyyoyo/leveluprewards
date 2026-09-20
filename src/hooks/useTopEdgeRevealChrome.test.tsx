import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TOP_EDGE_REVEAL_PX, TOP_EDGE_REVEAL_TOUCH_PX, useTopEdgeRevealChrome } from './useTopEdgeRevealChrome';

describe('kiosk header reveal', () => {
  it('does not show the header when the mouse moves below the top edge', () => {
    const { result } = renderHook(() => useTopEdgeRevealChrome(true));
    act(() => window.dispatchEvent(new MouseEvent('mousemove', { clientY: 300 })));
    expect(result.current).toBe(false);
    act(() => window.dispatchEvent(new MouseEvent('mousemove', { clientY: 50 })));
    expect(result.current).toBe(false);
  });

  it('shows the header when the mouse reaches the top edge and hides when moved away', () => {
    const { result } = renderHook(() => useTopEdgeRevealChrome(true));
    act(() => window.dispatchEvent(new MouseEvent('mousemove', { clientY: TOP_EDGE_REVEAL_PX })));
    expect(result.current).toBe(true);

    // Stays visible while hovering within the header
    act(() => window.dispatchEvent(new MouseEvent('mousemove', { clientY: 40 })));
    expect(result.current).toBe(true);

    // Hides when mouse moves below header height
    act(() => window.dispatchEvent(new MouseEvent('mousemove', { clientY: 150 })));
    expect(result.current).toBe(false);
  });

  it('closes login chrome when the student signs in (resetKey changes)', () => {
    const { result, rerender } = renderHook(
      ({ signedIn }) => useTopEdgeRevealChrome(true, { resetKey: signedIn }),
      { initialProps: { signedIn: false } },
    );
    act(() => window.dispatchEvent(new MouseEvent('mousemove', { clientY: 5 })));
    expect(result.current).toBe(true);

    rerender({ signedIn: true });
    expect(result.current).toBe(false);
  });

  it('does not show the school header for ordinary screen taps, but shows on top-edge taps', () => {
    const { result } = renderHook(() => useTopEdgeRevealChrome(true));
    const touch = (y: number) => {
      const event = new Event('touchstart');
      Object.defineProperty(event, 'touches', { value: [{ clientY: y }] });
      act(() => window.dispatchEvent(event));
    };
    touch(300);
    expect(result.current).toBe(false);
    touch(TOP_EDGE_REVEAL_TOUCH_PX);
    expect(result.current).toBe(true);
  });
});
