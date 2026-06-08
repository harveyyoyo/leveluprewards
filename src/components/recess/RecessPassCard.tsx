'use client';

import type { RecessReasonMeta } from '@/lib/recess/recessReasons';
import { recessPassScanCodeFor } from '@/lib/recess/recessPassScanCode';
import { PrintBarcode } from '@/components/print/PrintBarcode';
import { cn } from '@/lib/utils';

export function RecessPassCard({
  meta,
  schoolName,
  className,
}: {
  meta: RecessReasonMeta;
  schoolName: string;
  className?: string;
}) {
  const Icon = meta.icon;
  const scanCode = recessPassScanCodeFor(meta.value);

  return (
    <div
      className={cn('print-id-card print-recess-pass-card border-2', meta.badge, className)}
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
      <div className="print-id-header-container border-b border-border/40 px-3 py-2">
        <p className="text-[8pt] font-black uppercase tracking-widest text-center">{schoolName}</p>
        <p className="text-[7pt] font-semibold uppercase tracking-wide text-center opacity-70">
          Recess pass — scan at student kiosk
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-5 text-center">
        <span
          className={cn(
            'flex h-16 w-16 items-center justify-center rounded-2xl border-2',
            meta.badge,
          )}
        >
          <Icon className="h-9 w-9" aria-hidden />
        </span>
        <p className="text-xl font-black uppercase tracking-wide">{meta.label}</p>
        <p className="max-w-[14rem] text-[9pt] leading-snug opacity-80">{meta.kioskDescription}</p>
      </div>

      <div className="border-t border-border/40 bg-white px-2 py-2">
        <PrintBarcode value={scanCode} variant="prize-id" />
        <p className="mt-1 text-center text-[7pt] font-semibold text-muted-foreground">
          1. Student scans ID · 2. Scan this pass · 3. Scan pass again to return
        </p>
      </div>
    </div>
  );
}
