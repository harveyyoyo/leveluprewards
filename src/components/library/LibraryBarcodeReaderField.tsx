'use client';

import type { RefObject } from 'react';
import { ScanBarcode } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function LibraryBarcodeReaderField({
  inputId = 'library-barcode-reader-input',
  inputRef,
  scanBuffer,
  onScanBufferChange,
  onSubmit,
  active,
  hint,
  className,
}: {
  inputId?: string;
  inputRef: RefObject<HTMLInputElement | null>;
  scanBuffer: string;
  onScanBufferChange: (value: string) => void;
  onSubmit: () => void;
  active: boolean;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border-2 border-dashed p-4 space-y-2 transition-colors',
        active ? 'border-primary/50 bg-primary/5' : 'border-muted bg-muted/30',
        className,
      )}
    >
      <Label htmlFor={inputId} className="flex items-center gap-2 text-sm font-bold">
        <ScanBarcode className="h-4 w-4 text-primary" aria-hidden />
        Barcode reader
      </Label>
      <p className="text-xs text-muted-foreground">
        {hint ??
          'Focus this field, then scan with your USB or Bluetooth barcode reader. Each scan ends with Enter.'}
      </p>
      <Input
        id={inputId}
        ref={inputRef as RefObject<HTMLInputElement>}
        type="text"
        value={scanBuffer}
        onChange={(e) => onScanBufferChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder={active ? 'Ready — scan barcode…' : 'Waiting…'}
        className="font-mono text-sm h-11 rounded-xl"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        disabled={!active}
        aria-label="Barcode reader scan field"
      />
    </div>
  );
}
