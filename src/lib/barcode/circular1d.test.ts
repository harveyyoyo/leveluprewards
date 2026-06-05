import { describe, expect, it } from 'vitest';
import {
  decodeCircular1d,
  decodeCircular1dFromRingSamples,
  encodeCircular1d,
  formatCircular1dScanValue,
  modulesToRingSamples,
  parseCircular1dScanValue,
} from './circular1d';

describe('circular1d', () => {
  it('round-trips a student-style id', () => {
    const enc = encodeCircular1d('871294305');
    expect(enc).not.toBeNull();
    expect(decodeCircular1d(enc!.modules)).toBe('871294305');
  });

  it('round-trips after rotation', () => {
    const enc = encodeCircular1d('DEMO-42');
    const rotated = [...enc!.modules.slice(40), ...enc!.modules.slice(0, 40)];
    expect(decodeCircular1d(rotated)).toBe('DEMO-42');
  });

  it('decodes simulated ring samples', () => {
    const enc = encodeCircular1d('100');
    const samples = modulesToRingSamples(enc!.modules, 1024);
    expect(decodeCircular1dFromRingSamples(samples)).toBe('100');
  });

  it('parses prefixed scan values', () => {
    expect(parseCircular1dScanValue(formatCircular1dScanValue('100'))).toBe('100');
  });

  it('rejects empty and overlong payloads', () => {
    expect(encodeCircular1d('')).toBeNull();
    expect(encodeCircular1d('x'.repeat(40))).toBeNull();
  });
});
