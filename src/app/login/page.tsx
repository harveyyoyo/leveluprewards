'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { SchoolDeveloperLoginForm } from '@/components/SchoolDeveloperLoginForm';

function readSchoolFromUrl(): string {
  if (typeof window === 'undefined') return '';
  try {
    return (new URLSearchParams(window.location.search).get('school') || '').trim();
  } catch {
    return '';
  }
}

/**
 * Avoid `useSearchParams()` here: it suspends under the App Router and can leave `/login`
 * on a generic loading fallback until the client hydrates query handling.
 */
export default function LoginPage() {
  const pathname = usePathname();
  const [schoolFromQuery, setSchoolFromQuery] = useState('');
  const [initialSchoolId, setInitialSchoolId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const read = () => setSchoolFromQuery(readSchoolFromUrl());
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, [pathname]);

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
