'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { RecessReasonMeta } from '@/lib/recess/recessReasons';
import { RecessPassCard } from '@/components/recess/RecessPassCard';
import { waitForPrintBarcodes } from '@/lib/printBarcode';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

interface RecessPassDTCPrintSheetProps {
  passes: RecessReasonMeta[];
  schoolId: string | null;
  onReady: () => void;
  cornerStyle?: 'rounded' | 'rectangular';
}

export function RecessPassDTCPrintSheet({
  passes,
  schoolId,
  onReady,
  cornerStyle,
}: RecessPassDTCPrintSheetProps) {
  const firestore = useFirestore();
  const schoolDocRef = useMemoFirebase(
    () => (firestore && schoolId ? doc(firestore, 'schools', schoolId) : null),
    [firestore, schoolId],
  );
  const { data: schoolData, isLoading: isSchoolLoading } = useDoc<{ name?: string }>(schoolDocRef);

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
    if (isSchoolLoading) return;
    let cancelled = false;
    void waitForPrintBarcodes().then(() => {
      if (cancelled) return;
      requestAnimationFrame(() => onReady());
    });
    return () => {
      cancelled = true;
    };
  }, [isSchoolLoading, onReady, passes]);

  if (passes.length === 0 || !bodyEl) {
    return null;
  }

  const schoolName = schoolData?.name?.trim() || 'School';

  const content = (
    <div id="student-id-dtc-print-wrapper" aria-hidden>
      <style
        dangerouslySetInnerHTML={{
          __html: `
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
      `,
        }}
      />
      {passes.map((meta) => (
        <div key={meta.value} className="dtc-page">
          <RecessPassCard meta={meta} schoolName={schoolName} cornerStyle={cornerStyle} />
        </div>
      ))}
    </div>
  );

  return createPortal(content, bodyEl);
}
