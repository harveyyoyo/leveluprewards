'use client';

/** Strip legacy Code 39 font asterisks; keep the value scanners expect. */
export function normalizePrintBarcodeValue(raw: string): string {
  return String(raw ?? '')
    .trim()
    .replace(/^\*+|\*+$/g, '');
}

export type PrintBarcodeVariant = 'id-card' | 'coupon' | 'library-sticker' | 'prize-id';

export type PrintBarcodeOptions = {
  format?: 'CODE128' | 'CODE39';
  width?: number;
  height?: number;
  margin?: number;
  displayValue?: boolean;
  fontSize?: number;
};

const VARIANT_PRESETS: Record<PrintBarcodeVariant, PrintBarcodeOptions> = {
  'id-card': {
    format: 'CODE128',
    width: 2.4,
    height: 52,
    margin: 10,
    displayValue: true,
    fontSize: 11,
  },
  'prize-id': {
    format: 'CODE128',
    width: 2.4,
    height: 48,
    margin: 10,
    displayValue: true,
    fontSize: 10,
  },
  coupon: {
    format: 'CODE128',
    width: 2.2,
    height: 44,
    margin: 8,
    displayValue: true,
    fontSize: 10,
  },
  'library-sticker': {
    format: 'CODE128',
    width: 2,
    height: 36,
    margin: 6,
    displayValue: false,
    fontSize: 9,
  },
};

export function printBarcodeOptionsForVariant(variant: PrintBarcodeVariant): PrintBarcodeOptions {
  return { ...VARIANT_PRESETS[variant] };
}

export function pickBarcodeFormat(value: string): 'CODE128' | 'CODE39' {
  const v = normalizePrintBarcodeValue(value);
  if (!v) return 'CODE128';
  // Code 39 subset — fallback when Code128 rejects a character.
  if (/^[0-9A-Z\-.\s$+/]+$/i.test(v)) return 'CODE128';
  return 'CODE39';
}

/** Brief delay so SVG barcodes finish layout before window.print(). */
export function waitForPrintBarcodes(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}
