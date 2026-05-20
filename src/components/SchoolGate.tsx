'use client';

import { useAppContext } from "@/components/AppProvider";
import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

const ALLOWED = ['student', 'teacher', 'admin', 'school', 'developer', 'secretary', 'prizeClerk', 'reports'] as const;

export function SchoolGate({ children }: { children: React.ReactNode }) {
  const { schoolId, isInitialized, loginState, login } = useAppContext();
  const router = useRouter();
  const params = useParams<{ schoolId?: string }>();
  const routeSchoolId =
    typeof params?.schoolId === 'string' ? params.schoolId.trim().toLowerCase() : '';

  useEffect(() => {
    if (!isInitialized || schoolId || !routeSchoolId) return;
    if (loginState !== 'student' && loginState !== 'school') return;
    void login('student', { schoolId: routeSchoolId });
  }, [isInitialized, schoolId, routeSchoolId, loginState, login]);

  useEffect(() => {
    if (!isInitialized) return;
    if (loginState === 'loggedOut') {
      router.push('/');
      return;
    }
    if (!schoolId) {
      const canRecoverFromRoute =
        !!routeSchoolId && (loginState === 'student' || loginState === 'school');
      if (!canRecoverFromRoute) {
        router.push('/');
      }
    }
  }, [isInitialized, schoolId, loginState, routeSchoolId, router]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  if (!ALLOWED.includes(loginState as (typeof ALLOWED)[number])) {
    return null;
  }

  if (!schoolId) {
    if ((loginState === 'student' || loginState === 'school') && routeSchoolId) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
          <span className="text-sm font-medium">Connecting to school…</span>
        </div>
      );
    }
    return null;
  }

  return <>{children}</>;
}
