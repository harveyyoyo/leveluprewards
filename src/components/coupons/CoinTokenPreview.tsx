'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { Coupon } from '@/lib/types';
import { PrintIdCardScanCode } from '@/components/print/PrintIdCardScanCode';

export type CoinFinish = 'gold' | 'silver' | 'bronze' | 'copper' | 'emerald';
export type CoinRimStyle = 'ridged' | 'smooth' | 'stars';

export interface CoinTokenDesign {
  finish?: CoinFinish;
  rimStyle?: CoinRimStyle;
  topText?: string;
  bottomText?: string;
  emblem?: string;
  showSchoolName?: boolean;
  showValue?: boolean;
  valuePrefix?: string;
}

export const COIN_FINISH_PALETTES: Record<CoinFinish, {
  name: string;
  baseBg: string;
  rimBorder: string;
  outerRing: string;
  innerRing: string;
  bevelHighlight: string;
  bevelShadow: string;
  faceBg: string;
  textColor: string;
  textShadow: string;
  accent: string;
}> = {
  gold: {
    name: 'Royal Gold',
    baseBg: '#fbf0b9',
    rimBorder: '#b38728',
    outerRing: 'linear-gradient(135deg, #fbf5b7 0%, #fbf0b9 15%, #d1a938 50%, #aa771c 85%, #fbf5b7 100%)',
    innerRing: 'linear-gradient(135deg, #875c10 0%, #d4af37 40%, #fff2a3 70%, #996515 100%)',
    bevelHighlight: 'rgba(255, 255, 255, 0.65)',
    bevelShadow: 'rgba(100, 60, 0, 0.45)',
    faceBg: 'radial-gradient(circle at 35% 35%, #fff6c9 0%, #e6be44 45%, #b38519 85%, #8f640c 100%)',
    textColor: '#5a3d07',
    textShadow: '0 1px 0 rgba(255,255,255,0.7), 0 -1px 0 rgba(0,0,0,0.35)',
    accent: '#d4af37',
  },
  silver: {
    name: 'Platinum Silver',
    baseBg: '#e2e8f0',
    rimBorder: '#64748b',
    outerRing: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 20%, #94a3b8 50%, #475569 85%, #f1f5f9 100%)',
    innerRing: 'linear-gradient(135deg, #334155 0%, #94a3b8 40%, #ffffff 70%, #475569 100%)',
    bevelHighlight: 'rgba(255, 255, 255, 0.8)',
    bevelShadow: 'rgba(15, 23, 42, 0.45)',
    faceBg: 'radial-gradient(circle at 35% 35%, #ffffff 0%, #cbd5e1 50%, #94a3b8 85%, #64748b 100%)',
    textColor: '#1e293b',
    textShadow: '0 1px 0 rgba(255,255,255,0.85), 0 -1px 0 rgba(0,0,0,0.3)',
    accent: '#94a3b8',
  },
  bronze: {
    name: 'Antique Bronze',
    baseBg: '#d7995b',
    rimBorder: '#78350f',
    outerRing: 'linear-gradient(135deg, #fcd34d 0%, #d97706 25%, #92400e 55%, #451a03 85%, #f59e0b 100%)',
    innerRing: 'linear-gradient(135deg, #451a03 0%, #b45309 40%, #fde68a 70%, #78350f 100%)',
    bevelHighlight: 'rgba(255, 235, 180, 0.6)',
    bevelShadow: 'rgba(50, 15, 0, 0.55)',
    faceBg: 'radial-gradient(circle at 35% 35%, #fed7aa 0%, #c2410c 45%, #7c2d12 85%, #431407 100%)',
    textColor: '#381204',
    textShadow: '0 1px 0 rgba(255,220,180,0.65), 0 -1px 0 rgba(0,0,0,0.4)',
    accent: '#b45309',
  },
  copper: {
    name: 'Rose Copper',
    baseBg: '#f87171',
    rimBorder: '#991b1b',
    outerRing: 'linear-gradient(135deg, #fecaca 0%, #f87171 20%, #b91c1c 55%, #7f1d1d 85%, #fca5a5 100%)',
    innerRing: 'linear-gradient(135deg, #450a0a 0%, #dc2626 40%, #fee2e2 70%, #991b1b 100%)',
    bevelHighlight: 'rgba(255, 220, 220, 0.7)',
    bevelShadow: 'rgba(60, 10, 10, 0.5)',
    faceBg: 'radial-gradient(circle at 35% 35%, #fecdd3 0%, #fb7185 45%, #be123c 85%, #881337 100%)',
    textColor: '#4c0519',
    textShadow: '0 1px 0 rgba(255,200,200,0.7), 0 -1px 0 rgba(0,0,0,0.4)',
    accent: '#e11d48',
  },
  emerald: {
    name: 'Jade Medallion',
    baseBg: '#6ee7b7',
    rimBorder: '#065f46',
    outerRing: 'linear-gradient(135deg, #a7f3d0 0%, #34d399 25%, #059669 55%, #064e3b 85%, #6ee7b7 100%)',
    innerRing: 'linear-gradient(135deg, #022c22 0%, #059669 40%, #d1fae5 70%, #047857 100%)',
    bevelHighlight: 'rgba(209, 250, 229, 0.75)',
    bevelShadow: 'rgba(2, 44, 34, 0.55)',
    faceBg: 'radial-gradient(circle at 35% 35%, #a7f3d0 0%, #10b981 45%, #047857 85%, #064e3b 100%)',
    textColor: '#022c22',
    textShadow: '0 1px 0 rgba(200,255,230,0.7), 0 -1px 0 rgba(0,0,0,0.45)',
    accent: '#10b981',
  },
};

