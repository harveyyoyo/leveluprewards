import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MAIN_PORTAL_CARDS,
  isMainPortalCardEnabled,
  portalHubGridClass,
  resolveMainPortalCards,
  toggleMainPortalCard,
} from './portalHub';

describe('portalHub', () => {
  it('defaults to admin, teacher, and student kiosk cards', () => {
    expect(resolveMainPortalCards(undefined)).toEqual([...DEFAULT_MAIN_PORTAL_CARDS]);
    expect(resolveMainPortalCards([])).toEqual([...DEFAULT_MAIN_PORTAL_CARDS]);
    expect(resolveMainPortalCards(['parent', 'invalid'])).toEqual(['parent']);
  });

  it('preserves canonical card order', () => {
    expect(resolveMainPortalCards(['parent', 'admin', 'redeem', 'print'])).toEqual([
      'admin',
      'print',
      'redeem',
      'parent',
    ]);
  });

  it('checks card visibility from settings', () => {
    expect(isMainPortalCardEnabled(['admin', 'print'], 'redeem')).toBe(false);
    expect(isMainPortalCardEnabled(undefined, 'admin')).toBe(true);
  });

  it('toggles cards without removing the last one', () => {
    expect(toggleMainPortalCard(['admin'], 'admin', false)).toEqual(['admin']);
    expect(toggleMainPortalCard(['admin', 'print'], 'admin', false)).toEqual(['print']);
    expect(toggleMainPortalCard(['admin'], 'print', true)).toEqual(['admin', 'print']);
  });

  it('uses wider grids for more cards on web layout', () => {
    expect(portalHubGridClass(3, false, false)).toContain('md:grid-cols-3');
    expect(portalHubGridClass(5, false, false)).toContain('lg:grid-cols-3');
    expect(portalHubGridClass(3, true, false)).toBe('grid-cols-1');
  });
});
