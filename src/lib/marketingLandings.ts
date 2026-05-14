/**
 * Public marketing landing routes (full-page promos, no app chrome).
 * Keep in sync: add each approved route here so LayoutClientWrapper hides Header.
 */
export const MARKETING_LANDING_PAGES: ReadonlyArray<{ href: string; label: string }> = [
  { href: '/level-up-arcade', label: 'LevelUp Arcade' },
];

export function isMarketingLandingPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return MARKETING_LANDING_PAGES.some(
    (p) => pathname === p.href || pathname.startsWith(`${p.href}/`),
  );
}
