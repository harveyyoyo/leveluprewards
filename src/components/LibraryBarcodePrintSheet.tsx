'use client';

import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { LibraryItem } from '@/lib/types';
import { LibraryBarcodeSticker } from './LibraryBarcodeSticker';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

interface LibraryBarcodePrintSheetProps {
  items: LibraryItem[];
  schoolId: string | null;
  onReady: () => void;
}

const STICKERS_PER_PAGE = 30;

export function LibraryBarcodePrintSheet({ items, schoolId, onReady }: LibraryBarcodePrintSheetProps) {
  const firestore = useFirestore();
  const schoolDocRef = useMemoFirebase(
    () => (firestore && schoolId ? doc(firestore, 'schools', schoolId) : null),
    [firestore, schoolId],
  );
  const { data: schoolData, isLoading: isSchoolLoading } = useDoc<{ name?: string }>(schoolDocRef);

  useEffect(() => {
    document.body.classList.add('library-barcode-printing');
    let t: ReturnType<typeof setTimeout> | undefined;
    if (!isSchoolLoading) {
      t = setTimeout(() => onReady(), 100);
    }
    return () => {
      if (t) clearTimeout(t);
      document.body.classList.remove('library-barcode-printing');
    };
  }, [isSchoolLoading, onReady]);

  const pages = useMemo(() => {
    const chunks: LibraryItem[][] = [];
    for (let i = 0; i < items.length; i += STICKERS_PER_PAGE) {
      chunks.push(items.slice(i, i + STICKERS_PER_PAGE));
    }
    return chunks;
  }, [items]);

  if (items.length === 0) return null;

  const schoolName = schoolData?.name?.trim() || (schoolId ? schoolId.replace(/_/g, ' ') : 'School');

  const sheet = (
    <div id="library-barcode-print-wrapper">
      {pages.map((chunk, pageIndex) => (
        <div key={pageIndex} className="library-barcode-print-page">
          {chunk.map((item) => (
            <LibraryBarcodeSticker key={item.id} item={item} schoolName={schoolName} />
          ))}
        </div>
      ))}
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(sheet, document.body);
}
