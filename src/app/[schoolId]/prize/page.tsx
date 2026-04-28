
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy, limit } from 'firebase/firestore';
import dynamic from 'next/dynamic';
import { FaceMismatchBanner } from '@/components/FaceMismatchBanner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const StudentScanner = dynamic(
    () => import('@/components/StudentScanner').then((m) => m.StudentScanner),
    { ssr: false },
);
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Student, Prize, HistoryItem } from '@/lib/types';
import { format } from 'date-fns';
import {
    Gift,
    LogOut,
    ShoppingBag,
    ChevronRight,
    Clock,
    ShoppingBasket,
    Plus,
    Minus,
    Loader2,
    Sparkles,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import DynamicIcon from '@/components/DynamicIcon';
import { cn, getStudentNickname, getContrastColor } from '@/lib/utils';
import { normalizeStudentTheme, primaryForegroundFor } from '@/lib/themeContrast';
import { getReadableErrorMessage } from '@/lib/errorMessage';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from '@/components/providers/SettingsProvider';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { GoogleFontLoader } from '@/components/GoogleFontLoader';
import { useActiveStudentSession } from '@/hooks/useActiveStudentSession';
import type { StudentFoundMeta } from '@/components/StudentScanner';
import { rainbowTripletForNavId, complementTripletForNavId } from '@/lib/rainbowNav';
import { globalAnimatedBackdropActive } from '@/lib/animatedBackdrop';
import { prizeIsListed, stripLeadingEmojiFromPrizeName, studentSeesPrizeByTeachers } from '@/lib/prize-utils';
import { runMotor as runVendingMotor, isConnected as motorIsConnected } from '@/lib/vendingMotor';
import { useAuthFetch } from '@/lib/authFetch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';


/** Max units per redemption for 0-point prizes when stock is unlimited (balance does not limit). */
const FREE_PRIZE_MAX_QTY = 99;

const AI_SURPRISE_KIND_LABEL: Record<string, string> = {
    joke: 'Your joke',
    riddle: 'Your riddle',
    fortune: 'Your fortune',
};

/** Inactivity before returning to the student scanner (same as the student / redeem kiosk). */
const KIOSK_AUTO_LOGOUT_SEC = 15;

function ConfirmRedemptionDialog({
    student,
    prize,
    isOpen,
    onOpenChange,
    onConfirm
}: {
    student: Student | null,
    prize: Prize | null,
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    onConfirm: (quantity: number) => void
}) {
    const [quantity, setQuantity] = useState(1);
    const playSound = useArcadeSound();

    const studentPoints = student && typeof student.points === 'number' ? student.points : 0;
    const prizePoints = prize && typeof prize.points === 'number' ? prize.points : 0;
    /** Free (0 pt) prizes are not limited by balance — cap + optional stock count. */
    const maxByPoints =
        !prize ? 1 :
        prizePoints > 0 ? Math.max(0, Math.floor(studentPoints / prizePoints)) :
        FREE_PRIZE_MAX_QTY;
    const maxByStock =
        prize && typeof prize.stockCount === 'number' ? prize.stockCount : Number.POSITIVE_INFINITY;
    const maxQuantity = prize ? Math.max(1, Math.min(maxByPoints, maxByStock)) : 1;

    useEffect(() => {
        if (isOpen) setQuantity(1);
    }, [isOpen, prize?.id]);

    useEffect(() => {
        if (!isOpen || !prize) return;
        setQuantity((q) => Math.min(Math.max(1, maxQuantity), Math.max(1, q)));
    }, [isOpen, prize, maxQuantity]);

    if (!prize || !student) return null;

    const totalCost = prizePoints * quantity;
    const canAfford = studentPoints >= totalCost;
    const remainingPoints = studentPoints - totalCost;

    const handleQuantityChange = (amount: number) => {
        const newQuantity = Math.min(maxQuantity, Math.max(1, quantity + amount));
        setQuantity(newQuantity);
        playSound('click');
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Purchase</AlertDialogTitle>
                    <AlertDialogDescription className="break-words [overflow-wrap:anywhere]">
                        You are redeeming <span className="font-bold">{prize.name}</span>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4 space-y-4">
                    {prize.imageUrl ? (
                        <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border bg-muted">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={prize.imageUrl} alt="" className="size-full object-cover" />
                        </div>
                    ) : null}
                    <div className="flex items-center justify-center gap-3">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-12 w-12 rounded-full"
                            onClick={() => handleQuantityChange(-1)}
                            disabled={quantity <= 1}
                            aria-label="Decrease quantity"
                        >
                            <Minus className="w-5 h-5" aria-hidden="true" />
                        </Button>
                        <Input
                            type="number"
                            min={1}
                            max={maxQuantity}
                            value={quantity}
                            onChange={(e) => {
                                const v = Math.max(1, Math.min(maxQuantity, Math.floor(Number(e.target.value) || 1)));
                                setQuantity(v);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'ArrowUp') { e.preventDefault(); handleQuantityChange(1); }
                                else if (e.key === 'ArrowDown') { e.preventDefault(); handleQuantityChange(-1); }
                            }}
                            aria-label="Quantity"
                            className="text-4xl font-bold w-24 text-center h-16 px-0"
                        />
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-12 w-12 rounded-full"
                            onClick={() => handleQuantityChange(1)}
                            disabled={quantity >= maxQuantity}
                            aria-label="Increase quantity"
                        >
                            <Plus className="w-5 h-5" aria-hidden="true" />
                        </Button>
                    </div>
                    {quantity >= maxQuantity && (
                        <p className="text-xs text-center text-muted-foreground">
                            {maxByStock !== Number.POSITIVE_INFINITY && quantity >= maxByStock
                                ? `Only ${maxByStock} in stock.`
                                : prizePoints > 0
                                    ? `Max you can afford: ${maxByPoints}.`
                                    : `Limit: ${FREE_PRIZE_MAX_QTY} per redemption.`}
                        </p>
                    )}
                    <div className="text-sm space-y-1 bg-secondary p-3 rounded-lg">
                        {typeof prize.stockCount === 'number' && (
                            <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                                <span>In stock</span>
                                <span className="font-bold text-foreground">{prize.stockCount}</span>
                            </div>
                        )}
                        <div className="flex justify-between"><span>Total Cost:</span> <span className="font-bold">{totalCost.toLocaleString()} pts</span></div>
                        <div className={`flex justify-between ${!canAfford ? 'text-destructive' : ''}`}><span>Your balance after:</span> <span className="font-bold">{remainingPoints.toLocaleString()} pts</span></div>
                    </div>
                    {!canAfford && <p className="text-sm text-destructive font-bold text-center" role="alert">You don&apos;t have enough points for this quantity.</p>}
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => onOpenChange(false)}>Cancel</AlertDialogCancel>
                    <Button type="button" disabled={!canAfford} onClick={() => onConfirm(quantity)}>
                        Confirm
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function PrizeActivityList({ schoolId, studentId, themed = false }: { schoolId: string; studentId: string; themed?: boolean }) {
    const firestore = useFirestore();
    const activitiesQuery = useMemoFirebase(() => {
        if (!schoolId || !studentId) return null;
        return query(
            collection(firestore, `schools/${schoolId}/students/${studentId}/activities`),
            orderBy('date', 'desc'),
            limit(20)
        );
    }, [firestore, schoolId, studentId]);
    const { data: history, isLoading, error: historyError } = useCollection<HistoryItem>(activitiesQuery);

    // When the parent card is using a custom student theme, the semantic
    // Tailwind tokens (`text-foreground`, `bg-background/50`, the
    // emerald/rose pills) can't guarantee contrast against the themed
    // card background. In that mode we hand back to the inherited
    // `var(--theme-text)` color and use neutral translucent surfaces.
    const mutedStyle: React.CSSProperties | undefined = themed ? { color: 'var(--theme-text)', opacity: 0.7 } : undefined;

    if (isLoading) {
        return (
            <div
                className={cn("py-4 text-center text-sm", !themed && "text-muted-foreground")}
                style={mutedStyle}
            >
                Loading history...
            </div>
        );
    }

    if (historyError) {
        return (
            <p
                className={cn("py-4 text-center text-sm leading-relaxed px-2", !themed && "text-muted-foreground")}
                style={mutedStyle}
            >
                {getReadableErrorMessage(historyError, "Couldn't load recent activity.")}
            </p>
        );
    }

    return (
        <ScrollArea className="h-full min-h-[240px] max-h-[min(70dvh,720px)] w-full flex-1 pr-4">
            <ul className="space-y-3">
                {history && history.length > 0 ? (
                    history.map((item, index) => (
                        <li
                            key={index}
                            className={cn(
                                "rounded-xl p-3 transition-all",
                                !themed && "bg-background/50 border border-border/40 hover:bg-background/80",
                                themed && "border",
                            )}
                            style={themed ? { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(127,127,127,0.25)', borderWidth: 1, borderStyle: 'solid' } : undefined}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <p className={cn("font-bold text-sm truncate", !themed && "text-foreground")}>{item.desc}</p>
                                <Badge
                                    variant={item.amount > 0 ? 'default' : 'secondary'}
                                    className={cn(
                                        "text-[10px] h-5 px-1.5",
                                        !themed && (item.amount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'),
                                    )}
                                    style={themed ? {
                                        backgroundColor: item.amount > 0 ? 'rgba(16,185,129,0.18)' : 'rgba(244,63,94,0.18)',
                                        color: 'var(--theme-text)',
                                        borderColor: 'transparent',
                                    } : undefined}
                                >
                                    {item.amount > 0 ? `+${item.amount}` : item.amount} pts
                                </Badge>
                            </div>
                            {item.date ? (
                                <p
                                    className={cn("text-[10px] font-bold uppercase tracking-widest", !themed && "text-muted-foreground")}
                                    style={mutedStyle}
                                >
                                    {(() => {
                                        try {
                                            return format(new Date(item.date), 'MMM d, h:mm a');
                                        } catch (e) {
                                            return 'Date unknown';
                                        }
                                    })()}
                                </p>
                            ) : (
                                <p
                                    className={cn("text-[10px] font-bold uppercase tracking-widest opacity-30", !themed && "text-muted-foreground")}
                                    style={mutedStyle}
                                >
                                    Date unknown
                                </p>
                            )}
                        </li>
                    ))
                ) : (
                    <p
                        className={cn("text-center italic py-4 text-sm font-medium", !themed && "text-muted-foreground")}
                        style={mutedStyle}
                    >
                        No recent activity.
                    </p>
                )}
            </ul>
        </ScrollArea>
    );
}

function PrizeDashboard({
    studentId,
    onDone,
    onRequestExit,
}: {
    studentId: string;
    onDone: () => void;
    onRequestExit: () => void;
}) {
    const router = useRouter();
    const { schoolId, redeemPrize, printPrizeTickets, isKioskLocked } = useAppContext();
    const firestore = useFirestore();
    const { toast } = useToast();
    const playSound = useArcadeSound();
    const [hoveredPrize, setHoveredPrize] = useState<string | null>(null);
    const { settings } = useSettings();
    const animBackdrop = globalAnimatedBackdropActive(settings);
    const [confirmingPrize, setConfirmingPrize] = useState<Prize | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'name' | 'affordable'>('price-asc');
    const [ticketData, setTicketData] = useState<{
        activityId: string;
        ticketNo: string;
        redeemedAt: number;
        studentId: string;
        studentName: string;
        studentNickname?: string;
        prizeName: string;
        prizeIcon?: string;
        quantity: number;
        totalCost: number;
    } | null>(null);

    const [aiSurpriseOpen, setAiSurpriseOpen] = useState(false);
    const [aiSurpriseLoading, setAiSurpriseLoading] = useState(false);
    const [aiSurpriseErr, setAiSurpriseErr] = useState<string | null>(null);
    const [aiSurpriseBody, setAiSurpriseBody] = useState<{ kind: string; text: string; answer?: string } | null>(null);
    const pendingTicketAfterAiRef = useRef<typeof ticketData>(null);

    const authFetch = useAuthFetch();

    const flushPendingTicketAfterAi = useCallback(() => {
        const p = pendingTicketAfterAiRef.current;
        pendingTicketAfterAiRef.current = null;
        if (p) setTicketData(p);
    }, []);

    const studentDocRef = useMemoFirebase(() => schoolId ? doc(firestore, 'schools', schoolId, 'students', studentId) : null, [firestore, schoolId, studentId]);
    const { data: student, isLoading: studentLoading, error: studentError } = useDoc<Student>(studentDocRef);

    const prizesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'prizes') : null, [firestore, schoolId]);
    const { data: prizes, isLoading: prizesLoading, error: prizesError } = useCollection<Prize>(prizesQuery);

    const [logoutTimer, setLogoutTimer] = useState(KIOSK_AUTO_LOGOUT_SEC);

    const resetTimer = useCallback(() => {
        if (!isKioskLocked) {
            setLogoutTimer(KIOSK_AUTO_LOGOUT_SEC);
        }
    }, [isKioskLocked]);

    useEffect(() => {
        if (isKioskLocked) return;
        if (logoutTimer <= 0) {
            onDone();
            return;
        }
        const timerId = setTimeout(() => {
            setLogoutTimer((t) => t - 1);
        }, 1000);
        return () => clearTimeout(timerId);
    }, [logoutTimer, onDone, isKioskLocked]);

    useEffect(() => {
        if (isKioskLocked) return;
        const handleActivity = () => {
            resetTimer();
        };
        const events: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'touchstart'];
        events.forEach((ev) => window.addEventListener(ev, handleActivity));
        return () => {
            events.forEach((ev) => window.removeEventListener(ev, handleActivity));
        };
    }, [resetTimer, isKioskLocked]);

    const handleRedeemReward = async (prize: Prize, quantity: number) => {
        if (!student) return;
        resetTimer();
        setConfirmingPrize(null);
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            playSound('error');
            toast({
                variant: 'destructive',
                title: 'No connection',
                description: 'Connect to the internet, then try redeeming again.',
                duration: 8000,
            });
            return;
        }
        try {
            const result = await redeemPrize(student.id, prize, quantity);
            if (!result.success) {
                throw new Error(result.message || 'An error occurred during redemption.');
            }

            const { activityId, redeemedAt, totalCost } = result;

            playSound('redeem');
            toast({
                title: 'Reward Redeemed!',
                description: `Successfully redeemed ${prize.name}${quantity > 1 ? ` (x${quantity})` : ''}.`,
            });

            // Fire the physical vending motor once per unit, in sequence, if the
            // prize has it enabled and a serial port is connected on this kiosk.
            // Failures are surfaced but do not roll back the redemption — the
            // points are already spent and the student already saw the success
            // toast; a motor jam is a human-operator problem.
            if (settings.enableVendingMachine && prize.vendingMotor?.enabled) {
                if (!motorIsConnected()) {
                    toast({
                        variant: 'destructive',
                        title: 'Motor not connected',
                        description:
                            'This prize is configured to dispense from the vending machine, but no USB serial port is connected.',
                        duration: 8000,
                    });
                } else {
                    for (let i = 0; i < quantity; i++) {
                        try {
                            await runVendingMotor(prize.vendingMotor);
                        } catch (motorErr) {
                            console.error('Vending motor dispense failed:', motorErr);
                            toast({
                                variant: 'destructive',
                                title: 'Motor error',
                                description: getReadableErrorMessage(motorErr, 'The vending motor failed mid-dispense.'),
                                duration: 8000,
                            });
                            break;
                        }
                    }
                }
            }
            let ticketPayload: NonNullable<typeof ticketData> | null = null;
            if (prize.offerPrintTicketOnRedeem === true && activityId && redeemedAt && typeof totalCost === 'number') {
                const ticketNo = String(redeemedAt).slice(-6);
                const displayFirst = getStudentNickname(student);
                const legalFirst = (student.firstName || '').trim();
                const nick = student.nickname?.trim();
                ticketPayload = {
                    activityId,
                    ticketNo,
                    redeemedAt,
                    studentId: student.id,
                    studentName: `${displayFirst} ${student.lastName}`.trim(),
                    /** Legal first name in parens only when a real nickname is shown. */
                    studentNickname:
                        nick && legalFirst && displayFirst.trim() !== legalFirst ? legalFirst : undefined,
                    prizeName: prize.name,
                    prizeIcon: prize.icon || 'Gift',
                    quantity,
                    totalCost,
                };
            }

            if (prize.aiFunReward && schoolId && settings.enablePrizeAiSurprise === true) {
                pendingTicketAfterAiRef.current = ticketPayload;
                setAiSurpriseErr(null);
                setAiSurpriseBody(null);
                setAiSurpriseLoading(true);
                setAiSurpriseOpen(true);
                try {
                    const res = await authFetch('/api/prize-ai-fun', {
                        method: 'POST',
                        body: JSON.stringify({
                            schoolId,
                            mode: prize.aiFunReward,
                        }),
                    });
                    const j = (await res.json()) as { error?: string; kind?: string; text?: string; answer?: string };
                    if (!res.ok) throw new Error(j.error || 'Could not load surprise.');
                    setAiSurpriseBody({
                        kind: typeof j.kind === 'string' ? j.kind : 'fortune',
                        text: typeof j.text === 'string' ? j.text : '',
                        answer: typeof j.answer === 'string' ? j.answer : undefined,
                    });
                } catch (e: unknown) {
                    setAiSurpriseErr(getReadableErrorMessage(e, 'Something went wrong loading your surprise.'));
                } finally {
                    setAiSurpriseLoading(false);
                }
            } else if (ticketPayload) {
                setTicketData(ticketPayload);
            }
        } catch (error: unknown) {
            console.error('Redemption error:', error);
            playSound('error');
            toast({
                variant: 'destructive',
                title: 'Redemption Failed',
                description: getReadableErrorMessage(error, 'An error occurred during redemption.'),
                duration: 8000,
            });
        }
    };

    const handlePrintTicket = useCallback(() => {
        if (!ticketData || !schoolId) return;
        setTicketData(null);
        const qty = Math.max(1, Math.floor(Number(ticketData.quantity)) || 1);
        const baseNo = ticketData.ticketNo.replace(/\D/g, '').slice(-6) || String(ticketData.redeemedAt).slice(-6);
        const perUnitCost =
            qty > 0 && typeof ticketData.totalCost === 'number'
                ? Math.round(ticketData.totalCost / qty)
                : undefined;
        const sheets = Array.from({ length: qty }, (_, i) => ({
            activityId: ticketData.activityId,
            ticketNo: qty > 1 ? `${baseNo}-${i + 1}` : baseNo,
            redeemedAt: ticketData.redeemedAt,
            studentId: ticketData.studentId,
            studentName: ticketData.studentName,
            studentNickname: ticketData.studentNickname,
            prizeName: ticketData.prizeName,
            prizeIcon: ticketData.prizeIcon,
            quantity: 1,
            totalCost: perUnitCost,
        }));
        printPrizeTickets(sheets);
    }, [ticketData, schoolId, printPrizeTickets]);

    if (studentLoading || prizesLoading) {
        return (
            <div
                className="space-y-6 p-8"
                role="status"
                aria-live="polite"
                aria-label="Loading prize shop"
            >
                <Skeleton className="h-32 w-full rounded-3xl" />
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[...Array(9)].map((_, i) => (
                        <div key={i} className="rounded-3xl border-2 border-dashed border-border/40 p-5 space-y-4">
                            <Skeleton className="h-40 w-full rounded-2xl" />
                            <Skeleton className="h-5 w-3/4 rounded" />
                            <Skeleton className="h-4 w-1/2 rounded" />
                            <Skeleton className="h-10 w-full rounded-xl" />
                        </div>
                    ))}
                </div>
                <span className="sr-only">Loading prize shop…</span>
            </div>
        );
    }

    if (studentError || prizesError) {
        const loadErr = studentError || prizesError;
        return (
            <div className="min-h-[50vh] flex items-center justify-center p-6">
                <Card className="max-w-md w-full border-destructive/30 shadow-lg">
                    <CardHeader className="text-center space-y-2">
                        <CardTitle className="text-xl">Can&apos;t load the prize shop</CardTitle>
                        <CardDescription className="text-base leading-relaxed">
                            {getReadableErrorMessage(loadErr, 'Something went wrong while loading. Please try again.')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center gap-3">
                        <Button type="button" variant="default" onClick={() => router.refresh()}>
                            Try again
                        </Button>
                        <Button type="button" variant="outline" onClick={onRequestExit}>
                            Go back
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!student) {
        return (
            <div className="min-h-[40vh] flex items-center justify-center p-6 text-center text-muted-foreground">
                <p className="text-sm font-medium">Student profile could not be loaded.</p>
            </div>
        );
    }

    const baseVisiblePrizes = (prizes || [])
        .filter(p => {
            if (!prizeIsListed(p)) return false;
            const teacherMatch = studentSeesPrizeByTeachers(student, p);
            const classMatch = !p.classId || student.classId === p.classId;
            return teacherMatch && classMatch;
        });

    const filteredPrizes = searchTerm.trim()
        ? baseVisiblePrizes.filter(p =>
            (p.name || '').toLowerCase().includes(searchTerm.trim().toLowerCase())
        )
        : baseVisiblePrizes;

    const visiblePrizes = [...filteredPrizes].sort((a, b) => {
        const ap = a.points || 0;
        const bp = b.points || 0;
        switch (sortBy) {
            case 'price-desc': return bp - ap;
            case 'name': return (a.name || '').localeCompare(b.name || '');
            case 'affordable': {
                const aAfford = (student.points || 0) >= ap ? 0 : 1;
                const bAfford = (student.points || 0) >= bp ? 0 : 1;
                if (aAfford !== bAfford) return aAfford - bAfford;
                return ap - bp;
            }
            case 'price-asc':
            default: return ap - bp;
        }
    });

    // Used by the empty-state CTA to tell a student how many more points they
    // need to unlock their cheapest available prize.
    const studentPointsForEmpty = student.points || 0;
    const cheapestVisiblePrize = baseVisiblePrizes
        .slice()
        .sort((a, b) => (a.points || 0) - (b.points || 0))[0];
    const cheapestUnaffordablePrize = baseVisiblePrizes
        .filter((p) => (p.points || 0) > studentPointsForEmpty)
        .sort((a, b) => (a.points || 0) - (b.points || 0))[0];
    const pointsToNextPrize = cheapestUnaffordablePrize
        ? Math.max(0, (cheapestUnaffordablePrize.points || 0) - studentPointsForEmpty)
        : 0;

    // Normalize the student theme so every color pairing we render meets
    // at least WCAG AA contrast, regardless of what the AI or a teacher
    // hand-picked. Downstream code reads `activeTheme` instead of
    // `student.theme` so the fixes propagate everywhere.
    const activeTheme = normalizeStudentTheme(student.theme);
    const fontScale = activeTheme?.fontScale ?? 1;
    const themeBg = activeTheme?.background || 'transparent';
    const computedThemeText = activeTheme?.text || (getContrastColor(activeTheme?.background || activeTheme?.cardBackground || activeTheme?.primary || '#0ea5e9') === 'black' ? '#020617' : '#ffffff');
    // Readable foreground for anything rendered on top of `--theme-primary`
    // (redeem buttons, points badges). Falls back to white when there is
    // no custom theme (matching the existing default-theme look).
    const primaryForeground = activeTheme ? primaryForegroundFor(activeTheme) : '#ffffff';
    const prizeAccentTriplet = rainbowTripletForNavId('prize', settings.colorScheme);

    const complementAccentTriplet = complementTripletForNavId('prize', settings.colorScheme);

    const fallbackStyle: React.CSSProperties = {
        ['--primary' as any]: prizeAccentTriplet,
        ['--chart-1' as any]: prizeAccentTriplet,
        ['--chart-2' as any]: complementAccentTriplet,
        ['--chart-3' as any]: prizeAccentTriplet,
        ['--chart-4' as any]: complementAccentTriplet,
        ['--chart-5' as any]: prizeAccentTriplet,
        ['--ring' as any]: complementAccentTriplet,
    };

    const themeStyle: React.CSSProperties = (student && activeTheme) ? ({
        '--theme-bg': themeBg,
        '--theme-text': computedThemeText,
        '--theme-primary': activeTheme.primary || 'hsl(var(--primary))',
        '--theme-primary-foreground': primaryForeground,
        '--theme-card': activeTheme.cardBackground || 'hsl(var(--card))',
        '--theme-accent': activeTheme.accent || 'hsl(var(--accent))',
        background: activeTheme.backgroundStyle || `radial-gradient(circle at top left, ${activeTheme.primary || 'hsl(var(--primary))'}22 0, transparent 45%), radial-gradient(circle at bottom right, ${activeTheme.accent || 'hsl(var(--accent))'}22 0, ${activeTheme.background || 'transparent'} 55%)`,
        color: 'var(--theme-text)',
        fontFamily: activeTheme.fontFamily || 'inherit',
        fontSize: fontScale !== 1 ? `${fontScale}em` : undefined,
    } as any) : {};

    return (
        <TooltipProvider>
            <div
                className={cn(
                    "min-h-screen relative overflow-hidden font-sans flex flex-col items-center",
                    settings.enableThemeAnimations && !!activeTheme && "theme-theme-elements-animated theme-motion-override",
                    settings.displayMode === 'app' && 'pb-24',
                    (!student || !activeTheme) && (animBackdrop ? "bg-transparent text-foreground" : "bg-background text-foreground"),
                )}
                style={activeTheme ? themeStyle : fallbackStyle}
            >
                {activeTheme?.fontFamily && <GoogleFontLoader fontFamily={activeTheme.fontFamily} />}

                {(!activeTheme || !animBackdrop) && (
                <div className="pointer-events-none fixed inset-0 opacity-[0.03] z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
                )}
                {activeTheme?.emoji && (
                    <div className="pointer-events-none fixed inset-0 flex items-center justify-center z-0 opacity-5">
                        <span className="text-[220px] leading-none">
                            {activeTheme.emoji}
                        </span>
                    </div>
                )}

                <div className="relative z-10 w-full max-w-full px-8">
                    <Card
                        className={cn(
                            "border-t-8 shadow-2xl mt-12 mb-24 backdrop-blur-md",
                            !activeTheme
                                ? animBackdrop
                                    ? "border-chart-3 bg-card/92 border-border/30"
                                    : "border-chart-3 bg-card/80"
                                : "bg-card/40",
                        )}
                        style={activeTheme ? { backgroundColor: 'var(--theme-card)', color: 'var(--theme-text)', borderColor: 'var(--theme-primary)' } : undefined}
                    >
                        <CardContent className="p-6 md:p-8">
                            {/* Header */}
                            <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-16">
                                <div className="text-center md:text-left">
                                    <h2 className="text-5xl font-black tracking-tighter font-headline drop-shadow-sm mb-4 flex items-center justify-center md:justify-start gap-4">
                                        {activeTheme?.emoji ? (
                                            <span
                                                className="theme-animated-emoji text-6xl leading-none"
                                                style={{ filter: activeTheme?.primary ? `drop-shadow(0 0 10px ${activeTheme.primary}) drop-shadow(0 0 20px ${activeTheme.primary})` : undefined }}
                                            >
                                                {activeTheme.emoji}
                                            </span>
                                        ) : (
                                            <ShoppingBag className="w-12 h-12 text-primary" />
                                        )}
                                        <span style={{ color: activeTheme ? 'var(--theme-primary)' : 'hsl(var(--primary))' }}>Prize Shop</span>
                                    </h2>
                                    <p className="text-sm font-bold uppercase tracking-[0.3em]" style={{ color: activeTheme ? 'var(--theme-text)' : undefined, opacity: 0.7 }}>
                                        Redeem your points for rewards
                                    </p>
                                </div>
                                <div className="flex flex-col items-stretch sm:items-end gap-4 w-full md:w-auto">
                                    <div className="flex items-center justify-center sm:justify-end gap-2 flex-wrap">
                                        <div
                                            className={cn(
                                                "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-colors whitespace-nowrap",
                                                isKioskLocked
                                                    ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800"
                                                    : "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800",
                                            )}
                                            role="timer"
                                            aria-live={logoutTimer <= 5 ? 'assertive' : 'off'}
                                            aria-label={isKioskLocked ? 'Kiosk locked' : `Auto logout in ${logoutTimer} seconds`}
                                        >
                                            <span>{isKioskLocked ? 'Kiosk Locked • ' : ''}Auto-logout in {logoutTimer}s</span>
                                        </div>
                                        <div className="relative">
                                            {!isKioskLocked && (
                                                <svg
                                                    className="absolute inset-0 w-full h-full pointer-events-none motion-reduce:hidden"
                                                    viewBox="0 0 36 36"
                                                    aria-hidden="true"
                                                >
                                                    <circle
                                                        cx="18"
                                                        cy="18"
                                                        r="16"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeOpacity="0.15"
                                                        strokeWidth="2"
                                                    />
                                                    <circle
                                                        cx="18"
                                                        cy="18"
                                                        r="16"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeDasharray={2 * Math.PI * 16}
                                                        strokeDashoffset={
                                                            2 *
                                                            Math.PI *
                                                            16 *
                                                            (1 - Math.max(0, Math.min(1, logoutTimer / KIOSK_AUTO_LOGOUT_SEC)))
                                                        }
                                                        transform="rotate(-90 18 18)"
                                                        className={cn(
                                                            'transition-[stroke-dashoffset] duration-500 ease-linear',
                                                            logoutTimer <= 5 ? 'text-rose-500' : 'text-amber-500',
                                                        )}
                                                    />
                                                </svg>
                                            )}
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="relative h-8 px-3.5 rounded-full text-[11px] font-bold uppercase tracking-widest whitespace-nowrap"
                                                onClick={onRequestExit}
                                                aria-label={`Log out now. Auto logout in ${logoutTimer} seconds.`}
                                            >
                                                Logout
                                            </Button>
                                        </div>
                                    </div>
                                    <div
                                    className="backdrop-blur-md border-2 rounded-3xl p-6 px-10 text-center shadow-xl"
                                    style={activeTheme ? {
                                        backgroundColor: 'var(--theme-card)',
                                        borderColor: 'var(--theme-primary)'
                                    } : {
                                        backgroundColor: 'hsl(var(--card) / 0.8)',
                                        borderColor: 'hsl(var(--primary) / 0.2)'
                                    }}
                                >
                                    <p className="text-xs font-black uppercase tracking-[0.2em] mb-1" style={{ color: activeTheme ? 'var(--theme-text)' : undefined, opacity: 0.7 }}>
                                        {student.firstName} {student.lastName}
                                    </p>
                                    {student.nickname?.trim() ? (
                                        <p className="text-[10px] font-black uppercase tracking-[0.25em] -mt-1 mb-2" style={{ color: activeTheme ? 'var(--theme-text)' : undefined, opacity: 0.65 }}>
                                            {student.nickname.trim()}
                                        </p>
                                    ) : null}
                                    <p className="text-4xl font-black tracking-tighter" style={{ color: activeTheme ? 'var(--theme-primary)' : 'hsl(var(--primary))' }}>{(student.points || 0).toLocaleString()} <span className="text-sm font-bold uppercase tracking-widest ml-1" style={{ color: activeTheme ? 'var(--theme-primary)' : 'hsl(var(--primary) / 0.6)', opacity: 0.6 }}>pts</span></p>
                                </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10">
                                <div className="flex flex-col gap-4 min-w-0">
                                {/* Filter & sort controls */}
                                {baseVisiblePrizes.length > 0 && (
                                    <div className="flex flex-col sm:flex-row gap-3 px-1">
                                        <div className="flex-1">
                                            <label htmlFor="prize-search" className="sr-only">Search prizes</label>
                                            <Input
                                                id="prize-search"
                                                type="search"
                                                placeholder="Search prizes…"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="h-11 rounded-xl bg-card/60"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="prize-sort" className="sr-only">Sort prizes</label>
                                            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                                                <SelectTrigger id="prize-sort" className="h-11 rounded-xl bg-card/60 font-semibold">
                                                    <SelectValue placeholder="Sort by…" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="price-asc">Price: low to high</SelectItem>
                                                    <SelectItem value="price-desc">Price: high to low</SelectItem>
                                                    <SelectItem value="name">Name (A–Z)</SelectItem>
                                                    <SelectItem value="affordable">What you can afford first</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}

                                {/* Prizes Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 h-fit">
                                    {visiblePrizes.length === 0 ? (
                                        <div
                                            className="col-span-full bg-card/30 backdrop-blur-sm rounded-3xl border-2 border-dashed border-border"
                                            style={activeTheme ? { color: 'var(--theme-text)' } : undefined}
                                        >
                                            {searchTerm.trim() ? (
                                                <EmptyState
                                                    icon={ShoppingBasket}
                                                    title={`No prizes match "${searchTerm}"`}
                                                    description="Try a different search, or clear the filter to see everything."
                                                    action={{
                                                        label: 'Clear search',
                                                        onClick: () => setSearchTerm(''),
                                                    }}
                                                />
                                            ) : baseVisiblePrizes.length === 0 && (prizes && prizes.length > 0) ? (
                                                <EmptyState
                                                    icon={ShoppingBasket}
                                                    title="No prizes are available for your class right now"
                                                    description="Your teacher hasn't made any prizes visible to your class yet. Keep earning points — they'll show up here as soon as they're listed!"
                                                />
                                            ) : cheapestUnaffordablePrize && !cheapestVisiblePrize ? (
                                                <EmptyState
                                                    icon={Gift}
                                                    title="The shop is empty"
                                                    description="Check back soon for new rewards!"
                                                />
                                            ) : cheapestUnaffordablePrize ? (
                                                <EmptyState
                                                    icon={Gift}
                                                    title="Keep earning points!"
                                                    description={`You're ${pointsToNextPrize.toLocaleString()} pts away from "${cheapestUnaffordablePrize.name}". Every sign-in gets you closer.`}
                                                />
                                            ) : (
                                                <EmptyState
                                                    icon={Gift}
                                                    title="The shop is empty"
                                                    description="Check back soon for new rewards!"
                                                />
                                            )}
                                        </div>
                                    ) : (
                                        visiblePrizes.map((prize: Prize, index) => {
                                            const canAfford = student.points >= prize.points;
                                            const isHovered = hoveredPrize === prize.id;
                                            const displayName =
                                                stripLeadingEmojiFromPrizeName(prize.name) || prize.name;
                                            const pctTowardCost = Math.min(
                                                100,
                                                Math.floor((student.points / (prize.points || 1)) * 100)
                                            );

                                            return (
                                                <motion.div
                                                    key={prize.id}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    onMouseEnter={() => setHoveredPrize(prize.id)}
                                                    onMouseLeave={() => setHoveredPrize(null)}
                                                    className={cn(
                                                        "group relative flex min-w-0 w-full flex-col items-center justify-between text-center p-8 rounded-3xl border-2 border-transparent transition-all duration-300 backdrop-blur-sm",
                                                        canAfford ? "hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1" : "opacity-75 cursor-not-allowed"
                                                    )}
                                                    style={activeTheme ? {
                                                        backgroundColor: canAfford ? 'var(--theme-card)' : 'transparent',
                                                        borderColor: (isHovered && canAfford) ? 'var(--theme-primary)' : 'transparent',
                                                        color: 'var(--theme-text)',
                                                    } : {
                                                        backgroundColor: canAfford ? 'hsl(var(--card) / 0.4)' : 'hsl(var(--card) / 0.1)'
                                                    }}
                                                >
                                                    {/* SVG Border Draw Animation */}
                                                    {isHovered && canAfford && (
                                                        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible rounded-3xl z-20">
                                                            <motion.rect
                                                                initial={{ pathLength: 0 }}
                                                                animate={{ pathLength: 1 }}
                                                                transition={{ duration: 0.6 }}
                                                                width="100%"
                                                                height="100%"
                                                                rx="24"
                                                                className="stroke-primary stroke-[3px] fill-none"
                                                            />
                                                        </svg>
                                                    )}

                                                    <div className={cn(
                                                        "w-24 h-24 rounded-[2rem] flex items-center justify-center mb-6 transition-transform duration-500 bg-gradient-to-br shadow-inner relative overflow-hidden",
                                                        canAfford ? "group-hover:scale-110 group-hover:rotate-6" : "grayscale opacity-80"
                                                    )}
                                                        style={activeTheme ? {
                                                            backgroundColor: canAfford ? 'var(--theme-bg)' : 'transparent',
                                                            color: canAfford ? 'var(--theme-primary)' : 'var(--theme-text)'
                                                        } : {
                                                            backgroundImage: canAfford
                                                                ? 'linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--chart-3) / 0.3))'
                                                                : 'linear-gradient(135deg, hsl(var(--muted) / 0.6), hsl(var(--muted) / 0.8))',
                                                            color: canAfford ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'
                                                        }}
                                                    >
                                                        {prize.imageUrl ? (
                                                            /* eslint-disable-next-line @next/next/no-img-element */
                                                            <img
                                                                src={prize.imageUrl}
                                                                alt=""
                                                                className="absolute inset-0 z-[5] size-full object-cover group-hover:scale-105 transition-transform duration-700"
                                                            />
                                                        ) : (
                                                            prize.name && (
                                                                <div className="absolute inset-0 opacity-40 mix-blend-overlay group-hover:scale-125 transition-transform duration-700 pointer-events-none z-0">
                                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                    <img
                                                                        src={`https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(prize.name)}&backgroundColor=transparent`}
                                                                        alt=""
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                </div>
                                                            )
                                                        )}
                                                        <DynamicIcon name={prize.icon || 'Gift'} className="w-12 h-12 drop-shadow-sm relative z-10" />
                                                    </div>

                                                    <div className="mb-6 w-full min-w-0">
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <h3
                                                                    className={cn(
                                                                        "font-black text-xl tracking-tight line-clamp-2 w-full max-w-full cursor-help break-words leading-snug [overflow-wrap:anywhere]",
                                                                        !activeTheme && "text-foreground"
                                                                    )}
                                                                    style={activeTheme ? { color: 'var(--theme-text)' } : undefined}
                                                                >
                                                                    {displayName}
                                                                </h3>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top" align="center" className="max-w-[min(20rem,calc(100vw-2rem))]">
                                                                <p className="break-words text-sm font-semibold [overflow-wrap:anywhere]">
                                                                    {displayName}
                                                                </p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                        <div className="mt-3 flex items-center justify-center gap-2">
                                                            <Badge
                                                                className="font-black text-base px-4 py-1 rounded-xl"
                                                                style={activeTheme
                                                                    ? { backgroundColor: 'var(--theme-primary)', color: primaryForeground }
                                                                    : { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
                                                            >
                                                                {(prize.points || 0).toLocaleString()} pts
                                                            </Badge>
                                                            {!canAfford && (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="font-black text-xs px-2 py-1 rounded-xl border-dashed"
                                                                    style={activeTheme ? { borderColor: 'var(--theme-text)', color: 'var(--theme-text)', opacity: 0.6 } : { borderColor: 'hsl(var(--muted-foreground))', color: 'hsl(var(--muted-foreground))' }}
                                                                    title={`You have ${pctTowardCost}% of the points this prize costs (need ${(prize.points || 0).toLocaleString()} pts).`}
                                                                >
                                                                    {pctTowardCost}%
                                                                </Badge>
                                                            )}
                                                            {typeof prize.stockCount === 'number' && (
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="font-black text-xs px-2 py-1 rounded-xl"
                                                                >
                                                                    {prize.stockCount} in stock
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <Button
                                                        onClick={() => setConfirmingPrize(prize)}
                                                        disabled={!canAfford}
                                                        className={cn(
                                                            "w-full h-12 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg"
                                                        )}
                                                        style={activeTheme && canAfford
                                                            ? { backgroundColor: 'var(--theme-primary)', color: primaryForeground }
                                                            : canAfford
                                                                ? { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }
                                                                : { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}
                                                    >
                                                        <Gift className="mr-2 w-4 h-4" /> Redeem Now
                                                    </Button>

                                                    <AnimatePresence>
                                                        {isHovered && canAfford && (
                                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.05 }} exit={{ opacity: 0 }} className="absolute inset-0 rounded-3xl pointer-events-none bg-primary" />
                                                        )}
                                                    </AnimatePresence>
                                                </motion.div>
                                            );
                                        })
                                    )}
                                </div>
                                </div>

                                {/* Sidebar */}
                                <div className="space-y-6">
                                    <Card
                                        className="backdrop-blur-sm border-2 rounded-3xl overflow-hidden shadow-xl flex flex-col min-h-0 max-h-[min(88dvh,960px)]"
                                        style={activeTheme ? { backgroundColor: 'var(--theme-card)', borderColor: 'var(--theme-bg)', color: 'var(--theme-text)' } : { backgroundColor: 'hsl(var(--card) / 0.4)', borderColor: 'hsl(var(--border) / 0.5)' }}
                                    >
                                        <CardHeader className="border-b py-6 px-8 shrink-0" style={activeTheme ? { backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-bg)' } : { backgroundColor: 'hsl(var(--primary) / 0.05)', borderColor: 'hsl(var(--border) / 0.5)' }}>
                                            <CardTitle className="text-sm font-black uppercase tracking-[0.3em] flex items-center gap-3" style={activeTheme ? { color: 'var(--theme-primary)' } : { color: 'hsl(var(--primary))' }}>
                                                <Clock className="w-5 h-5" style={activeTheme ? { color: 'var(--theme-primary)' } : { color: 'hsl(var(--chart-3))' }} /> Recent Activity
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-6 flex-1 min-h-0 overflow-hidden flex flex-col">
                                            <PrizeActivityList schoolId={schoolId!} studentId={student.id} themed={!!activeTheme} />
                                        </CardContent>
                                    </Card>

                                    <Button
                                        variant="outline"
                                        className="w-full h-16 rounded-3xl border-2 font-black uppercase tracking-widest text-xs transition-all group"
                                        onClick={onRequestExit}
                                        style={activeTheme ? {
                                            borderColor: 'var(--theme-text)',
                                            color: 'var(--theme-text)',
                                            backgroundColor: 'transparent'
                                        } : {
                                            borderColor: 'hsl(var(--rose-200))',
                                            color: 'hsl(var(--rose-600))'
                                        }}
                                    >
                                        <LogOut className="mr-2 w-5 h-5 transition-transform group-hover:-translate-x-1" /> Log Out & Finish
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <ConfirmRedemptionDialog
                    isOpen={!!confirmingPrize}
                    onOpenChange={(open) => {
                        if (!open) setConfirmingPrize(null);
                    }}
                    student={student}
                    prize={confirmingPrize}
                    onConfirm={(quantity) => {
                        const p = confirmingPrize;
                        if (p) void handleRedeemReward(p, quantity);
                    }}
                />
                <AlertDialog open={!!ticketData} onOpenChange={(open) => { if (!open) setTicketData(null); }}>
                    <AlertDialogContent className="no-print">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Print redeem ticket?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Print a ticket for <span className="font-bold">{ticketData?.prizeName}</span>{ticketData && ticketData.quantity > 1 ? ` (x${ticketData.quantity})` : ''}.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:justify-end sm:space-x-0">
                            <AlertDialogCancel onClick={() => setTicketData(null)}>No Thanks</AlertDialogCancel>
                            <AlertDialogAction className="w-full sm:w-auto" onClick={handlePrintTicket}>Print Ticket</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <Dialog
                    open={aiSurpriseOpen}
                    onOpenChange={(open) => {
                        if (!open) {
                            flushPendingTicketAfterAi();
                            setAiSurpriseOpen(false);
                        }
                    }}
                >
                    <DialogContent className="no-print sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-left">
                                <Sparkles className="h-5 w-5 shrink-0 text-amber-500" aria-hidden />
                                {aiSurpriseLoading
                                    ? 'Your surprise'
                                    : (AI_SURPRISE_KIND_LABEL[aiSurpriseBody?.kind ?? ''] ?? 'Your surprise')}
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                                AI-generated joke, riddle, or fortune after redeeming a prize.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="min-h-[100px] py-1">
                            {aiSurpriseLoading ? (
                                <div className="flex flex-col items-center justify-center gap-3 py-8 text-muted-foreground">
                                    <Loader2 className="h-10 w-10 animate-spin" aria-hidden />
                                    <p className="text-sm font-medium">Cooking up something fun…</p>
                                </div>
                            ) : aiSurpriseErr ? (
                                <p className="text-sm text-destructive">{aiSurpriseErr}</p>
                            ) : aiSurpriseBody ? (
                                <div className="space-y-4 text-base leading-relaxed">
                                    <p className="font-medium">{aiSurpriseBody.text}</p>
                                    {aiSurpriseBody.kind === 'riddle' && aiSurpriseBody.answer ? (
                                        <p className="text-sm rounded-lg bg-muted/80 px-3 py-2 border border-border">
                                            <span className="font-semibold text-muted-foreground">Answer: </span>
                                            {aiSurpriseBody.answer}
                                        </p>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="default"
                                className="w-full sm:w-auto"
                                onClick={() => setAiSurpriseOpen(false)}
                                disabled={aiSurpriseLoading}
                            >
                                {aiSurpriseLoading ? 'Please wait…' : 'Awesome'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    );
}
export default function PrizePage() {
    const { loginState, isInitialized } = useAppContext();
    const { toast } = useToast();
    const { settings } = useSettings();

    const { activeStudentId, setActiveStudentId, handleDone, loginMeta, setLoginMeta } = useActiveStudentSession();
    const playSound = useArcadeSound();

    const handlePrizeSessionExit = useCallback(() => {
        playSound('swoosh');
        handleDone();
        toast({ title: 'Logged Out', description: 'Returning to prize portal home.' });
    }, [handleDone, playSound, toast]);

    const onScannerStudent = useCallback(
        (id: string, meta?: StudentFoundMeta) => {
            setActiveStudentId(id);
            if (meta?.source === 'face') {
                setLoginMeta({ source: 'face', confidence: meta.confidence });
            } else {
                setLoginMeta(null);
            }
        },
        [setActiveStudentId, setLoginMeta],
    );

    if (!isInitialized || !['student', 'teacher', 'admin', 'school', 'developer'].includes(loginState)) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Button disabled variant="ghost" size="lg" className="text-muted-foreground">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Loading Kiosk...
                </Button>
            </div>
        );
    }

    if (activeStudentId) {
        return (
            <>
                {loginMeta?.source === 'face' && (
                    <FaceMismatchBanner
                        studentId={activeStudentId}
                        confidence={loginMeta.confidence}
                        onResolved={handleDone}
                    />
                )}
                <PrizeDashboard
                    studentId={activeStudentId}
                    onDone={handleDone}
                    onRequestExit={handlePrizeSessionExit}
                />
            </>
        );
    }



    return (
        <TooltipProvider>
            <div
              className={cn("min-h-[80vh] flex flex-col items-center justify-center", settings.displayMode === 'app' && 'pb-24')}
              style={{
                ['--primary' as any]: rainbowTripletForNavId('prize', settings.colorScheme),
                ['--chart-1' as any]: rainbowTripletForNavId('prize', settings.colorScheme),
                ['--chart-2' as any]: complementTripletForNavId('prize', settings.colorScheme),
                ['--chart-3' as any]: rainbowTripletForNavId('prize', settings.colorScheme),
                ['--chart-4' as any]: complementTripletForNavId('prize', settings.colorScheme),
                ['--chart-5' as any]: rainbowTripletForNavId('prize', settings.colorScheme),
                ['--ring' as any]: complementTripletForNavId('prize', settings.colorScheme),
              } as any}
            >
                <StudentScanner
                    onStudentFound={onScannerStudent}
                    title="Prize Redemption"
                    description="Choose how to identify the student below."
                    icon={<Gift className="w-10 h-10" />}
                />
            </div>
        </TooltipProvider>
    );
}
