'use client';

import type { LibraryItem } from '@/lib/types';
import { libraryBarcodeForPrint } from '@/lib/libraryScanCode';
import { cn } from '@/lib/utils';

export function LibraryBarcodeSticker({
  item,
  schoolName,
  className,
}: {
  item: LibraryItem;
  schoolName: string;
  className?: string;
}) {
  const barcode = libraryBarcodeForPrint(item);
  const titleFit = item.name.length >= 36 ? 'text-[7pt]' : item.name.length >= 28 ? 'text-[8pt]' : 'text-[9pt]';
  const meta = [item.author, item.shelfLocation, item.copyNumber ? `Copy ${item.copyNumber}` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className={cn('library-barcode-sticker', className)}>
      <div className="library-barcode-sticker-school truncate">{schoolName}</div>
      <div className={cn('library-barcode-sticker-title font-bold leading-tight text-slate-900', titleFit)}>
        {item.name}
      </div>
      {meta ? (
        <p className="library-barcode-sticker-meta truncate text-[6.5pt] text-slate-600">{meta}</p>
      ) : null}
      <div
        className="library-barcode-sticker-code font-barcode leading-none text-black"
        style={{ color: '#000000' }}
      >
        *{barcode}*
      </div>
      <p className="library-barcode-sticker-upc font-mono text-[6pt] text-slate-500">{barcode}</p>
    </div>
  );
}
