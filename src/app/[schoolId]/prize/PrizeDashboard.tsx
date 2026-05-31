
'use client';
import { useState, useEffect, useRef, useCallback, useMemo, type CSSProperties } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import dynamic from 'next/dynamic';
import { FaceMismatchBanner } from '@/components/student/FaceMismatchBanner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const StudentScanner = dynamic(
    () =>
        import('@/components/student/StudentScanner')
            .then((m) => m.StudentScanner)
            .catch((err) => {
                if (typeof window !== 'undefined' && (err.message?.includes('Loading chunk') || err.name === 'ChunkLoadError')) {
                    window.location.reload();
                }
                throw err;
            }),
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
import type { Student, Prize, PrizeAiFunReward } from '@/lib/types';
import {
    Gift,
    LogOut,
    ChevronRight,
    ArrowLeft,
    ShoppingBasket,
    Plus,
    Minus,
    Loader2,
    Sparkles,
    Printer,
} from 'lucide-react';
import { cn, getStudentNickname, getContrastColor } from '@/lib/utils';
import { ensureContrast, resolveStudentThemeWithSchoolDefault, primaryForegroundFor } from '@/lib/themeContrast';
import { getReadableErrorMessage, OFFLINE_USER_MESSAGE } from '@/lib/errorMessage';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useKioskAiFunAndVoucherIdleActive } from '@/hooks/useKioskAiFunAndVoucherIdle';
import { usePrizeAiFunAudienceCacheReset } from '@/hooks/usePrizeAiFunAudienceCacheReset';
import { useSettings } from '@/components/providers/SettingsProvider';
import { PrinterReminderCallout } from '@/components/coupons/PrinterReminderCallout';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { GoogleFontLoader } from '@/components/themes/GoogleFontLoader';
import { useActiveStudentSession } from '@/hooks/useActiveStudentSession';
import type { StudentFoundMeta } from '@/components/student/StudentScanner';
import { rainbowTripletForNavId, complementTripletForNavId } from '@/lib/rainbowNav';
import { globalAnimatedBackdropActive } from '@/lib/animatedBackdrop';
import { appearanceVarsForSurface } from '@/lib/appearance';
import { StudentKioskTopBar } from '@/components/student-kiosk/StudentKioskTopBar';
import {
  StudentKioskLogoutControls,
  StudentKioskWarmBackdrop,
} from '@/components/student-kiosk/StudentKioskRedeemUI';
import { StudentPrizeShopCard } from '@/components/student-kiosk/StudentPrizeShopCard';

import { prizeIsListed, studentSeesPrizeByTeachers } from '@/lib/prizes/prizeUtils';
import { runMotor as runVendingMotor, isConnected as motorIsConnected } from '@/lib/vendingMotor';
import { useAuthFetch } from '@/lib/authFetch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { isAiFunPrize, prizeAppearsInRewardsShop, resolveAiFunApiMode, withUnifiedAiFunPrize } from '@/lib/aiJokePrize';
import { acrosticFirstNameFromStudent } from '@/lib/prizes/prizeAiFunAcrostic';
import { requestAcrosticSurprise } from '@/lib/prizes/prizeAiFunRequest';
import { prizeAiFunAgeBandKey, studentAgeYearsFromBirthday } from '@/lib/students/studentAiFunAge';
import {
    type AiSurpriseBody,
    type AiSurpriseKind,
    AI_SURPRISE_STOCK_REFILL_AT,
    AI_SURPRISE_STOCK_TARGET,
    aiSurpriseDedupeKey,
    aiSurpriseStockKey,
    buildPrizeAiFunAvoidTexts,
    normalizeAiSurpriseBody,
    readAiSurpriseStock,
    rememberAiSurprise,
    recentAiSurpriseDedupeSet,
    writeAiSurpriseStock,
} from '@/lib/prizes/prizeAiFunClientStorage';

/** Max units per redemption for 0-point prizes when stock is unlimited (balance does not limit). */
const FREE_PRIZE_MAX_QTY = 99;

const AI_SURPRISE_KIND_LABEL: Record<string, string> = {
    joke: 'Your joke',
    riddle: 'Your riddle',
    fortune: 'Fortune teller',
    acrostic: 'Your name poem',
};

const aiSurpriseStockFetches = new Set<string>();

const FALLBACK_AI_SURPRISES: Record<Exclude<AiSurpriseKind, 'acrostic'>, AiSurpriseBody[]> = {
    joke: [
        { kind: 'joke', text: 'Why did the pencil get invited to class? Because it always had a good point.' },
        { kind: 'joke', text: 'Why was the math book smiling? It finally solved one of its problems.' },
        { kind: 'joke', text: 'Why did the calendar do well in school? It had all its dates organized.' },
    ],
    riddle: [
        { kind: 'riddle', text: 'I get bigger the more you take away from me. What am I?', answer: 'A hole' },
        { kind: 'riddle', text: 'What has many pages but no voice, and can still tell a story?', answer: 'A book' },
        { kind: 'riddle', text: 'What can you catch but not throw?', answer: 'A cold' },
    ],
    fortune: [
        { kind: 'fortune', text: 'Your next brave try may be the one that makes everything click.' },
        { kind: 'fortune', text: 'A small kind choice today can become someone else\'s best memory.' },
        { kind: 'fortune', text: 'You are closer to figuring it out than it feels right now.' },
    ],
};

function pickAiSurpriseKind(mode: PrizeAiFunReward | undefined): AiSurpriseKind {
    if (mode === 'riddle' || mode === 'fortune' || mode === 'joke' || mode === 'acrostic') return mode;
    const roll = Math.floor(Math.random() * 4);
    return (['joke', 'riddle', 'fortune', 'acrostic'] as const)[roll];
}

