'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { SchoolDeveloperLoginForm } from '@/components/auth/SchoolDeveloperLoginForm';
import { useAuth } from '@/components/providers/AuthProvider';

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
  const { clearSchoolChooserSession } = useAuth();
  const [schoolFromQuery, setSchoolFromQuery] = useState('');
  const [changeSchool, setChangeSchool] = useState(false);
  const [initialSchoolId, setInitialSchoolId] = useState<string | undefined>(undefined);
  const changeSchoolResetDoneRef = useRef(false);

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
      if (!changeSchoolResetDoneRef.current) {
        changeSchoolResetDoneRef.current = true;
        clearSchoolChooserSession();
      }
      setInitialSchoolId(undefined);
      return;
    }
    changeSchoolResetDoneRef.current = false;

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
  }, [changeSchool, clearSchoolChooserSession, schoolFromQuery]);

  return (
    <SchoolDeveloperLoginForm
      key={changeSchool ? 'change-school' : initialSchoolId ?? 'login'}
      mode="full"
      initialSchoolId={initialSchoolId}
    />
  );
}
