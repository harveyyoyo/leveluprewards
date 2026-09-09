'use client';

import type { LibraryItem } from '@/lib/types';
import { libraryBarcodeForPrint, type LibraryLabelFormat } from '@/lib/library/libraryScanCode';
import { resolveBookClassification } from '@/lib/library/libraryClassification';
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
  const classification = resolveBookClassification(item.category, null, item.shelfLocation);
  const genre = classification.genre;
  const shelf = item.shelfLocation?.trim() || classification.shelfLocation;
  const titleFit = title.length >= 36 ? 'text-[7pt]' : title.length >= 28 ? 'text-[8pt]' : 'text-[9pt]';
  const meta = [item.author, shelf ? `Shelf: ${shelf}` : null, item.copyNumber ? `Copy ${item.copyNumber}` : null]
    .filter(Boolean)
    .join(' · ');

  if (format === 'spine') {
    return (
      <div
        className={cn('library-barcode-sticker library-barcode-sticker--spine relative overflow-hidden', className)}
        style={{
          borderLeft: `4px solid ${genre.color}`,
          printColorAdjust: 'exact',
          WebkitPrintColorAdjust: 'exact',
        }}
      >
        <div
          className="text-[6pt] font-black uppercase tracking-wider px-1 py-0.5 rounded text-white text-center"
          style={{
            backgroundColor: genre.color,
            printColorAdjust: 'exact',
            WebkitPrintColorAdjust: 'exact',
          }}
        >
          {genre.callPrefix}
        </div>
        <div className="font-bold text-[8pt] text-slate-900 truncate leading-tight">{title}</div>
        <p className="text-[6pt] text-slate-600 font-mono truncate">{shelf || barcode}</p>
        <p className="library-barcode-sticker-upc font-mono text-[5.5pt] text-slate-500">{barcode}</p>
      </div>
    );
  }

  return (
    <div
      className={cn('library-barcode-sticker', `library-barcode-sticker--${format}`, 'relative overflow-hidden', className)}
      style={{
        borderTop: `3.5px solid ${genre.color}`,
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact',
      }}
    >
      <div className="w-full flex items-center justify-between gap-1 text-[5.5pt]">
        <span className="library-barcode-sticker-school truncate font-bold text-slate-500">{schoolName}</span>
        <span
          className="font-bold uppercase tracking-wide px-1.5 py-0.5 rounded text-[5.5pt] text-white shrink-0"
          style={{
            backgroundColor: genre.color,
            printColorAdjust: 'exact',
            WebkitPrintColorAdjust: 'exact',
          }}
        >
          {genre.callPrefix} · {genre.label}
        </span>
      </div>

      <div className={cn('library-barcode-sticker-title font-bold leading-tight text-slate-900', titleFit)}>
        {title}
      </div>

      {meta ? (
        <p className="library-barcode-sticker-meta truncate text-[6.5pt] text-slate-600 font-medium">{meta}</p>
      ) : null}

      <div
        className="w-full rounded px-1 py-0.5 border"
        style={{ borderColor: `${genre.color}40`, backgroundColor: `${genre.color}08` }}
      >
        <PrintBarcode value={barcode} variant="library-sticker" className="library-barcode-sticker-code w-full" />
      </div>
      <p className="library-barcode-sticker-upc font-mono text-[6pt] text-slate-500 flex items-center justify-between w-full px-1">
        <span>{barcode}</span>
        {shelf ? <span className="font-sans text-[5.5pt] text-slate-600 truncate">📍 {shelf}</span> : null}
      </p>
    </div>
  );
}
