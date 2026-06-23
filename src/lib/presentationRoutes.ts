/** Routes meant for audience-facing fullscreen presentation (no app chrome). */
export function isPresentationRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return (
    pathname.includes('/houses-realm') ||
    pathname.includes('/classroom-realm') ||
    pathname.includes('/house-sorting') ||
    pathname.includes('/classroom-screen') ||
    pathname.includes('/smart-screen') ||
    pathname.includes('/displays')
  );
}