function takeAiSurpriseFromStock(
    schoolId: string,
    kind: Exclude<AiSurpriseKind, 'acrostic'>,
    ageBand = '0',
): AiSurpriseBody {
    const recentKeys = recentAiSurpriseDedupeSet(schoolId, kind, ageBand);
    const stock = readAiSurpriseStock(schoolId, kind, ageBand).filter(
        (item) => !recentKeys.has(aiSurpriseDedupeKey(kind, item.text)),
    );
    const next = stock.shift();
    writeAiSurpriseStock(schoolId, kind, stock, ageBand);
    if (next) {
        rememberAiSurprise(schoolId, next, ageBand);
        return next;
    }
    const fallback = FALLBACK_AI_SURPRISES[kind];
    const freshFallback =
        fallback.find((item) => !recentKeys.has(aiSurpriseDedupeKey(kind, item.text))) ??
        fallback[Math.floor(Math.random() * fallback.length)];
    rememberAiSurprise(schoolId, freshFallback, ageBand);
    return freshFallback;
}

async function refillAiSurpriseStock(
    authFetch: ReturnType<typeof useAuthFetch>,
    schoolId: string,
    kind: Exclude<AiSurpriseKind, 'acrostic'>,
    force = false,
    ageBand = '0',
    ageYears?: number,
) {
    if (typeof window === 'undefined') return;
    const key = aiSurpriseStockKey(schoolId, kind, ageBand);
    const current = readAiSurpriseStock(schoolId, kind, ageBand);
    if (!force && current.length > AI_SURPRISE_STOCK_REFILL_AT) return;
    if (aiSurpriseStockFetches.has(key)) return;
    aiSurpriseStockFetches.add(key);
    try {
        const stock = current.slice();
        let attempts = 0;
        const maxAttempts = 18;
        while (stock.length < AI_SURPRISE_STOCK_TARGET && attempts < maxAttempts) {
            attempts += 1;
            const avoidTexts = buildPrizeAiFunAvoidTexts(schoolId, kind, undefined, 18, ageBand);
            const res = await authFetch('/api/prize-ai-fun', {
                method: 'POST',
                body: JSON.stringify({
                    schoolId,
                    mode: kind,
                    avoidTexts,
                    ...(ageYears != null ? { ageYears } : {}),
                }),
            });
            const j = (await res.json()) as { error?: string; kind?: string; text?: string; answer?: string };
            if (!res.ok) throw new Error(j.error || 'Could not load surprise.');
            const body = normalizeAiSurpriseBody(j, kind);
            if (!body) break;
            const dedupe = aiSurpriseDedupeKey(kind, body.text);
            if (stock.some((item) => aiSurpriseDedupeKey(kind, item.text) === dedupe)) continue;
            if (recentAiSurpriseDedupeSet(schoolId, kind, ageBand).has(dedupe)) continue;
            stock.push(body);
            writeAiSurpriseStock(schoolId, kind, stock, ageBand);
        }
    } catch (e) {
        console.warn('Prize AI surprise stock refill unavailable:', e);
    } finally {
        aiSurpriseStockFetches.delete(key);
    }
}


