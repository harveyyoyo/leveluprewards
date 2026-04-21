
'use client';

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useMemo,
    useRef,
    useCallback,
} from 'react';
import { flushSync } from 'react-dom';
import type { Coupon, Student, Class } from '@/lib/types';
import { PrintSheet } from '@/components/PrintSheet';
import { StudentIdPrintSheet } from '@/components/StudentIdPrintSheet';
import { StudentIdDTCPrintSheet } from '@/components/StudentIdDTCPrintSheet';
import { PrizeRedeemTicketPrintSheet, type PrizeRedeemTicket } from '@/components/PrizeRedeemTicketPrintSheet';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useAuth } from './AuthProvider';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

interface PrintContextType {
    setCouponsToPrint: (coupons: Coupon[]) => void;
    setStudentsToPrint: (data: { students: Student[]; classes: Class[]; printerType?: 'dtc4500e' }) => void;
    setPrizeTicketsToPrint: (tickets: PrizeRedeemTicket[]) => void;
    printPrizeTickets: (tickets: PrizeRedeemTicket[]) => void;
}

const PrintContext = createContext<PrintContextType | null>(null);

const PRINT_SAFETY_TIMEOUT_MS = 15_000;

/** Prize ticket uses Fraunces + DM Sans from root `layout.tsx` Google Fonts (not next/font). */
function ensurePrizeTicketFontsLoaded(): Promise<void> {
    const api = document.fonts;
    if (!api?.load) return Promise.resolve();
    const specs = [
        '600 8px Fraunces',
        '700 11px Fraunces',
        '700 14px Fraunces',
        '700 18px Fraunces',
        '800 22px Fraunces',
        '500 7px "DM Sans"',
        '600 7px "DM Sans"',
        '700 10px "DM Sans"',
        '800 13px "DM Sans"',
        '800 17px "DM Sans"',
    ];
    return Promise.all(specs.map((s) => api.load(s).catch(() => undefined))).then(() => undefined);
}

