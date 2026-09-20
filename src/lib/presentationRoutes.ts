/** Routes meant for audience-facing fullscreen presentation (no app chrome). */
export function isPresentationRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return (
    pathname.includes('/library/kiosk') ||
    pathname.includes('/houses-realm') ||
    /\/houses(?:\/|$|\?)/.test(pathname) ||
    pathname.includes('/classroom-realm') ||
    /\/classroom(?:\/|$|\?)/.test(pathname) ||
    pathname.includes('/house-sorting') ||
    pathname.includes('/classroom-screen') ||
    pathname.includes('/smart-screen') ||
    pathname.includes('/displays')
  );
}
