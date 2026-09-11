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

  // 1. SLIM SPINE LABEL (Avery 5167: 1/2" x 1-3/4")
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
        <div className="flex items-center gap-1.5 w-full h-full">
          <div
            className="h-full px-1.5 py-0.5 rounded-xs text-white text-center font-black text-[7pt] uppercase flex items-center justify-center shrink-0"
            style={{
              backgroundColor: genre.color,
              printColorAdjust: 'exact',
              WebkitPrintColorAdjust: 'exact',
            }}
          >
            {genre.callPrefix}
          </div>
          <div className="min-w-0 flex-1 flex flex-col justify-between h-full py-0.5">
            <div className="font-bold text-[7pt] text-slate-900 truncate leading-tight">{title}</div>
            <div className="flex items-center justify-between text-[5.5pt] font-mono text-slate-600">
              <span className="truncate">{shelf || item.author || 'General'}</span>
              <span className="font-bold text-slate-900 ml-1">{barcode}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. SQUARE SPINE LABEL (1" x 1-1/2")
  if (format === 'spine_square') {
    const authorCutter = (item.author ?? '').trim().split(/\s+/).pop()?.slice(0, 3).toUpperCase() || 'LIB';
    return (
      <div
        className={cn('library-barcode-sticker library-barcode-sticker--spine_square relative overflow-hidden flex flex-col justify-between text-center', className)}
        style={{
          border: `1.5px solid ${genre.color}`,
          printColorAdjust: 'exact',
          WebkitPrintColorAdjust: 'exact',
        }}
      >
        <div
          className="text-[7pt] font-black uppercase tracking-wider py-1 text-white text-center w-full"
          style={{
            backgroundColor: genre.color,
            printColorAdjust: 'exact',
            WebkitPrintColorAdjust: 'exact',
          }}
        >
          {genre.callPrefix} &middot; {genre.label}
        </div>
        <div className="py-1 space-y-0.5">
          <div className="font-mono font-black text-[12pt] text-slate-950 leading-none tracking-wider">
            {authorCutter}
          </div>
          <div className="text-[6pt] font-bold text-slate-600 truncate max-w-full px-1">
            {shelf || 'Shelf ' + genre.callPrefix}
          </div>
          <div className="text-[6.5pt] font-bold text-slate-900 truncate max-w-full px-1 leading-tight">
            {title}
          </div>
        </div>
        <div className="border-t pt-0.5 pb-0.5 bg-slate-50 font-mono text-[5.5pt] text-slate-500 truncate px-1">
          {barcode}
        </div>
      </div>
    );
  }

  // 3. LARGE INSIDE COVER BOOKPLATE (Avery 5163: 2" x 4")
  if (format === 'large_plate') {
    return (
      <div
        className={cn('library-barcode-sticker library-barcode-sticker--large_plate relative overflow-hidden flex flex-col justify-between p-3', className)}
        style={{
          border: `2px solid ${genre.color}`,
          printColorAdjust: 'exact',
          WebkitPrintColorAdjust: 'exact',
        }}
      >
        <div className="flex items-center justify-between border-b pb-1.5" style={{ borderColor: `${genre.color}40` }}>
          <div>
            <span className="font-black text-[8pt] uppercase tracking-wider text-slate-900">{schoolName}</span>
            <span className="text-[6.5pt] text-slate-500 uppercase tracking-widest ml-1.5 font-bold">Library Collection</span>
          </div>
          <span
            className="font-bold uppercase tracking-wider px-2 py-0.5 rounded text-[6.5pt] text-white"
            style={{
              backgroundColor: genre.color,
              printColorAdjust: 'exact',
              WebkitPrintColorAdjust: 'exact',
            }}
          >
            {genre.callPrefix} &middot; {genre.label}
          </span>
        </div>

        <div className="py-1.5 space-y-0.5 text-left">
          <div className="font-serif font-bold text-[11pt] text-slate-950 leading-tight line-clamp-2">
            {title}
          </div>
          <div className="text-[7.5pt] text-slate-700 font-medium">
            {item.author ? `By ${item.author}` : null}
            {item.publishedYear ? ` (${item.publishedYear})` : null}
            {shelf ? ` · Shelf: ${shelf}` : null}
            {item.copyNumber ? ` · Copy #${item.copyNumber}` : null}
          </div>
          {item.description ? (
            <p className="text-[6.5pt] text-slate-500 line-clamp-2 italic leading-tight pt-0.5">
              &ldquo;{item.description}&rdquo;
            </p>
          ) : null}
        </div>

        <div className="pt-1 border-t flex items-center justify-between gap-4" style={{ borderColor: `${genre.color}30` }}>
          <div className="flex-1 max-w-[2.2in]">
            <PrintBarcode value={barcode} variant="library-sticker" className="w-full" />
          </div>
          <div className="text-right shrink-0">
            <div className="font-mono font-bold text-[8pt] text-slate-950">{barcode}</div>
            <div className="text-[6pt] text-slate-500 uppercase font-semibold">Scan to borrow</div>
          </div>
        </div>
      </div>
    );
  }

  // 4. THERMAL ROLL LABEL (2-1/4" x 1-1/4" Dymo / Zebra / Brother)
  if (format === 'thermal') {
    return (
      <div
        className={cn('library-barcode-sticker library-barcode-sticker--thermal relative overflow-hidden flex flex-col justify-between p-1.5 bg-white text-black border border-black', className)}
      >
        <div className="flex items-baseline justify-between border-b border-black pb-0.5 text-[6.5pt] font-black uppercase">
          <span className="truncate max-w-[1.4in]">{schoolName}</span>
          <span className="font-mono font-bold">[{genre.callPrefix}]</span>
        </div>

        <div className="py-0.5 text-left">
          <div className="font-bold text-[8pt] leading-tight truncate text-black">{title}</div>
          <div className="text-[6pt] text-neutral-800 truncate font-mono">
            {item.author ? `${item.author} · ` : ''}{shelf || 'General'}
          </div>
        </div>

        <div>
          <PrintBarcode value={barcode} variant="library-sticker" className="w-full" />
          <div className="flex items-center justify-between text-[6pt] font-mono font-bold text-black px-0.5">
            <span>{barcode}</span>
            {item.copyNumber ? <span>CPY #{item.copyNumber}</span> : null}
          </div>
        </div>
      </div>
    );
  }

  // 5. CIRCULATION POCKET SLIP (2-3/4" x 4-1/4")
  if (format === 'pocket') {
    return (
      <div
        className={cn('library-barcode-sticker library-barcode-sticker--pocket relative overflow-hidden flex flex-col justify-between p-3 bg-white border border-slate-300', className)}
      >
        <div className="border-b-2 border-slate-900 pb-1.5 text-center">
          <div className="font-black text-[8.5pt] uppercase tracking-wider text-slate-900">{schoolName} LIBRARY</div>
          <div className="text-[6pt] uppercase font-bold tracking-widest text-slate-500">Date Due Loan Slip</div>
        </div>

        <div className="py-1 space-y-0.5 text-left">
          <div className="font-bold text-[9pt] text-slate-900 line-clamp-2 leading-tight">{title}</div>
          <div className="text-[7pt] text-slate-600 truncate">{item.author ? `Author: ${item.author}` : null}</div>
          <div className="flex items-center justify-between text-[6.5pt] text-slate-500 font-mono pt-0.5">
            <span>Call: {genre.callPrefix} {shelf}</span>
            <span>Copy: {item.copyNumber || '1'}</span>
          </div>
        </div>

        {/* Date Due Grid Table */}
        <div className="border border-slate-300 rounded overflow-hidden my-1">
          <div className="grid grid-cols-3 bg-slate-100 text-[6pt] font-black uppercase text-slate-700 py-0.5 text-center border-b border-slate-300">
            <span>Date Due</span>
            <span>Borrower</span>
            <span>Returned</span>
          </div>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="grid grid-cols-3 border-b border-slate-200 h-4.5 text-[6pt]" />
          ))}
        </div>

        <div className="pt-1 flex items-center justify-between">
          <div className="w-28">
            <PrintBarcode value={barcode} variant="library-sticker" className="w-full" />
          </div>
          <div className="font-mono text-[6.5pt] font-bold text-slate-800">{barcode}</div>
        </div>
      </div>
    );
  }

  // 6. STANDARD STICKER (Avery 5160: 1" x 2-5/8" Default)
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