export function CoinTokenPreview({
  coupon,
  schoolName,
  design,
  size = 180,
  showFlipCode = true,
}: {
  coupon?: Partial<Coupon>;
  schoolName?: string;
  design?: CoinTokenDesign;
  size?: number;
  showFlipCode?: boolean;
}) {
  const finish = design?.finish ?? 'gold';
  const rimStyle = design?.rimStyle ?? 'ridged';
  const palette = COIN_FINISH_PALETTES[finish] ?? COIN_FINISH_PALETTES.gold;
  
  const emblem = design?.emblem || '⭐';
  const topText = (design?.topText || (design?.showSchoolName !== false ? schoolName : '') || 'EXCELLENCE').toUpperCase();
  const bottomText = (design?.bottomText || 'LEVEL UP REWARDS').toUpperCase();
  const value = coupon?.value ?? (coupon as any)?.points ?? 1;
  const showValue = design?.showValue !== false;
  const valuePrefix = design?.valuePrefix ?? '';

  return (
    <div className="inline-flex flex-col items-center gap-3">
      {/* 3D Coin Body */}
      <div
        className="relative select-none flex items-center justify-center rounded-full transition-transform hover:scale-105"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          boxShadow: `
            0 12px 28px -4px rgba(0, 0, 0, 0.45),
            0 4px 10px rgba(0, 0, 0, 0.25),
            inset 0 2px 4px ${palette.bevelHighlight},
            inset 0 -2px 4px ${palette.bevelShadow}
          `,
          background: palette.outerRing,
        }}
      >
        {/* Outer Rim styling (ridged grooves or stars) */}
        {rimStyle === 'ridged' && (
          <div
            className="absolute inset-[4px] rounded-full pointer-events-none"
            style={{
              border: `2px dashed ${palette.rimBorder}60`,
              boxShadow: `inset 0 0 0 1px ${palette.bevelHighlight}40`,
            }}
          />
        )}

        {rimStyle === 'stars' && (
          <div className="absolute inset-[2px] rounded-full pointer-events-none flex items-center justify-center">
            <span className="text-[10px] tracking-[6px] opacity-70" style={{ color: palette.textColor }}>
              ★ ★ ★ ★ ★ ★ ★ ★
            </span>
          </div>
        )}

        {/* Inner stepped ring */}
        <div
          className="absolute inset-[10px] rounded-full flex items-center justify-center"
          style={{
            background: palette.innerRing,
            boxShadow: `
              inset 0 2px 5px rgba(0,0,0,0.5),
              0 1px 2px ${palette.bevelHighlight}
            `,
          }}
        >
          {/* Central Medallion Face */}
          <div
            className="relative w-full h-full rounded-full flex flex-col items-center justify-between p-3 overflow-hidden"
            style={{
              background: palette.faceBg,
              boxShadow: `
                inset 0 0 18px rgba(0,0,0,0.35),
                0 0 0 1px ${palette.rimBorder}
              `,
            }}
          >
            {/* Top Arched Title */}
            <div
              className="text-[9px] font-black uppercase tracking-widest text-center truncate max-w-[85%] z-10"
              style={{
                color: palette.textColor,
                textShadow: palette.textShadow,
              }}
            >
              {topText}
            </div>

            {/* Central Emblem & Value */}
            <div className="my-auto flex flex-col items-center justify-center z-10 leading-none">
              <span
                className="text-2xl drop-shadow-md transition-transform"
                style={{
                  filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))',
                }}
              >
                {emblem}
              </span>
              {showValue && (
                <span
                  className="text-base font-black tracking-tight mt-0.5"
                  style={{
                    color: palette.textColor,
                    textShadow: palette.textShadow,
                  }}
                >
                  {valuePrefix}{value}
                </span>
              )}
            </div>

            {/* Bottom Arched Text */}
            <div
              className="text-[8px] font-black uppercase tracking-wider text-center truncate max-w-[85%] z-10 opacity-90"
              style={{
                color: palette.textColor,
                textShadow: palette.textShadow,
              }}
            >
              {bottomText}
            </div>

            {/* Realistic diagonal luster light sweep */}
            <div
              className="absolute inset-0 pointer-events-none opacity-25"
              style={{
                background: 'linear-gradient(120deg, transparent 35%, rgba(255,255,255,0.7) 48%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0.7) 52%, transparent 65%)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Redemption Barcode strip below coin if available */}
      {showFlipCode && coupon?.code && (
        <div className="bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm flex items-center gap-1.5 max-w-[170px]">
          <PrintIdCardScanCode value={coupon.code} variant="coupon" className="h-6" />
        </div>
      )}
    </div>
  );
}
