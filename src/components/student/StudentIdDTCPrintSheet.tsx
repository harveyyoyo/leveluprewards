'use client';

import { useMemo, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Student, Class } from '@/lib/types';
import { StudentIdCard } from './StudentIdCard';
import { useSettings } from '../providers/SettingsProvider';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { APP_NAME, APP_TAGLINE } from '@/lib/appBranding';

interface StudentIdDTCPrintSheetProps {
  students: Student[];
  classes: Class[];
  schoolId: string | null;
  onReady: () => void;
}

export function StudentIdDTCPrintSheet({ students, classes, schoolId, onReady }: StudentIdDTCPrintSheetProps) {
  const { settings } = useSettings();
  const firestore = useFirestore();
  const appConfigRef = useMemoFirebase(() => (firestore ? doc(firestore, 'appConfig', 'global') : null), [firestore]);
  const schoolDocRef = useMemoFirebase(() => (firestore && schoolId ? doc(firestore, 'schools', schoolId) : null), [firestore, schoolId]);
  const { data: appConfig, isLoading: isAppConfigLoading } = useDoc<{ appLogoUrl?: string; appName?: string; appTagline?: string }>(appConfigRef);
  const { data: schoolData, isLoading: isSchoolLoading } = useDoc<{ name?: string; logoUrl?: string }>(schoolDocRef);

  const [bodyEl, setBodyEl] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    setBodyEl(document.body);
  }, []);

  useLayoutEffect(() => {
    document.body.classList.add('dtc-card-printing');
    return () => {
      document.body.classList.remove('dtc-card-printing');
    };
  }, []);

  useEffect(() => {
    if (isAppConfigLoading || isSchoolLoading) return;
    let cancelled = false;
    let t: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      // Ensure theme Google Fonts are loaded before print so the PDF matches the theme wizard.
      const families = new Set(
        students.map((s) => s.theme?.fontFamily).filter(Boolean) as string[],
      );
      if (settings.enableStudentThemes !== false && settings.defaultStudentTheme?.fontFamily) {
        families.add(settings.defaultStudentTheme.fontFamily);
      }
      if (families.size > 0 && typeof document !== 'undefined' && document.fonts?.load) {
        try {
          await Promise.all(
            [...families].map((ff) => document.fonts.load(`800 14px "${ff}"`))
          );
        } catch {
          // ignore
        }
      }
      if (cancelled) return;
      t = setTimeout(() => {
        requestAnimationFrame(() => onReady());
      }, 100);
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

  const schoolName = schoolData?.name?.trim() || 'School';
  const appName = appConfig?.appName?.trim() || APP_NAME;
  const appTagline = appConfig?.appTagline?.trim() ?? APP_TAGLINE;
  const appLogoUrl = appConfig?.appLogoUrl || null;

  if (students.length === 0 || !bodyEl) {
    return null;
  }

  const content = (
    <div id="student-id-dtc-print-wrapper" aria-hidden>
      <style dangerouslySetInnerHTML={{__html: `
        #student-id-dtc-print-wrapper {
          position: fixed;
          left: -10000px;
          top: 0;
          width: 85.6mm;
          height: auto;
          background: white;
          z-index: -1;
          pointer-events: none;
        }
        @media print {
          @page {
            size: 85.6mm 53.98mm;
            margin: 0 !important;
          }
          body.dtc-card-printing > *:not(#student-id-dtc-print-wrapper) {
            display: none !important;
          }
          html, body.dtc-card-printing {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color: black !important;
          }
          body.dtc-card-printing #student-id-dtc-print-wrapper {
            position: static !important;
            left: 0 !important;
            top: 0 !important;
            width: 85.6mm !important;
            max-width: 85.6mm !important;
            background: white !important;
            display: block !important;
            visibility: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            pointer-events: auto !important;
            z-index: auto !important;
          }
          /* Let theme colors / emoji render; no blanket filter/animation only where needed */
          body.dtc-card-printing #student-id-dtc-print-wrapper * {
            visibility: visible !important;
            transition: none !important;
            animation: none !important;
          }
          body.dtc-card-printing #student-id-dtc-print-wrapper .dtc-page {
            page-break-after: always !important;
            break-after: page !important;
          }
          body.dtc-card-printing #student-id-dtc-print-wrapper .dtc-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}} />
      {students.map((s) => (
        <div key={s.id} className="dtc-page">
          <StudentIdCard
            student={s}
            schoolName={schoolName}
            schoolLogoUrl={schoolData?.logoUrl ?? null}
            className={getClassName(s.classId || '')}
            isColorEnabled={settings.enableColorPrinting}
            appLogoUrl={appLogoUrl}
            appName={appName}
            appTagline={appTagline}
          />
        </div>
      ))}
    </div>
  );

  return createPortal(content, bodyEl);
}
