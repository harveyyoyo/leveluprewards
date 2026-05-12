'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import DynamicIcon from '@/components/DynamicIcon';
import { leadingEmojiSequenceFromName, stripLeadingEmojiFromPrizeName } from '@/lib/prize-utils';
import type { PrizeVoucherPaperFormat } from '@/lib/prize-voucher-print';

export type { PrizeVoucherPaperFormat } from '@/lib/prize-voucher-print';

export type PrizeRedeemTicket = {
  activityId: string;
  ticketNo: string;
  redeemedAt: number;
  studentId: string;
  studentName: string;
  studentNickname?: string;
  /** Theme emoji for this student when school setting enables it on tickets. */
  studentEmoji?: string;
  prizeName: string;
  /** Lucide icon name (matches shop card). */
  prizeIcon?: string;
  quantity: number;
  totalCost?: number;
  /** When set (e.g. after AI surprise + print voucher), show on the physical ticket. */
  aiSurpriseKind?: 'joke' | 'riddle' | 'fortune';
  aiSurpriseText?: string;
  aiSurpriseAnswer?: string;
};

export function PrizeRedeemTicketPrintSheet({
  tickets,
  logoUrl,
  schoolName,
  /** `overlay` = off-screen for window.print() from the root provider; `page` = visible full-page (e.g. /prize/ticket). */
  displayMode = 'overlay' as 'overlay' | 'page',
  /** School setting: label stock (e.g. M110S) vs 80mm thermal receipt (e.g. VCP-8370). */
  paperFormat = 'label_50x70' as PrizeVoucherPaperFormat,
}: {
  tickets: PrizeRedeemTicket[];
  logoUrl?: string | null;
  schoolName?: string | null;
  displayMode?: 'overlay' | 'page';
  paperFormat?: PrizeVoucherPaperFormat;
}) {
  const [logoError, setLogoError] = useState(false);
  /** Avoid SSR/client DOM mismatch: first paint matches server (no portal), then portal thermal overlay to body. */
  const [portalReady, setPortalReady] = useState(false);

  useLayoutEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    setLogoError(false);
  }, [logoUrl]);

  useEffect(() => {
    const style = document.createElement('style');
    style.setAttribute('data-prize-ticket-print', 'true');
    const printSheetCss =
      paperFormat === 'thermal_80mm'
        ? /* @page prizethermal80 lives in globals.css — here only root sizing so this tag wins after other print CSS. */
          'html,body{margin:0!important;padding:0!important;background:#fff!important;height:auto!important;min-height:0!important;overflow:visible!important;}'
        : '@page{size:50mm 70mm;margin:1mm;}' +
          'html,body{margin:0!important;padding:0!important;background:#fff!important;}';
    style.textContent = '@media print{' + printSheetCss + '}';
    document.head.appendChild(style);

    document.body.classList.add('prize-ticket-printing');
    document.body.dataset.prizeVoucherPrint = paperFormat;
    return () => {
      document.body.classList.remove('prize-ticket-printing');
      delete document.body.dataset.prizeVoucherPrint;
      style.remove();
    };
  }, [paperFormat]);

  if (!tickets || tickets.length === 0) return null;

  const multiPage = tickets.length > 1;
  const schoolLabel = (schoolName || '').trim() || null;
  const wrapperId = displayMode === 'page' ? 'prize-ticket-standalone' : 'prize-ticket-print-wrapper';

  const portalThermalOverlay =
    portalReady &&
    paperFormat === 'thermal_80mm' &&
    displayMode === 'overlay' &&
    typeof document !== 'undefined';

  const sheet = (
    <div
      id={wrapperId}
      className="prize-ticket-root"
      data-ticket-pages={multiPage ? 'multi' : 'single'}
      data-prize-voucher-paper={paperFormat}
    >
      {tickets.map((t) => {
        const rawPrizeName = (t.prizeName || '').trim();
        const leadingEmoji = leadingEmojiSequenceFromName(rawPrizeName);
        const nameWithoutLeadingEmoji = stripLeadingEmojiFromPrizeName(rawPrizeName);
        const titleText = leadingEmoji ? nameWithoutLeadingEmoji : rawPrizeName;
        const showTitle = Boolean(titleText || !leadingEmoji);
        const displayStudent = (t.studentName || t.studentId || '').normalize('NFC');

        const surpriseText = (t.aiSurpriseText || '').trim();
        const hasSurprise = Boolean(surpriseText);
        const surpriseKind = t.aiSurpriseKind === 'riddle' || t.aiSurpriseKind === 'fortune' ? t.aiSurpriseKind : 'joke';
        const surpriseAnswer =
          surpriseKind === 'riddle' && (t.aiSurpriseAnswer || '').trim() ? (t.aiSurpriseAnswer || '').trim() : '';

        /** AI joke/riddle/fortune-teller text belongs in the hero headline (where the prize name usually is), not under metadata. */
        const heroHeadline = hasSurprise ? surpriseText : titleText || rawPrizeName;
        const showHeroHeadline = hasSurprise ? Boolean(surpriseText) : showTitle;

        return (
          <article
            key={`${t.activityId}-${t.ticketNo}`}
            className="prize-ticket"
            data-has-ai-surprise={hasSurprise ? 'true' : undefined}
          >
            <header className="prize-ticket__head">
              <div className="prize-ticket__logo-box">
                {logoUrl && !logoError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="prize-ticket__logo"
                    src={logoUrl}
                    alt=""
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className="prize-ticket__logo-fallback" aria-hidden>
                    LU
                  </div>
                )}
              </div>
              <div className="prize-ticket__head-text">
                <p className="prize-ticket__brandline">
                  <span className="prize-ticket__brand-lu">LEVELUP</span>
                  <span className="prize-ticket__brand-redeem"> REDEEM</span>
                </p>
                {schoolLabel ? <p className="prize-ticket__school">{schoolLabel}</p> : null}
              </div>
            </header>

            <div className="prize-ticket__hero">
              <div className="prize-ticket__icon-ring" aria-hidden>
                {leadingEmoji ? (
                  <span className="prize-ticket__hero-emoji">{leadingEmoji}</span>
                ) : (
                  <DynamicIcon
                    name={(t.prizeIcon || 'Gift').trim() || 'Gift'}
                    className="prize-ticket__lucide"
                  />
                )}
              </div>
              {showHeroHeadline ? (
                <h2
                  className={
                    hasSurprise
                      ? 'prize-ticket__prize-name prize-ticket__prize-name--surprise-body'
                      : 'prize-ticket__prize-name'
                  }
                >
                  {heroHeadline}
                </h2>
              ) : null}
            </div>

            <div className="prize-ticket__banner" role="group" aria-label="Ticket reference">
              <span className="prize-ticket__banner-title">VOUCHER</span>
              <span className="prize-ticket__banner-sep" aria-hidden>
                •
              </span>
              <span className="prize-ticket__banner-id">#{t.ticketNo}</span>
            </div>

            <div className="prize-ticket__details">
              <div className="prize-ticket__student-info">
                <h3 className="prize-ticket__student-name">
                  <span className="prize-ticket__student-name-inner">
                    {t.studentEmoji ? (
                      <span className="prize-ticket__student-emoji" aria-hidden>
                        {t.studentEmoji.normalize('NFC')}
                      </span>
                    ) : null}
                    <span>{displayStudent}</span>
                  </span>
                </h3>
                {t.studentNickname ? (
                  <p className="prize-ticket__student-nick">
                    ({t.studentNickname.normalize('NFC')})
                  </p>
                ) : null}
              </div>
              
              <div className="prize-ticket__stats">
                {typeof t.totalCost === 'number' ? (
                  <p className="prize-ticket__stat-line">
                    <span className="prize-ticket__stat-label">Cost:</span>
                    {t.totalCost.toLocaleString()} pts
                  </p>
                ) : null}
                {Number.isFinite(t.redeemedAt) ? (
                  <p className="prize-ticket__stat-line">
                    <span className="prize-ticket__stat-label">Date:</span>
                    {(() => {
                        try {
                          return format(new Date(t.redeemedAt), 'MMM d, yyyy');
                        } catch {
                          return '';
                        }
                      })()}
                  </p>
                ) : null}
              </div>

              {hasSurprise && surpriseKind === 'riddle' && surpriseAnswer ? (
                <div className="prize-ticket__surprise" aria-label="Riddle answer">
                  <p className="prize-ticket__surprise-answer">
                    <span className="prize-ticket__surprise-answer-label">Answer: </span>
                    {surpriseAnswer}
                  </p>
                </div>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );

  return portalThermalOverlay ? createPortal(sheet, document.body) : sheet;
}
