'use client';

import type { LibraryItem } from '@/lib/types';
import { libraryBarcodeForPrint, type LibraryLabelFormat } from '@/lib/library/libraryScanCode';
import { PrintBarcode } from '@/components/print/PrintBarcode';
import { cn } from '@/lib/utils';

export function LibraryBarcodeSticker({
  item,
  schoolName,
  format = 'sticker',
  className,
}: {
  item: LibraryItem;
  schoolName: string;
  format?: LibraryLabelFormat;
  className?: string;
}) {
  const barcode = libraryBarcodeForPrint(item);
  const title = item.name ?? '';
  const titleFit = title.length >= 36 ? 'text-[7pt]' : title.length >= 28 ? 'text-[8pt]' : 'text-[9pt]';
  const meta = [item.author, item.shelfLocation, item.copyNumber ? `Copy ${item.copyNumber}` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className={cn('library-barcode-sticker', `library-barcode-sticker--${format}`, className)}>
      <div className="library-barcode-sticker-school truncate">{schoolName}</div>
      <div className={cn('library-barcode-sticker-title font-bold leading-tight text-slate-900', titleFit)}>
        {title}
      </div>
      {meta ? (
        <p className="library-barcode-sticker-meta truncate text-[6.5pt] text-slate-600">{meta}</p>
      ) : null}
      <PrintBarcode value={barcode} variant="library-sticker" className="library-barcode-sticker-code w-full" />
      <p className="library-barcode-sticker-upc font-mono text-[6pt] text-slate-500">{barcode}</p>
    </div>
  );
}
