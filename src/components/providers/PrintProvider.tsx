
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
import type { StaffIdCardSubject } from '@/lib/staff/staffIdCardSubject';
import type { LibraryLabelFormat } from '@/lib/library/libraryScanCode';
import type { PrizeRedeemTicket } from '@/components/prizes/PrizeRedeemTicketPrintSheet';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useAuth } from './AuthProvider';
import { useDoc } from '@/firebase';
import { useSchoolMetadataDocRef } from '@/hooks/useSchoolMetadataDocRef';
import { useCurrency } from '@/hooks/useCurrency';
import {
    DEFAULT_COUPON_CORNER_STYLE,
    type CouponCornerStyle,
    type CouponPrintPageSize,
} from '@/lib/coupons/couponPrint';
import { useSettings } from '@/components/providers/SettingsProvider';
import type { PrizeVoucherPaperFormat } from '@/lib/prizes/prizeVoucherPrint';
import { applyThermalPrizePrintRootLocks, clearThermalPrizePrintRootLocks } from '@/lib/prizes/prizeThermalPrintDom';
import { waitForPrintBarcodes } from '@/lib/printBarcode';
import { useToast } from '@/hooks/use-toast';
import type { IdCardSheetSpacing } from '@/lib/idCardPrintCatalog';
import type { RecessReasonMeta } from '@/lib/recess/recessReasons';
import {
    DTC_MULTI_CARD_START_TOAST,
    dtcCardProgressToast,
    dtcPrintIndex,
    nextDtcPrintIndex,
    type DtcPrintIndex,
} from '@/lib/dtcPrintQueue';

const PrintSheet = dynamic(
    () => import('@/components/print/PrintSheet').then((m) => ({ default: m.PrintSheet })),
    { ssr: false },
);

const StudentIdPrintSheet = dynamic(
    () => import('@/components/student/StudentIdPrintSheet').then((m) => ({ default: m.StudentIdPrintSheet })),
    { ssr: false },
);

const StudentIdDTCPrintSheet = dynamic(
    () => import('@/components/student/StudentIdDTCPrintSheet').then((m) => ({ default: m.StudentIdDTCPrintSheet })),
    { ssr: false },
);

const StaffIdPrintSheet = dynamic(
    () => import('@/components/staff/StaffIdPrintSheet').then((m) => ({ default: m.StaffIdPrintSheet })),
    { ssr: false },
);

const StaffIdDTCPrintSheet = dynamic(
    () => import('@/components/staff/StaffIdDTCPrintSheet').then((m) => ({ default: m.StaffIdDTCPrintSheet })),
    { ssr: false },
);

const PrizeRedeemTicketPrintSheet = dynamic(
    () => import('@/components/prizes/PrizeRedeemTicketPrintSheet').then((m) => ({ default: m.PrizeRedeemTicketPrintSheet })),
    { ssr: false },
);

const PrizeIdPrintSheet = dynamic(
    () => import('@/components/prizes/PrizeIdPrintSheet').then((m) => ({ default: m.PrizeIdPrintSheet })),
    { ssr: false },
);

const PrizeIdDTCPrintSheet = dynamic(
    () => import('@/components/prizes/PrizeIdDTCPrintSheet').then((m) => ({ default: m.PrizeIdDTCPrintSheet })),
    { ssr: false },
);

const RecessPassPrintSheet = dynamic(
    () => import('@/components/recess/RecessPassPrintSheet').then((m) => ({ default: m.RecessPassPrintSheet })),
    { ssr: false },
);

const RecessPassDTCPrintSheet = dynamic(
    () => import('@/components/recess/RecessPassDTCPrintSheet').then((m) => ({ default: m.RecessPassDTCPrintSheet })),
    { ssr: false },
);

const LibraryBarcodePrintSheet = dynamic(
    () => import('@/components/print/LibraryBarcodePrintSheet').then((m) => ({ default: m.LibraryBarcodePrintSheet })),
    { ssr: false },
);

