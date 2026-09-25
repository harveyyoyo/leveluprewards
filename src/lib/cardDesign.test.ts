import { describe, expect, it } from 'vitest';
import { blankCardDesign, sanitizeCardDesign } from '../../functions/src/cardDesign';
const piece = { id: 'a', kind: 'text', text: 'My card', x: 0, y: 0, width: 120, height: 50, rotation: 0, color: '#ffffff', fontSize: 24, font: 'sans-serif', bold: true };
describe('card design storage', () => {
  it('round trips a blank card and artwork', () => {
    expect(sanitizeCardDesign(blankCardDesign())).toEqual(blankCardDesign());
    expect(sanitizeCardDesign({ ...blankCardDesign(), elements: [piece] })?.elements[0].text).toBe('My card');
  });
  it('rejects external and executable pictures and oversized artwork', () => {
    for (const text of ['javascript:alert(1)', 'https://example.com/a.png', 'data:image/svg+xml;base64,AAAA', 'data:image/png;base64,' + 'A'.repeat(350001)]) {
      expect(sanitizeCardDesign({ ...blankCardDesign(), elements: [{ ...piece, kind: 'image', text }] })).toBeNull();
    }
    expect(sanitizeCardDesign({ ...blankCardDesign(), elements: Array(41).fill(piece) })).toBeNull();
  });
  it('keeps pieces inside the artwork area and normalizes invalid styles', () => {
    const result = sanitizeCardDesign({ ...blankCardDesign(), elements: [{ ...piece, x: 999, y: -42, color: 'url(evil)', rotation: Infinity }] })!;
    expect(result.elements[0]).toMatchObject({ x: 420, y: 0, color: '#111827', rotation: -180 });
  });
});
