'use client';

import { useMemo, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Student, Class } from '@/lib/types';
import { StudentIdCard } from './StudentIdCard';
import { useSettings } from './providers/SettingsProvider';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { APP_NAME, APP_TAGLINE } from '@/lib/app-branding';

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

  // Track when document.body is available so we can portal into it.
  const [bodyEl, setBodyEl] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    setBodyEl(document.body);
  }, []);

  // Tag the document so the dedicated print rules apply.
  // Use layout effect so the class is applied before print preview captures layout.
  useLayoutEffect(() => {
    document.body.classList.add('dtc-card-printing');
    return () => {
      document.body.classList.remove('dtc-card-printing');
    };
  }, []);

  // Trigger print dialog only after the async configurations have finished loading.
  useEffect(() => {
    if (!isAppConfigLoading && !isSchoolLoading) {
      const t = setTimeout(() => {
        requestAnimationFrame(() => onReady());
      }, 100);
      return () => clearTimeout(t);
    }
  }, [isAppConfigLoading, isSchoolLoading, onReady]);

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
        /*
         * Standard credit card / ID-1 size per ISO/IEC 7810: 85.6mm x 53.98mm.
         * This is the universal "credit card" size used by all card printers
         * (Fargo DTC, Zebra ZC, etc.) and by physical credit cards.
         */

        /* Off-screen on the regular UI; only visible during print. */
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
            /* Credit card / ID-1 (ISO/IEC 7810) — 85.6mm x 53.98mm landscape */
            size: 85.6mm 53.98mm;
            margin: 0 !important;
          }

          /* While DTC printing, hide all body children EXCEPT the wrapper. */
          body.dtc-card-printing > *:not(#student-id-dtc-print-wrapper) {
            display: none !important;
          }

          html,
          body.dtc-card-printing {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body.dtc-card-printing #student-id-dtc-print-wrapper {
            position: static !important;
            left: 0 !important;
            top: 0 !important;
            width: 85.6mm !important;
            max-width: 85.6mm !important;
            height: auto !important;
            background: white !important;
            z-index: auto !important;
            pointer-events: auto !important;
            display: block !important;
            visibility: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
          }

          body.dtc-card-printing #student-id-dtc-print-wrapper * {
            visibility: visible !important;
            box-shadow: none !important;
            text-shadow: none !important;
            filter: none !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            transform: none !important;
            transition: none !important;
            animation: none !important;
          }

          /* Each card = one credit-card-sized page. Rigidly enforced. */
          body.dtc-card-printing #student-id-dtc-print-wrapper .dtc-page {
            width: 85.6mm !important;
            height: 53.98mm !important;
            min-width: 85.6mm !important;
            min-height: 53.98mm !important;
            max-width: 85.6mm !important;
            max-height: 53.98mm !important;
            overflow: hidden !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
            break-after: page !important;
            break-inside: avoid !important;
            position: relative !important;
            background: white !important;
            box-sizing: border-box !important;
            display: flex !important;
            align-items: stretch !important;
            justify-content: stretch !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            border-radius: 0 !important;
          }

          body.dtc-card-printing #student-id-dtc-print-wrapper .dtc-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          /*
           * The global print stylesheet sizes .print-id-card for Avery labels
           * (width: 100%, min-height: 64mm). For DTC we MUST override to a
           * rigid credit-card size (85.6mm x 53.98mm) so the card is always
           * the size of a credit card, regardless of selected paper or printer.
           */
          body.dtc-card-printing #student-id-dtc-print-wrapper .dtc-page .print-id-card,
          body.dtc-card-printing #student-id-dtc-print-wrapper .print-id-card {
            width: 85.6mm !important;
            height: 53.98mm !important;
            min-width: 85.6mm !important;
            min-height: 53.98mm !important;
            max-width: 85.6mm !important;
            max-height: 53.98mm !important;
            padding: 3mm 3.5mm !important;
            margin: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
            flex: 0 0 auto !important;
            overflow: hidden !important;
          }

          /* Lift barcode slightly so it doesn't kiss the bottom edge. */
          body.dtc-card-printing #student-id-dtc-print-wrapper .print-id-barcode-container {
            margin-top: 1.8mm !important;
            padding-top: 1.8mm !important;
            padding-bottom: 2.6mm !important;
            border-radius: 2mm !important;
          }

          /* The barcode font is vertically scaled globally; on a fixed-height CR80/ID-1 card
             that can cause bottom clipping. Slightly reduce scale for DTC printing. */
          body.dtc-card-printing #student-id-dtc-print-wrapper .print-id-barcode-container .font-barcode,
          body.dtc-card-printing #student-id-dtc-print-wrapper .font-barcode {
            transform: scaleY(1.25) !important;
            transform-origin: top !important;
            line-height: 0.75 !important;
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
