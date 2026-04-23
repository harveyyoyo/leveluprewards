'use client';

import { format } from 'date-fns';
import DynamicIcon from '@/components/DynamicIcon';
import { stripLeadingEmojiFromPrizeName } from '@/lib/prize-utils';

export type PrizeRedeemTicket = {
  activityId: string;
  ticketNo: string;
  redeemedAt: number;
  studentId: string;
  studentName: string;
  studentNickname?: string;
  prizeName: string;
  /** Lucide icon name (matches shop card). */
  prizeIcon?: string;
  quantity: number;
  totalCost?: number;
};

export function PrizeRedeemTicketPrintSheet({
  tickets,
  logoUrl,
  schoolName,
}: {
  tickets: PrizeRedeemTicket[];
  logoUrl?: string | null;
  schoolName?: string | null;
}) {
  if (!tickets || tickets.length === 0) return null;

  const multiPage = tickets.length > 1;

  return (
    <div
      id="prize-ticket-print-wrapper"
      data-ticket-pages={multiPage ? 'multi' : 'single'}
    >
      {tickets.map((t) => {
        const rawPrizeName = (t.prizeName || '').trim();
        const displayPrizeName = stripLeadingEmojiFromPrizeName(rawPrizeName) || rawPrizeName;
        const displayStudent = (t.studentName || t.studentId || '').normalize('NFC');

        return (
        <div key={`${t.activityId}-${t.ticketNo}`} className="prize-ticket">
          <div className="prize-ticket__stack">
            <div className="prize-ticket__header">
            <div className="prize-ticket__top">
              <div className="prize-ticket__logo-wrap">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="prize-ticket__logo" src={logoUrl} alt="" />
                ) : (
                  <div className="prize-ticket__logo-fallback" aria-hidden>
                    LU
                  </div>
                )}
              </div>
              <div className="prize-ticket__top-text">
                <div className="prize-ticket__brand-line">
                  <span className="prize-ticket__brand-mark">LEVELUP</span>
                  <span className="prize-ticket__brand-sub">REDEEM</span>
                </div>
                {schoolName ? <div className="prize-ticket__school">{schoolName}</div> : null}
              </div>
            </div>
            </div>

            <div className="prize-ticket__middle">
            <div className="prize-ticket__prize">
              <div className="prize-ticket__prize-mark" aria-hidden>
                <span className="prize-ticket__prize-icon">
                  <DynamicIcon name={(t.prizeIcon || 'Gift').trim() || 'Gift'} className="prize-ticket__lucide" />
                </span>
              </div>
              <span className="prize-ticket__prize-name">{displayPrizeName}</span>
            </div>
            <div className="prize-ticket__middle-note">Present to staff for fulfillment</div>
            </div>

            <div className="prize-ticket__banner">
              <span className="prize-ticket__title">Prize ticket</span>
              <span className="prize-ticket__banner-sep" aria-hidden>
                ·
              </span>
              <span className="prize-ticket__subtle">#{t.ticketNo}</span>
            </div>

            <div className="prize-ticket__section">
            <div className="prize-ticket__student">
              {displayStudent}
              {t.studentNickname ? <span className="prize-ticket__subtle"> ({t.studentNickname.normalize('NFC')})</span> : null}
            </div>
            {typeof t.totalCost === 'number' ? (
              <div className="prize-ticket__row">
                <div className="prize-ticket__label">Cost:</div>
                <div className="prize-ticket__value">{t.totalCost.toLocaleString()} pts</div>
              </div>
            ) : null}
            {Number.isFinite(t.redeemedAt) ? (
              <div className="prize-ticket__row">
                <div className="prize-ticket__label">Date:</div>
                <div className="prize-ticket__value">
                  {(() => {
                    try {
                      return format(new Date(t.redeemedAt), 'MMM d, yyyy');
                    } catch {
                      return '';
                    }
                  })()}
                </div>
              </div>
            ) : null}
            </div>
          </div>
        </div>
        );
      })}
    </div>
  );
}

