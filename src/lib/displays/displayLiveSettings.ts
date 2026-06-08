/** Routes where display pages should follow Firestore `appSettings` in real time. */
export function isDisplaySettingsRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname.includes('/displays') || pathname.includes('/smart-screen') || pathname.includes('/bulletin-board');
}
