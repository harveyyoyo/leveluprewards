'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { normalizeSchoolId } from '@/lib/schoolId';
import { SchoolDeveloperLoginForm } from '@/components/auth/SchoolDeveloperLoginForm';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  markSchoolLoginLibraryIntent,
  schoolLoginPageStateFromSearch,
} from '@/lib/auth/schoolLoginRedirect';

function readLoginUrlState(): {
  school: string;
  changeSchool: boolean;
  library: boolean;
} {
  if (typeof window === 'undefined') {
    return { school: '', changeSchool: false, library: false };
  }
  try {
    const state = schoolLoginPageStateFromSearch(window.location.search);
    return {
      school: state.school,
      changeSchool: state.blankSchoolBox,
      library: state.libraryIntent,
    };
  } catch {
    return { school: '', changeSchool: false, library: false };
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
  const [libraryLogin, setLibraryLogin] = useState(false);
  const [initialSchoolId, setInitialSchoolId] = useState<string | undefined>(undefined);
  const changeSchoolResetDoneRef = useRef(false);

  useEffect(() => {
    const read = () => {
      const state = readLoginUrlState();
      setSchoolFromQuery(state.school);
      setChangeSchool(state.changeSchool);
      setLibraryLogin(state.library);
    };
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, [pathname]);

  useEffect(() => {
    if (libraryLogin) markSchoolLoginLibraryIntent();
  }, [libraryLogin]);

  useEffect(() => {
    const urlState = readLoginUrlState();
    if (urlState.changeSchool || urlState.library) {
      if (!changeSchoolResetDoneRef.current) {
        changeSchoolResetDoneRef.current = true;
        clearSchoolChooserSession();
      }
      setInitialSchoolId(undefined);
      return;
    }
    changeSchoolResetDoneRef.current = false;

    if (schoolFromQuery) {
      setInitialSchoolId(normalizeSchoolId(schoolFromQuery) || undefined);
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

    const inferred = normalizeSchoolId(fromReferrer || fromStorage);
    if (inferred) setInitialSchoolId(inferred);
  }, [changeSchool, clearSchoolChooserSession, schoolFromQuery]);

  return (
    <SchoolDeveloperLoginForm
      key={libraryLogin ? 'library-login' : changeSchool ? 'change-school' : initialSchoolId ?? 'login'}
      mode="full"
      initialSchoolId={libraryLogin ? undefined : initialSchoolId}
      libraryLogin={libraryLogin}
    />
  );
}
