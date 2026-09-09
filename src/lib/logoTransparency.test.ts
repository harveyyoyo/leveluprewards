import { describe, it, expect } from 'vitest';
import { floodFillWhiteBorder } from './logoTransparency';

/** Builds a flat RGBA buffer for a `width`x`height` image filled with `fill`. */
function makeBuffer(width: number, height: number, fill: [number, number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = fill[0];
    data[i * 4 + 1] = fill[1];
    data[i * 4 + 2] = fill[2];
    data[i * 4 + 3] = fill[3];
  }
  return { data, width, height };
}

function setPixel(
  img: { data: Uint8ClampedArray; width: number },
  x: number,
  y: number,
  rgba: [number, number, number, number],
) {
  const idx = (y * img.width + x) * 4;
  img.data[idx] = rgba[0];
  img.data[idx + 1] = rgba[1];
  img.data[idx + 2] = rgba[2];
  img.data[idx + 3] = rgba[3];
}

function alphaAt(img: { data: Uint8ClampedArray; width: number }, x: number, y: number) {
  return img.data[(y * img.width + x) * 4 + 3];
}

describe('floodFillWhiteBorder', () => {
  it('clears a solid white background to fully transparent', () => {
    const img = makeBuffer(5, 5, [255, 255, 255, 255]);
    floodFillWhiteBorder(img);
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        expect(alphaAt(img, x, y)).toBe(0);
      }
    }
  });

  it('leaves non-white ink untouched', () => {
    const img = makeBuffer(5, 5, [255, 255, 255, 255]);
    // A dark "ink" pixel in the middle, surrounded by white background.
    setPixel(img, 2, 2, [10, 20, 30, 255]);
    floodFillWhiteBorder(img);
    expect(alphaAt(img, 2, 2)).toBe(255);
    const idx = (2 * 5 + 2) * 4;
    expect(img.data[idx]).toBe(10);
    expect(img.data[idx + 1]).toBe(20);
    expect(img.data[idx + 2]).toBe(30);
    // Background around it is cleared.
    expect(alphaAt(img, 0, 0)).toBe(0);
  });

  it('preserves a white pixel enclosed by ink (not reachable from the border)', () => {
    // 5x5 ring of dark ink around a single enclosed white "island" pixel.
    const img = makeBuffer(5, 5, [255, 255, 255, 255]);
    for (let y = 1; y <= 3; y++) {
      for (let x = 1; x <= 3; x++) {
        setPixel(img, x, y, [10, 10, 10, 255]);
      }
    }
    setPixel(img, 2, 2, [255, 255, 255, 255]); // enclosed white island
    floodFillWhiteBorder(img);
    // Border-connected white is cleared.
    expect(alphaAt(img, 0, 0)).toBe(0);
    // The ring of ink is untouched.
    expect(alphaAt(img, 1, 1)).toBe(255);
    // The enclosed white island is NOT connected to the border, so it stays opaque.
    expect(alphaAt(img, 2, 2)).toBe(255);
  });

  it('feathers pixels near the whiteness threshold instead of a hard cutoff', () => {
    // A pixel just barely over WHITE_THRESHOLD (245) but under
    // FULLY_TRANSPARENT_AT (253) should end up partially, not fully, transparent.
    const img = makeBuffer(3, 3, [255, 255, 255, 255]);
    setPixel(img, 1, 1, [246, 246, 246, 255]);
    floodFillWhiteBorder(img);
    const a = alphaAt(img, 1, 1);
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(255);
  });

  it('does not touch pixels already fully transparent', () => {
    const img = makeBuffer(3, 3, [255, 255, 255, 0]);
    floodFillWhiteBorder(img);
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        expect(alphaAt(img, x, y)).toBe(0);
      }
    }
  });

  it('is a no-op on a zero-sized image', () => {
    const img = { data: new Uint8ClampedArray(0), width: 0, height: 0 };
    expect(() => floodFillWhiteBorder(img)).not.toThrow();
  });
});