interface PrintContextType {
    setCouponsToPrint: (
        coupons: Coupon[],
        options?: { couponsPerPage?: CouponPrintPageSize; schoolId: string; cornerStyle?: CouponCornerStyle },
    ) => void;
    setStudentsToPrint: (data: { students: Student[]; classes: Class[]; schoolId: string; printerType?: 'dtc4500e'; cornerStyle?: 'rounded' | 'rectangular'; sheetSpacing?: IdCardSheetSpacing }) => void;
    printPrizeTickets: (tickets: PrizeRedeemTicket[]) => void;
    setPrizeIdCardsToPrint: (data: { prizes: Prize[]; schoolId: string; printerType?: 'dtc4500e'; cornerStyle?: 'rounded' | 'rectangular'; sheetSpacing?: IdCardSheetSpacing }) => void;
    setStaffIdCardsToPrint: (data: { subjects: StaffIdCardSubject[]; schoolId: string; printerType?: 'dtc4500e'; cornerStyle?: 'rounded' | 'rectangular'; sheetSpacing?: IdCardSheetSpacing }) => void;
    setRecessPassesToPrint: (data: { passes: RecessReasonMeta[]; schoolId: string; printerType?: 'dtc4500e'; cornerStyle?: 'rounded' | 'rectangular'; sheetSpacing?: IdCardSheetSpacing }) => void;
    setLibraryStickersToPrint: (items: LibraryItem[], options: { schoolId: string; format?: LibraryLabelFormat }) => void;
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
    const { toast } = useToast();
    const [couponPrintJob, setCouponPrintJob] = useState<{
        coupons: Coupon[];
        couponsPerPage: CouponPrintPageSize;
        schoolId: string;
        cornerStyle: CouponCornerStyle;
    } | null>(null);
    type StudentIdPrintJob = {
        students: Student[];
        classes: Class[];
        schoolId: string;
        printerType?: 'dtc4500e';
        cornerStyle?: 'rounded' | 'rectangular';
        sheetSpacing?: IdCardSheetSpacing;
    } & DtcPrintIndex;
    type PrizeIdPrintJob = {
        prizes: Prize[];
        schoolId: string;
        printerType?: 'dtc4500e';
        cornerStyle?: 'rounded' | 'rectangular';
        sheetSpacing?: IdCardSheetSpacing;
    } & DtcPrintIndex;
    type StaffIdPrintJob = {
        subjects: StaffIdCardSubject[];
        schoolId: string;
        printerType?: 'dtc4500e';
        cornerStyle?: 'rounded' | 'rectangular';
        sheetSpacing?: IdCardSheetSpacing;
    } & DtcPrintIndex;
    type RecessPassPrintJob = {
        passes: RecessReasonMeta[];
        schoolId: string;
        printerType?: 'dtc4500e';
        cornerStyle?: 'rounded' | 'rectangular';
        sheetSpacing?: IdCardSheetSpacing;
    } & DtcPrintIndex;

