'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { encodeCircular1d } from '@/lib/barcode/circular1d';
import {
  CIRCULAR1D_INNER_RADIUS_RATIO,
  circular1dRingRadii,
} from '@/lib/barcode/circular1dGeometry';

export type Circular1dBarcodeProps = {
  value: string;
  size?: number;
  className?: string;
  /** Inner hole as fraction of outer radius (0–0.5) */
  innerRadiusRatio?: number;
  showLabel?: boolean;
};

function arcPath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number,
): string {
  const x1o = cx + outerR * Math.cos(startAngle);
  const y1o = cy + outerR * Math.sin(startAngle);
  const x2o = cx + outerR * Math.cos(endAngle);
  const y2o = cy + outerR * Math.sin(endAngle);
  const x2i = cx + innerR * Math.cos(endAngle);
  const y2i = cy + innerR * Math.sin(endAngle);
  const x1i = cx + innerR * Math.cos(startAngle);
  const y1i = cy + innerR * Math.sin(startAngle);
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  return [
    `M ${x1o} ${y1o}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${x2o} ${y2o}`,
    `L ${x2i} ${y2i}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${x1i} ${y1i}`,
    'Z',
  ].join(' ');
}

export function Circular1dBarcode({
  value,
  size = 200,
  className,
  innerRadiusRatio = CIRCULAR1D_INNER_RADIUS_RATIO,
  showLabel = true,
}: Circular1dBarcodeProps) {
  const encoded = useMemo(() => encodeCircular1d(value), [value]);
  const { cx, cy, outerR } = circular1dRingRadii(size);
  const innerRAdjusted = outerR * innerRadiusRatio;

  if (!encoded) return null;

  const { modules, payload } = encoded;
  const n = modules.length;
  const gapRad = (0.35 / n) * Math.PI * 2;

  const segments = modules.map((isBar, i) => {
    if (!isBar) return null;
    const startAngle = (i / n) * Math.PI * 2 - Math.PI / 2 + gapRad / 2;
    const endAngle = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2 - gapRad / 2;
    if (endAngle <= startAngle) return null;
    return (
      <path
        key={i}
        d={arcPath(cx, cy, innerRAdjusted, outerR, startAngle, endAngle)}
        fill="#000000"
      />
    );
  });

  return (
    <div
      className={cn('circular-1d-barcode inline-flex flex-col items-center', className)}
      data-circular-1d-barcode=""
      data-circular-1d-payload={payload}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Circular barcode ${payload}`}
        className="circular-1d-barcode-svg"
      >
        <circle cx={cx} cy={cy} r={outerR + 2} fill="#ffffff" />
        <circle cx={cx} cy={cy} r={innerRAdjusted - 1} fill="#ffffff" />
        {segments}
        {showLabel ? (
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#111827"
            fontSize={Math.max(9, size * 0.07)}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
          >
            {payload.length > 10 ? `${payload.slice(0, 8)}…` : payload}
          </text>
        ) : null}
      </svg>
    </div>
  );
}
