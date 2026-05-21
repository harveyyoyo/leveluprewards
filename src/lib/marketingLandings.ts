/**
 * Public marketing landing routes (full-page promos, no app chrome).
 * Keep in sync: add each approved route here so LayoutClientWrapper hides Header.
 */
export const MARKETING_LANDING_PAGES: ReadonlyArray<{ href: string; label: string }> = [
  { href: '/level-up-arcade', label: 'LevelUp Arcade' },
  { href: '/promotions', label: 'Promotions' },
];

/** Hub for printable flyers and promotional materials. */
export const MARKETING_PROMOTIONS_HREF = '/promotions';

/** @deprecated Use {@link MARKETING_PROMOTIONS_HREF}. */
export const MARKETING_FLYER_HREF = MARKETING_PROMOTIONS_HREF;

export function isMarketingLandingPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return MARKETING_LANDING_PAGES.some(
    (p) => pathname === p.href || pathname.startsWith(`${p.href}/`),
  );
}
