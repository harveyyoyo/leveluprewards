'use client';

import { motion } from 'framer-motion';
import { Printer, ScanBarcode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LIBRARY_CATALOGING_HEADING, LIBRARY_CATALOGING_STEPS } from '@/lib/library/libraryCatalogingCopy';

export function LibraryCatalogingStepsNote({
  className,
  onPrint,
  printDisabled,
  printHint,
}: {
  className?: string;
  onPrint?: () => void;
  printDisabled?: boolean;
  printHint?: string;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      className={cn(
        'rounded-xl border border-amber-400/50 bg-amber-50/90 p-3 text-sm dark:bg-amber-950/40',
        className,
      )}
    >
      <p className="flex items-center gap-1.5 font-bold text-amber-950 dark:text-amber-100">
        <ScanBarcode className="h-4 w-4 shrink-0" />
        {LIBRARY_CATALOGING_HEADING}
      </p>
      <ol className="mt-1.5 list-decimal space-y-0.5 pl-5 text-xs font-medium text-muted-foreground">
        {LIBRARY_CATALOGING_STEPS.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {onPrint ? (
        <div className="mt-2.5">
          <Button
            type="button"
            size="sm"
            className="h-8 rounded-xl text-xs font-bold"
            onClick={onPrint}
            disabled={printDisabled}
            title={printHint}
          >
            <Printer className="h-3.5 w-3.5" />
            Print barcode sticker
          </Button>
          {printHint && printDisabled ? (
            <p className="mt-1 text-[11px] font-medium text-muted-foreground">{printHint}</p>
          ) : null}
        </div>
      ) : null}
    </motion.div>
  );
}
