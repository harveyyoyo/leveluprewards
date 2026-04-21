'use client';

import { useMemo } from 'react';
import type { Student, Class } from '@/lib/types';
import { StudentIdCard } from './StudentIdCard';
import { useSettings } from './providers/SettingsProvider';

import { APP_NAME, APP_TAGLINE } from '@/lib/app-branding';

interface StudentIdDTCPrintSheetProps {
  students: Student[];
  classes: Class[];
  schoolId: string | null;
  appConfig: { appLogoUrl?: string; appName?: string; appTagline?: string } | null;
  schoolData: { name?: string; logoUrl?: string } | null;
}

export function StudentIdDTCPrintSheet({ students, classes, schoolId, appConfig, schoolData }: StudentIdDTCPrintSheetProps) {
  const { settings } = useSettings();

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

  if (students.length === 0) {
    return null;
  }

  return (
    <div id="student-id-dtc-print-wrapper">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          title { display: none; }
          @page {
            /* CR80 card size (landscape) for Fargo DTC printers */
            size: 3.375in 2.125in;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            background-color: white;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #student-id-dtc-print-wrapper {
            display: block !important;
            visibility: visible !important;
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 999999;
            background: white;
          }
          #student-id-dtc-print-wrapper .dtc-page {
            width: 3.375in;
            height: 2.125in;
            overflow: hidden;
            page-break-after: always;
            position: relative;
            background: white;
            box-sizing: border-box;
            display: flex;
            align-items: stretch;
            justify-content: stretch;
          }

          /*
           * The global print stylesheet sizes .print-id-card for Avery labels.
           * For DTC printing we must override to full CR80, otherwise the card is
           * scaled/cropped and looks like it isn't "full page".
           */
          #student-id-dtc-print-wrapper .dtc-page .print-id-card {
            width: 3.375in !important;
            height: 2.125in !important;
            min-width: 3.375in !important;
            min-height: 2.125in !important;
            max-width: 3.375in !important;
            max-height: 2.125in !important;
            padding: 0.12in 0.14in !important;
            margin: 0 !important;
            border-radius: 0 !important;
          }

          /* global.css already hides #screen-view, .no-print, etc. */
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
}
