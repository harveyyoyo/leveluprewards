'use client';

import { useMemo, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Student, Class } from '@/lib/types';
import { StudentIdCard } from './StudentIdCard';
import { useSettings } from '../providers/SettingsProvider';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { APP_NAME, APP_TAGLINE } from '@/lib/appBranding';

interface StudentIdPrintSheetProps {
  students: Student[];
  classes: Class[];
  schoolId: string | null;
  onReady: () => void;
  cornerStyle?: 'rounded' | 'rectangular';
}

export function StudentIdPrintSheet({ students, classes, schoolId, onReady, cornerStyle }: StudentIdPrintSheetProps) {
  const { settings } = useSettings();
  const firestore = useFirestore();
  const appConfigRef = useMemoFirebase(() => (firestore ? doc(firestore, 'appConfig', 'global') : null), [firestore]);
  const schoolDocRef = useMemoFirebase(() => (firestore && schoolId ? doc(firestore, 'schools', schoolId) : null), [firestore, schoolId]);
  const { data: appConfig, isLoading: isAppConfigLoading } = useDoc<{ appLogoUrl?: string; appName?: string; appTagline?: string }>(appConfigRef);
  const { data: schoolData, isLoading: isSchoolLoading } = useDoc<{ name?: string; logoUrl?: string }>(schoolDocRef);

  useLayoutEffect(() => {
    document.body.classList.add('id-card-printing');
    return () => {
      document.body.classList.remove('id-card-printing');
    };
  }, []);

  // Trigger print dialog only after configs (and theme fonts) are ready
  useEffect(() => {
    if (isAppConfigLoading || isSchoolLoading) return;
    let cancelled = false;
    let t: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      const families = new Set<string>();
      if (settings.enableStudentThemes !== false && settings.defaultStudentTheme?.fontFamily) {
        families.add(settings.defaultStudentTheme.fontFamily);
      }
      for (const s of students) {
        if (s.theme?.fontFamily) families.add(s.theme.fontFamily);
      }
      if (families.size > 0 && typeof document !== 'undefined' && document.fonts?.load) {
        try {
          await Promise.all([...families].map((ff) => document.fonts.load(`800 14px "${ff}"`)));
        } catch {
          // ignore
        }
      }
      if (cancelled) return;
      t = setTimeout(() => {
        requestAnimationFrame(() => onReady());
      }, 220);
    })();
    return () => {
      cancelled = true;
      if (t) clearTimeout(t);
    };
  }, [isAppConfigLoading, isSchoolLoading, onReady, students, settings.defaultStudentTheme?.fontFamily, settings.enableStudentThemes]);

  const classMap = useMemo(() => {
    if (!classes) return new Map<string, string>();
    return new Map(classes.map(c => [c.id, c.name]));
  }, [classes]);

  const getClassName = (classId: string) => {
    return classMap.get(classId) || 'Unassigned';
  };

  // Always show the exact school name stored in Firestore.
  // Fall back to a generic label only if the document somehow has no name.
  const schoolName = schoolData?.name?.trim() || 'School';
  const appName = appConfig?.appName?.trim() || APP_NAME;
  const appTagline = appConfig?.appTagline?.trim() ?? APP_TAGLINE;
  const appLogoUrl = appConfig?.appLogoUrl || null;

  // Chunk students into groups of 8 (since Avery 25395 has 8 labels per page)
  const studentChunks = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < students.length; i += 8) {
      chunks.push(students.slice(i, i + 8));
    }
    return chunks;
  }, [students]);

  if (students.length === 0) {
    return null;
  }

  const sheet = (
    <div id="student-id-print-wrapper">
      {studentChunks.map((chunk, pageIndex) => (
        <div key={pageIndex} className="student-id-print-page">
          {chunk.map((s) => (
            <div key={s.id} className="student-id-print-slot">
              <StudentIdCard
                student={s}
                schoolName={schoolName}
                schoolLogoUrl={schoolData?.logoUrl ?? null}
                className={getClassName(s.classId || '')}
                isColorEnabled={settings.enableColorPrinting}
                appLogoUrl={appLogoUrl}
                appName={appName}
                appTagline={appTagline}
                cornerStyle={cornerStyle}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(sheet, document.body);
}
