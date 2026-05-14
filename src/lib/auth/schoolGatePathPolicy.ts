/**
 * Edge-safe path checks aligned with `SchoolSessionGate.canUseRoute` (section-level).
 */
export function schoolPathAllowedByGate(
  pathname: string,
  urlSchoolId: string,
  scopes: Set<string>,
): boolean {
  if (scopes.has('dev')) return true;

  const normSchool = urlSchoolId.trim().toLowerCase();
  const prefix = `/${normSchool}/`;
  if (!pathname.toLowerCase().startsWith(prefix)) return false;

  const rest = pathname.slice(prefix.length);
  const section = (rest.split('/')[0] || '').toLowerCase();

  if (section === 'admin') {
    return scopes.has('admin') || scopes.has('portal') || scopes.has('prizeClerk');
  }
  if (section === 'teacher') {
    if (pathname === prefix + 'teacher' || pathname === prefix + 'teacher/') {
      return true;
    }
    return scopes.has('teacher') || scopes.has('admin');
  }
  if (section === 'secretary') {
    return scopes.has('secretary') || scopes.has('admin');
  }
  if (section === 'prize-clerk') {
    return scopes.has('prizeClerk') || scopes.has('admin');
  }
  if (section === 'reports') {
    return scopes.has('reports') || scopes.has('admin');
  }
  if (section === 'hall-of-fame') {
    return (
      scopes.has('admin') ||
      scopes.has('teacher') ||
      scopes.has('secretary') ||
      scopes.has('prizeClerk') ||
      scopes.has('reports')
    );
  }

  return (
    scopes.has('kiosk') ||
    scopes.has('portal') ||
    scopes.has('admin') ||
    scopes.has('teacher') ||
    scopes.has('secretary') ||
    scopes.has('prizeClerk') ||
    scopes.has('reports')
  );
}
