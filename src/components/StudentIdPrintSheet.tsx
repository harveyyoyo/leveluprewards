'use client';

import { useMemo } from 'react';
import type { Student, Class } from '@/lib/types';
import { StudentIdCard } from './StudentIdCard';
import { useSettings } from './providers/SettingsProvider';

import { APP_NAME, APP_TAGLINE } from '@/lib/app-branding';

interface StudentIdPrintSheetProps {
  students: Student[];
  classes: Class[];
  schoolId: string | null;
  appConfig: { appLogoUrl?: string; appName?: string; appTagline?: string } | null;
  schoolData: { name?: string; logoUrl?: string } | null;
}

export function StudentIdPrintSheet({ students, classes, schoolId, appConfig, schoolData }: StudentIdPrintSheetProps) {
  const { settings } = useSettings();

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

  if (students.length === 0) {
    return null;
  }

  // Chunk students into groups of 8 (since Avery 25395 has 8 labels per page)
  const studentChunks = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < students.length; i += 8) {
      chunks.push(students.slice(i, i + 8));
    }
    return chunks;
  }, [students]);

  return (
    <div id="student-id-print-wrapper">
      {studentChunks.map((chunk, pageIndex) => (
        <div key={pageIndex} className="student-id-print-page">
          {chunk.map((s) => (
            <StudentIdCard
              key={s.id}
              student={s}
              schoolName={schoolName}
              schoolLogoUrl={schoolData?.logoUrl ?? null}
              className={getClassName(s.classId || '')}
              isColorEnabled={settings.enableColorPrinting}
              appLogoUrl={appLogoUrl}
              appName={appName}
              appTagline={appTagline}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
