'use client';

import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { LibraryItem } from '@/lib/types';
import { getLibraryLabelOption, type LibraryLabelFormat } from '@/lib/library/libraryScanCode';
import { LibraryBarcodeSticker } from './LibraryBarcodeSticker';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

interface LibraryBarcodePrintSheetProps {
  items: LibraryItem[];
  format?: LibraryLabelFormat;
  schoolId: string | null;
  startOffset?: number;
  onReady: () => void;
}

export function LibraryBarcodePrintSheet({
  items,
  format = 'sticker',
  schoolId,
  startOffset = 0,
  onReady,
}: LibraryBarcodePrintSheetProps) {
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
    const opt = getLibraryLabelOption(format);
    const perPage = opt.itemsPerPage;

    if (format === 'thermal') {
      // Thermal rolls print 1 label per page
      return items.map((item) => [item]);
    }

    const offset = Math.max(0, Math.min(startOffset ?? 0, perPage - 1));
    const chunks: (LibraryItem | null)[][] = [];

    let cursor = 0;
    // Page 1 with offset spacers
    const firstPageSlots: (LibraryItem | null)[] = [];
    for (let o = 0; o < offset; o++) {
      firstPageSlots.push(null);
    }
    const firstPageFill = Math.min(perPage - offset, items.length);
    for (let i = 0; i < firstPageFill; i++) {
      firstPageSlots.push(items[cursor++]);
    }
    chunks.push(firstPageSlots);

    // Subsequent pages
    while (cursor < items.length) {
      const pageSlice = items.slice(cursor, cursor + perPage);
      chunks.push(pageSlice);
      cursor += perPage;
    }

    return chunks;
  }, [items, format, startOffset]);

  if (items.length === 0) return null;

  const schoolName = schoolData?.name?.trim() || (schoolId ? schoolId.replace(/_/g, ' ') : 'School');

  const sheet = (
    <div id="library-barcode-print-wrapper" data-label-format={format}>
      {pages.map((chunk, pageIndex) => (
        <div key={pageIndex} className="library-barcode-print-page">
          {chunk.map((item, itemIndex) =>
            item ? (
              <LibraryBarcodeSticker
                key={`${item.id}-${pageIndex}-${itemIndex}`}
                item={item}
                schoolName={schoolName}
                format={format}
              />
            ) : (
              <div
                key={`offset-${pageIndex}-${itemIndex}`}
                className="library-barcode-sticker-placeholder"
                style={{ visibility: 'hidden' }}
                aria-hidden="true"
              />
            ),
          )}
        </div>
      ))}
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(sheet, document.body);
}
