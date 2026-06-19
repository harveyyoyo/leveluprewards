'use client';

import type { RecessReasonMeta } from '@/lib/recess/recessReasons';
import { recessPassScanCodeFor } from '@/lib/recess/recessPassScanCode';
import { PrintBarcode } from '@/components/print/PrintBarcode';
import { cn } from '@/lib/utils';

export function RecessPassCard({
  meta,
  schoolName,
  className,
  cornerStyle,
}: {
  meta: RecessReasonMeta;
  schoolName: string;
  className?: string;
  cornerStyle?: 'rounded' | 'rectangular';
}) {
  const Icon = meta.icon;
  const scanCode = recessPassScanCodeFor(meta.value);

  return (
    <div
      className={cn(
        'print-id-card print-prize-id-card print-recess-pass-card border-2',
        cornerStyle === 'rectangular' && 'print-id-card--rectangular',
        meta.badge,
        className,
      )}
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
      <div className="print-id-header-container border-b border-border/40 px-2 py-1.5">
        <p className="text-[7pt] font-black uppercase tracking-widest text-center leading-tight">
          {schoolName}
        </p>
        <p className="text-[6pt] font-semibold uppercase tracking-wide text-center opacity-70">
          Recess pass
        </p>
      </div>

      <div className="print-recess-pass-body flex min-h-0 flex-1 flex-col items-center justify-center gap-1 px-3 py-2 text-center">
        <span
          className={cn(
            'print-recess-pass-icon flex h-10 w-10 items-center justify-center rounded-xl border-2',
            meta.badge,
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <p className="print-recess-pass-label text-sm font-black uppercase tracking-wide leading-tight">
          {meta.label}
        </p>
        <p className="print-recess-pass-copy max-w-[12rem] text-[7pt] leading-snug opacity-80">
          {meta.kioskDescription}
        </p>
      </div>

      <div className="print-id-barcode-container border-t border-border/40 px-2 py-1.5">
        <PrintBarcode value={scanCode} variant="prize-id" />
        <p className="mt-0.5 text-center text-[6pt] font-semibold text-muted-foreground leading-tight">
          Scan at kiosk after student ID · scan again to return
        </p>
      </div>
    </div>
  );
}
