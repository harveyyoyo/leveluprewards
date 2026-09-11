export function adminWelcomeTitle(userName?: string | null): string {
  const first = userName?.trim().split(/\s+/)[0];
  return first ? `Welcome back, ${first}` : 'Admin overview';
}
