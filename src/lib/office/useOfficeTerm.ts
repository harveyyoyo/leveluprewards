'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSuggestedTermLabel } from '@/lib/office/officeUtils';

export function useOfficeTerm(schoolId: string | null) {
  const storageKey = schoolId ? `office-active-term-${schoolId}` : '';
  const suggested = getSuggestedTermLabel();
  const [term, setTermState] = useState(suggested);

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return;
    const saved = localStorage.getItem(storageKey);
    setTermState(saved?.trim() || suggested);
  }, [storageKey, suggested]);

  const setTerm = useCallback(
    (value: string) => {
      const next = value.trim() || suggested;
      setTermState(next);
      if (storageKey && typeof window !== 'undefined') {
        localStorage.setItem(storageKey, next);
      }
    },
    [storageKey, suggested],
  );

  return { term, setTerm, suggestedTerm: suggested };
}