export function PrintProvider({ children }: { children: React.ReactNode }) {
    const [couponsToPrint, setCouponsToPrint] = useState<Coupon[]>([]);
    const [printData, setPrintData] = useState<{ students: Student[]; classes: Class[]; printerType?: 'dtc4500e' } | null>(null);
    const [prizeTicketsToPrint, setPrizeTicketsToPrint] = useState<PrizeRedeemTicket[]>([]);
    const playSound = useArcadeSound();
    const { schoolId } = useAuth();
    const firestore = useFirestore();

    const appConfigRef = useMemoFirebase(() => (firestore ? doc(firestore, 'appConfig', 'global') : null), [firestore]);
    const schoolDocRef = useMemoFirebase(() => (firestore && schoolId ? doc(firestore, 'schools', schoolId) : null), [firestore, schoolId]);
    const { isLoading: appConfigLoading, data: appConfig } = useDoc<{ appLogoUrl?: string; appName?: string; appTagline?: string }>(appConfigRef);
    const { isLoading: schoolConfigLoading, data: schoolData } = useDoc<{ name?: string; logoUrl?: string }>(schoolDocRef);

    // ── Coupon print (unchanged — works) ──
    const printTriggered = useRef(false);
    const printSafetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (couponsToPrint.length > 0 && !printTriggered.current && !appConfigLoading && !schoolConfigLoading) {
            printTriggered.current = true;

            const cleanup = () => {
                setCouponsToPrint([]);
                printTriggered.current = false;
                window.removeEventListener('afterprint', cleanup);
                if (printSafetyTimer.current) { clearTimeout(printSafetyTimer.current); printSafetyTimer.current = null; }
            };

            window.addEventListener('afterprint', cleanup);
            printSafetyTimer.current = setTimeout(cleanup, PRINT_SAFETY_TIMEOUT_MS);

            playSound('swoosh');
            document.fonts.load('38pt "Libre Barcode 39"').finally(window.print);
        }
    }, [couponsToPrint, playSound, appConfigLoading, schoolConfigLoading]);

    // ── Student ID card print — mirrors the coupon flow exactly ──
    const studentPrintTriggered = useRef(false);
    const studentSafetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (printData && printData.students.length > 0 && !studentPrintTriggered.current && !appConfigLoading && !schoolConfigLoading) {
            studentPrintTriggered.current = true;

            const cleanup = () => {
                setPrintData(null);
                studentPrintTriggered.current = false;
                window.removeEventListener('afterprint', cleanup);
                if (studentSafetyTimer.current) { clearTimeout(studentSafetyTimer.current); studentSafetyTimer.current = null; }
            };

            window.addEventListener('afterprint', cleanup);
            studentSafetyTimer.current = setTimeout(cleanup, PRINT_SAFETY_TIMEOUT_MS);

            playSound('swoosh');
            document.fonts.load('48pt "Libre Barcode 39"').finally(() => {
                window.print();
            });
        }
    }, [printData, playSound, appConfigLoading, schoolConfigLoading]);

    // ── Prize redeem ticket print — mirrors the coupon flow ──
    const prizeTicketTriggered = useRef(false);
    const prizeTicketSafetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const cleanupPrizeTicketPrint = useCallback((styleEl?: HTMLStyleElement) => {
        setPrizeTicketsToPrint([]);
        prizeTicketTriggered.current = false;
        window.removeEventListener('afterprint', cleanupPrizeTicketPrint as any);
        if (prizeTicketSafetyTimer.current) { clearTimeout(prizeTicketSafetyTimer.current); prizeTicketSafetyTimer.current = null; }
        document.body.classList.remove('prize-ticket-printing');
        styleEl?.remove();
        document.documentElement.style.removeProperty('--prize-label-w');
        document.documentElement.style.removeProperty('--prize-label-h');
        document.documentElement.style.removeProperty('--prize-print-scale');
    }, []);

    const printPrizeTickets = useCallback((tickets: PrizeRedeemTicket[]) => {
        prizeTicketTriggered.current = false;
        if (prizeTicketSafetyTimer.current) { clearTimeout(prizeTicketSafetyTimer.current); prizeTicketSafetyTimer.current = null; }

        // Synchronously mount the print sheet so calling window.print() is still a user gesture.
        flushSync(() => {
            setPrizeTicketsToPrint(tickets);
        });

        if (tickets.length === 0 || prizeTicketTriggered.current) return;
        prizeTicketTriggered.current = true;

        const styleEl = document.createElement('style');
        styleEl.setAttribute('data-prize-ticket-page', 'true');

        // Match the printer dialog paper size: 50mm x 70mm.
        const labelWmm = 50;
        const labelHmm = 70;

        document.documentElement.style.setProperty('--prize-label-w', `${labelWmm}mm`);
        document.documentElement.style.setProperty('--prize-label-h', `${labelHmm}mm`);
        // Print as close to full-size as possible (keep a small CSS gutter instead).
        document.documentElement.style.setProperty('--prize-print-scale', '1');

        const multi = tickets.length > 1;
        // Must beat globals.css `html body { width:100%; height:auto }` (same @media print) or label jobs fragment wrong.
        // Same label width for 1 or N tickets; only height differs (one page vs stacked pages).
        const htmlBodyHeight = multi
            ? `  html:has(body.prize-ticket-printing) {
    height: auto !important;
    min-height: 0 !important;
    overflow: visible !important;
  }
  html body.prize-ticket-printing {
    height: auto !important;
    min-height: 0 !important;
    overflow: visible !important;
  }`
            : `  html:has(body.prize-ticket-printing) {
    height: ${labelHmm}mm !important;
    max-height: ${labelHmm}mm !important;
    overflow: hidden !important;
  }
  html body.prize-ticket-printing {
    height: ${labelHmm}mm !important;
    max-height: ${labelHmm}mm !important;
    overflow: hidden !important;
  }`;
        const htmlBody = [
            '  html:has(body.prize-ticket-printing),',
            '  html body.prize-ticket-printing {',
            `    width: ${labelWmm}mm !important;`,
            `    max-width: ${labelWmm}mm !important;`,
            '    margin: 0 !important;',
            '    padding: 0 !important;',
            '  }',
            htmlBodyHeight,
        ].join('\n');

        styleEl.textContent = [
            '@media print {',
            `  @page { size: ${labelWmm}mm ${labelHmm}mm; margin: 0; }`,
            htmlBody,
            '}',
        ].join('\n');
        document.head.appendChild(styleEl);

        const cleanup = () => cleanupPrizeTicketPrint(styleEl);
        window.addEventListener('afterprint', cleanup);
        prizeTicketSafetyTimer.current = setTimeout(cleanup, PRINT_SAFETY_TIMEOUT_MS);

        playSound('swoosh');
        document.body.classList.add('prize-ticket-printing');

        const runPrint = () => {
            requestAnimationFrame(() => {
                void document.getElementById('prize-ticket-print-wrapper')?.offsetHeight;
                window.print();
            });
        };

        void ensurePrizeTicketFontsLoaded()
            .then(() =>
                Promise.race([
                    document.fonts.ready,
                    new Promise<void>((r) => setTimeout(r, 1500)),
                ]),
            )
            .catch(() => undefined)
            .finally(runPrint);
    }, [cleanupPrizeTicketPrint, playSound]);

    // NOTE: Prize tickets are printed via `printPrizeTickets()` to keep `window.print()`
    // inside the user gesture. Do not re-add an effect-driven print here or browsers may block it.

    const handleSetStudentsToPrint = useCallback((data: { students: Student[]; classes: Class[]; printerType?: 'dtc4500e' }) => {
        studentPrintTriggered.current = false;
        if (studentSafetyTimer.current) { clearTimeout(studentSafetyTimer.current); studentSafetyTimer.current = null; }
        setPrintData(data);
    }, []);

    const handleSetPrizeTicketsToPrint = useCallback((tickets: PrizeRedeemTicket[]) => {
        prizeTicketTriggered.current = false;
        if (prizeTicketSafetyTimer.current) { clearTimeout(prizeTicketSafetyTimer.current); prizeTicketSafetyTimer.current = null; }
        setPrizeTicketsToPrint(tickets);
    }, []);

    const value = useMemo(
        () => ({ setCouponsToPrint, setStudentsToPrint: handleSetStudentsToPrint, setPrizeTicketsToPrint: handleSetPrizeTicketsToPrint, printPrizeTickets }),
        [handleSetStudentsToPrint, handleSetPrizeTicketsToPrint, printPrizeTickets]
    );

    return (
        <PrintContext.Provider value={value}>
            {children}
            {couponsToPrint.length > 0 && <PrintSheet coupons={couponsToPrint} schoolId={schoolId} schoolName={schoolData?.name} />}
            {printData && printData.students.length > 0 && printData.printerType !== 'dtc4500e' && <StudentIdPrintSheet students={printData.students} classes={printData.classes} schoolId={schoolId} appConfig={appConfig} schoolData={schoolData} />}
            {printData && printData.students.length > 0 && printData.printerType === 'dtc4500e' && <StudentIdDTCPrintSheet students={printData.students} classes={printData.classes} schoolId={schoolId} appConfig={appConfig} schoolData={schoolData} />}
            {prizeTicketsToPrint.length > 0 && (
              <PrizeRedeemTicketPrintSheet
                tickets={prizeTicketsToPrint}
                logoUrl={schoolData?.logoUrl ?? appConfig?.appLogoUrl ?? null}
                schoolName={schoolData?.name ?? null}
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
