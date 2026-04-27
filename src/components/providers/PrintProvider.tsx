
'use client';

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useMemo,
    useRef,
} from 'react';
import type { Coupon, Student, Class } from '@/lib/types';
import { PrintSheet } from '@/components/PrintSheet';
import { StudentIdPrintSheet } from '@/components/StudentIdPrintSheet';
import { StudentIdDTCPrintSheet } from '@/components/StudentIdDTCPrintSheet';
import { PrizeRedeemTicketPrintSheet, PrizeRedeemTicket } from '@/components/PrizeRedeemTicketPrintSheet';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useAuth } from './AuthProvider';
import { useDoc } from '@/firebase';
import { useSchoolMetadataDocRef } from '@/hooks/useSchoolMetadataDocRef';

interface PrintContextType {
    setCouponsToPrint: (coupons: Coupon[]) => void;
    setStudentsToPrint: (data: { students: Student[]; classes: Class[]; printerType?: 'dtc4500e' }) => void;
    printPrizeTickets: (tickets: PrizeRedeemTicket[]) => void;
}

const PrintContext = createContext<PrintContextType | null>(null);

async function ensurePrizeTicketFontsLoaded(): Promise<void> {
    if (typeof document === 'undefined') return;
    // Best-effort: the print wrapper is off-screen; make sure fonts are loaded before printing.
    try {
        // Fraunces / DM Sans are loaded via <link> in app layout.
        await Promise.allSettled([
            document.fonts.load('700 28pt "Fraunces"'),
            document.fonts.load('400 16pt "DM Sans"'),
        ]);
    } catch {
        // ignore
    }
}

export function PrintProvider({ children }: { children: React.ReactNode }) {
    const [couponsToPrint, setCouponsToPrint] = useState<Coupon[]>([]);
    const [printData, setPrintData] = useState<{ students: Student[]; classes: Class[]; printerType?: 'dtc4500e' } | null>(null);
    const [prizeTicketsToPrint, setPrizeTicketsToPrint] = useState<PrizeRedeemTicket[]>([]);
    const playSound = useArcadeSound();
    const { schoolId } = useAuth();
    const schoolDocRef = useSchoolMetadataDocRef();
    const { data: schoolData } = useDoc<{ name?: string; logoUrl?: string }>(schoolDocRef);
    const printSchoolName = (schoolData?.name ?? '').trim() || (schoolId ? schoolId : null);
    const printSchoolLogoUrl = (schoolData?.logoUrl ?? '').trim() || null;

    const printTriggered = useRef(false);
    useEffect(() => {
        if (couponsToPrint.length > 0 && !printTriggered.current) {
            printTriggered.current = true;
            const afterPrint = () => {
                setCouponsToPrint([]);
                printTriggered.current = false;
                window.removeEventListener('afterprint', afterPrint);
            };
            window.addEventListener('afterprint', afterPrint);
            playSound('swoosh');
            document.fonts.load('38pt "Libre Barcode 39"').finally(window.print);
        }
    }, [couponsToPrint, playSound]);

    const studentPrintTriggered = useRef(false);
    const triggerStudentPrint = React.useCallback(() => {
        if (printData && printData.students.length > 0 && !studentPrintTriggered.current) {
            studentPrintTriggered.current = true;
            const afterPrint = () => {
                setPrintData(null);
                studentPrintTriggered.current = false;
                window.removeEventListener('afterprint', afterPrint);
            };
            window.addEventListener('afterprint', afterPrint);
            playSound('swoosh');
            document.fonts.load('48pt "Libre Barcode 39"').finally(window.print);
        }
    }, [printData, playSound]);

    const prizePrintTriggered = useRef(false);
    const prizeTicketAfterPrintRef = useRef<(() => void) | null>(null);
    useEffect(() => {
        if (prizeTicketsToPrint.length > 0 && !prizePrintTriggered.current) {
            prizePrintTriggered.current = true;
            const afterPrint = () => {
                setPrizeTicketsToPrint([]);
                prizePrintTriggered.current = false;
                if (prizeTicketAfterPrintRef.current) {
                    window.removeEventListener('afterprint', prizeTicketAfterPrintRef.current);
                    prizeTicketAfterPrintRef.current = null;
                }
            };
            prizeTicketAfterPrintRef.current = afterPrint;
            window.addEventListener('afterprint', afterPrint);
            playSound('swoosh');
            ensurePrizeTicketFontsLoaded().finally(() => window.print());
        }
    }, [prizeTicketsToPrint, playSound]);

    const value = useMemo(
        () => ({ 
            setCouponsToPrint, 
            setStudentsToPrint: setPrintData,
            printPrizeTickets: setPrizeTicketsToPrint
        }),
        []
    );

    return (
        <PrintContext.Provider value={value}>
            {children}
            {couponsToPrint.length > 0 && <PrintSheet coupons={couponsToPrint} schoolId={schoolId} />}
            {printData && printData.students.length > 0 && printData.printerType !== 'dtc4500e' && <StudentIdPrintSheet students={printData.students} classes={printData.classes} schoolId={schoolId} onReady={triggerStudentPrint} />}
            {printData && printData.students.length > 0 && printData.printerType === 'dtc4500e' && <StudentIdDTCPrintSheet students={printData.students} classes={printData.classes} schoolId={schoolId} onReady={triggerStudentPrint} />}
            {prizeTicketsToPrint.length > 0 && (
                <PrizeRedeemTicketPrintSheet
                    tickets={prizeTicketsToPrint}
                    schoolName={printSchoolName}
                    logoUrl={printSchoolLogoUrl}
                />
            )}
        </PrintContext.Provider>
    );
}

export const usePrint = () => {
    const context = useContext(PrintContext);
    if (!context) {
        throw new Error('usePrint must be used within a PrintProvider');
    }
    return context;
};
