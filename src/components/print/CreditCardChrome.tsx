'use client';

import type { CSSProperties } from 'react';
import { useId } from 'react';
import { APP_NAME } from '@/lib/appBranding';

export function formatCreditCardPan(raw: string): string {
  const digits = String(raw ?? '').replace(/\D/g, '');
  const body = digits.padStart(12, '0').slice(-12);
  const groups = body.match(/.{1,4}/g) ?? ['0000', '0000', '0000'];
  return `4000 ${groups.join(' ')}`;
}

export function CreditCardChip() {
  const gradId = `chip-grad-${useId().replace(/:/g, '')}`;
  return (
    <div className="credit-card-chip" aria-hidden>
      <svg viewBox="0 0 32 24" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="24" rx="3" fill={`url(#${gradId})`} stroke="rgba(120,80,0,0.3)" strokeWidth="0.5" />
        <path d="M10 0v24M22 0v24M0 8h10M22 8h10M0 16h10M22 16h10M10 12h12" stroke="rgba(120,80,0,0.5)" strokeWidth="0.75" />
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="32" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#d4a843" />
            <stop offset="0.3" stopColor="#f0d060" />
            <stop offset="0.5" stopColor="#c89830" />
            <stop offset="0.7" stopColor="#e8c84c" />
            <stop offset="1" stopColor="#b88828" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export function CreditCardContactless() {
  return (
    <div className="credit-card-contactless" aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.5 16.5c2-2.5 5.5-2.5 7.5 0" />
        <path d="M7 11.5c3.5-4 9.5-4 13 0" />
        <path d="M9.5 6.5c5.5-6 14.5-6 20 0" />
      </svg>
    </div>
  );
}

export function CreditCardValidThru({ date }: { date: string }) {
  return (
    <div className="credit-card-valid-thru">
      <span className="valid-thru-label">VALID<br />THRU</span>
      <span className="valid-thru-date">{date}</span>
    </div>
  );
}

export function CreditCardBrand({
  schoolName,
  schoolLogoUrl,
  appLogoUrl,
  appName,
  style,
  nameColor,
}: {
  schoolName?: string;
  schoolLogoUrl?: string | null;
  appLogoUrl?: string | null;
  appName?: string;
  style?: CSSProperties;
  nameColor?: string;
}) {
  const logoUrl = schoolLogoUrl || appLogoUrl || null;
  return (
    <div className="credit-card-brand" style={style}>
      {logoUrl ? (
        <div className="print-id-app-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt="" className="object-contain" />
        </div>
      ) : null}
      <div className="print-id-app-text">
        {schoolName ? <span className="print-id-header">{schoolName}</span> : null}
        <span className="print-id-app-name" style={nameColor ? { color: nameColor } : undefined}>
          {appName || APP_NAME}
        </span>
      </div>
    </div>
  );
}
