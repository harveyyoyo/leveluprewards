'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';

const SCHOOL_SESSION_STATES = new Set([
  'school',
  'student',
  'teacher',
  'admin',
  'developer',
  'secretary',
  'prizeClerk',
  'reports',
]);

export function PortalEntryRedirect() {
  const router = useRouter();
  const { isInitialized, isUserLoading, loginState, schoolId } = useAppContext();

  useEffect(() => {
    if (!isInitialized || isUserLoading) return;

    const sid = schoolId?.trim().toLowerCase();
    if (sid && SCHOOL_SESSION_STATES.has(loginState)) {
      router.replace(`/${sid}/portal`);
      return;
    }

    router.replace('/login');
  }, [isInitialized, isUserLoading, loginState, router, schoolId]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-6 text-muted-foreground">
      <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
      <p className="text-sm font-medium">Opening school portal...</p>
    </div>
  );
}
