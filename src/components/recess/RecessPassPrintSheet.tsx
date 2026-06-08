'use client';

import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { RecessReasonMeta } from '@/lib/recess/recessReasons';
import { RecessPassCard } from '@/components/recess/RecessPassCard';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

export function RecessPassPrintSheet({
  passes,
  schoolId,
  onReady,
}: {
  passes: RecessReasonMeta[];
  schoolId: string;
  onReady: () => void;
}) {
  const firestore = useFirestore();
  const schoolDocRef = useMemoFirebase(
    () => (firestore && schoolId ? doc(firestore, 'schools', schoolId) : null),
    [firestore, schoolId],
  );
  const { data: schoolData, isLoading } = useDoc<{ name?: string }>(schoolDocRef);

  useEffect(() => {
    document.body.classList.add('id-card-printing');
    let t: ReturnType<typeof setTimeout> | undefined;
    if (!isLoading) {
      t = setTimeout(() => onReady(), 120);
    }
    return () => {
      if (t) clearTimeout(t);
      document.body.classList.remove('id-card-printing');
    };
  }, [isLoading, onReady]);

  const pages = useMemo(() => {
    const chunks: RecessReasonMeta[][] = [];
    for (let i = 0; i < passes.length; i += 6) {
      chunks.push(passes.slice(i, i + 6));
    }
    return chunks;
  }, [passes]);

  if (passes.length === 0) return null;

  const schoolName = schoolData?.name?.trim() || 'School';

  const sheet = (
    <div id="student-id-print-wrapper">
      {pages.map((chunk, pageIndex) => (
        <div key={pageIndex} className="student-id-print-page">
          {chunk.map((meta) => (
            <div key={meta.value} className="student-id-print-slot">
              <RecessPassCard meta={meta} schoolName={schoolName} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(sheet, document.body);
}