    const [printData, setPrintData] = useState<StudentIdPrintJob | null>(null);
    const [prizeTicketsToPrint, setPrizeTicketsToPrint] = useState<PrizeRedeemTicket[]>([]);
    const [prizeIdPrintData, setPrizeIdPrintData] = useState<PrizeIdPrintJob | null>(null);
    const [staffIdPrintData, setStaffIdPrintData] = useState<StaffIdPrintJob | null>(null);
    const [recessPassPrintData, setRecessPassPrintData] = useState<RecessPassPrintJob | null>(null);
    const [libraryPrintJob, setLibraryPrintJob] = useState<{ items: LibraryItem[]; format: LibraryLabelFormat; schoolId: string } | null>(null);
    const { settings } = useSettings();
    const prizeVoucherPaperFormat: PrizeVoucherPaperFormat =
        settings.prizeVoucherPaperFormat === 'thermal_80mm' ? 'thermal_80mm' : 'label_50x70';
    const playSound = useArcadeSound();
    const { schoolId } = useAuth();
    const schoolDocRef = useSchoolMetadataDocRef();
    const couponCurrency = useCurrency();
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
            waitForPrintBarcodes().finally(() => {
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
                window.removeEventListener('afterprint', afterPrint);
                setPrintData((prev) => {
                    if (!prev) {
                        studentPrintTriggered.current = false;
                        return null;
                    }
                    if (prev.printerType === 'dtc4500e') {
                        const idx = dtcPrintIndex(prev);
                        const nextIdx = nextDtcPrintIndex(idx, prev.students.length);
                        if (nextIdx !== null) {
                            studentPrintTriggered.current = false;
                            toast(dtcCardProgressToast(nextIdx, prev.students.length));
                            return { ...prev, dtcIndex: nextIdx };
                        }
                    }
                    studentPrintTriggered.current = false;
                    return null;
                });
            };
            window.addEventListener('afterprint', afterPrint);
            playSound('swoosh');
            waitForPrintBarcodes().finally(() => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => window.print());
                });
            });
        }
    }, [printData, playSound, toast]);

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
                window.removeEventListener('afterprint', afterPrint);
                setPrizeIdPrintData((prev) => {
                    if (!prev) {
                        prizeIdPrintTriggered.current = false;
                        return null;
                    }
                    if (prev.printerType === 'dtc4500e') {
                        const idx = dtcPrintIndex(prev);
                        const nextIdx = nextDtcPrintIndex(idx, prev.prizes.length);
                        if (nextIdx !== null) {
                            prizeIdPrintTriggered.current = false;
                            toast(dtcCardProgressToast(nextIdx, prev.prizes.length));
                            return { ...prev, dtcIndex: nextIdx };
                        }
                    }
                    prizeIdPrintTriggered.current = false;
                    return null;
                });
            };
            window.addEventListener('afterprint', afterPrint);
            playSound('swoosh');
            waitForPrintBarcodes().finally(() => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => window.print());
                });
            });
        }
    }, [prizeIdPrintData, playSound, toast]);

    const staffIdPrintTriggered = useRef(false);
    const triggerStaffIdPrint = React.useCallback(() => {
        if (staffIdPrintData && staffIdPrintData.subjects.length > 0 && !staffIdPrintTriggered.current) {
            staffIdPrintTriggered.current = true;
            const afterPrint = () => {
                window.removeEventListener('afterprint', afterPrint);
                setStaffIdPrintData((prev) => {
                    if (!prev) {
                        staffIdPrintTriggered.current = false;
                        return null;
                    }
                    if (prev.printerType === 'dtc4500e') {
                        const idx = dtcPrintIndex(prev);
                        const nextIdx = nextDtcPrintIndex(idx, prev.subjects.length);
                        if (nextIdx !== null) {
                            staffIdPrintTriggered.current = false;
                            toast(dtcCardProgressToast(nextIdx, prev.subjects.length));
                            return { ...prev, dtcIndex: nextIdx };
                        }
                    }
                    staffIdPrintTriggered.current = false;
                    return null;
                });
            };
            window.addEventListener('afterprint', afterPrint);
            playSound('swoosh');
            waitForPrintBarcodes().finally(() => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => window.print());
                });
            });
        }
    }, [staffIdPrintData, playSound, toast]);

    const recessPassPrintTriggered = useRef(false);
    const triggerRecessPassPrint = React.useCallback(() => {
        if (recessPassPrintData && recessPassPrintData.passes.length > 0 && !recessPassPrintTriggered.current) {
            recessPassPrintTriggered.current = true;
            const afterPrint = () => {
                window.removeEventListener('afterprint', afterPrint);
                setRecessPassPrintData((prev) => {
                    if (!prev) {
                        recessPassPrintTriggered.current = false;
                        return null;
                    }
                    if (prev.printerType === 'dtc4500e') {
                        const idx = dtcPrintIndex(prev);
                        const nextIdx = nextDtcPrintIndex(idx, prev.passes.length);
                        if (nextIdx !== null) {
                            recessPassPrintTriggered.current = false;
                            toast(dtcCardProgressToast(nextIdx, prev.passes.length));
                            return { ...prev, dtcIndex: nextIdx };
                        }
                    }
                    recessPassPrintTriggered.current = false;
                    return null;
                });
            };
            window.addEventListener('afterprint', afterPrint);
            playSound('swoosh');
            waitForPrintBarcodes().finally(() => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => window.print());
                });
            });
        }
    }, [recessPassPrintData, playSound, toast]);

    const libraryPrintTriggered = useRef(false);
    const triggerLibraryStickerPrint = React.useCallback(() => {
        if (libraryPrintJob && libraryPrintJob.items.length > 0 && !libraryPrintTriggered.current) {
            libraryPrintTriggered.current = true;
            const afterPrint = () => {
                setLibraryPrintJob(null);
                libraryPrintTriggered.current = false;
                window.removeEventListener('afterprint', afterPrint);
            };
            window.addEventListener('afterprint', afterPrint);
            playSound('swoosh');
            waitForPrintBarcodes().finally(() => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => window.print());
                });
            });
        }
    }, [libraryPrintJob, playSound]);

    const value = useMemo(
        () => ({
            setCouponsToPrint: (
                coupons: Coupon[],
                options?: { couponsPerPage?: CouponPrintPageSize; schoolId: string; cornerStyle?: CouponCornerStyle },
            ) => {
                const sid = (options?.schoolId ?? '').trim();
                if (!sid) {
                    toast({ variant: 'destructive', title: 'Cannot print coupons', description: 'Missing schoolId.' });
                    return;
                }
                setCouponPrintJob({
                    coupons,
                    couponsPerPage: options?.couponsPerPage ?? 10,
                    schoolId: sid,
                    cornerStyle: options?.cornerStyle ?? DEFAULT_COUPON_CORNER_STYLE,
                });
            },
            setStudentsToPrint: (data: { students: Student[]; classes: Class[]; schoolId: string; printerType?: 'dtc4500e'; cornerStyle?: 'rounded' | 'rectangular'; sheetSpacing?: IdCardSheetSpacing }) => {
                const sid = (data?.schoolId ?? '').trim();
                if (!sid) {
                    toast({ variant: 'destructive', title: 'Cannot print ID cards', description: 'Missing schoolId.' });
                    return;
                }
                if (data.printerType === 'dtc4500e' && data.students.length > 1) {
                    toast(DTC_MULTI_CARD_START_TOAST);
                }
                setPrintData({
                    ...data,
                    schoolId: sid,
                    ...(data.printerType === 'dtc4500e' ? { dtcIndex: 0 } : {}),
                });
            },
            printPrizeTickets: setPrizeTicketsToPrint,
            setPrizeIdCardsToPrint: (data: { prizes: Prize[]; schoolId: string; printerType?: 'dtc4500e'; cornerStyle?: 'rounded' | 'rectangular'; sheetSpacing?: IdCardSheetSpacing }) => {
                const sid = (data?.schoolId ?? '').trim();
                if (!sid) {
                    toast({ variant: 'destructive', title: 'Cannot print prize cards', description: 'Missing schoolId.' });
                    return;
                }
                if (data.printerType === 'dtc4500e' && data.prizes.length > 1) {
                    toast(DTC_MULTI_CARD_START_TOAST);
                }
                setPrizeIdPrintData({
                    ...data,
                    schoolId: sid,
                    ...(data.printerType === 'dtc4500e' ? { dtcIndex: 0 } : {}),
                });
            },
            setStaffIdCardsToPrint: (data: { subjects: StaffIdCardSubject[]; schoolId: string; printerType?: 'dtc4500e'; cornerStyle?: 'rounded' | 'rectangular'; sheetSpacing?: IdCardSheetSpacing }) => {
                const sid = (data?.schoolId ?? '').trim();
                if (!sid) {
                    toast({ variant: 'destructive', title: 'Cannot print staff ID cards', description: 'Missing schoolId.' });
                    return;
                }
                if (data.printerType === 'dtc4500e' && data.subjects.length > 1) {
                    toast(DTC_MULTI_CARD_START_TOAST);
                }
                setStaffIdPrintData({
                    ...data,
                    schoolId: sid,
                    ...(data.printerType === 'dtc4500e' ? { dtcIndex: 0 } : {}),
                });
            },
            setRecessPassesToPrint: (data: { passes: RecessReasonMeta[]; schoolId: string; printerType?: 'dtc4500e'; cornerStyle?: 'rounded' | 'rectangular'; sheetSpacing?: IdCardSheetSpacing }) => {
                const sid = (data?.schoolId ?? '').trim();
                if (!sid) {
                    toast({ variant: 'destructive', title: 'Cannot print recess passes', description: 'Missing schoolId.' });
                    return;
                }
                if (data.printerType === 'dtc4500e' && data.passes.length > 1) {
                    toast(DTC_MULTI_CARD_START_TOAST);
                }
                setRecessPassPrintData({
                    ...data,
                    schoolId: sid,
                    ...(data.printerType === 'dtc4500e' ? { dtcIndex: 0 } : {}),
                });
            },
            setLibraryStickersToPrint: (items: LibraryItem[], options: { schoolId: string; format?: LibraryLabelFormat }) => {
                const sid = (options?.schoolId ?? '').trim();
                if (!sid) {
                    toast({ variant: 'destructive', title: 'Cannot print library labels', description: 'Missing schoolId.' });
                    return;
                }
                setLibraryPrintJob({ items, format: options?.format ?? 'sticker', schoolId: sid });
            },
        }),
        [toast],
    );

    return (
        <PrintContext.Provider value={value}>
            {children}
            {couponPrintJob && couponPrintJob.coupons.length > 0 && (
                <PrintSheet
                    coupons={couponPrintJob.coupons}
                    couponsPerPage={couponPrintJob.couponsPerPage}
                    schoolId={couponPrintJob.schoolId}
                    cornerStyle={couponPrintJob.cornerStyle}
                    currency={couponCurrency}
                    onReady={triggerCouponPrint}
                />
            )}
            {printData && printData.students.length > 0 && printData.printerType !== 'dtc4500e' && (
                <StudentIdPrintSheet
                    students={printData.students}
                    classes={printData.classes}
                    schoolId={printData.schoolId}
                    onReady={triggerStudentPrint}
                    cornerStyle={printData.cornerStyle}
                    sheetSpacing={printData.sheetSpacing}
                />
            )}
            {printData && printData.students.length > 0 && printData.printerType === 'dtc4500e' && (() => {
                const dtcIdx = dtcPrintIndex(printData);
                const dtcStudent = printData.students[dtcIdx];
                if (!dtcStudent) return null;
                return (
                    <StudentIdDTCPrintSheet
                        key={dtcStudent.id}
                        students={[dtcStudent]}
                        classes={printData.classes}
                        schoolId={printData.schoolId}
                        onReady={triggerStudentPrint}
                    />
                );
            })()}
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
                <PrizeIdPrintSheet
                    prizes={prizeIdPrintData.prizes}
                    schoolId={prizeIdPrintData.schoolId}
                    onReady={triggerPrizeIdPrint}
                    cornerStyle={prizeIdPrintData.cornerStyle}
                    sheetSpacing={prizeIdPrintData.sheetSpacing}
                />
            )}
            {prizeIdPrintData && prizeIdPrintData.prizes.length > 0 && prizeIdPrintData.printerType === 'dtc4500e' && (() => {
                const dtcIdx = dtcPrintIndex(prizeIdPrintData);
                const dtcPrize = prizeIdPrintData.prizes[dtcIdx];
                if (!dtcPrize) return null;
                return (
                    <PrizeIdDTCPrintSheet
                        key={dtcPrize.id}
                        prizes={[dtcPrize]}
                        schoolId={prizeIdPrintData.schoolId}
                        onReady={triggerPrizeIdPrint}
                    />
                );
            })()}
            {staffIdPrintData && staffIdPrintData.subjects.length > 0 && staffIdPrintData.printerType !== 'dtc4500e' && (
                <StaffIdPrintSheet
                    subjects={staffIdPrintData.subjects}
                    schoolId={staffIdPrintData.schoolId}
                    onReady={triggerStaffIdPrint}
                    cornerStyle={staffIdPrintData.cornerStyle}
                    sheetSpacing={staffIdPrintData.sheetSpacing}
                />
            )}
            {staffIdPrintData && staffIdPrintData.subjects.length > 0 && staffIdPrintData.printerType === 'dtc4500e' && (() => {
                const dtcIdx = dtcPrintIndex(staffIdPrintData);
                const dtcSubject = staffIdPrintData.subjects[dtcIdx];
                if (!dtcSubject) return null;
                const subjectKey = dtcSubject.kind === 'teacher' ? dtcSubject.teacher.id : dtcSubject.account.id;
                return (
                    <StaffIdDTCPrintSheet
                        key={subjectKey}
                        subjects={[dtcSubject]}
                        schoolId={staffIdPrintData.schoolId}
                        onReady={triggerStaffIdPrint}
                    />
                );
            })()}
            {recessPassPrintData && recessPassPrintData.passes.length > 0 && recessPassPrintData.printerType !== 'dtc4500e' && (
                <RecessPassPrintSheet
                    passes={recessPassPrintData.passes}
                    schoolId={recessPassPrintData.schoolId}
                    onReady={triggerRecessPassPrint}
                    cornerStyle={recessPassPrintData.cornerStyle}
                    sheetSpacing={recessPassPrintData.sheetSpacing}
                />
            )}
            {recessPassPrintData && recessPassPrintData.passes.length > 0 && recessPassPrintData.printerType === 'dtc4500e' && (() => {
                const dtcIdx = dtcPrintIndex(recessPassPrintData);
                const dtcPass = recessPassPrintData.passes[dtcIdx];
                if (!dtcPass) return null;
                return (
                    <RecessPassDTCPrintSheet
                        key={dtcPass.value}
                        passes={[dtcPass]}
                        schoolId={recessPassPrintData.schoolId}
                        onReady={triggerRecessPassPrint}
                        cornerStyle={recessPassPrintData.cornerStyle}
                    />
                );
            })()}
            {libraryPrintJob && libraryPrintJob.items.length > 0 && (
                <LibraryBarcodePrintSheet
                    items={libraryPrintJob.items}
                    format={libraryPrintJob.format}
                    schoolId={libraryPrintJob.schoolId}
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
