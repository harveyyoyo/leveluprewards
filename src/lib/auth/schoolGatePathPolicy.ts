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
    return scopes.has('admin') || scopes.has('portal') || scopes.has('prizeClerk') || scopes.has('houseCoordinator');
  }
  if (section === 'portal') {
    return (
      scopes.has('portal') ||
      scopes.has('kiosk') ||
      scopes.has('studentPortal') ||
      scopes.has('admin') ||
      scopes.has('teacher') ||
      scopes.has('secretary') ||
      scopes.has('prizeClerk') ||
      scopes.has('reports') ||
      scopes.has('librarian') ||
      scopes.has('office') ||
      scopes.has('houseCoordinator')
    );
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
  if (section === 'librarian') {
    return scopes.has('librarian') || scopes.has('admin');
  }
  if (section === 'office') {
    if (pathname === prefix + 'office' || pathname === prefix + 'office/') {
      return (
        scopes.has('portal') ||
        scopes.has('office') ||
        scopes.has('admin')
      );
    }
    return scopes.has('office') || scopes.has('admin');
  }
  if (section === 'library' || section === 'parent') {
    return true;
  }
  if (section === 'hall-of-fame') {
    return (
      scopes.has('admin') ||
      scopes.has('teacher') ||
      scopes.has('secretary') ||
      scopes.has('prizeClerk') ||
      scopes.has('reports') ||
      scopes.has('librarian') ||
      scopes.has('houseCoordinator')
    );
  }

  if (section === 'smart-screen') {
    return (
      scopes.has('portal') ||
      scopes.has('admin') ||
      scopes.has('teacher') ||
      scopes.has('secretary') ||
      scopes.has('prizeClerk') ||
      scopes.has('reports') ||
      scopes.has('librarian') ||
      scopes.has('houseCoordinator')
    );
  }

  if (section === 'student-home') {
    return (
      scopes.has('studentPortal') ||
      scopes.has('kiosk') ||
      scopes.has('portal') ||
      scopes.has('admin') ||
      scopes.has('teacher') ||
      scopes.has('secretary') ||
      scopes.has('prizeClerk') ||
      scopes.has('reports') ||
      scopes.has('librarian') ||
      scopes.has('houseCoordinator')
    );
  }

  if (section === 'student') {
    return (
      scopes.has('kiosk') ||
      scopes.has('admin') ||
      scopes.has('teacher') ||
      scopes.has('secretary') ||
      scopes.has('prizeClerk') ||
      scopes.has('reports') ||
      scopes.has('librarian') ||
      scopes.has('houseCoordinator')
    );
  }

  return (
    scopes.has('kiosk') ||
    scopes.has('portal') ||
    scopes.has('admin') ||
    scopes.has('teacher') ||
    scopes.has('secretary') ||
    scopes.has('prizeClerk') ||
    scopes.has('reports') ||
    scopes.has('librarian') ||
    scopes.has('houseCoordinator')
  );
}
