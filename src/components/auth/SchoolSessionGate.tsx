'use client';

import { Suspense, useCallback, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';
import {
  followAppRedirect,
  markSchoolLoginOfficeIntent,
  schoolLoginRedirectHref,
  schoolStaffPortalHref,
} from '@/lib/auth/schoolLoginRedirect';
import { canAccessHallOfFameRoute } from '@/lib/hallOfFameAccess';
import { officePublicHref } from '@/lib/officePublicUrl';
import { isOfficeHostname, isOfficeSchoolScopedPath } from '@/lib/officeRouting';

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

  // Admin URL hosts full admin tools, prize desk, house coordinator, and the unified teacher staff portal.
  if (section === 'admin') {
    return (
      loginState === 'admin' ||
      loginState === 'school' ||
      loginState === 'teacher' ||
      loginState === 'prizeClerk' ||
      loginState === 'houseCoordinator'
    );
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
  if (section === 'office') {
    if (pathname === `/${routeSchoolId}/office`) {
      return loginState === 'school' || loginState === 'office' || loginState === 'admin';
    }
    return loginState === 'office' || loginState === 'admin';
  }
  if (
    typeof window !== 'undefined' &&
    isOfficeHostname(window.location.host) &&
    isOfficeSchoolScopedPath(pathname) &&
    (pathname === `/${routeSchoolId}` || pathname === `/${routeSchoolId}/`)
  ) {
    return loginState === 'school' || loginState === 'office' || loginState === 'admin';
  }
  if (
    typeof window !== 'undefined' &&
    isOfficeHostname(window.location.host) &&
    isOfficeSchoolScopedPath(pathname) &&
    pathname.startsWith(`/${routeSchoolId}/`)
  ) {
    return loginState === 'office' || loginState === 'admin';
  }
  if (section === 'library' || section === 'parent') return true;

  if (section === 'hall-of-fame') return canAccessHallOfFameRoute(loginState);

  if (section === 'smart-screen' || section === 'displays' || section === 'bulletin-board') {
    return (
      loginState === 'teacher' ||
      loginState === 'admin' ||
      loginState === 'school' ||
      loginState === 'secretary' ||
      loginState === 'prizeClerk' ||
      loginState === 'reports' ||
      loginState === 'librarian' ||
      loginState === 'houseCoordinator'
    );
  }

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

  const schoolLoginHref = useCallback(
    (options?: { changeSchool?: boolean }) =>
      schoolLoginRedirectHref(route, { pathname, changeSchool: options?.changeSchool }),
    [pathname, route],
  );

  const redirectToSchoolLogin = useCallback(
    (options?: { changeSchool?: boolean }) => {
      if (typeof window !== 'undefined' && isOfficeHostname(window.location.host)) {
        markSchoolLoginOfficeIntent(route);
      }
      followAppRedirect(schoolLoginHref(options), router);
    },
    [route, router, schoolLoginHref],
  );

  useEffect(() => {
    if (!isInitialized || isUserLoading) return;

    if (loginState === 'loggedOut' || !ALLOWED.has(loginState)) {
      if (loginState === 'loggedOut' && isStaffSignInLink) {
        void login('student', { schoolId: route });
        return;
      }
      redirectToSchoolLogin();
      return;
    }

    if (loginState === 'developer') return;

    const sessionSchool = schoolId?.trim().toLowerCase() ?? '';
    if (!sessionSchool || sessionSchool !== route) {
      if (loginState === 'school' && sessionSchool && sessionSchool !== route) {
        redirectToSchoolLogin({ changeSchool: true });
        return;
      }
      // Student / school chooser sessions may restore schoolId shortly after navigation.
      if (loginState !== 'student' && loginState !== 'school') {
        redirectToSchoolLogin();
      }
      return;
    }

    if (
      typeof window !== 'undefined' &&
      isOfficeHostname(window.location.host) &&
      pathname === `/${route}/portal`
    ) {
      followAppRedirect(officePublicHref(route), router);
      return;
    }

    if (!canUseRoute(pathname, route, loginState)) {
      const fallback =
        loginState === 'teacher'
          ? schoolStaffPortalHref(route, 'admin')
          : schoolLoginHref();
      if (pathname !== fallback) {
        followAppRedirect(fallback, router);
      }
    }
  }, [
    isInitialized,
    isStaffSignInLink,
    isUserLoading,
    login,
    loginState,
    schoolId,
    route,
    router,
    pathname,
    schoolLoginHref,
    redirectToSchoolLogin,
  ]);

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
