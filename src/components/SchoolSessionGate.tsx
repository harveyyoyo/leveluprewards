'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/components/AppProvider';

const ALLOWED = new Set(['school', 'student', 'teacher', 'admin', 'developer']);

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
  const { schoolId, loginState, isInitialized, isUserLoading } = useAppContext();
  const router = useRouter();
  const route = routeSchoolId.trim().toLowerCase();

  useEffect(() => {
    if (!isInitialized || isUserLoading) return;

    if (loginState === 'loggedOut' || !ALLOWED.has(loginState)) {
      router.replace(`/login?school=${encodeURIComponent(route)}`);
      return;
    }

    if (loginState === 'developer') return;

    const sessionSchool = schoolId?.trim().toLowerCase();
    if (!sessionSchool || sessionSchool !== route) {
      router.replace(`/login?school=${encodeURIComponent(route)}`);
    }
  }, [isInitialized, isUserLoading, loginState, schoolId, route, router]);

  if (!isInitialized || isUserLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
        <div className="animate-pulse font-semibold text-foreground">Loading…</div>
      </div>
    );
  }

  if (loginState === 'loggedOut' || !ALLOWED.has(loginState)) {
    return null;
  }

  if (loginState !== 'developer') {
    const sessionSchool = schoolId?.trim().toLowerCase();
    if (!sessionSchool || sessionSchool !== route) {
      return null;
    }
  }

  return <>{children}</>;
}
