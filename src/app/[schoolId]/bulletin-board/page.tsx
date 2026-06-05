'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppContext } from '@/components/AppProvider';

export default function BulletinBoardRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { schoolId } = useAppContext();

  useEffect(() => {
    if (!schoolId) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', 'bulletin');
    router.replace(`/${schoolId}/displays?${params.toString()}`);
  }, [router, schoolId, searchParams]);

  return null;
}
