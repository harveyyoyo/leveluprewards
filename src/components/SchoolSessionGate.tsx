'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAppContext } from '@/components/AppProvider';
import { canAccessHallOfFameRoute } from '@/lib/hallOfFameAccess';

const ALLOWED = new Set(['school', 'student', 'teacher', 'admin', 'developer', 'secretary', 'prizeClerk', 'reports']);

function canUseRoute(pathname: string, routeSchoolId: string, loginState: string) {
  if (loginState === 'developer') return true;

  const prefix = `/${routeSchoolId}/`;
  const section = pathname.startsWith(prefix) ? pathname.slice(prefix.length).split('/')[0] : '';

  // Allow school chooser through: Admin page shows the passcode gate until role is granted (same idea as /teacher).
  if (section === 'admin') return loginState === 'admin' || loginState === 'school';
  if (section === 'teacher') {
    // Allow reaching the staff sign-in screen while in a student/public session.
    // The page itself will show a login form unless you already have a staff role.
    if (pathname === `/${routeSchoolId}/teacher`) return true;
    return loginState === 'teacher' || loginState === 'admin';
  }
  if (section === 'secretary') return loginState === 'secretary' || loginState === 'admin';
  if (section === 'prize-clerk') return loginState === 'prizeClerk' || loginState === 'admin';
  if (section === 'reports') return loginState === 'reports' || loginState === 'admin';

  if (section === 'halloffame') return canAccessHallOfFameRoute(loginState);

  return true;
}

/**
 * Ensures `/{schoolId}/…` is only reachable with a matching session (or developer).
 * This is a client UX gate; Firestore rules still enforce real data access.
 */
export function SchoolSessionGate({
  routeSchoolId,
  children,
}: {
  routeSchoolId: string;
  children: React.ReactNode;
}) {
  const { schoolId, loginState, isInitialized, isUserLoading, login } = useAppContext();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const route = routeSchoolId.trim().toLowerCase();
  const isStaffSignInLink = pathname === `/${route}/teacher` && !!searchParams.get('account');

  useEffect(() => {
    if (!isInitialized || isUserLoading) return;

    if (loginState === 'loggedOut' || !ALLOWED.has(loginState)) {
      if (loginState === 'loggedOut' && isStaffSignInLink) {
        void login('student', { schoolId: route });
        return;
      }
      router.replace(`/login?school=${encodeURIComponent(route)}`);
      return;
    }

    if (loginState === 'developer') return;

    const sessionSchool = schoolId?.trim().toLowerCase();
    if (!sessionSchool || sessionSchool !== route) {
      router.replace(`/login?school=${encodeURIComponent(route)}`);
      return;
    }

    if (!canUseRoute(pathname, route, loginState)) {
      router.replace(`/login?school=${encodeURIComponent(route)}`);
    }
  }, [isInitialized, isStaffSignInLink, isUserLoading, login, loginState, schoolId, route, router, pathname]);

  if (!isInitialized || isUserLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
        <div className="animate-pulse font-semibold text-foreground">Loading…</div>
      </div>
    );
  }

  if (loginState === 'loggedOut' || !ALLOWED.has(loginState)) {
    if (loginState === 'loggedOut' && isStaffSignInLink) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
          <div className="animate-pulse font-semibold text-foreground">Loading...</div>
        </div>
      );
    }
    return null;
  }

  if (loginState !== 'developer') {
    const sessionSchool = schoolId?.trim().toLowerCase();
    if (!sessionSchool || sessionSchool !== route) {
      return null;
    }

    if (!canUseRoute(pathname, route, loginState)) {
      return null;
    }
  }

  return <>{children}</>;
}
