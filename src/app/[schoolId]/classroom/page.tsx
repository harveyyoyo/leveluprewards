'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { classroomRealmHref } from '@/lib/classroomRealmUrl';

/** Legacy URL — the live monitor now lives under the Classroom Realm namespace. */
export default function LegacyClassroomRedirect() {
  const params = useParams();
  const router = useRouter();
  const schoolId = typeof params.schoolId === 'string' ? params.schoolId : '';

  useEffect(() => {
    if (!schoolId) return;
    router.replace(classroomRealmHref(schoolId, 'live'));
  }, [router, schoolId]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
