
'use client';

import React, {
    createContext,
    useContext,
    useState,
    useMemo,
    useRef,
} from 'react';
import dynamic from 'next/dynamic';
import type { Coupon, Student, Class, Prize, LibraryItem } from '@/lib/types';
import type { PrizeRedeemTicket } from '@/components/PrizeRedeemTicketPrintSheet';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useAuth } from './AuthProvider';
import { useDoc } from '@/firebase';
import { useSchoolMetadataDocRef } from '@/hooks/useSchoolMetadataDocRef';
import type { CouponPrintPageSize } from '@/lib/couponPrint';
import { useSettings } from '@/components/providers/SettingsProvider';
import type { PrizeVoucherPaperFormat } from '@/lib/prizeVoucherPrint';
import { applyThermalPrizePrintRootLocks, clearThermalPrizePrintRootLocks } from '@/lib/prizeThermalPrintDom';

const PrintSheet = dynamic(
    () => import('@/components/PrintSheet').then((m) => ({ default: m.PrintSheet })),
    { ssr: false },
);

const StudentIdPrintSheet = dynamic(
    () => import('@/components/StudentIdPrintSheet').then((m) => ({ default: m.StudentIdPrintSheet })),
    { ssr: false },
);

const StudentIdDTCPrintSheet = dynamic(
    () => import('@/components/StudentIdDTCPrintSheet').then((m) => ({ default: m.StudentIdDTCPrintSheet })),
    { ssr: false },
);

const PrizeRedeemTicketPrintSheet = dynamic(
    () => import('@/components/PrizeRedeemTicketPrintSheet').then((m) => ({ default: m.PrizeRedeemTicketPrintSheet })),
    { ssr: false },
);

const PrizeIdPrintSheet = dynamic(
    () => import('@/components/PrizeIdPrintSheet').then((m) => ({ default: m.PrizeIdPrintSheet })),
    { ssr: false },
);

const PrizeIdDTCPrintSheet = dynamic(
    () => import('@/components/PrizeIdDTCPrintSheet').then((m) => ({ default: m.PrizeIdDTCPrintSheet })),
    { ssr: false },
);

const LibraryBarcodePrintSheet = dynamic(
    () => import('@/components/LibraryBarcodePrintSheet').then((m) => ({ default: m.LibraryBarcodePrintSheet })),
    { ssr: false },
);

interface PrintContextType {
    setCouponsToPrint: (coupons: Coupon[], options?: { couponsPerPage?: CouponPrintPageSize }) => void;
    setStudentsToPrint: (data: { students: Student[]; classes: Class[]; printerType?: 'dtc4500e' }) => void;
    printPrizeTickets: (tickets: PrizeRedeemTicket[]) => void;
    setPrizeIdCardsToPrint: (data: { prizes: Prize[]; printerType?: 'dtc4500e' }) => void;
    setLibraryStickersToPrint: (items: LibraryItem[]) => void;
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
    const [couponPrintJob, setCouponPrintJob] = useState<{ coupons: Coupon[]; couponsPerPage: CouponPrintPageSize } | null>(null);
    const [printData, setPrintData] = useState<{ students: Student[]; classes: Class[]; printerType?: 'dtc4500e' } | null>(null);
    const [prizeTicketsToPrint, setPrizeTicketsToPrint] = useState<PrizeRedeemTicket[]>([]);
    const [prizeIdPrintData, setPrizeIdPrintData] = useState<{ prizes: Prize[]; printerType?: 'dtc4500e' } | null>(null);
    const [libraryStickersToPrint, setLibraryStickersToPrint] = useState<LibraryItem[]>([]);
    const { settings } = useSettings();
    const prizeVoucherPaperFormat: PrizeVoucherPaperFormat =
        settings.prizeVoucherPaperFormat === 'thermal_80mm' ? 'thermal_80mm' : 'label_50x70';
    const playSound = useArcadeSound();
    const { schoolId } = useAuth();
    const schoolDocRef = useSchoolMetadataDocRef();
    const { data: schoolData } = useDoc<{ name?: string; logoUrl?: string }>(schoolDocRef);
    const printSchoolName = (schoolData?.name ?? '').trim() || (schoolId ? schoolId : null);
    const printSchoolLogoUrl = (schoolData?.logoUrl ?? '').trim() || null;

