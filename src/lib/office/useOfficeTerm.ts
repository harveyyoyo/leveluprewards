'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSuggestedTermLabel } from '@/lib/office/officeUtils';
import { useOfficeSettings } from '@/lib/office/useOfficeSettings';

export function useOfficeTerm(schoolId: string | null) {
  const storageKey = schoolId ? `office-active-term-${schoolId}` : '';
  const suggested = getSuggestedTermLabel();
  const { settings } = useOfficeSettings(schoolId);
  const schoolDefault = settings?.defaultActiveTerm?.trim() || '';
  const [term, setTermState] = useState(schoolDefault || suggested);

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return;
    const saved = localStorage.getItem(storageKey);
    setTermState(saved?.trim() || schoolDefault || suggested);
  }, [storageKey, suggested, schoolDefault]);

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

  const configuredTerms = settings?.configuredTerms?.filter((t) => t?.trim()) ?? [];

  return { term, setTerm, suggestedTerm: suggested, configuredTerms };
}
