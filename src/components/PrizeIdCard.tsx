'use client';

import type { Prize } from '@/lib/types';
import { cn, getContrastColor } from '@/lib/utils';
import { APP_NAME, APP_TAGLINE } from '@/lib/appBranding';
import DynamicIcon from '@/components/DynamicIcon';
import { prizeScanCodeFor } from '@/lib/prizeScanCode';
import { prizeCardColorForId } from '@/lib/prizeCardColor';

export function PrizeIdCard({
  prize,
  schoolName,
  schoolLogoUrl,
  appLogoUrl,
  appName,
  appTagline,
  className,
}: {
  prize: Prize;
  schoolName: string;
  schoolLogoUrl?: string | null;
  appLogoUrl?: string | null;
  appName?: string;
  appTagline?: string;
  className?: string;
}) {
  const scanCode = prizeScanCodeFor(prize);
  const nameFitScale = prize.name.length >= 28 ? 0.78 : prize.name.length >= 22 ? 0.88 : 1;
  const fitStyle: React.CSSProperties = { ['--print-id-name-fit-scale' as string]: String(nameFitScale) };
  const accent = prize.cardColor?.trim() || prizeCardColorForId(prize.id);
  const onColor = getContrastColor(accent) === 'white';
  const textColor = onColor ? '#ffffff' : '#0f172a';
  const mutedText = onColor ? 'rgba(255,255,255,0.82)' : 'rgba(15,23,42,0.72)';
  const dividerColor = onColor ? 'rgba(255,255,255,0.35)' : 'rgba(15,23,42,0.18)';
  const iconBg = onColor ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.45)';

  const cardStyle: React.CSSProperties = {
    ['--prize-card-accent' as string]: accent,
    ['--prize-card-text' as string]: textColor,
    ['--prize-card-muted' as string]: mutedText,
    ['--prize-card-divider' as string]: dividerColor,
    background: accent,
    borderColor: accent,
    borderWidth: 2,
    color: textColor,
    WebkitPrintColorAdjust: 'exact',
    printColorAdjust: 'exact',
    ...fitStyle,
  };

  const headerStyle: React.CSSProperties = { color: textColor };
  const iconBoxStyle: React.CSSProperties = {
    borderColor: onColor ? 'rgba(255,255,255,0.55)' : 'rgba(15,23,42,0.2)',
    backgroundColor: iconBg,
    color: textColor,
    WebkitPrintColorAdjust: 'exact',
    printColorAdjust: 'exact',
  };

  return (
    <div className={cn('print-id-card print-prize-id-card is-colored', className)} style={cardStyle}>
      <div className="print-id-header-container" style={{ borderBottomColor: dividerColor }}>
        <div className="print-id-app" style={headerStyle}>
          {appLogoUrl ? (
            <div className="print-id-app-logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={appLogoUrl} alt="" className="object-contain" />
            </div>
          ) : null}
          <PrizeIdCardAppText appName={appName} appTagline={appTagline} textColor={textColor} mutedText={mutedText} />
        </div>
        <div className="print-id-school" style={headerStyle}>
          <span className="print-id-header">{schoolName}</span>
          {schoolLogoUrl ? (
            <div className="print-id-school-logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={schoolLogoUrl} alt="" className="object-contain" />
            </div>
          ) : null}
        </div>
      </div>

      <div className="print-id-main flex items-center justify-center gap-3 px-2 min-h-0 flex-1">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2"
          style={iconBoxStyle}
          aria-hidden
        >
          <DynamicIcon name={prize.icon || 'Gift'} className="h-8 w-8" />
        </div>
        <div className="min-w-0 flex-1 text-left" style={{ color: textColor }}>
          <div className="print-id-name text-left">{prize.name}</div>
          <p className="text-[8pt] font-semibold uppercase tracking-wide mt-0.5" style={{ color: mutedText }}>
            Reward
          </p>
          <p className="text-[11pt] font-black leading-tight" style={{ color: textColor }}>
            {prize.points} <span className="text-[8pt] font-bold uppercase tracking-wider opacity-80">pts</span>
          </p>
        </div>
      </div>

      <div
        className="print-id-barcode-container mt-auto"
        style={{ background: '#ffffff', color: '#000000', borderTop: `1px solid ${dividerColor}` }}
      >
        <div
          className="font-barcode text-[10px] leading-none"
          style={{ color: '#000000', fontWeight: 400, fontStyle: 'normal' }}
        >
          *{scanCode}*
        </div>
      </div>
    </div>
  );
}

function PrizeIdCardAppText({
  appName,
  appTagline,
  textColor,
  mutedText,
}: {
  appName?: string;
  appTagline?: string;
  textColor: string;
  mutedText: string;
}) {
  return (
    <div className="print-id-app-text">
      <span className="print-id-app-name" style={{ color: textColor }}>
        {appName || APP_NAME}
      </span>
      <span className="print-id-app-tagline" style={{ color: mutedText }}>
        {appTagline ?? APP_TAGLINE}
      </span>
    </div>
  );
}
