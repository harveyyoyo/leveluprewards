'use client';

import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { StaffIdCardSubject } from '@/lib/staff/staffIdCardSubject';
import { StaffIdCard } from './StaffIdCard';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { APP_NAME, APP_TAGLINE } from '@/lib/appBranding';

interface StaffIdPrintSheetProps {
  subjects: StaffIdCardSubject[];
  schoolId: string | null;
  onReady: () => void;
  cornerStyle?: 'rounded' | 'rectangular';
}

export function StaffIdPrintSheet({ subjects, schoolId, onReady, cornerStyle }: StaffIdPrintSheetProps) {
  const { settings } = useSettings();
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

  const subjectChunks = useMemo(() => {
    const chunks: StaffIdCardSubject[][] = [];
    for (let i = 0; i < subjects.length; i += 8) {
      chunks.push(subjects.slice(i, i + 8));
    }
    return chunks;
  }, [subjects]);

  if (subjects.length === 0) return null;

  const schoolName = schoolData?.name?.trim() || 'School';
  const appName = appConfig?.appName?.trim() || APP_NAME;
  const appTagline = appConfig?.appTagline?.trim() ?? APP_TAGLINE;
  const appLogoUrl = appConfig?.appLogoUrl || null;

  const sheet = (
    <div id="student-id-print-wrapper">
      {subjectChunks.map((chunk, pageIndex) => (
        <div key={pageIndex} className="student-id-print-page">
          {chunk.map((subject) => (
            <StaffIdCard
              key={subject.kind === 'teacher' ? subject.teacher.id : subject.account.id}
              subject={subject}
              schoolName={schoolName}
              schoolLogoUrl={schoolData?.logoUrl ?? null}
              isColorEnabled={settings.enableColorPrinting}
              appLogoUrl={appLogoUrl}
              appName={appName}
              appTagline={appTagline}
              cornerStyle={cornerStyle}
            />
          ))}
        </div>
      ))}
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(sheet, document.body);
}