function ConfirmRedemptionDialog({
    student,
    prize,
    isOpen,
    onOpenChange,
    onConfirm,
    isRedeeming = false,
    hasTheme = false,
    themeSurfaceStyle,
    primaryForeground = '#ffffff',
}: {
    student: Student | null,
    prize: Prize | null,
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    onConfirm: (quantity: number, aiFunUserPick?: PrizeAiFunReward) => void,
    isRedeeming?: boolean,
    hasTheme?: boolean,
    themeSurfaceStyle?: CSSProperties,
    primaryForeground?: string,
}) {
    const [quantity, setQuantity] = useState(1);
    const [pickerKind, setPickerKind] = useState<PrizeAiFunReward>('joke');
    const playSound = useArcadeSound();

    const studentPoints = student && typeof student.points === 'number' ? student.points : 0;
    const prizePoints = prize && typeof prize.points === 'number' ? prize.points : 0;
    const aiPrize = isAiFunPrize(prize);
    const pickerSurprise = prize?.aiFunReward === 'picker';
    /** Free (0 pt) prizes are not limited by balance; cap + optional stock count. */
    const maxByPoints =
        !prize ? 1 :
        prizePoints > 0 ? Math.max(0, Math.floor(studentPoints / prizePoints)) :
        FREE_PRIZE_MAX_QTY;
    const maxByStock =
        prize && typeof prize.stockCount === 'number' ? prize.stockCount : Number.POSITIVE_INFINITY;
    const maxQuantity = prize ? Math.max(1, Math.min(maxByPoints, maxByStock)) : 1;

    useEffect(() => {
        if (isOpen) {
            setQuantity(1);
            setPickerKind('joke');
        }
    }, [isOpen, prize?.id]);

    useEffect(() => {
        if (!isOpen || !prize) return;
        setQuantity((q) => Math.min(Math.max(1, maxQuantity), Math.max(1, q)));
    }, [isOpen, prize, maxQuantity]);

    if (!prize || !student) return null;

    const effectiveQty = aiPrize ? 1 : quantity;
    const totalCost = prizePoints * effectiveQty;
    const canAfford = studentPoints >= totalCost;
    const remainingPoints = studentPoints - totalCost;

    const handleQuantityChange = (amount: number) => {
        const newQuantity = Math.min(maxQuantity, Math.max(1, quantity + amount));
        setQuantity(newQuantity);
        playSound('click');
    };

    const mutedTextStyle: CSSProperties | undefined = hasTheme ? { color: 'var(--theme-text)', opacity: 0.7 } : undefined;

    return (
        <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
            <AlertDialogContent
                className={cn(hasTheme && 'student-theme-surface')}
                style={themeSurfaceStyle}
            >
                <AlertDialogHeader>
                    <AlertDialogTitle style={hasTheme ? { color: 'var(--theme-text)' } : undefined}>Confirm Purchase</AlertDialogTitle>
                    <AlertDialogDescription
                        className="break-words [overflow-wrap:anywhere]"
                        style={hasTheme ? { color: 'var(--theme-text)', opacity: 0.85 } : undefined}
                    >
                        You are redeeming{' '}
                        <span className="text-xl font-black sm:text-2xl">{prize.name}</span>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4 space-y-4">
                    {prize.imageUrl ? (
                        <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border bg-muted">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={prize.imageUrl} alt="" className="size-full object-cover" />
                        </div>
                    ) : null}
                    {!aiPrize ? (
                        <>
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
                                <p className={cn("text-xs text-center", !hasTheme && "text-muted-foreground")} style={mutedTextStyle}>
                                    {maxByStock !== Number.POSITIVE_INFINITY && quantity >= maxByStock
                                        ? `Only ${maxByStock} in stock.`
                                        : prizePoints > 0
                                            ? `Max you can afford: ${maxByPoints}.`
                                            : `Limit: ${FREE_PRIZE_MAX_QTY} per redemption.`}
                                </p>
                            )}
                        </>
                    ) : pickerSurprise ? (
                        <div className="space-y-2">
                            <Label htmlFor="fun-ai-kind" className="text-xs font-semibold" style={hasTheme ? { color: 'var(--theme-text)' } : undefined}>
                                What do you want?
                            </Label>
                            <Select value={pickerKind} onValueChange={(v) => setPickerKind(v as PrizeAiFunReward)}>
                                <SelectTrigger
                                    id="fun-ai-kind"
                                    className="h-11"
                                    style={hasTheme ? { backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-primary)', color: 'var(--theme-text)' } : undefined}
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="joke">Joke</SelectItem>
                                    <SelectItem value="riddle">Riddle</SelectItem>
                                    <SelectItem value="fortune">Fortune teller</SelectItem>
                                    <SelectItem value="acrostic">Name poem (your first name)</SelectItem>
                                    <SelectItem value="random">Surprise me</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className={cn("text-xs text-center font-semibold", !hasTheme && "text-muted-foreground")} style={mutedTextStyle}>One per redeem.</p>
                        </div>
                    ) : (
                        <p className={cn("text-xs text-center font-semibold", !hasTheme && "text-muted-foreground")} style={mutedTextStyle}>
                            One per redeem.
                        </p>
                    )}
                    <div
                        className={cn("text-sm space-y-1 p-3 rounded-lg", !hasTheme && "bg-secondary")}
                        style={hasTheme ? { backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text)' } : undefined}
                    >
                        {typeof prize.stockCount === 'number' && (
                            <div className={cn("flex justify-between text-xs font-semibold", !hasTheme && "text-muted-foreground")} style={mutedTextStyle}>
                                <span>In stock</span>
                                <span className="font-bold" style={hasTheme ? { color: 'var(--theme-text)' } : undefined}>{prize.stockCount}</span>
                            </div>
                        )}
                        <div className="flex justify-between"><span>Total Cost:</span> <span className="font-bold">{totalCost.toLocaleString()} pts</span></div>
                        <div className={`flex justify-between ${!canAfford ? 'text-destructive' : ''}`}><span>Your balance after:</span> <span className="font-bold">{remainingPoints.toLocaleString()} pts</span></div>
                    </div>
                    {!canAfford && <p className="text-sm text-destructive font-bold text-center" role="alert">You don&apos;t have enough points for this quantity.</p>}
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => onOpenChange(false)} disabled={isRedeeming}>Cancel</AlertDialogCancel>
                    <Button
                        type="button"
                        disabled={!canAfford || isRedeeming}
                        onClick={() =>
                            onConfirm(effectiveQty, pickerSurprise ? pickerKind : undefined)
                        }
                        style={hasTheme && canAfford ? { backgroundColor: 'var(--theme-primary)', color: primaryForeground } : undefined}
                    >
                        {isRedeeming ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />Processing…</> : 'Confirm'}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export function PrizeDashboard({
    studentId,
    onDone,
    onRequestExit,
    embedded = false,
    onBackToKiosk,
}: {
    studentId: string;
    onDone: () => void;
    onRequestExit: () => void;
    /** Render inside student kiosk — skip full-page shell and duplicate header. */
    embedded?: boolean;
    onBackToKiosk?: () => void;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { schoolId, redeemPrize, printPrizeTickets, isKioskLocked } = useAppContext();
    const firestore = useFirestore();
    const { toast } = useToast();
    const playSound = useArcadeSound();
    const { settings } = useSettings();
    const { kioskAiFunActive, markKioskRewardsActivity } = useKioskAiFunAndVoucherIdleActive(
        settings.kioskAiFunIdleOffSec,
        isKioskLocked,
    );
    const kioskAutoLogoutOn = settings.kioskAutoLogoutEnabled !== false;
    const kioskAiFunInShop = settings.enablePrizeAiSurprise === true && kioskAiFunActive;
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
        studentEmoji?: string;
        prizeName: string;
        prizeIcon?: string;
        quantity: number;
        totalCost: number;
        aiSurpriseKind?: 'joke' | 'riddle' | 'fortune' | 'acrostic';
        aiSurpriseText?: string;
        aiSurpriseAnswer?: string;
    } | null>(null);

    const [aiSurpriseOpen, setAiSurpriseOpen] = useState(false);
    /** Guards against double-click: disables confirm button while a redemption Cloud Function call is in flight. */
    const [isRedeeming, setIsRedeeming] = useState(false);
    const lastActivityResetRef = useRef(0);

    const pendingTicketRef = useRef<any>(null);
    const [aiSurpriseLoading, setAiSurpriseLoading] = useState(false);
    const [aiSurpriseErr, setAiSurpriseErr] = useState<string | null>(null);
    const [aiSurpriseBody, setAiSurpriseBody] = useState<AiSurpriseBody | null>(null);
    const aiSurpriseBodyRef = useRef<typeof aiSurpriseBody>(null);
    useEffect(() => {
        aiSurpriseBodyRef.current = aiSurpriseBody;
    }, [aiSurpriseBody]);
    const pendingTicketAfterAiRef = useRef<typeof ticketData>(null);

    const authFetch = useAuthFetch();

    const flushPendingTicketAfterAi = useCallback(() => {
        const p = pendingTicketAfterAiRef.current;
        pendingTicketAfterAiRef.current = null;
        if (!p) return;
        const s = aiSurpriseBodyRef.current;
        const text = typeof s?.text === 'string' ? s.text.trim() : '';
        if (!text) {
            setTicketData(p);
            return;
        }
        const kind =
            s!.kind === 'riddle' || s!.kind === 'fortune' || s!.kind === 'acrostic' ? s!.kind : 'joke';
        setTicketData({
            ...p,
            aiSurpriseKind: kind,
            aiSurpriseText: text,
            aiSurpriseAnswer:
                kind === 'riddle' && typeof s!.answer === 'string' && s!.answer.trim()
                    ? s!.answer.trim()
                    : undefined,
        });
    }, []);

    const studentDocRef = useMemoFirebase(() => schoolId ? doc(firestore, 'schools', schoolId, 'students', studentId) : null, [firestore, schoolId, studentId]);
    const { data: student, isLoading: studentLoading, error: studentError } = useDoc<Student>(studentDocRef);

    const prizesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'prizes') : null, [firestore, schoolId]);
    const { data: prizes, isLoading: prizesLoading, error: prizesError } = useCollection<Prize>(prizesQuery);
    const rewardPrizes = useMemo(
        () => withUnifiedAiFunPrize(prizes, {
            enablePrizeAiSurprise: kioskAiFunInShop,
            defaultPoints: settings.prizeAiSurpriseDefaultPoints,
        }),
        [prizes, kioskAiFunInShop, settings.prizeAiSurpriseDefaultPoints],
    );

    const prizeAiFunAgeYears = useMemo(
        () => studentAgeYearsFromBirthday(student?.birthday),
        [student?.birthday],
    );
    const prizeAiFunAgeBand = useMemo(() => prizeAiFunAgeBandKey(prizeAiFunAgeYears), [prizeAiFunAgeYears]);

    usePrizeAiFunAudienceCacheReset(schoolId, studentId, student);

    useEffect(() => {
        if (!schoolId || settings.enablePrizeAiSurprise !== true || !kioskAiFunActive) return;
        void refillAiSurpriseStock(authFetch, schoolId, 'joke', false, prizeAiFunAgeBand, prizeAiFunAgeYears);
        void refillAiSurpriseStock(authFetch, schoolId, 'riddle', false, prizeAiFunAgeBand, prizeAiFunAgeYears);
        void refillAiSurpriseStock(authFetch, schoolId, 'fortune', false, prizeAiFunAgeBand, prizeAiFunAgeYears);
    }, [
        authFetch,
        schoolId,
        settings.enablePrizeAiSurprise,
        kioskAiFunActive,
        prizeAiFunAgeBand,
        prizeAiFunAgeYears,
    ]);

    /** Open confirm dialog when linked from student dashboard (?redeem=prizeId). */
    useEffect(() => {
        const redeemId = searchParams.get('redeem');
        if (!redeemId || studentLoading || prizesLoading || !schoolId || !student) return;
        const visible = rewardPrizes.filter((p) => {
            if (!prizeAppearsInRewardsShop(p, { enablePrizeAiSurprise: kioskAiFunInShop })) return false;
            if (!prizeIsListed(p)) return false;
            const teacherMatch = studentSeesPrizeByTeachers(student, p);
            const classMatch = !p.classId || student.classId === p.classId;
            return teacherMatch && classMatch;
        });
        const match = visible.find((p) => p.id === redeemId);
        const pts = student.points || 0;
        if (match && pts >= (match.points || 0)) {
            setConfirmingPrize(match);
        }
        router.replace(`/${schoolId}/prize`, { scroll: false });
    }, [
        searchParams,
        studentLoading,
        prizesLoading,
        schoolId,
        student,
        rewardPrizes,
        router,
        kioskAiFunInShop,
    ]);

    const [logoutTimer, setLogoutTimer] = useState(settings.kioskSessionTimeoutSec ?? 10);

    const resetTimer = useCallback(() => {
        if (!isKioskLocked && kioskAutoLogoutOn) {
            markKioskRewardsActivity();
            setLogoutTimer(settings.kioskSessionTimeoutSec ?? 10);
        }
    }, [isKioskLocked, kioskAutoLogoutOn, settings.kioskSessionTimeoutSec, markKioskRewardsActivity]);

    const closeAiSurprise = useCallback(() => {
        flushPendingTicketAfterAi();
        setAiSurpriseOpen(false);
        setAiSurpriseLoading(false);
        setAiSurpriseErr(null);
        setAiSurpriseBody(null);
        resetTimer();
    }, [flushPendingTicketAfterAi, resetTimer]);

    useEffect(() => {
        if (isKioskLocked || !kioskAutoLogoutOn) return;
        if (logoutTimer <= 0) {
            onDone();
            return;
        }
        const timerId = setTimeout(() => {
            setLogoutTimer((t: number) => t - 1);
        }, 1000);
        return () => clearTimeout(timerId);
    }, [logoutTimer, onDone, isKioskLocked, kioskAutoLogoutOn]);

    useEffect(() => {
        if (isKioskLocked || !kioskAutoLogoutOn) return;
        const handleActivity = () => {
            const now = Date.now();
            if (now - lastActivityResetRef.current < 1000) return;
            lastActivityResetRef.current = now;
            resetTimer();
        };
        const events: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'touchstart'];
        events.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }));
        return () => {
            events.forEach((ev) => window.removeEventListener(ev, handleActivity));
        };
    }, [resetTimer, isKioskLocked, kioskAutoLogoutOn]);

    const handleRedeemReward = async (prize: Prize, quantity: number, aiFunUserPick?: PrizeAiFunReward) => {
        if (!student || isRedeeming) return;
        resetTimer();
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            playSound('error');
            toast({
                variant: 'destructive',
                title: 'Offline',
                description: OFFLINE_USER_MESSAGE,
                duration: 8000,
            });
            return;
        }
        setIsRedeeming(true);
        setConfirmingPrize(null);
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
            // Failures are surfaced but do not roll back the redemption; the
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
            if (
                prize.offerPrintTicketOnRedeem === true &&
                activityId &&
                redeemedAt &&
                typeof totalCost === 'number'
            ) {
                const ticketNo = String(redeemedAt).slice(-6);
                const displayFirst = getStudentNickname(student);
                const legalFirst = (student.firstName || '').trim();
                const nick = student.nickname?.trim();
                const themeForTicket = resolveStudentThemeWithSchoolDefault(
                    student.theme,
                    settings.defaultStudentTheme,
                    settings.enableStudentThemes,
                );
                const emojiRaw =
                    settings.enableStudentEmojiOnPrizeTickets === true ? themeForTicket?.emoji : undefined;
                const studentEmoji =
                    typeof emojiRaw === 'string' && emojiRaw.trim() ? emojiRaw.trim() : undefined;
                ticketPayload = {
                    activityId,
                    ticketNo,
                    redeemedAt,
                    studentId: student.id,
                    studentName: `${displayFirst} ${student.lastName}`.trim(),
                    /** Legal first name in parens only when a real nickname is shown. */
                    studentNickname:
                        nick && legalFirst && displayFirst.trim() !== legalFirst ? legalFirst : undefined,
                    studentEmoji,
                    prizeName: prize.name,
                    prizeIcon: prize.icon || 'Gift',
                    quantity,
                    totalCost,
                };
            }

            if (prize.aiFunReward && schoolId && settings.enablePrizeAiSurprise === true && kioskAiFunActive) {
                pendingTicketAfterAiRef.current = ticketPayload;
                setAiSurpriseErr(null);
                const apiMode = resolveAiFunApiMode(prize, aiFunUserPick);
                const stockKind = pickAiSurpriseKind(apiMode);
                setAiSurpriseOpen(true);

                if (stockKind === 'acrostic') {
                    setAiSurpriseLoading(true);
                    setAiSurpriseBody(null);
                    const firstName = acrosticFirstNameFromStudent(student);
                    void requestAcrosticSurprise(authFetch, {
                        schoolId,
                        firstName,
                        ageBand: prizeAiFunAgeBand,
                        ageYears: prizeAiFunAgeYears,
                    })
                        .then((surprise) => {
                            rememberAiSurprise(schoolId, surprise, prizeAiFunAgeBand);
                            setAiSurpriseBody(surprise);
                            setAiSurpriseErr(null);
                        })
                        .catch((e: unknown) => {
                            console.warn('Prize AI acrostic unavailable:', e);
                            setAiSurpriseErr('Could not load your name poem. Try again in a moment.');
                        })
                        .finally(() => setAiSurpriseLoading(false));
                } else {
                    setAiSurpriseLoading(false);
                    const surprise = takeAiSurpriseFromStock(schoolId, stockKind, prizeAiFunAgeBand);
                    setAiSurpriseBody(surprise);
                    void refillAiSurpriseStock(
                        authFetch,
                        schoolId,
                        stockKind,
                        true,
                        prizeAiFunAgeBand,
                        prizeAiFunAgeYears,
                    );
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
        } finally {
            setIsRedeeming(false);
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
        const surpriseText = ticketData.aiSurpriseText?.trim();
        const surpriseExtras = surpriseText
            ? {
                  aiSurpriseKind: ticketData.aiSurpriseKind ?? 'joke',
                  aiSurpriseText: surpriseText,
                  aiSurpriseAnswer:
                      ticketData.aiSurpriseKind === 'riddle' && ticketData.aiSurpriseAnswer?.trim()
                          ? ticketData.aiSurpriseAnswer.trim()
                          : undefined,
              }
            : {};
        const sheets = Array.from({ length: qty }, (_, i) => ({
            activityId: ticketData.activityId,
            ticketNo: qty > 1 ? `${baseNo}-${i + 1}` : baseNo,
            redeemedAt: ticketData.redeemedAt,
            studentId: ticketData.studentId,
            studentName: ticketData.studentName,
            studentNickname: ticketData.studentNickname,
            studentEmoji: ticketData.studentEmoji,
            prizeName: ticketData.prizeName,
            prizeIcon: ticketData.prizeIcon,
            quantity: 1,
            totalCost: perUnitCost,
            ...surpriseExtras,
        }));
        printPrizeTickets(sheets);
    }, [ticketData, schoolId, printPrizeTickets]);


    if (studentLoading || prizesLoading) {
        return (
            <div
                className="space-y-6 p-8"
                role="status"
                aria-live="polite"
          aria-label="Loading rewards shop"
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
          <span className="sr-only">Loading rewards shop...</span>
            </div>
        );
    }

    if (studentError || prizesError) {
        const loadErr = studentError || prizesError;
        return (
            <div className="min-h-[50vh] flex items-center justify-center p-6">
                <Card className="max-w-md w-full border-destructive/30 shadow-lg">
                    <CardHeader className="text-center space-y-2">
            <CardTitle className="text-xl">Can&apos;t load the rewards shop</CardTitle>
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

    const baseVisiblePrizes = rewardPrizes
        .filter(p => {
            if (!prizeAppearsInRewardsShop(p, { enablePrizeAiSurprise: kioskAiFunInShop })) return false;
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
    // hand-picked. Uses per-student theme, else admin default from school
    // settings. Downstream reads `activeTheme` instead of `student.theme`.
    const activeTheme = resolveStudentThemeWithSchoolDefault(
        student.theme,
        settings.defaultStudentTheme,
        settings.enableStudentThemes,
    );
    const fontScale = activeTheme?.fontScale ?? 1.15;
    const themeBg = activeTheme?.background || '#020617';
    const themeCard = activeTheme?.cardBackground || themeBg;
    const computedThemeText =
        activeTheme?.text || (getContrastColor(themeBg) === 'black' ? '#020617' : '#ffffff');
    const computedThemePageText = activeTheme ? ensureContrast(computedThemeText, themeBg, 4.5) : computedThemeText;
    const computedThemeCardText = activeTheme ? ensureContrast(computedThemeText, themeCard, 4.5) : computedThemeText;
    const primaryForeground = activeTheme ? primaryForegroundFor(activeTheme) : '#ffffff';
    const themedFieldStyle: CSSProperties | undefined = activeTheme
        ? { backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-primary)', color: 'var(--theme-text)' }
        : undefined;
    const themedMutedStyle: CSSProperties | undefined = activeTheme
        ? { color: 'var(--theme-text)', opacity: 0.7 }
        : undefined;
    const themeSurfaceStyle: CSSProperties | undefined = activeTheme
        ? ({
            ['--theme-bg' as string]: themeBg,
            ['--theme-page-text' as string]: computedThemePageText,
            ['--theme-text' as string]: computedThemeCardText,
            ['--theme-text-muted' as string]: `${computedThemeCardText}b3`,
            ['--theme-primary' as string]: activeTheme.primary || 'hsl(var(--primary))',
            ['--theme-primary-foreground' as string]: primaryForeground,
            ['--theme-card' as string]: themeCard,
            ['--theme-accent' as string]: activeTheme.accent || 'hsl(var(--accent))',
            backgroundColor: 'var(--theme-card)',
            color: 'var(--theme-text)',
            borderColor: 'color-mix(in srgb, var(--theme-primary) 42%, transparent)',
        } as CSSProperties)
        : undefined;

    const prizeAccentTriplet = rainbowTripletForNavId('prize', settings.colorScheme);
    const complementAccentTriplet = complementTripletForNavId('prize', settings.colorScheme);

    const fallbackStyle: CSSProperties = {
        fontSize: '1.15em',
        ['--primary' as string]: prizeAccentTriplet,
        ['--chart-1' as string]: prizeAccentTriplet,
        ['--chart-2' as string]: complementAccentTriplet,
        ['--chart-3' as string]: prizeAccentTriplet,
        ['--chart-4' as string]: complementAccentTriplet,
        ['--chart-5' as string]: prizeAccentTriplet,
        ['--ring' as string]: complementAccentTriplet,
        ...appearanceVarsForSurface(settings, 'prize'),
    };

    const themeStyle: CSSProperties = activeTheme
        ? ({
            ['--theme-bg' as string]: themeBg,
            ['--theme-page-text' as string]: computedThemePageText,
            ['--theme-text' as string]: computedThemeCardText,
            ['--theme-text-muted' as string]: `${computedThemeCardText}b3`,
            ['--theme-primary' as string]: activeTheme.primary || 'hsl(var(--primary))',
            ['--theme-primary-foreground' as string]: primaryForeground,
            ['--theme-card' as string]: themeCard,
            ['--theme-accent' as string]: activeTheme.accent || 'hsl(var(--accent))',
            ...(activeTheme.backgroundStyle
                ? { background: activeTheme.backgroundStyle }
                : {
                    backgroundColor: themeBg,
                    backgroundImage: `radial-gradient(circle at top left, ${activeTheme.primary || 'hsl(var(--primary))'}22 0, transparent 45%), radial-gradient(circle at bottom right, ${activeTheme.accent || 'hsl(var(--accent))'}22 0, transparent 55%)`,
                }),
            color: 'var(--theme-page-text)',
            fontFamily: activeTheme.fontFamily || 'inherit',
            fontSize: fontScale !== 1 ? `${fontScale}em` : undefined,
        } as CSSProperties)
        : fallbackStyle;

    return (
        <TooltipProvider>
            <div
                className={cn(
                    embedded
                        ? 'relative flex min-h-0 flex-1 flex-col overflow-hidden font-sans'
                        : cn(
                              'min-h-screen relative overflow-x-hidden font-sans flex flex-col items-center',
                              'pt-1 md:pt-3 [@media(max-height:760px)]:pt-1 [@media(max-height:760px)]:md:pt-2',
                              settings.enableThemeAnimations && !!activeTheme && 'theme-theme-elements-animated theme-motion-override',
                              activeTheme && 'student-theme-surface',
                              settings.displayMode === 'app' && 'pb-24',
                              (!student || !activeTheme) &&
                                  (animBackdrop ? 'bg-transparent text-foreground' : 'bg-background text-foreground'),
                          ),
                )}
                style={embedded ? undefined : themeStyle}
            >
                {!embedded && activeTheme?.fontFamily ? <GoogleFontLoader fontFamily={activeTheme.fontFamily} /> : null}

                {!embedded && (!activeTheme || !animBackdrop) && (
                <div className="pointer-events-none fixed inset-0 opacity-[0.03] z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
                )}
                {!embedded && activeTheme?.emoji && (
                    <div className="pointer-events-none fixed inset-0 flex items-center justify-center z-0 opacity-5">
                        <span className="text-[220px] leading-none">
                            {activeTheme.emoji}
                        </span>
                    </div>
                )}

                {!embedded && !activeTheme ? <StudentKioskWarmBackdrop /> : null}

                <div
                    className={cn(
                        embedded
                            ? 'flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden'
                            : 'relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-4 pb-4 md:gap-6 md:px-8 md:pb-6',
                    )}
                >
                    {!embedded ? (
                        <StudentKioskTopBar
                            student={student}
                            points={student.points ?? 0}
                            themed={!!activeTheme}
                            primaryForeground={primaryForeground}
                            photoDisplayMode={settings.photoDisplayMode}
                        />
                    ) : null}

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        {embedded ? (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9 rounded-full px-3.5 text-[11px] font-bold uppercase tracking-widest"
                                style={activeTheme ? themedFieldStyle : undefined}
                                onClick={onBackToKiosk}
                            >
                                <ArrowLeft className="mr-1.5 h-4 w-4 shrink-0" aria-hidden />
                                Back to kiosk
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9 rounded-full px-3.5 text-[11px] font-bold uppercase tracking-widest"
                                style={activeTheme ? themedFieldStyle : undefined}
                                asChild
                            >
                                <Link href={schoolId ? `/${schoolId}/student` : '#'}>
                                    <ArrowLeft className="mr-1.5 h-4 w-4 shrink-0" aria-hidden />
                                    Back to kiosk
                                </Link>
                            </Button>
                        )}
                        <StudentKioskLogoutControls
                            themed={{ active: !!activeTheme }}
                            primaryForeground={primaryForeground}
                            isKioskLocked={isKioskLocked}
                            autoLogoutEnabled={kioskAutoLogoutOn}
                            logoutTimer={logoutTimer}
                            sessionTimeoutSec={settings.kioskSessionTimeoutSec ?? 10}
                            onLogout={onRequestExit}
                        />
                    </div>

                    <p
                        className="text-xs font-black uppercase tracking-[0.2em] opacity-70"
                        style={activeTheme ? { color: 'var(--theme-page-text)' } : undefined}
                    >
                        All eligible prizes
                    </p>

                    <PrinterReminderCallout
                        title="Voucher / slip printer"
                        message={settings.printerReminderPrizeVouchers}
                    />

                    <div className="flex min-w-0 flex-col gap-4">
                                {/* Filter & sort controls */}
                                {baseVisiblePrizes.length > 0 && (
                                    <div className="flex flex-col sm:flex-row gap-3 px-1">
                                        <div className="flex-1">
                                            <label htmlFor="prize-search" className="sr-only">Search prizes</label>
                                            <Input
                                                id="prize-search"
                                                type="search"
                                                placeholder="Search prizes..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className={cn("h-11 rounded-xl", !activeTheme && "bg-card/60")}
                                                style={themedFieldStyle}
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="prize-sort" className="sr-only">Sort prizes</label>
                                            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                                                <SelectTrigger
                                                    id="prize-sort"
                                                    className={cn("h-11 rounded-xl font-semibold", !activeTheme && "bg-card/60")}
                                                    style={themedFieldStyle}
                                                >
                                                    <SelectValue placeholder="Sort by..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="price-asc">Price: low to high</SelectItem>
                                                    <SelectItem value="price-desc">Price: high to low</SelectItem>
                                                    <SelectItem value="name">Name (A-Z)</SelectItem>
                                                    <SelectItem value="affordable">What you can afford first</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 h-fit">
                                    {visiblePrizes.length === 0 ? (
                                        <div
                                            className={cn(
                                                "col-span-full backdrop-blur-sm rounded-3xl border-2 border-dashed",
                                                !activeTheme && "bg-card/30 border-border",
                                            )}
                                            style={
                                                activeTheme
                                                    ? {
                                                        color: 'var(--theme-text)',
                                                        backgroundColor: 'var(--theme-bg)',
                                                        borderColor: 'color-mix(in srgb, var(--theme-primary) 38%, transparent)',
                                                    }
                                                    : undefined
                                            }
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
                                                    description="Your teacher hasn't made any prizes visible to your class yet. Keep earning points - they'll show up here as soon as they're listed!"
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
                                        visiblePrizes.map((prize: Prize) => (
                                            <StudentPrizeShopCard
                                                key={prize.id}
                                                prize={prize}
                                                studentPoints={student.points ?? 0}
                                                themed={!!activeTheme}
                                                primaryForeground={primaryForeground}
                                                onRedeem={() => setConfirmingPrize(prize)}
                                            />
                                        ))
                                    )}
                                </div>

                    {!embedded ? (
                    <Button
                        variant="outline"
                        className="h-12 w-full rounded-2xl border-2 text-xs font-black uppercase tracking-widest transition-all group sm:max-w-sm sm:mx-auto"
                        onClick={onRequestExit}
                        style={
                            activeTheme
                                ? {
                                      borderColor: 'var(--theme-text)',
                                      color: 'var(--theme-text)',
                                      backgroundColor: 'transparent',
                                  }
                                : {
                                      borderColor: 'hsl(var(--rose-200))',
                                      color: 'hsl(var(--rose-600))',
                                  }
                        }
                    >
                        <LogOut className="mr-2 h-5 w-5 transition-transform group-hover:-translate-x-1" aria-hidden />
                        Log out & finish
                    </Button>
                    ) : null}
                    </div>
                </div>

                <ConfirmRedemptionDialog
                    isOpen={!!confirmingPrize}
                    onOpenChange={(open: boolean) => {
                        if (!open && !isRedeeming) setConfirmingPrize(null);
                    }}
                    student={student}
                    prize={confirmingPrize}
                    isRedeeming={isRedeeming}
                    hasTheme={!!activeTheme}
                    themeSurfaceStyle={themeSurfaceStyle}
                    primaryForeground={primaryForeground}
                    onConfirm={(quantity: number, aiPick?: PrizeAiFunReward) => {
                        const p = confirmingPrize;
                        if (p) void handleRedeemReward(p, quantity, aiPick);
                    }}
                />
                <AlertDialog open={!!ticketData} onOpenChange={(open) => { if (!open) setTicketData(null); }}>
                    <AlertDialogContent
                        className={cn("no-print", activeTheme && 'student-theme-surface')}
                        style={themeSurfaceStyle}
                    >
                        <AlertDialogHeader>
                            <AlertDialogTitle>Print redeem voucher?</AlertDialogTitle>
                            <AlertDialogDescription style={activeTheme ? { color: 'var(--theme-text)', opacity: 0.85 } : undefined}>
                                Print a voucher for{' '}
                                <span className="text-xl font-black sm:text-2xl">{ticketData?.prizeName}</span>
                                {ticketData && ticketData.quantity > 1 ? ` (x${ticketData.quantity})` : ''}.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <PrinterReminderCallout
                            title="Printer reminder"
                            message={settings.printerReminderPrizeVouchers}
                            className="mt-1 mb-2"
                        />
                        <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:justify-end sm:space-x-0">
                            <AlertDialogCancel onClick={() => setTicketData(null)}>No Thanks</AlertDialogCancel>
                            <AlertDialogAction
                                className="w-full sm:w-auto"
                                onClick={handlePrintTicket}
                                style={activeTheme ? { backgroundColor: 'var(--theme-primary)', color: primaryForeground } : undefined}
                            >
                                Print Voucher
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <Dialog
                    open={aiSurpriseOpen}
                    onOpenChange={(open) => {
                        if (!open) {
                            closeAiSurprise();
                        } else {
                            setAiSurpriseOpen(true);
                        }
                    }}
                >
                    <DialogContent
                        className={cn("no-print sm:max-w-md", activeTheme && 'student-theme-surface')}
                        style={themeSurfaceStyle}
                    >
                        <DialogHeader>
                            <DialogTitle
                                className="flex items-center gap-2 text-left"
                                style={activeTheme ? { color: 'var(--theme-text)' } : undefined}
                            >
                                <Sparkles className="h-5 w-5 shrink-0 text-amber-500" aria-hidden />
                                {aiSurpriseLoading
                                    ? 'Your surprise'
                                    : (AI_SURPRISE_KIND_LABEL[aiSurpriseBody?.kind ?? ''] ?? 'Your surprise')}
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                                Short school-safe surprise text after redeeming this reward.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="min-h-[100px] py-1">
                            {aiSurpriseLoading ? (
                                <div
                                    className={cn("flex flex-col items-center justify-center gap-3 py-8", !activeTheme && "text-muted-foreground")}
                                    style={themedMutedStyle}
                                >
                                    <Loader2 className="h-10 w-10 animate-spin" aria-hidden />
                                    <p className="text-sm font-medium">Cooking up something fun…</p>
                                </div>
                            ) : aiSurpriseErr ? (
                                <p className="text-sm text-destructive">{aiSurpriseErr}</p>
                            ) : aiSurpriseBody ? (
                                <div className="space-y-4 text-base leading-relaxed" style={activeTheme ? { color: 'var(--theme-text)' } : undefined}>
                                    <p
                                        className={cn(
                                            'font-medium',
                                            aiSurpriseBody.kind === 'acrostic' && 'whitespace-pre-line',
                                        )}
                                    >
                                        {aiSurpriseBody.text}
                                    </p>
                                    {aiSurpriseBody.kind === 'riddle' && aiSurpriseBody.answer ? (
                                        <p
                                            className={cn("text-sm rounded-lg px-3 py-2 border", !activeTheme && "bg-muted/80 border-border")}
                                            style={activeTheme ? { backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-primary)' } : undefined}
                                        >
                                            <span className="font-semibold" style={themedMutedStyle}>Answer: </span>
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
                                onClick={closeAiSurprise}
                                disabled={aiSurpriseLoading}
                                style={activeTheme ? { backgroundColor: 'var(--theme-primary)', color: primaryForeground } : undefined}
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
