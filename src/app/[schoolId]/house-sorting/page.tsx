'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/** Legacy URL — forwards to the Houses realm ceremony. */
export default function HouseSortingRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const schoolId = String(params.schoolId || '');

  useEffect(() => {
    if (!schoolId) return;
    router.replace(`/${schoolId}/houses-realm/ceremony`);
  }, [router, schoolId]);

  return null;
}
