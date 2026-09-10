import { describe, expect, it, vi, afterEach } from 'vitest';
import { openStandalonePage } from './openStandalonePage';

describe('openStandalonePage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does a full page load so the staff tab cannot bounce back', () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { assign });
    const preventDefault = vi.fn();

    openStandalonePage('/schoolabc/classroom-realm', { preventDefault });

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(assign).toHaveBeenCalledWith('/schoolabc/classroom-realm');
  });
});