    const printTriggered = useRef(false);
    const triggerCouponPrint = React.useCallback(() => {
        if (couponPrintJob && couponPrintJob.coupons.length > 0 && !printTriggered.current) {
            printTriggered.current = true;
            const afterPrint = () => {
                setCouponPrintJob(null);
                printTriggered.current = false;
                window.removeEventListener('afterprint', afterPrint);
            };
            window.addEventListener('afterprint', afterPrint);
            playSound('swoosh');
            document.fonts.load('38pt "Libre Barcode 39"').finally(() => {
              requestAnimationFrame(() => {
                requestAnimationFrame(() => window.print());
              });
            });
        }
    }, [couponPrintJob, playSound]);

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
            document.fonts.load('48pt "Libre Barcode 39"').finally(() => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => window.print());
                });
            });
        }
    }, [printData, playSound]);

    const prizePrintTriggered = useRef(false);
    const prizeTicketAfterPrintRef = useRef<(() => void) | null>(null);
    const triggerPrizeTicketPrint = React.useCallback(() => {
        if (prizeTicketsToPrint.length > 0 && !prizePrintTriggered.current) {
            prizePrintTriggered.current = true;
            const afterPrint = () => {
                if (prizeVoucherPaperFormat === 'thermal_80mm') {
                    clearThermalPrizePrintRootLocks();
                }
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
            ensurePrizeTicketFontsLoaded().finally(() => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        if (prizeVoucherPaperFormat === 'thermal_80mm') {
                            applyThermalPrizePrintRootLocks();
                        }
                        window.print();
                    });
                });
            });
        }
    }, [prizeTicketsToPrint, playSound, prizeVoucherPaperFormat]);

    const prizeIdPrintTriggered = useRef(false);
    const triggerPrizeIdPrint = React.useCallback(() => {
        if (prizeIdPrintData && prizeIdPrintData.prizes.length > 0 && !prizeIdPrintTriggered.current) {
            prizeIdPrintTriggered.current = true;
            const afterPrint = () => {
                setPrizeIdPrintData(null);
                prizeIdPrintTriggered.current = false;
                window.removeEventListener('afterprint', afterPrint);
            };
            window.addEventListener('afterprint', afterPrint);
            playSound('swoosh');
            document.fonts.load('48pt "Libre Barcode 39"').finally(() => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => window.print());
                });
            });
        }
    }, [prizeIdPrintData, playSound]);

    const libraryPrintTriggered = useRef(false);
    const triggerLibraryStickerPrint = React.useCallback(() => {
        if (libraryStickersToPrint.length > 0 && !libraryPrintTriggered.current) {
            libraryPrintTriggered.current = true;
            const afterPrint = () => {
                setLibraryStickersToPrint([]);
                libraryPrintTriggered.current = false;
                window.removeEventListener('afterprint', afterPrint);
            };
            window.addEventListener('afterprint', afterPrint);
            playSound('swoosh');
            document.fonts.load('32pt "Libre Barcode 39"').finally(() => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => window.print());
                });
            });
        }
    }, [libraryStickersToPrint, playSound]);

    const value = useMemo(
        () => ({ 
            setCouponsToPrint: (coupons: Coupon[], options?: { couponsPerPage?: CouponPrintPageSize }) => {
                setCouponPrintJob({ coupons, couponsPerPage: options?.couponsPerPage ?? 10 });
            }, 
            setStudentsToPrint: setPrintData,
            printPrizeTickets: setPrizeTicketsToPrint,
            setPrizeIdCardsToPrint: setPrizeIdPrintData,
            setLibraryStickersToPrint,
        }),
        []
    );

    return (
        <PrintContext.Provider value={value}>
            {children}
            {couponPrintJob && couponPrintJob.coupons.length > 0 && (
                <PrintSheet
                    coupons={couponPrintJob.coupons}
                    couponsPerPage={couponPrintJob.couponsPerPage}
                    schoolId={schoolId}
                    onReady={triggerCouponPrint}
                />
            )}
            {printData && printData.students.length > 0 && printData.printerType !== 'dtc4500e' && <StudentIdPrintSheet students={printData.students} classes={printData.classes} schoolId={schoolId} onReady={triggerStudentPrint} />}
            {printData && printData.students.length > 0 && printData.printerType === 'dtc4500e' && <StudentIdDTCPrintSheet students={printData.students} classes={printData.classes} schoolId={schoolId} onReady={triggerStudentPrint} />}
            {prizeTicketsToPrint.length > 0 && (
                <PrizeRedeemTicketPrintSheet
                    tickets={prizeTicketsToPrint}
                    schoolName={printSchoolName}
                    logoUrl={printSchoolLogoUrl}
                    paperFormat={prizeVoucherPaperFormat}
                    onReady={triggerPrizeTicketPrint}
                />
            )}
            {prizeIdPrintData && prizeIdPrintData.prizes.length > 0 && prizeIdPrintData.printerType !== 'dtc4500e' && (
                <PrizeIdPrintSheet prizes={prizeIdPrintData.prizes} schoolId={schoolId} onReady={triggerPrizeIdPrint} />
            )}
            {prizeIdPrintData && prizeIdPrintData.prizes.length > 0 && prizeIdPrintData.printerType === 'dtc4500e' && (
                <PrizeIdDTCPrintSheet prizes={prizeIdPrintData.prizes} schoolId={schoolId} onReady={triggerPrizeIdPrint} />
            )}
            {libraryStickersToPrint.length > 0 && (
                <LibraryBarcodePrintSheet
                    items={libraryStickersToPrint}
                    schoolId={schoolId}
                    onReady={triggerLibraryStickerPrint}
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
