'use client';

import { useLayoutEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { cn } from '@/lib/utils';
import {
  normalizePrintBarcodeValue,
  pickBarcodeFormat,
  printBarcodeOptionsForVariant,
  type PrintBarcodeVariant,
} from '@/lib/printBarcode';

export type PrintBarcodeProps = {
  value: string;
  variant?: PrintBarcodeVariant;
  className?: string;
  /** Screen-only caption under the bars (print uses JsBarcode HRI when enabled). */
  caption?: string;
};

function renderBarcodeSvg(svg: SVGSVGElement, value: string, variant: PrintBarcodeVariant): boolean {
  const normalized = normalizePrintBarcodeValue(value);
  if (!normalized) return false;

  const preset = printBarcodeOptionsForVariant(variant);
  const primaryFormat = preset.format ?? pickBarcodeFormat(normalized);
  const base = {
    width: preset.width ?? 2,
    height: preset.height ?? 40,
    margin: preset.margin ?? 8,
    displayValue: preset.displayValue ?? true,
    fontSize: preset.fontSize ?? 10,
    background: '#ffffff',
    lineColor: '#000000',
    font: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    textAlign: 'center' as const,
    textMargin: 2,
  };

  try {
    JsBarcode(svg, normalized, { ...base, format: primaryFormat });
    return true;
  } catch {
    try {
      JsBarcode(svg, normalized, { ...base, format: 'CODE39' });
      return true;
    } catch {
      svg.replaceChildren();
      return false;
    }
  }
}

export function PrintBarcode({ value, variant = 'id-card', className, caption }: PrintBarcodeProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    renderBarcodeSvg(svg, value, variant);
  }, [value, variant]);

  const normalized = normalizePrintBarcodeValue(value);
  if (!normalized) return null;

  return (
    <div className={cn('print-barcode', `print-barcode--${variant}`, className)}>
      <svg
        ref={svgRef}
        className="print-barcode-svg"
        data-print-barcode=""
        role="img"
        aria-label={`Barcode ${normalized}`}
      />
      {caption ? (
        <p className="print-barcode-caption font-mono text-[8px] leading-none text-black/70">{caption}</p>
      ) : null}
    </div>
  );
}
