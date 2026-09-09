import { describe, it, expect } from 'vitest';
import { isPresentationRoute } from './presentationRoutes';

describe('isPresentationRoute', () => {
  it('returns false for null or undefined', () => {
    expect(isPresentationRoute(null)).toBe(false);
    expect(isPresentationRoute(undefined)).toBe(false);
    expect(isPresentationRoute('')).toBe(false);
  });

  it('returns false for library and librarian staff workspaces so they can scroll naturally', () => {
    expect(isPresentationRoute('/schoolabc/library')).toBe(false);
    expect(isPresentationRoute('/schoolabc/librarian')).toBe(false);
    expect(isPresentationRoute('/schoolabc/librarian/')).toBe(false);
  });

  it('returns true for library kiosk presentation route', () => {
    expect(isPresentationRoute('/schoolabc/library/kiosk')).toBe(true);
    expect(isPresentationRoute('/schoolabc/library/kiosk/')).toBe(true);
  });

  it('returns true for other presentation routes', () => {
    expect(isPresentationRoute('/schoolabc/displays')).toBe(true);
    expect(isPresentationRoute('/schoolabc/smart-screen')).toBe(true);
    expect(isPresentationRoute('/schoolabc/classroom-screen')).toBe(true);
    expect(isPresentationRoute('/schoolabc/house-sorting')).toBe(true);
    expect(isPresentationRoute('/schoolabc/classroom-realm')).toBe(true);
    expect(isPresentationRoute('/schoolabc/houses-realm')).toBe(true);
  });
});
