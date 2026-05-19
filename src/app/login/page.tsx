'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { SchoolDeveloperLoginForm } from '@/components/SchoolDeveloperLoginForm';

function readLoginUrlState(): { school: string; changeSchool: boolean } {
  if (typeof window === 'undefined') return { school: '', changeSchool: false };
  try {
    const params = new URLSearchParams(window.location.search);
    return {
      school: (params.get('school') || '').trim(),
      changeSchool: params.get('changeSchool') === '1',
    };
  } catch {
    return { school: '', changeSchool: false };
  }
}

/**
 * Avoid `useSearchParams()` here: it suspends under the App Router and can leave `/login`
 * on a generic loading fallback until the client hydrates query handling.
 */
export default function LoginPage() {
  const pathname = usePathname();
  const [schoolFromQuery, setSchoolFromQuery] = useState('');
  const [changeSchool, setChangeSchool] = useState(false);
  const [initialSchoolId, setInitialSchoolId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const read = () => {
      const state = readLoginUrlState();
      setSchoolFromQuery(state.school);
      setChangeSchool(state.changeSchool);
    };
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, [pathname]);

  useEffect(() => {
    if (changeSchool) {
      try {
        localStorage.removeItem('loginState');
        localStorage.removeItem('schoolId');
        localStorage.removeItem('userName');
        localStorage.removeItem('teacherDocId');
      } catch {
        // Ignore storage errors; the visible form still lets the user choose a school.
      }
      setInitialSchoolId(undefined);
      return;
    }

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
  }, [changeSchool, schoolFromQuery]);

  return (
    <SchoolDeveloperLoginForm
      key={changeSchool ? 'change-school' : initialSchoolId ?? 'login'}
      mode="full"
      initialSchoolId={initialSchoolId}
    />
  );
}
