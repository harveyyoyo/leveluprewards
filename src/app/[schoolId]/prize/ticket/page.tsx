'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { PrizeRedeemTicketPrintSheet } from '@/components/PrizeRedeemTicketPrintSheet';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useAuth } from '@/components/providers/AuthProvider';
import { schoolPublicDocRef } from '@/lib/schoolPublic';

type TicketParams = {
  activityId: string;
  redeemedAt: number;
  studentId: string;
  studentName: string;
  studentNickname: string;
  studentEmoji: string;
  prizeName: string;
  /** Lucide name; optional. */
  prizeIcon?: string;
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
    const studentEmoji = sp.get('studentEmoji') || '';
    const prizeName = sp.get('prizeName') || '';
    const quantityRaw = sp.get('quantity') || '';
    const quantity = quantityRaw ? Number(quantityRaw) : NaN;
    const totalCostRaw = sp.get('totalCost') || '';
    const totalCost = totalCostRaw ? Number(totalCostRaw) : NaN;
    const returnPath = sp.get('returnPath') || '';
    const prizeIcon = sp.get('prizeIcon') || '';

    return {
      activityId,
      redeemedAt,
      studentId,
      studentName,
      studentNickname,
      studentEmoji,
      prizeName,
      prizeIcon: prizeIcon || undefined,
      quantity,
      totalCost,
      returnPath,
    };
  }, [sp]);
}

export default function PrizeRedeemTicketPage() {
  const ticket = useTicketParams();
  const router = useRouter();
  const { schoolId } = useParams<{ schoolId: string }>();
  const [printRequested, setPrintRequested] = useState(false);
  const firestore = useFirestore();
  const { loginState } = useAuth();
  const schoolRef = useMemoFirebase(() => {
    if (!schoolId || !firestore) return null;
    const staff = loginState === 'teacher' || loginState === 'admin' || loginState === 'developer';
    if (staff) return doc(firestore, 'schools', schoolId);
    return schoolPublicDocRef(firestore, schoolId);
  }, [firestore, schoolId, loginState]);
  const { data: schoolData } = useDoc<{ name?: string; logoUrl?: string }>(schoolRef);
  const schoolName = (schoolData?.name ?? '').trim() || schoolId;
  const logoUrl = (schoolData?.logoUrl ?? '').trim() || null;

  const prizeTickets = useMemo(() => {
    if (!ticket.activityId || !ticket.studentId || !ticket.prizeName) return null;
    const ticketNo = String(ticket.redeemedAt).replace(/\D/g, '').slice(-6) || String(ticket.redeemedAt).slice(-6);
    const qty = Number.isFinite(ticket.quantity) && ticket.quantity > 0 ? Math.floor(ticket.quantity) : 1;
    const per =
      typeof ticket.totalCost === 'number' && qty > 0 ? Math.round(ticket.totalCost / qty) : undefined;
    return Array.from({ length: qty }, (_, i) => ({
      activityId: ticket.activityId,
      ticketNo: qty > 1 ? `${ticketNo}-${i + 1}` : ticketNo,
      redeemedAt: ticket.redeemedAt,
      studentId: ticket.studentId,
      studentName: ticket.studentName,
      studentNickname: ticket.studentNickname || undefined,
      studentEmoji: ticket.studentEmoji.trim() || undefined,
      prizeName: ticket.prizeName,
      prizeIcon: ticket.prizeIcon || 'Gift',
      quantity: 1,
      totalCost: per,
    }));
  }, [ticket]);

  useEffect(() => {
    const style = document.createElement('style');
    style.setAttribute('data-prize-ticket-print', 'true');
    style.textContent =
      '@media print {' +
      'html,body{margin:0 !important;padding:0 !important;background:#fff !important;}' +
      '#screen-view,.no-print,[data-radix-toast-viewport]{display:none !important;}' +
      '}';
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, []);

  useEffect(() => {
    if (printRequested) return;
    if (!prizeTickets?.length) return;

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
  }, [printRequested, prizeTickets, ticket.returnPath, router]);

  if (!prizeTickets?.length) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center p-6 text-sm text-muted-foreground">
        Invalid ticket link.
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex justify-center bg-white py-3 px-2 box-border print:min-h-0 print:py-0 print:px-0">
      <PrizeRedeemTicketPrintSheet
        displayMode="page"
        tickets={prizeTickets}
        schoolName={schoolName}
        logoUrl={logoUrl}
      />
    </div>
  );
}
