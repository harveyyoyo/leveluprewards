'use client';

import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { Prize } from '@/lib/types';
import { PrizeIdCard } from './PrizeIdCard';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { APP_NAME, APP_TAGLINE } from '@/lib/appBranding';

interface PrizeIdPrintSheetProps {
  prizes: Prize[];
  schoolId: string | null;
  onReady: () => void;
}

export function PrizeIdPrintSheet({ prizes, schoolId, onReady }: PrizeIdPrintSheetProps) {
  const firestore = useFirestore();
  const appConfigRef = useMemoFirebase(() => (firestore ? doc(firestore, 'appConfig', 'global') : null), [firestore]);
  const schoolDocRef = useMemoFirebase(() => (firestore && schoolId ? doc(firestore, 'schools', schoolId) : null), [firestore, schoolId]);
  const { data: appConfig, isLoading: isAppConfigLoading } = useDoc<{ appLogoUrl?: string; appName?: string; appTagline?: string }>(appConfigRef);
  const { data: schoolData, isLoading: isSchoolLoading } = useDoc<{ name?: string; logoUrl?: string }>(schoolDocRef);

  useEffect(() => {
    document.body.classList.add('id-card-printing');
    let t: ReturnType<typeof setTimeout> | undefined;
    if (!isAppConfigLoading && !isSchoolLoading) {
      t = setTimeout(() => onReady(), 100);
    }
    return () => {
      if (t) clearTimeout(t);
      document.body.classList.remove('id-card-printing');
    };
  }, [isAppConfigLoading, isSchoolLoading, onReady]);

  const prizeChunks = useMemo(() => {
    const chunks: Prize[][] = [];
    for (let i = 0; i < prizes.length; i += 8) {
      chunks.push(prizes.slice(i, i + 8));
    }
    return chunks;
  }, [prizes]);

  if (prizes.length === 0) return null;

  const schoolName = schoolData?.name?.trim() || 'School';
  const appName = appConfig?.appName?.trim() || APP_NAME;
  const appTagline = appConfig?.appTagline?.trim() ?? APP_TAGLINE;
  const appLogoUrl = appConfig?.appLogoUrl || null;

  const sheet = (
    <div id="student-id-print-wrapper">
      {prizeChunks.map((chunk, pageIndex) => (
        <div key={pageIndex} className="student-id-print-page">
          {chunk.map((p) => (
            <PrizeIdCard
              key={p.id}
              prize={p}
              schoolName={schoolName}
              schoolLogoUrl={schoolData?.logoUrl ?? null}
              className="student-id-print-slot"
              appLogoUrl={appLogoUrl}
              appName={appName}
              appTagline={appTagline}
            />
          ))}
        </div>
      ))}
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(sheet, document.body);
}
