'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { SchoolDeveloperLoginForm } from '@/components/SchoolDeveloperLoginForm';

function LoginFallback() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6 text-center">
      <div className="animate-pulse mb-4 text-primary font-bold text-xl uppercase tracking-tighter">Loading levelUp EDU…</div>
    </div>
  );
}

function LoginFormWithQuery() {
  const sp = useSearchParams();
  const schoolFromQuery = (sp.get('school') || '').trim();
  const [initialSchoolId, setInitialSchoolId] = useState<string | undefined>(
    schoolFromQuery ? schoolFromQuery : undefined,
  );

  useEffect(() => {
    if (schoolFromQuery) {
      setInitialSchoolId(schoolFromQuery);
      return;
    }

    let fromReferrer = '';
    try {
      const ref = typeof document !== 'undefined' ? document.referrer : '';
      if (ref) {
        const u = new URL(ref);
        const first = u.pathname.split('/').filter(Boolean)[0] || '';
        // If we came from a school-scoped route like `/{schoolId}/…`, infer that schoolId.
        if (first && !['login', 'developer', 'api'].includes(first)) {
          fromReferrer = first;
        }
      }
    } catch {
      // ignore
    }

    let fromStorage = '';
    try {
      fromStorage = typeof localStorage !== 'undefined' ? localStorage.getItem('schoolId') || '' : '';
    } catch {
      // ignore
    }

    const inferred = (fromReferrer || fromStorage).trim().toLowerCase();
    if (inferred) setInitialSchoolId(inferred);
  }, [schoolFromQuery]);

  return <SchoolDeveloperLoginForm mode="full" initialSchoolId={initialSchoolId} />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginFormWithQuery />
    </Suspense>
  );
}
