/**
 * Public marketing landing routes (full-page promos, no app chrome).
 * Keep in sync: add each approved route here so LayoutClientWrapper hides Header.
 */
export const MARKETING_LANDING_PAGES: ReadonlyArray<{ href: string; label: string }> = [
  { href: '/level-up-arcade', label: 'LevelUp Arcade' },
  { href: '/flyers', label: 'Flyers' },
];

/** Hub for printable flyers. */
export const MARKETING_FLYERS_HREF = '/flyers';

/** @deprecated Use {@link MARKETING_FLYERS_HREF}. */
export const MARKETING_PROMOTIONS_HREF = MARKETING_FLYERS_HREF;

/** @deprecated Use {@link MARKETING_FLYERS_HREF}. */
export const MARKETING_FLYER_HREF = MARKETING_FLYERS_HREF;

export function isMarketingLandingPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return MARKETING_LANDING_PAGES.some(
    (p) => pathname === p.href || pathname.startsWith(`${p.href}/`),
  );
}
