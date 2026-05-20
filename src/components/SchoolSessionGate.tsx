'use client';

import { Suspense, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';
import { canAccessHallOfFameRoute } from '@/lib/hallOfFameAccess';

const ALLOWED = new Set([
  'school',
  'student',
  'teacher',
  'admin',
  'developer',
  'secretary',
  'prizeClerk',
  'reports',
  'librarian',
  'office',
  'houseCoordinator',
]);

function SessionGateLoading({ label }: { label?: string }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 p-6 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin shrink-0" aria-hidden />
      <span className="text-sm font-medium text-center">{label ?? 'Loading school session…'}</span>
    </div>
  );
}

function canUseRoute(pathname: string, routeSchoolId: string, loginState: string) {
  if (loginState === 'developer') return true;

  const prefix = `/${routeSchoolId}/`;
  const section = pathname.startsWith(prefix) ? pathname.slice(prefix.length).split('/')[0] : '';

  if (section === 'portal') {
    return (
      loginState === 'school' ||
      loginState === 'student' ||
      loginState === 'admin' ||
      loginState === 'teacher' ||
      loginState === 'secretary' ||
      loginState === 'prizeClerk' ||
      loginState === 'reports' ||
      loginState === 'librarian' ||
      loginState === 'office' ||
      loginState === 'houseCoordinator'
    );
  }

  // Allow school chooser through: Admin page shows the passcode gate until role is granted (same idea as /teacher).
  // Prize desk staff use Admin → Prizes (same URL, no full admin passcode).
  if (section === 'admin') {
    return loginState === 'admin' || loginState === 'school' || loginState === 'prizeClerk' || loginState === 'houseCoordinator';
  }
  if (section === 'teacher') {
    // Allow reaching the staff sign-in screen while in a student/public session.
    // The page itself will show a login form unless you already have a staff role.
    if (pathname === `/${routeSchoolId}/teacher`) return true;
    return loginState === 'teacher' || loginState === 'admin';
  }
  if (section === 'secretary') return loginState === 'secretary' || loginState === 'admin';
  if (section === 'prize-clerk') return loginState === 'prizeClerk' || loginState === 'admin';
  if (section === 'reports') return loginState === 'reports' || loginState === 'admin';
  if (section === 'librarian') return loginState === 'librarian' || loginState === 'admin';
  if (section === 'office') return loginState === 'office' || loginState === 'admin';
  if (section === 'library') return true;

  if (section === 'hall-of-fame') return canAccessHallOfFameRoute(loginState);

  return true;
}

/**
 * `useSearchParams()` suspends in the App Router until the client can read the URL.
 * Only the teacher root URL needs query params (`?account=…`); keep it isolated so
 * `/student`, `/portal`, etc. never sit on the generic Suspense fallback indefinitely.
 */
function SchoolSessionGateTeacherSearch({
  routeSchoolId,
  children,
}: {
  routeSchoolId: string;
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const route = routeSchoolId.trim().toLowerCase();
  const isStaffSignInLink = pathname === `/${route}/teacher` && !!searchParams.get('account');
  return (
    <SchoolSessionGateBody routeSchoolId={routeSchoolId} isStaffSignInLink={isStaffSignInLink}>
      {children}
    </SchoolSessionGateBody>
  );
}

function SchoolSessionGateBody({
  routeSchoolId,
  isStaffSignInLink,
  children,
}: {
  routeSchoolId: string;
  isStaffSignInLink: boolean;
  children: React.ReactNode;
}) {
  const { schoolId, loginState, isInitialized, isUserLoading, login } = useAppContext();
  const router = useRouter();
  const pathname = usePathname();
  const route = routeSchoolId.trim().toLowerCase();

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

    const sessionSchool = schoolId?.trim().toLowerCase() ?? '';
    if (!sessionSchool || sessionSchool !== route) {
      // Student / school chooser sessions may restore schoolId shortly after navigation.
      if (loginState !== 'student' && loginState !== 'school') {
        router.replace(`/login?school=${encodeURIComponent(route)}`);
      }
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
          <div className="animate-pulse font-semibold text-foreground">Loading…</div>
        </div>
      );
    }
    return <SessionGateLoading label="Redirecting to sign-in…" />;
  }

  if (loginState !== 'developer') {
    const sessionSchool = schoolId?.trim().toLowerCase();
    if (!sessionSchool || sessionSchool !== route) {
      return (
        <SessionGateLoading
          label={
            loginState === 'student' || loginState === 'school'
              ? 'Connecting to school…'
              : 'Loading school session…'
          }
        />
      );
    }

    if (!canUseRoute(pathname, route, loginState)) {
      return <SessionGateLoading label="Redirecting…" />;
    }
  }

  return <>{children}</>;
}

function SchoolSessionGateInner({
  routeSchoolId,
  children,
}: {
  routeSchoolId: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const route = routeSchoolId.trim().toLowerCase();

  if (pathname === `/${route}/teacher`) {
    return (
      <Suspense fallback={<SessionGateLoading label="Loading…" />}>
        <SchoolSessionGateTeacherSearch routeSchoolId={routeSchoolId}>{children}</SchoolSessionGateTeacherSearch>
      </Suspense>
    );
  }

  return (
    <SchoolSessionGateBody routeSchoolId={routeSchoolId} isStaffSignInLink={false}>
      {children}
    </SchoolSessionGateBody>
  );
}

/**
 * Ensures `/{schoolId}/…` is only reachable with a matching session (or developer).
 * This is a client UX gate; Firestore rules still enforce real data access.
 */
export function SchoolSessionGate(props: {
  routeSchoolId: string;
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<SessionGateLoading />}>
      <SchoolSessionGateInner {...props} />
    </Suspense>
  );
}
