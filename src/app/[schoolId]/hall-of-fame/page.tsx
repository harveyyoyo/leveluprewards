'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppContext } from '@/components/AppProvider';

/** Legacy URL — forwards to the unified displays hub. */
export default function HallOfFameRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { schoolId } = useAppContext();

  useEffect(() => {
    if (!schoolId) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', 'hall-of-fame');
    router.replace(`/${schoolId}/displays?${params.toString()}`);
  }, [router, schoolId, searchParams]);

  return null;
}
