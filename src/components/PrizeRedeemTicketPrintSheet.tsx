'use client';

import { useEffect } from 'react';
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
  /** `overlay` = off-screen for window.print() from the root provider; `page` = visible full-page (e.g. /prize/ticket). */
  displayMode = 'overlay' as 'overlay' | 'page',
}: {
  tickets: PrizeRedeemTicket[];
  logoUrl?: string | null;
  schoolName?: string | null;
  displayMode?: 'overlay' | 'page';
}) {
  useEffect(() => {
    document.body.classList.add('prize-ticket-printing');
    return () => {
      document.body.classList.remove('prize-ticket-printing');
    };
  }, []);

  if (!tickets || tickets.length === 0) return null;

  const multiPage = tickets.length > 1;
  const schoolLabel = (schoolName || '').trim() || null;
  const wrapperId = displayMode === 'page' ? 'prize-ticket-standalone' : 'prize-ticket-print-wrapper';

  return (
    <div
      id={wrapperId}
      className="prize-ticket-root"
      data-ticket-pages={multiPage ? 'multi' : 'single'}
    >
      {tickets.map((t) => {
        const rawPrizeName = (t.prizeName || '').trim();
        const displayPrizeName = stripLeadingEmojiFromPrizeName(rawPrizeName) || rawPrizeName;
        const displayStudent = (t.studentName || t.studentId || '').normalize('NFC');

        return (
          <article key={`${t.activityId}-${t.ticketNo}`} className="prize-ticket">
            <header className="prize-ticket__head">
              <div className="prize-ticket__logo-box">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="prize-ticket__logo" src={logoUrl} alt="" />
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
                <DynamicIcon
                  name={(t.prizeIcon || 'Gift').trim() || 'Gift'}
                  className="prize-ticket__lucide"
                />
              </div>
              <h2 className="prize-ticket__prize-name">{displayPrizeName}</h2>
            </div>

            <div className="prize-ticket__banner" role="group" aria-label="Ticket reference">
              <span className="prize-ticket__banner-title">PRIZE TICKET</span>
              <span className="prize-ticket__banner-sep" aria-hidden>
                •
              </span>
              <span className="prize-ticket__banner-id">#{t.ticketNo}</span>
            </div>

            <div className="prize-ticket__details">
              <div className="prize-ticket__student-info">
                <h3 className="prize-ticket__student-name">
                  {displayStudent}
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
            </div>
          </article>
        );
      })}
    </div>
  );
}
