'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';

type TicketParams = {
  activityId: string;
  redeemedAt: number;
  studentId: string;
  studentName: string;
  studentNickname: string;
  prizeName: string;
  quantity: number;
  totalCost: number;
  returnPath: string;
};

function useTicketParams(): TicketParams {
  const sp = useSearchParams();
  return useMemo(() => {
    const activityId = sp.get('activityId') || '';
    const redeemedAtRaw = sp.get('redeemedAt') || '';
    const redeemedAt = redeemedAtRaw ? Number(redeemedAtRaw) : NaN;
    const studentId = sp.get('studentId') || '';
    const studentName = sp.get('studentName') || '';
    const studentNickname = sp.get('studentNickname') || '';
    const prizeName = sp.get('prizeName') || '';
    const quantityRaw = sp.get('quantity') || '';
    const quantity = quantityRaw ? Number(quantityRaw) : NaN;
    const totalCostRaw = sp.get('totalCost') || '';
    const totalCost = totalCostRaw ? Number(totalCostRaw) : NaN;
    const returnPath = sp.get('returnPath') || '';

    return {
      activityId,
      redeemedAt,
      studentId,
      studentName,
      studentNickname,
      prizeName,
      quantity,
      totalCost,
      returnPath,
    };
  }, [sp]);
}

export default function PrizeRedeemTicketPage() {
  const ticket = useTicketParams();
  const router = useRouter();
  const [printRequested, setPrintRequested] = useState(false);

  useEffect(() => {
    // Minimal print CSS without template literals (Windows-safe for tsc).
    const style = document.createElement('style');
    style.setAttribute('data-prize-ticket-print', 'true');
    style.textContent =
      '@media print {' +
      '@page { margin: 0; }' +
      'html,body{margin:0 !important;padding:0 !important;background:#fff !important;color:#000 !important;-webkit-print-color-adjust:exact;print-color-adjust:exact;}' +
      '}';
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, []);

  useEffect(() => {
    if (printRequested) return;
    if (!ticket.activityId || !ticket.studentId || !ticket.prizeName) return;

    setPrintRequested(true);
    const safety = window.setTimeout(() => {
      if (ticket.returnPath) router.replace(ticket.returnPath);
      else router.back();
    }, 10_000);

    const cleanup = () => {
      window.removeEventListener('afterprint', cleanup);
      window.clearTimeout(safety);
      if (ticket.returnPath) router.replace(ticket.returnPath);
      else router.back();
    };
    window.addEventListener('afterprint', cleanup);

    const t = window.setTimeout(() => window.print(), 150);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(safety);
      window.removeEventListener('afterprint', cleanup);
    };
  }, [printRequested, ticket.activityId, ticket.studentId, ticket.prizeName, ticket.returnPath, router]);

  const redeemedLabel = (() => {
    if (!Number.isFinite(ticket.redeemedAt)) return '';
    try {
      return format(new Date(ticket.redeemedAt), 'MMM d, yyyy h:mm a');
    } catch {
      return '';
    }
  })();

  const qty = Number.isFinite(ticket.quantity) && ticket.quantity > 0 ? ticket.quantity : 1;
  const totalCost = Number.isFinite(ticket.totalCost) ? ticket.totalCost : undefined;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'start center',
        background: '#fff',
        padding: 12,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '58mm',
          maxWidth: '100%',
          border: '1px solid #000',
          padding: '10px 10px 12px',
          boxSizing: 'border-box',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Noto Sans", "Liberation Sans", sans-serif',
          fontSize: 12,
          lineHeight: 1.2,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontWeight: 900, letterSpacing: '0.12em', fontSize: 14 }}>PRIZE REDEEM</div>
          <div style={{ opacity: 0.75, fontSize: 10 }}>Ticket #{ticket.activityId}</div>
        </div>

        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr', gap: 8, alignItems: 'start' }}>
            <div style={{ fontWeight: 700, opacity: 0.75 }}>Student</div>
            <div style={{ fontWeight: 800, wordBreak: 'break-word' }}>
              {ticket.studentName || ticket.studentId}
              {ticket.studentNickname ? <span style={{ opacity: 0.75, fontSize: 10 }}> ({ticket.studentNickname})</span> : null}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr', gap: 8, alignItems: 'start' }}>
            <div style={{ fontWeight: 700, opacity: 0.75 }}>Prize</div>
            <div style={{ fontWeight: 800, wordBreak: 'break-word' }}>{ticket.prizeName}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr', gap: 8, alignItems: 'start' }}>
            <div style={{ fontWeight: 700, opacity: 0.75 }}>Qty</div>
            <div style={{ fontWeight: 800, wordBreak: 'break-word' }}>{qty}</div>
          </div>
          {typeof totalCost === 'number' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr', gap: 8, alignItems: 'start' }}>
              <div style={{ fontWeight: 700, opacity: 0.75 }}>Cost</div>
              <div style={{ fontWeight: 800, wordBreak: 'break-word' }}>{totalCost.toLocaleString()} pts</div>
            </div>
          ) : null}
          {redeemedLabel ? (
            <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr', gap: 8, alignItems: 'start' }}>
              <div style={{ fontWeight: 700, opacity: 0.75 }}>Time</div>
              <div style={{ fontWeight: 800, wordBreak: 'break-word' }}>{redeemedLabel}</div>
            </div>
          ) : null}
        </div>

        <div style={{ height: 1, background: '#000', margin: '10px 0' }} />

        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr', gap: 8, alignItems: 'start' }}>
            <div style={{ fontWeight: 700, opacity: 0.75 }}>Fulfilled</div>
            <div style={{ fontWeight: 800, wordBreak: 'break-word' }}>[ ] Yes   [ ] No</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr', gap: 8, alignItems: 'start' }}>
            <div style={{ fontWeight: 700, opacity: 0.75 }}>Staff</div>
            <div style={{ fontWeight: 800, wordBreak: 'break-word' }}>________________</div>
          </div>
        </div>

        <div style={{ marginTop: 10, textAlign: 'center', fontWeight: 700, fontSize: 11, opacity: 0.85 }}>
          Keep this ticket with the prize.
        </div>
      </div>
    </div>
  );
}

