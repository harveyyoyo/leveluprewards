'use client';

import { useState, useEffect, useRef, useCallback, useMemo, RefObject } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useKioskAiFunAndVoucherIdleActive } from '@/hooks/useKioskAiFunAndVoucherIdle';
import { usePrizeAiFunAudienceCacheReset } from '@/hooks/usePrizeAiFunAudienceCacheReset';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { useSettings } from '@/components/providers/SettingsProvider';
import { PrinterReminderCallout } from '@/components/PrinterReminderCallout';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useFirebase, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc, where, getDocs, updateDoc, addDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { SchoolGate } from '@/components/SchoolGate';
import dynamic from 'next/dynamic';
import type { StudentFoundMeta } from '@/components/StudentScanner';
import { LevelUpKioskLogo } from '@/components/LevelUpKioskLogo';
import { KioskSponsorBanner } from '@/components/KioskSponsorBanner';

// ~32 KB (plus @vladmandic/face-api on the face tab). Load only when the
// kiosk actually needs to scan a student.
const StudentScanner = dynamic(
  () =>
    import('@/components/StudentScanner')
      .then((m) => m.StudentScanner)
      .catch((err) => {
        if (typeof window !== 'undefined' && (err.message?.includes('Loading chunk') || err.name === 'ChunkLoadError')) {
          window.location.reload();
        }
        throw err;
      }),
  { ssr: false },
);
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Student, Prize, HistoryItem, Class, LibraryItem, PrizeAiFunReward } from '@/lib/types';
import { performKioskAttendanceSignIn, describeAttendanceKioskOutcome } from '@/lib/attendance/kioskSignIn';
import DynamicIcon from '@/components/DynamicIcon';
import { Progress } from '@/components/ui/progress';
import { useReducedMotion } from 'framer-motion';
import { useStaggeredCardListEntrance } from '@/hooks/useStaggeredCardListEntrance';
import { cn, getStudentNickname, getContrastColor } from '@/lib/utils';
import { resolveStudentThemeWithSchoolDefault, primaryForegroundFor } from '@/lib/themeContrast';
import { globalAnimatedBackdropActive } from '@/lib/animatedBackdrop';
import { getReadableErrorMessage, OFFLINE_USER_MESSAGE } from '@/lib/errorMessage';
import {
  ArrowLeft,
  Nfc,
  Type,
  Camera,
  Star,
  Award,
  FlaskConical,
  Home,
  Wallet,
  User,
  ChevronRight,
  Settings,
  Lock,
  Unlock,
  Loader2,
  Clock,
  Gift,
  Ticket,
  CheckCircle2,
  LogOut,
  Sparkles,
  Printer,
  ScanBarcode,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GoogleFontLoader } from '@/components/GoogleFontLoader';
import { Balloons, BirthdayHat, Confetti } from '@/components/BirthdayFX';

import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Helper } from '@/components/ui/helper';
import { Skeleton } from '@/components/ui/skeleton';
import { StudentGoalsCard } from '@/components/goals/StudentGoalsCard';
import { EarnedBadgesShowcase } from '@/components/EarnedBadgesShowcase';
import { useStudentKioskSession } from '@/components/providers/StudentKioskSessionProvider';
import { FaceMismatchBanner } from '@/components/FaceMismatchBanner';
import { appearanceVarsForSurface } from '@/lib/appearance';
import { STUDENT_KIOSK_REQUEST_EXIT_EVENT } from '@/lib/student-kiosk';
import { studentSeesWelcomeBackOverlay, studentSeesWelcomePage } from '@/lib/studentWelcome';
import { prizeIsListed, studentSeesPrizeByTeachers } from '@/lib/prize-utils';
import { prizeAppearsInRewardsShop, resolveAiFunApiMode, withUnifiedAiFunPrize } from '@/lib/aiJokePrize';
import { floorRaffleFullTickets, parseRafflePointsPerTicket } from '@/lib/raffleTickets';
import {
  buildPrizeAiFunAvoidTexts,
  canonicalAiSurpriseText,
  isAiSurpriseTextRecentlySeen,
  rememberAiSurprise,
} from '@/lib/prizeAiFunClientStorage';
import { prizeAiFunAgeBandKey, studentAgeYearsFromBirthday } from '@/lib/studentAiFunAge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthFetch } from '@/lib/authFetch';
import { WelcomeOverlay } from '@/components/WelcomeOverlay';
import { StudentKioskTransitionFlash } from '@/components/StudentKioskTransitionFlash';

const STUDENT_TRANSITION_MIN_VISIBLE_MS = 650;
const STUDENT_TRANSITION_EXIT_MS = 320;

const AI_SURPRISE_KIND_LABEL: Record<string, string> = {
  joke: 'Your joke',
  riddle: 'Your riddle',
  fortune: 'Fortune teller',
};

type PrizeSurprise = { kind: 'joke' | 'riddle' | 'fortune'; text: string; answer?: string };

const FALLBACK_PRIZE_SURPRISES: Record<'joke' | 'riddle' | 'fortune', PrizeSurprise[]> = {
  joke: [
    { kind: 'joke', text: 'Why did the student bring a ladder to school? Because they wanted to go to high school!' },
    { kind: 'joke', text: 'Why was the math book so good at telling stories? It had a lot of problems to solve.' },
    { kind: 'joke', text: 'What did one pencil say to the other? You are looking sharp today!' },
    { kind: 'joke', text: 'Why did the crayon win an award? It drew the biggest crowd.' },
    { kind: 'joke', text: 'Why did the notebook go to the doctor? It had too many notes.' },
    { kind: 'joke', text: 'Why did the clock do well in class? It was always on time.' },
    { kind: 'joke', text: "What is a teacher's favorite kind of music? Class-ical." },
    { kind: 'joke', text: 'Why did the student bring a spoon to class? They heard learning was sweet.' },
  ],
  riddle: [
    { kind: 'riddle', text: 'I get bigger the more you take away. What am I?', answer: 'A hole' },
    { kind: 'riddle', text: 'What has pages, tells stories, and never speaks out loud?', answer: 'A book' },
    { kind: 'riddle', text: 'What can you catch but never throw?', answer: 'A cold' },
    { kind: 'riddle', text: 'What has hands but cannot clap?', answer: 'A clock' },
    { kind: 'riddle', text: 'What has many teeth but cannot bite?', answer: 'A comb' },
  ],
  fortune: [
    { kind: 'fortune', text: 'A bright surprise is waiting in your next reward moment.' },
    { kind: 'fortune', text: 'Your next brave try may turn into your best win yet.' },
    { kind: 'fortune', text: 'A kind choice today will come back as a smile.' },
    { kind: 'fortune', text: 'Small steps are quietly building something awesome.' },
    { kind: 'fortune', text: 'Good effort has a way of opening new doors.' },
  ],
};

function fallbackPrizeSurprise(
  mode: Prize['aiFunReward'],
  prizeName: string,
  previousText?: string,
): PrizeSurprise {
  const roll =
    mode === 'random'
      ? (['joke', 'riddle', 'fortune'] as const)[Math.floor(Math.random() * 3)]
      : mode === 'picker'
        ? 'joke'
        : mode === 'riddle' || mode === 'fortune'
          ? mode
          : 'joke';
  const kind = roll;
  const options = FALLBACK_PRIZE_SURPRISES[kind];
  const prevCanon = previousText ? canonicalAiSurpriseText(previousText) : '';
  const freshOptions = prevCanon
    ? options.filter((item) => canonicalAiSurpriseText(item.text) !== prevCanon)
    : options;
  const selected = (freshOptions.length ? freshOptions : options)[Math.floor(Math.random() * (freshOptions.length || options.length))];
  if (kind === 'fortune' && prizeName) {
    return {
      ...selected,
      text: selected.text.replace('reward moment', `${prizeName} moment`),
    };
  }
  return selected;
}

function StudentActivityList({
  schoolId,
  studentId,
  themed = false,
  onReprintTicket,
  maxItems,
}: {
  schoolId: string;
  studentId: string;
  themed?: boolean;
  onReprintTicket?: (item: HistoryItem) => void;
  maxItems?: number;
}) {
  const firestore = useFirestore();
  const activitiesQuery = useMemoFirebase(() => (
    query(
      collection(firestore, `schools/${schoolId}/students/${studentId}/activities`),
      orderBy('date', 'desc'),
      limit(20)
    )
  ), [firestore, schoolId, studentId]);
  const { data: history, isLoading } = useCollection<HistoryItem>(activitiesQuery);
  // When hosted inside a custom-themed card, fall back to `currentColor`
  // / inherited theme text rather than the slate Tailwind ladder, so
  // text always contrasts against the student's chosen card color.
  const themedTextStyle: React.CSSProperties | undefined = themed ? { color: 'var(--theme-text)' } : undefined;
  const themedMutedStyle: React.CSSProperties | undefined = themed ? { color: 'var(--theme-text)', opacity: 0.7 } : undefined;

  if (isLoading) {
    return (
      <div className="space-y-2 p-3" role="status" aria-live="polite" aria-label="Loading activity">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex justify-between items-center py-2 border-b border-border/50">
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-2.5 w-14" />
            </div>
            <Skeleton className="h-5 w-10 rounded-full" />
          </div>
        ))}
        <span className="sr-only">Loading activity…</span>
      </div>
    );
  }

  const visibleHistory = typeof maxItems === 'number' ? (history || []).slice(0, Math.max(0, maxItems)) : (history || []);

  return (
    <div className="w-full overflow-hidden">
      <ul className="space-y-2">
        {history && history.length > 0 ? (
          visibleHistory.map((item, index) => {
            const isRedemption = item.desc.startsWith('Redeemed:');
            const isPointGain = item.amount > 0;

            return (
                            <li
                                key={index}
                                className={cn(
                                  "group p-2 rounded-xl transition-all duration-300",
                                  !themed && "border border-slate-50 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800/80",
                                )}
                                style={themed ? { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(127,127,127,0.25)', borderWidth: 1, borderStyle: 'solid' } : undefined}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex gap-2">
                                        <div className={cn(
                                            "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                                            isRedemption ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" :
                                                (item.desc.toLowerCase().includes('attendance') || item.desc.toLowerCase().includes('sign-in')) ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" :
                                                    "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                        )}>
                                            {isRedemption ? <Gift className="w-3.5 h-3.5" /> :
                                                (item.desc.toLowerCase().includes('attendance') || item.desc.toLowerCase().includes('sign-in')) ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                                                    <Ticket className="w-3.5 h-3.5" />}
                                        </div>
                                        <div>
                                            <p
                                                className={cn("text-[13px] font-bold leading-tight", !themed && "text-slate-800 dark:text-slate-200")}
                                                style={themedTextStyle}
                                            >
                                                {item.desc}
                                            </p>
                                            <div
                                                className={cn("flex items-center gap-1 mt-0.5", !themed && "text-muted-foreground")}
                                                style={themedMutedStyle}
                                            >
                                                <Clock className="w-2.5 h-2.5" aria-hidden="true" />
                                                <span className="text-[10px] font-semibold tracking-wide">
                                                    {item.date ? format(new Date(item.date), 'MMM d, h:mm a') : 'Recently'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <Badge
                                        variant={isPointGain ? 'default' : 'secondary'}
                                        className={cn(
                                            "font-black text-[9px] px-1.5 py-0 rounded-full tracking-tighter shrink-0",
                                            !themed && (isPointGain ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'),
                                        )}
                                        style={themed ? {
                                            backgroundColor: isPointGain ? 'rgba(16,185,129,0.18)' : 'rgba(244,63,94,0.18)',
                                            color: 'var(--theme-text)',
                                            borderColor: 'transparent',
                                        } : undefined}
                                    >
                                        {isPointGain ? `+${item.amount}` : item.amount} PTS
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                    <div />
                                    {isRedemption && (
                                        <div className="flex items-center gap-2 shrink-0">
                                            <div
                                                className={cn(
                                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide",
                                                    !themed && (item.fulfilled
                                                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                                                        : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30"),
                                                )}
                                                style={themed ? {
                                                    backgroundColor: item.fulfilled ? 'rgba(16,185,129,0.18)' : 'rgba(245,158,11,0.18)',
                                                    color: 'var(--theme-text)',
                                                    borderColor: 'transparent',
                                                } : undefined}
                                            >
                                                {item.fulfilled ? (
                                                    <>
                                                        <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> Delivered
                                                    </>
                                                ) : (
                                                    <>
                                                        <Clock className="w-3 h-3" aria-hidden="true" /> Pending
                                                    </>
                                                )}
                                            </div>
                                            {onReprintTicket && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onReprintTicket(item);
                                                    }}
                                                    className={cn(
                                                        "h-6 px-2 text-[10px] rounded-full border flex items-center gap-1 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 shrink-0",
                                                        !themed && "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300",
                                                    )}
                                                    style={themed ? {
                                                        backgroundColor: 'rgba(255,255,255,0.1)',
                                                        borderColor: 'rgba(127,127,127,0.3)',
                                                        color: 'var(--theme-text)',
                                                    } : undefined}
                                                >
                                                    <Printer className="w-3 h-3" aria-hidden="true" /> Reprint
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </li>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
              <Clock className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">No activity found</p>
          </div>
        )}
      </ul>
    </div>
  );
}

function StudentDashboardInner({

  studentId,
  onDone,
  onRequestExit,
  onReady,
}: {
  studentId: string;
  onDone: () => void;
  onRequestExit: () => void;
  onReady?: (studentId: string) => void;
}) {
  const router = useRouter();
  const { redeemCoupon, redeemPrize, printPrizeTickets, schoolId, isKioskLocked, badges, syncStatus } = useAppContext();
  const firestore = useFirestore();
  const { functions, auth } = useFirebase();
  const { toast } = useToast();
  const { settings, isFeatureAllowed } = useSettings();
  const { kioskAiFunAndVoucherActive, markKioskRewardsActivity } = useKioskAiFunAndVoucherIdleActive(
    settings.kioskAiFunAndVoucherIdleOffMin,
    isKioskLocked,
  );
  const kioskAiFunInShop = settings.enablePrizeAiSurprise === true && kioskAiFunAndVoucherActive;
  const showManualCoupon = settings.kioskCouponRedemptionManualEnabled !== false;
  const showCameraCoupon = settings.kioskCouponRedemptionCameraEnabled !== false;
  const couponSectionEnabled = showManualCoupon || showCameraCoupon;
  const showCouponMethodTabs = showManualCoupon && showCameraCoupon;
  const couponHelperText =
    showManualCoupon && !showCameraCoupon
      ? 'Type or USB-scan a coupon code to add points. Use the Logout button on this card to exit.'
      : showCameraCoupon && !showManualCoupon
        ? 'Scan the coupon QR or barcode with the webcam. Use the Logout button on this card to exit.'
        : 'Scan or type a coupon code to add points. Use the camera tab to scan a QR code. Use the Logout button on this card to exit.';
  const prefersReducedMotion = useReducedMotion();
  const authFetch = useAuthFetch();
  const isGraphic = settings.graphicMode === 'graphics';
  const animBackdrop = globalAnimatedBackdropActive(settings);
  const signInRecordedRef = useRef(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const hasShownWelcomeRef = useRef<string | null>(null);
  const dismissWelcome = useCallback(() => setShowWelcome(false), []);

  // Student kiosk should stay open indefinitely:
  // - Do not auto-logout on a countdown.
  // - Keep the screen awake (where supported).
  // - Refresh auth token periodically so the kiosk session doesn't expire due to inactivity.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof document === 'undefined') return;

    let cancelled = false;
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      try {
        if (cancelled) return;
        const navAny = navigator as any;
        if (!navAny?.wakeLock?.request) return;
        wakeLock = await navAny.wakeLock.request('screen');
        wakeLock?.addEventListener?.('release', () => {});
      } catch {
        // Wake Lock is best-effort: ignore errors (unsupported, permission, etc.).
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void requestWakeLock();
      }
    };

    void requestWakeLock();
    document.addEventListener('visibilitychange', onVisibility);

    const refreshId = window.setInterval(() => {
      const user = auth?.currentUser;
      if (!user) return;
      void user.getIdToken(true).catch(() => {});
    }, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(refreshId);
      try {
        void wakeLock?.release?.();
      } catch {
        // ignore
      }
    };
  }, [auth]);

  useEffect(() => {
    // Only show welcome if it's a new student ID session
    if (hasShownWelcomeRef.current !== studentId) {
      setShowWelcome(true);
      hasShownWelcomeRef.current = studentId;
    }
  }, [studentId]);

  useEffect(() => {
    signInRecordedRef.current = false;
  }, [studentId]);

  const studentDocRef = useMemoFirebase(() => schoolId ? doc(firestore, 'schools', schoolId, 'students', studentId) : null, [firestore, schoolId, studentId]);
  const { data: student, isLoading: studentLoading } = useDoc<Student>(studentDocRef);

  usePrizeAiFunAudienceCacheReset(schoolId, studentId, student);

  useEffect(() => {
    if (!studentLoading && student && schoolId) {
      onReady?.(studentId);
    }
  }, [onReady, schoolId, student, studentId, studentLoading]);

  const todayInSchoolTz = useMemo(() => {
    const d = new Date();
    const full = format(d, 'yyyy-MM-dd');
    const md = format(d, 'MM-dd');
    return { full, md };
  }, []);

  const birthdayToday = !!student?.birthday && student.birthday.substring(5) === todayInSchoolTz.md;

  const prizesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'prizes') : null, [firestore, schoolId]);
  const { data: prizes, isLoading: prizesLoading } = useCollection<Prize>(prizesQuery);
  const rewardPrizes = useMemo(
    () => withUnifiedAiFunPrize(prizes, {
      enablePrizeAiSurprise: kioskAiFunInShop,
      defaultPoints: settings.prizeAiSurpriseDefaultPoints,
    }),
    [prizes, kioskAiFunInShop, settings.prizeAiSurpriseDefaultPoints],
  );

  const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'classes') : null, [firestore, schoolId]);
  const { data: classes } = useCollection<Class>(classesQuery);

  const rewardGridRef = useRef<HTMLDivElement>(null);

  useStaggeredCardListEntrance(rewardGridRef, {
    dependencies: [rewardPrizes, prizesLoading],
    skip: prizesLoading,
    reducedMotion: !!prefersReducedMotion,
  });

  const [couponCode, setCouponCode] = useState('');
  const [flyPointsValue, setFlyPointsValue] = useState<number | null>(null);
  const [celebrationMessage, setCelebrationMessage] = useState<string | null>(null);
  const celebrationQueueRef = useRef<string[]>([]);
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationKey = useRef(0);
  const playSound = useArcadeSound();

  const queueCelebration = useCallback((msg: string) => {
    celebrationQueueRef.current.push(msg);
    if (celebrationTimerRef.current || celebrationMessage) return;
    const showNext = () => {
      const next = celebrationQueueRef.current.shift();
      if (!next) {
        setCelebrationMessage(null);
        celebrationTimerRef.current = null;
        return;
      }
      setCelebrationMessage(next);
      celebrationTimerRef.current = setTimeout(() => {
        setCelebrationMessage(null);
        celebrationTimerRef.current = setTimeout(showNext, 200);
      }, 2200);
    };
    showNext();
  }, [celebrationMessage]);

  useEffect(() => {
    return () => {
      if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
    };
  }, []);

  const [showRedeem, setShowRedeem] = useState(true);
  const [confirmingPrize, setConfirmingPrize] = useState<Prize | null>(null);
  const [confirmingFunKind, setConfirmingFunKind] = useState<PrizeAiFunReward>('joke');
  const [isRedeemingPrize, setIsRedeemingPrize] = useState(false);
  const [prizeTicketData, setPrizeTicketData] = useState<{
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
    aiSurpriseKind?: 'joke' | 'riddle' | 'fortune';
    aiSurpriseText?: string;
    aiSurpriseAnswer?: string;
  } | null>(null);
  const pendingPrizeTicketAfterAiRef = useRef<typeof prizeTicketData>(null);
  const lastAiSurpriseTextRef = useRef<string | undefined>(undefined);
  const lastAiSurpriseCallRef = useRef(0);
  const aiSurpriseRequestIdRef = useRef(0);
  const [aiSurpriseOpen, setAiSurpriseOpen] = useState(false);
  const [aiSurpriseLoading, setAiSurpriseLoading] = useState(false);
  const [aiSurpriseBody, setAiSurpriseBody] = useState<PrizeSurprise | null>(null);
  const aiSurpriseBodyRef = useRef<PrizeSurprise | null>(null);
  useEffect(() => {
    aiSurpriseBodyRef.current = aiSurpriseBody;
  }, [aiSurpriseBody]);

  const flushPendingPrizeTicketAfterAi = useCallback(() => {
    const pending = pendingPrizeTicketAfterAiRef.current;
    pendingPrizeTicketAfterAiRef.current = null;
    if (!pending) return;
    const s = aiSurpriseBodyRef.current;
    const text = s?.text?.trim() ?? '';
    if (!text) {
      setPrizeTicketData(pending);
      return;
    }
    const kind = s!.kind === 'riddle' || s!.kind === 'fortune' ? s!.kind : 'joke';
    setPrizeTicketData({
      ...pending,
      aiSurpriseKind: kind,
      aiSurpriseText: text,
      aiSurpriseAnswer:
        kind === 'riddle' && s!.answer?.trim() ? s!.answer.trim() : undefined,
    });
  }, []);

  const closeAiSurprise = useCallback(() => {
    setAiSurpriseOpen(false);
    flushPendingPrizeTicketAfterAi();
  }, [flushPendingPrizeTicketAfterAi]);

  useEffect(() => {
    if (!aiSurpriseOpen || aiSurpriseLoading || !aiSurpriseBody) return;
    const timerId = window.setTimeout(closeAiSurprise, 5000);
    return () => window.clearTimeout(timerId);
  }, [aiSurpriseBody, aiSurpriseLoading, aiSurpriseOpen, closeAiSurprise]);

  const handleManualLogout = useCallback(() => {
    playSound('swoosh');
    onDone();
    toast({ title: 'Logged Out', description: 'Returning to kiosk home.' });
  }, [onDone, playSound, toast]);

  const [logoutTimer, setLogoutTimer] = useState(settings.kioskSessionTimeoutSec ?? 10);

  const resetLogoutTimer = useCallback(() => {
    if (isKioskLocked) return;
    markKioskRewardsActivity();
    setLogoutTimer(settings.kioskSessionTimeoutSec ?? 10);
  }, [isKioskLocked, settings.kioskSessionTimeoutSec, markKioskRewardsActivity]);

  useEffect(() => {
    if (isKioskLocked) return;
    if (logoutTimer <= 0) {
      onDone();
      toast({ title: 'Session ended', description: 'Returning to kiosk home.' });
      return;
    }
    const timerId = window.setTimeout(() => setLogoutTimer((t) => t - 1), 1000);
    return () => window.clearTimeout(timerId);
  }, [isKioskLocked, logoutTimer, onDone, toast]);

  useEffect(() => {
    if (isKioskLocked) return;
    const onActivity = () => resetLogoutTimer();
    const events: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'pointerdown', 'wheel', 'scroll'];
    for (const ev of events) {
      window.addEventListener(ev, onActivity, { passive: true });
    }
    return () => {
      for (const ev of events) {
        window.removeEventListener(ev, onActivity);
      }
    };
  }, [isKioskLocked, resetLogoutTimer]);

  const [activeTab, setActiveTab] = useState<'manual' | 'camera'>(() => (showManualCoupon ? 'manual' : 'camera'));
  const [hasCameraPermission, setHasCameraPermission] = useState(true);

  useEffect(() => {
    if (!showManualCoupon && showCameraCoupon) setActiveTab('camera');
    else if (showManualCoupon && !showCameraCoupon) setActiveTab('manual');
    else if (showManualCoupon && showCameraCoupon) {
      // keep existing choice
    } else {
      // both disabled: no coupon section, default harmless
      setActiveTab('manual');
    }
  }, [showManualCoupon, showCameraCoupon]);

  const couponCameraScannerOn =
    showRedeem &&
    showCameraCoupon &&
    (!showCouponMethodTabs || activeTab === 'camera');

  const { videoRef, hasCameraPermission: hookHasPermission } = useBarcodeScanner(
    couponCameraScannerOn,
    (code) => handleRedeemCoupon(code),
    (err) => {
      setHasCameraPermission(false);
      if (showCouponMethodTabs && activeTab === 'camera') setActiveTab('manual');
      toast({ variant: 'destructive', title: 'Camera Error', description: err });
    }
  );

  useEffect(() => {
    setHasCameraPermission(hookHasPermission);
  }, [hookHasPermission]);

  useEffect(() => {
    if (
      !(settings.payAttendance ?? true) ||
      !settings.enableClassSignIn ||
      !student ||
      !schoolId ||
      !functions ||
      signInRecordedRef.current
    )
      return;
    signInRecordedRef.current = true;

    void (async () => {
      try {
        const result = await performKioskAttendanceSignIn({
          functions,
          schoolId,
          student,
        });
        if (result.pointsAwarded > 0) {
          playSound('success');
          const periodSuffix = result.periodLabel ? ` · ${result.periodLabel}` : '';
          toast({
            title: `Attendance recorded${periodSuffix}`,
            description: `+${result.pointsAwarded} pts${result.onTime ? ' (on time!)' : ''}.`,
          });
          animationKey.current += 1;
          setFlyPointsValue(result.pointsAwarded);
          setTimeout(() => { setFlyPointsValue(null); }, 1500);
          return;
        }
        if (result.reason === 'duplicate_same_session') {
          return;
        }
        if (
          result.reason === 'recorded' ||
          result.reason === 'class_not_in_enabled_list' ||
          result.reason === 'no_attendance_configuration' ||
          result.reason === 'no_periods_for_school_legacy' ||
          result.reason === 'student_not_found' ||
          result.reason === 'callable_failed'
        ) {
          // `recorded` with 0 points is a soft-success, not an error: show a
          // neutral "Attendance recorded" title rather than a warning-looking
          // "Attendance" one, and only mark destructive for real failures.
          const isRecordedZero = result.reason === 'recorded';
          toast({
            variant: result.reason === 'student_not_found' ? 'destructive' : 'default',
            title: isRecordedZero ? 'Attendance recorded' : 'Attendance',
            description: describeAttendanceKioskOutcome(result),
          });
        }
      } catch (err) {
        console.error('Attendance sign-in failed', err);
        toast({
          variant: 'destructive',
          title: 'Attendance not recorded',
          description: getReadableErrorMessage(err, 'Could not record attendance.'),
        });
      }
    })();
  }, [settings.payAttendance, settings.enableClassSignIn, student, schoolId, functions, toast, playSound]);
 
  // --- Special Occasions (Birthday & School Special Day) ---
  useEffect(() => {
    if (!student || !schoolId || !functions) return;
    
    const todayFull = todayInSchoolTz.full;
    const todayMD = todayInSchoolTz.md;
    const lastAwarded = student.lastSpecialDayAwarded || {};
    
    let totalAward = 0;
    const descriptions: string[] = [];
    const newLastAwarded = { ...lastAwarded };

    // 1. Birthday Check
    if (settings.enableBirthdayPoints && student.birthday) {
        // student.birthday is YYYY-MM-DD, we only care about MM-DD matching today
        const birthMD = student.birthday.substring(5); // MM-DD
        if (birthMD === todayMD && lastAwarded.birthday !== todayFull) {
            totalAward += settings.birthdayPointsAmount || 0;
            descriptions.push(`Happy Birthday! 🎂 (+${settings.birthdayPointsAmount} pts)`);
            newLastAwarded.birthday = todayFull;
        }
    }

    // 2. Special Day Check
    if (settings.enableSpecialDayPoints && settings.specialDayDate) {
        if (settings.specialDayDate === todayMD && lastAwarded.specialDay !== todayFull) {
            totalAward += settings.specialDayPointsAmount || 0;
            const label = settings.specialDayLabel || 'Special Day';
            descriptions.push(`${label}! ⭐ (+${settings.specialDayPointsAmount} pts)`);
            newLastAwarded.specialDay = todayFull;
        }
    }

    if (totalAward > 0) {
        void (async () => {
            try {
                const awardSpecialDayPoints = httpsCallable(functions, 'awardSpecialDayPoints');
                const res = await awardSpecialDayPoints({ schoolId, studentId: student.id });
                const data = (res.data || {}) as {
                  totalAward?: number;
                  awards?: Array<{ desc?: string; amount?: number }>;
                };
                const awarded = Number(data.totalAward || 0);
                if (awarded <= 0) return;
                for (const award of data.awards || []) {
                    if (award.desc) queueCelebration(award.desc);
                }
                playSound('success');
                animationKey.current += 1;
                setFlyPointsValue(awarded);
                setTimeout(() => { setFlyPointsValue(null); }, 2000);
            } catch (err) {
                console.error('Failed to award special day points', err);
            }
        })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    student?.id,
    todayInSchoolTz.full,
    todayInSchoolTz.md,
    settings.enableBirthdayPoints,
    settings.enableSpecialDayPoints,
    schoolId,
    functions,
    playSound,
    queueCelebration,
  ]);

  const [activityMaxItems, setActivityMaxItems] = useState(7);
  const [activityPanelHeight, setActivityPanelHeight] = useState<number | null>(null);
  const activityPanelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const rowPx = 66; // approximates one activity row including spacing
    const headerAndPadding = 64; // Activity card header + padding inside content area

    const computeFromPanel = () => {
      const el = activityPanelRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const isDesktopLayout = window.matchMedia('(min-width: 1024px)').matches;
      const heightToBottom = Math.floor(window.innerHeight - rect.top - 16);
      const panelHeight = isDesktopLayout ? Math.max(240, heightToBottom) : null;
      setActivityPanelHeight(panelHeight);
      const h = panelHeight || rect.height || 0;
      const available = Math.max(0, h - headerAndPadding);
      const rows = Math.floor(available / rowPx);
      setActivityMaxItems(Math.max(3, Math.min(20, rows || 3)));
    };

    computeFromPanel();
    window.addEventListener('resize', computeFromPanel, { passive: true });

    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(() => computeFromPanel());
      if (activityPanelRef.current) ro.observe(activityPanelRef.current);
    } catch {
      // ignore
    }

    return () => {
      window.removeEventListener('resize', computeFromPanel);
      try {
        ro?.disconnect();
      } catch {
        // ignore
      }
    };
  }, []);

  const handleRedeemCoupon = useCallback(async (codeToRedeem?: string) => {
    if (!student) return;
    const code = (codeToRedeem || couponCode).toUpperCase();
    if (!code) return;
    resetLogoutTimer();

    // 1. Check Library Item first (if enabled)
    if (settings.payLibrary !== false && firestore && schoolId) {
      try {
        const libraryQuery = query(collection(firestore, 'schools', schoolId, 'library'), where('upc', '==', code), limit(1));
        const librarySnap = await getDocs(libraryQuery);
        if (!librarySnap.empty) {
          const itemDoc = librarySnap.docs[0];
          const item = itemDoc.data() as LibraryItem;
          
          if (item.status === 'available') {
            await updateDoc(doc(firestore, 'schools', schoolId, 'library', itemDoc.id), {
              status: 'checked_out',
              checkedOutTo: student.id,
              checkedOutAt: Date.now()
            });
            await addDoc(collection(firestore, 'schools', schoolId, 'students', student.id, 'activities'), {
              desc: `Checked out library item: ${item.name}`,
              amount: 0,
              date: Date.now()
            });
            playSound('success');
            toast({ title: 'Checked Out', description: `You have successfully checked out: ${item.name}` });
          } else if (item.status === 'checked_out') {
            if (item.checkedOutTo === student.id) {
              await updateDoc(doc(firestore, 'schools', schoolId, 'library', itemDoc.id), {
                status: 'available',
                checkedOutTo: null,
                checkedOutAt: null
              });
              await addDoc(collection(firestore, 'schools', schoolId, 'students', student.id, 'activities'), {
                desc: `Returned library item: ${item.name}`,
                amount: 0,
                date: Date.now()
              });
              playSound('success');
              toast({ title: 'Returned', description: `You have successfully returned: ${item.name}` });
            } else {
              playSound('error');
              toast({ variant: 'destructive', title: 'Action Denied', description: 'This item is checked out to someone else.' });
            }
          }
          if (activeTab === 'manual') setCouponCode('');
          return;
        }
      } catch (e) {
        console.error('Library scan error:', e);
      }
    }

    // 2. Fall back to coupon redemption
    try {
      const result = await redeemCoupon(student.id, code);

      if (result.success) {
        playSound('redeem');
        toast({ title: 'Coupon Redeemed!', description: `You gained ${result.value} points.` });
        animationKey.current += 1;
        setFlyPointsValue(result.value || null);
        setTimeout(() => { setFlyPointsValue(null); setShowRedeem(false); }, 1500);
        if (settings.enableGoals && isFeatureAllowed('enableGoals') && schoolId && firestore) {
          void import('@/lib/goalsProgress').then((m) =>
            m.syncGoalsForStudent(firestore, schoolId, student.id).catch(() => {}),
          );
        }
      } else {
        playSound('error');
        toast({ variant: 'destructive', title: 'Redemption Failed', description: result.message });
      }
    } catch (e: unknown) {
      console.error('Coupon redeem:', e);
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Redemption Failed',
        description: getReadableErrorMessage(e, 'Could not redeem this coupon. Check your connection and try again.'),
      });
    } finally {
      if (activeTab === 'manual') setCouponCode('');
    }
  }, [couponCode, resetLogoutTimer, redeemCoupon, student, toast, playSound, activeTab, settings.payLibrary, settings.enableGoals, firestore, schoolId, isFeatureAllowed]);

  const handleRedeemPrize = useCallback(async () => {
    if (!student || !confirmingPrize) return;
    resetLogoutTimer();
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Offline',
        description: OFFLINE_USER_MESSAGE,
      });
      return;
    }

    setIsRedeemingPrize(true);
    try {
      const prize = confirmingPrize;
      const result = await redeemPrize(student.id, prize, 1);
      if (!result.success) {
        throw new Error(result.message || 'Could not redeem this prize.');
      }
      playSound('redeem');
      toast({
        title: 'Prize Redeemed!',
        description: `Successfully redeemed ${prize.name}.`,
      });

      if (settings.enableGoals && isFeatureAllowed('enableGoals') && schoolId && firestore) {
        void import('@/lib/goalsProgress').then((m) =>
          m.syncGoalsForStudent(firestore, schoolId, student.id).catch(() => {}),
        );
      }

      const { activityId, redeemedAt, totalCost } = result;
      let ticketPayload: typeof prizeTicketData = null;
      if (
        prize.offerPrintTicketOnRedeem === true &&
        kioskAiFunAndVoucherActive &&
        activityId &&
        redeemedAt &&
        typeof totalCost === 'number'
      ) {
        const displayFirst = getStudentNickname(student);
        const legalFirst = (student.firstName || '').trim();
        const nick = student.nickname?.trim();
        const themeForTicket = resolveStudentThemeWithSchoolDefault(
          student.theme,
          settings.defaultStudentTheme,
          settings.enableStudentThemes,
        );
        const emojiRaw = settings.enableStudentEmojiOnPrizeTickets === true ? themeForTicket?.emoji : undefined;
        const studentEmoji = typeof emojiRaw === 'string' && emojiRaw.trim() ? emojiRaw.trim() : undefined;
        ticketPayload = {
          activityId,
          ticketNo: String(redeemedAt).replace(/\D/g, '').slice(-6) || String(redeemedAt).slice(-6),
          redeemedAt,
          studentId: student.id,
          studentName: `${displayFirst} ${student.lastName}`.trim(),
          studentNickname: nick && legalFirst && displayFirst.trim() !== legalFirst ? legalFirst : undefined,
          studentEmoji,
          prizeName: prize.name,
          prizeIcon: prize.icon || 'Gift',
          quantity: 1,
          totalCost,
        };
      }

      if (prize.aiFunReward && schoolId && settings.enablePrizeAiSurprise === true && kioskAiFunAndVoucherActive) {
        const aiCooldownOk = Date.now() - lastAiSurpriseCallRef.current > 10_000;
        if (!aiCooldownOk) {
          if (ticketPayload && kioskAiFunAndVoucherActive) setPrizeTicketData(ticketPayload);
        } else {
          lastAiSurpriseCallRef.current = Date.now();
          pendingPrizeTicketAfterAiRef.current = ticketPayload;
          const apiMode = resolveAiFunApiMode(prize, prize.aiFunReward === 'picker' ? confirmingFunKind : undefined);
          const requestId = aiSurpriseRequestIdRef.current + 1;
          aiSurpriseRequestIdRef.current = requestId;
          const instantSurprise = fallbackPrizeSurprise(apiMode, prize.name, lastAiSurpriseTextRef.current);
          const sessionExtraAvoid = lastAiSurpriseTextRef.current?.trim()
            ? [lastAiSurpriseTextRef.current.trim()]
            : [];
          const ageYears = studentAgeYearsFromBirthday(student?.birthday);
          const ageBand = prizeAiFunAgeBandKey(ageYears);
          const avoidTexts = buildPrizeAiFunAvoidTexts(
            schoolId,
            apiMode,
            [...sessionExtraAvoid, instantSurprise.text],
            18,
            ageBand,
          );
          lastAiSurpriseTextRef.current = instantSurprise.text;
          setAiSurpriseBody(instantSurprise);
          rememberAiSurprise(schoolId, instantSurprise, ageBand);
          setAiSurpriseLoading(false);
          setAiSurpriseOpen(true);
          void (async () => {
            const controller = new AbortController();
            const timeoutId = window.setTimeout(() => controller.abort(), 1200);
            try {
              const res = await authFetch('/api/prize-ai-fun', {
                method: 'POST',
                signal: controller.signal,
                body: JSON.stringify({
                  schoolId,
                  mode: apiMode,
                  avoidTexts,
                  ...(ageYears != null ? { ageYears } : {}),
                }),
              });
              const j = (await res.json()) as { error?: string; kind?: string; text?: string; answer?: string };
              if (!res.ok) throw new Error(j.error || 'Could not load surprise.');
              const kind: PrizeSurprise['kind'] =
                j.kind === 'riddle' || j.kind === 'fortune' ? j.kind : 'joke';
              const text = typeof j.text === 'string' ? j.text.trim() : '';
              if (!text || aiSurpriseRequestIdRef.current !== requestId) return;
              const canonInstant = canonicalAiSurpriseText(instantSurprise.text);
              if (canonicalAiSurpriseText(text) === canonInstant) return;
              if (isAiSurpriseTextRecentlySeen(schoolId, kind, text, ageBand)) return;
              lastAiSurpriseTextRef.current = text;
              const nextBody: PrizeSurprise = {
                kind,
                text,
                answer: kind === 'riddle' && typeof j.answer === 'string' ? j.answer : undefined,
              };
              setAiSurpriseBody(nextBody);
              rememberAiSurprise(schoolId, nextBody, ageBand);
            } catch (e: unknown) {
              if ((e as { name?: string })?.name !== 'AbortError') {
                console.warn('Prize AI surprise unavailable:', e);
              }
            } finally {
              window.clearTimeout(timeoutId);
            }
          })();
        }
      } else if (ticketPayload && kioskAiFunAndVoucherActive) {
        setPrizeTicketData(ticketPayload);
      }
      setConfirmingPrize(null);
    } catch (e: unknown) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Redemption Failed',
        description: getReadableErrorMessage(e, 'Could not redeem this prize.'),
      });
    } finally {
      setIsRedeemingPrize(false);
    }
  }, [authFetch, confirmingFunKind, confirmingPrize, playSound, redeemPrize, resetLogoutTimer, schoolId, settings.defaultStudentTheme, settings.enableStudentThemes, settings.enablePrizeAiSurprise, settings.enableStudentEmojiOnPrizeTickets, settings.enableGoals, student, toast, firestore, isFeatureAllowed, kioskAiFunAndVoucherActive]);

  const handlePrintPrizeTicket = useCallback(() => {
    if (!prizeTicketData) return;
    setPrizeTicketData(null);
    const surpriseText = prizeTicketData.aiSurpriseText?.trim();
    const surpriseExtras = surpriseText
      ? {
          aiSurpriseKind: prizeTicketData.aiSurpriseKind ?? 'joke',
          aiSurpriseText: surpriseText,
          aiSurpriseAnswer:
            (prizeTicketData.aiSurpriseKind ?? 'joke') === 'riddle' && prizeTicketData.aiSurpriseAnswer?.trim()
              ? prizeTicketData.aiSurpriseAnswer.trim()
              : undefined,
        }
      : {};
    printPrizeTickets([{
      activityId: prizeTicketData.activityId,
      ticketNo: prizeTicketData.ticketNo,
      redeemedAt: prizeTicketData.redeemedAt,
      studentId: prizeTicketData.studentId,
      studentName: prizeTicketData.studentName,
      studentNickname: prizeTicketData.studentNickname,
      studentEmoji: prizeTicketData.studentEmoji,
      prizeName: prizeTicketData.prizeName,
      prizeIcon: prizeTicketData.prizeIcon,
      quantity: 1,
      totalCost: prizeTicketData.totalCost,
      ...surpriseExtras,
    }]);
  }, [printPrizeTickets, prizeTicketData]);

  const handleReprint = useCallback((item: HistoryItem) => {
    if (!student) return;
    let prizeName = item.desc.replace(/^Redeemed:\s*/, '');
    let quantity = 1;
    const match = prizeName.match(/\s*\(x(\d+)\)$/);
    if (match) {
      quantity = parseInt(match[1], 10);
      prizeName = prizeName.replace(/\s*\(x(\d+)\)$/, '');
    }
    const foundPrize = rewardPrizes.find(p => p.name === prizeName);
    const prizeIcon = foundPrize?.icon || 'Gift';

    const ticketNo = String(item.date).replace(/\D/g, '').slice(-6) || String(item.date).slice(-6);
    const displayFirst = getStudentNickname(student);
    const legalFirst = (student.firstName || '').trim();
    const nick = student.nickname?.trim();
    const themeForTicket = resolveStudentThemeWithSchoolDefault(
      student.theme,
      settings.defaultStudentTheme,
      settings.enableStudentThemes,
    );
    const emojiRaw = settings.enableStudentEmojiOnPrizeTickets === true ? themeForTicket?.emoji : undefined;
    const studentEmoji = typeof emojiRaw === 'string' && emojiRaw.trim() ? emojiRaw.trim() : undefined;

    setPrizeTicketData({
      activityId: item.id || String(item.date),
      ticketNo,
      redeemedAt: item.date,
      studentId: student.id,
      studentName: `${displayFirst} ${student.lastName}`.trim(),
      studentNickname: nick && legalFirst && displayFirst.trim() !== legalFirst ? legalFirst : undefined,
      studentEmoji,
      prizeName,
      prizeIcon,
      quantity,
      totalCost: -item.amount,
    });
  }, [student, rewardPrizes, settings]);


  // Celebrate on login if new badges were earned since last time this student opened the kiosk.
  useEffect(() => {
    if (!student || !schoolId) return;
    try {
      const key = `arcade:lastSeenCelebrations:${schoolId}:${student.id}`;
      const prev = JSON.parse(localStorage.getItem(key) || '{}') as { badgeAt?: number };

      const latestBadgeAt = Math.max(0, ...(student.earnedBadges || []).map((e) => e.earnedAt || 0));
      const newBadge = latestBadgeAt > (prev.badgeAt || 0);

      if (newBadge) {
        playSound('success');
        queueCelebration('You earned a new badge!');
      }

      localStorage.setItem(key, JSON.stringify({ badgeAt: latestBadgeAt }));
    } catch {
      // ignore storage / JSON errors
    }
  }, [student, student?.id, schoolId, student?.earnedBadges, playSound, queueCelebration]);

  const headerBadges = useMemo(() => {
    if (!student?.earnedBadges?.length || !badges?.length) return [];
    const defsById = new Map<string, typeof badges[number]>();
    for (const e of student.earnedBadges) {
      const def = badges.find(b => b.id === e.badgeId);
      if (def && def.enabled !== false && !defsById.has(def.id)) {
        defsById.set(def.id, def);
      }
    }
    return Array.from(defsById.values()).slice(0, 3);
  }, [student?.earnedBadges, badges]);

  const totalUniqueBadges = useMemo(() => {
    if (!student?.earnedBadges?.length || !badges?.length) return 0;
    const ids = new Set(
      student.earnedBadges
        .map(e => badges.find(b => b.id === e.badgeId))
        .filter((b): b is typeof badges[number] => !!b && b.enabled !== false)
        .map(b => b.id)
    );
    return ids.size;
  }, [student?.earnedBadges, badges]);

  const portalRaffleTickets = useMemo(() => {
    if (!settings.enableWeeklyRaffle || !isFeatureAllowed('enableWeeklyRaffle')) return null;
    const { isGeneralRaffle, pointsPerTicket } = parseRafflePointsPerTicket(settings.rafflePointsPerTicket);
    if (isGeneralRaffle || pointsPerTicket < 1) return null;
    return {
      count: floorRaffleFullTickets(student?.points ?? 0, pointsPerTicket),
      pointsPerTicket,
      equalOddsNote: !!settings.raffleOneEntryPerStudent,
    };
  }, [
    settings.enableWeeklyRaffle,
    settings.rafflePointsPerTicket,
    settings.raffleOneEntryPerStudent,
    isFeatureAllowed,
    student?.points,
  ]);

  if (studentLoading || !student || !schoolId) {
    return (
      <div
        className={cn(
          "min-h-screen px-3 md:px-6 pt-6 md:pt-10 space-y-4",
          animBackdrop ? "bg-transparent" : "bg-background",
        )}
        role="status"
        aria-live="polite"
        aria-label="Loading student profile"
      >
        <Skeleton className="h-40 md:h-52 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48 w-full rounded-3xl" />
          <Skeleton className="h-48 w-full rounded-3xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-3xl" />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  // Normalize: per-student theme, else school default from admin settings.
  const baseTheme = resolveStudentThemeWithSchoolDefault(
    student.theme,
    settings.defaultStudentTheme,
    settings.enableStudentThemes,
  );
  const birthdayRainbowTheme = birthdayToday
    ? {
        background: '#070A18',
        primary: '#ff2d55',
        accent: '#22d3ee',
        cardBackground: 'rgba(10, 15, 35, 0.72)',
        backgroundStyle:
          'radial-gradient(circle at 15% 20%, rgba(255, 45, 85, 0.28) 0%, transparent 46%), radial-gradient(circle at 85% 10%, rgba(34, 211, 238, 0.24) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.22) 0%, transparent 55%), radial-gradient(circle at 20% 85%, rgba(34, 197, 94, 0.20) 0%, transparent 55%), linear-gradient(135deg, rgba(59, 130, 246, 0.18), rgba(236, 72, 153, 0.16), rgba(245, 158, 11, 0.14))',
        emoji: '🎂',
      }
    : null;
  const effectiveTheme = birthdayRainbowTheme
    ? ({ ...(baseTheme || {}), ...birthdayRainbowTheme } as NonNullable<typeof baseTheme>)
    : baseTheme;
  // Keep legacy variable name used widely in this file.
  const activeTheme = effectiveTheme;

  const fontScale = effectiveTheme?.fontScale ?? 1.15;
  const themeBg = effectiveTheme?.background || '#020617';
  const computedThemeText = effectiveTheme?.text || (getContrastColor(themeBg) === 'black' ? '#020617' : '#ffffff');
  const primaryForeground = effectiveTheme ? primaryForegroundFor(effectiveTheme) : '#ffffff';

  const welcomeBackdropActive =
    showWelcome && studentSeesWelcomeBackOverlay(settings, student);

  return (
    <TooltipProvider>
      <>
      <div
        className={cn(
          // Lock the dashboard to the viewport so inner panes scroll
          // (prevents Activity + CTA from falling below the fold).
          "w-full max-w-none h-dvh min-h-dvh relative px-3 md:px-6 overflow-x-hidden overflow-y-hidden flex flex-col",
          birthdayToday ? "pt-14 md:pt-16" : "pt-3 md:pt-8",
          settings.enableThemeAnimations && !!effectiveTheme && "theme-theme-elements-animated theme-motion-override",
          // Avoid large bottom padding that leaves a visible gap.
          settings.displayMode === 'app' && 'pb-6'
        )}
        style={effectiveTheme ? ({
          '--theme-bg': themeBg,
          '--theme-text': computedThemeText,
          '--theme-primary': effectiveTheme.primary || 'hsl(var(--primary))',
          '--theme-primary-foreground': primaryForeground,
          '--theme-card': effectiveTheme.cardBackground || 'hsl(var(--card))',
          '--theme-accent': effectiveTheme.accent || 'hsl(var(--accent))',
          ...(effectiveTheme.backgroundStyle
            ? { background: effectiveTheme.backgroundStyle }
            : {
                backgroundColor: themeBg,
                backgroundImage: `radial-gradient(circle at top left, ${effectiveTheme.primary || 'hsl(var(--primary))'}22 0, transparent 45%), radial-gradient(circle at bottom right, ${effectiveTheme.accent || 'hsl(var(--accent))'}22 0, transparent 55%)`,
              }),
          color: 'var(--theme-text)',
          fontFamily: effectiveTheme.fontFamily || 'inherit',
          fontSize: fontScale !== 1 ? `${fontScale}em` : undefined,
        } as unknown as React.CSSProperties) : ({
          fontSize: '1.15em',
          ...appearanceVarsForSurface(settings, 'redeem'),
        } as any)}
      >
        {effectiveTheme?.fontFamily && <GoogleFontLoader fontFamily={effectiveTheme.fontFamily} />}

        <div
          className={cn(
            "relative flex flex-1 flex-col min-h-0 min-w-0 w-full space-y-3 md:space-y-4 overflow-hidden",
            isGraphic
              ? "animate-in fade-in duration-200 motion-reduce:animate-none motion-reduce:duration-0"
              : "",
          )}
        >
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {celebrationMessage || (flyPointsValue !== null ? `You earned ${flyPointsValue} points` : '')}
        </div>

        {syncStatus === 'offline' && (
          <Alert variant="destructive" className="no-print shrink-0 border-red-600/70 py-2 px-3">
            <AlertDescription className="text-xs font-semibold leading-snug">
              {OFFLINE_USER_MESSAGE}
            </AlertDescription>
          </Alert>
        )}

        {celebrationMessage && (
          <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center">
            <div className="pointer-events-auto bg-black/70 text-white px-8 py-5 rounded-3xl shadow-2xl border border-white/20 flex flex-col items-center gap-2 animate-in fade-in zoom-in duration-300">
              <span className="text-3xl font-black tracking-widest uppercase">Yay!</span>
              <span className="text-sm font-medium text-center max-w-xs">{celebrationMessage}</span>
            </div>
          </div>
        )}

        {flyPointsValue !== null && (
          <div key={animationKey.current} className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center" aria-hidden="true">
            <div className="animate-fly-up text-4xl md:text-6xl font-black tracking-widest text-emerald-400 drop-shadow-[0_0_14px_rgba(52,211,153,0.75)]">
              +{flyPointsValue} PTS
            </div>
          </div>
        )}

        {/* Graphic Elements */}
        {isGraphic && !effectiveTheme && (
          <div className="absolute -top-12 right-0 w-32 h-32 opacity-20 pointer-events-none z-0">
            <Star className="w-full h-full text-amber-400 fill-amber-400 opacity-80" />
          </div>
        )}

        {/* Hero Welcome Section */}
        <Card
          className={cn(
            "shrink-0 overflow-hidden shadow-xl border-t-8 border-chart-1",
            isGraphic && !effectiveTheme
              ? animBackdrop
                ? "bg-card/90 backdrop-blur-md border-border/40"
                : "bg-gradient-to-br from-indigo-100/50 to-indigo-50/30 dark:from-indigo-950/40 dark:to-slate-900/40"
              : !effectiveTheme ? "bg-card dark:bg-slate-800" : "",
          )}
          style={effectiveTheme ? { backgroundColor: 'var(--theme-card)', color: 'var(--theme-text)', borderColor: 'var(--theme-primary)' } : undefined}
        >
          <CardContent className="p-4 md:p-5 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="space-y-1 text-center md:text-left">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: effectiveTheme ? 'var(--theme-text)' : undefined, opacity: effectiveTheme ? 0.7 : undefined }}>Welcome back,</p>
              <div className="flex items-center gap-3 mt-1">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-primary/10 border border-border/60 flex items-center justify-center font-bold text-primary flex-shrink-0">
                  {student.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={student.photoUrl} alt={`${student.firstName} ${student.lastName}`} className={settings.photoDisplayMode === 'cover' ? 'h-full w-full object-cover' : 'h-full w-full object-contain'} />
                  ) : (
                    <span>{(student.firstName?.[0] || '')}{(student.lastName?.[0] || '')}</span>
                  )}
                </div>
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl md:text-4xl font-black leading-tight">
                      {student.firstName} {student.lastName}
                    </h2>
                    {birthdayToday ? (
                      <>
                        <BirthdayHat size={52} className="hidden sm:block shrink-0 -mt-1" />
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 px-2 py-1 text-[10px] font-black uppercase tracking-widest"
                          title="Birthday today"
                        >
                          🎂 Birthday
                        </span>
                      </>
                    ) : null}
                    {(student.customEmojiUrl || effectiveTheme?.emoji) && (
                      student.customEmojiUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={student.customEmojiUrl}
                          alt=""
                          className="theme-animated-emoji h-9 w-9 md:h-11 md:w-11 shrink-0 object-contain"
                          style={{ filter: effectiveTheme?.primary ? `drop-shadow(0 0 8px ${effectiveTheme.primary}) drop-shadow(0 0 16px ${effectiveTheme.primary})` : undefined }}
                        />
                      ) : (
                        <span
                          className="theme-animated-emoji text-3xl md:text-4xl leading-none"
                          style={{ filter: effectiveTheme?.primary ? `drop-shadow(0 0 8px ${effectiveTheme.primary}) drop-shadow(0 0 16px ${effectiveTheme.primary})` : undefined }}
                        >
                          {effectiveTheme?.emoji ?? ''}
                        </span>
                      )
                    )}
                  </div>
                  {student.nickname?.trim() ? (
                    <div className="text-[10px] md:text-xs font-black uppercase tracking-[0.25em] opacity-75">
                      {student.nickname.trim()}
                    </div>
                  ) : null}
                  {settings.enableBadges && headerBadges.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      {headerBadges.map((b) => (
                        <div
                          key={b.id}
                          className="w-7 h-7 rounded-full border border-white/40 bg-white/10 flex items-center justify-center shadow-sm"
                        >
                          <DynamicIcon
                            name={b.icon}
                            className="w-4 h-4"
                            style={b.accentColor ? { color: b.accentColor } : undefined}
                          />
                        </div>
                      ))}
                      {totalUniqueBadges > headerBadges.length && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                          +{totalUniqueBadges - headerBadges.length} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: effectiveTheme ? 'var(--theme-text)' : undefined, opacity: effectiveTheme ? 0.7 : undefined }}>Current Balance</p>
              <div
                className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 md:justify-end"
                style={{ color: effectiveTheme ? 'var(--theme-primary)' : undefined }}
              >
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl md:text-5xl font-black leading-none" style={{ color: effectiveTheme ? 'var(--theme-primary)' : 'hsl(var(--primary))' }}>
                    {(student.points || 0).toLocaleString()}
                  </span>
                  <span className="text-lg md:text-xl font-bold uppercase tracking-widest" style={{ color: effectiveTheme ? 'var(--theme-primary)' : 'hsl(var(--primary) / 0.6)', opacity: 0.6 }}>pts</span>
                </div>
                {portalRaffleTickets ? (
                  <>
                    <span className="text-lg font-black opacity-35 select-none" aria-hidden>
                      ·
                    </span>
                    <div
                      className="flex items-baseline gap-1"
                      title={
                        `Weekly raffle: ${portalRaffleTickets.count === 1 ? '1 ticket' : `${portalRaffleTickets.count} tickets`} from your balance at ${portalRaffleTickets.pointsPerTicket} points per ticket.` +
                        (portalRaffleTickets.equalOddsNote
                          ? ' Your school uses equal odds on the wheel (one pool entry per qualifying student, not one slice per ticket shown).'
                          : '')
                      }
                    >
                      <Ticket className="h-5 w-5 shrink-0 opacity-70" aria-hidden />
                      <span className="text-2xl md:text-3xl font-black tabular-nums leading-none" style={{ color: effectiveTheme ? 'var(--theme-primary)' : 'hsl(var(--primary))' }}>
                        {portalRaffleTickets.count.toLocaleString()}
                      </span>
                      <span className="text-xs md:text-sm font-bold uppercase tracking-widest opacity-60">
                        raffle {portalRaffleTickets.count === 1 ? 'ticket' : 'tickets'}
                      </span>
                    </div>
                  </>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 md:justify-end">
                {studentSeesWelcomePage(settings, student) && schoolId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest"
                    style={
                      activeTheme
                        ? {
                            borderColor: 'var(--theme-primary)',
                            backgroundColor: 'transparent',
                            color: 'var(--theme-primary)',
                          }
                        : undefined
                    }
                    asChild
                  >
                    <Link href={`/${schoolId}/student/welcome`}>
                      <Sparkles className="h-3.5 w-3.5" aria-hidden />
                      Welcome styles
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid w-full min-w-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_min(320px,28vw)] gap-4 relative z-10 flex-1 min-h-0 items-stretch overflow-hidden pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {/* Left Section: Content */}
          <div className="min-w-0 flex flex-1 min-h-0 flex-col gap-3 overflow-hidden pr-1">
            <div className="min-w-0 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden pb-3 scroll-pb-3">
            <StudentGoalsCard
              schoolId={schoolId!}
              student={student}
              enabled={settings.enableGoals && isFeatureAllowed('enableGoals')}
              themed={!!effectiveTheme}
              themeForeground={effectiveTheme ? 'var(--theme-primary)' : undefined}
            />

            {couponSectionEnabled && (
            <Card
              className={cn(
                "relative z-20 w-full min-w-0 max-w-full origin-center overflow-hidden rounded-3xl border-2 shadow-[0_24px_60px_rgba(15,23,42,0.28)] ring-4 ring-offset-4 ring-offset-background transition-transform duration-300",
                !effectiveTheme
                  ? "border-amber-300/80 bg-white ring-amber-200/70 dark:border-amber-400/60 dark:bg-slate-900 dark:ring-amber-500/20"
                  : "",
              )}
              style={effectiveTheme ? {
                backgroundColor: 'var(--theme-card)',
                borderColor: 'var(--theme-primary)',
                boxShadow: '0 24px 60px color-mix(in srgb, var(--theme-primary) 34%, transparent)',
                color: 'var(--theme-text)',
                ['--tw-ring-color' as string]: 'color-mix(in srgb, var(--theme-primary) 32%, transparent)',
              } : undefined}
            >
              <CardHeader className="pb-3 border-b" style={effectiveTheme ? { borderColor: 'var(--theme-bg)' } : undefined}>
                <Helper content={couponHelperText}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-sm font-black flex items-center gap-2">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", !effectiveTheme && "bg-slate-100 dark:bg-slate-800")} style={effectiveTheme ? { backgroundColor: 'var(--theme-bg)' } : undefined}>
                        <Wallet className="w-4 h-4" style={effectiveTheme ? { color: 'var(--theme-primary)' } : undefined} />
                      </div>
                      Redeem Coupon Code
                    </CardTitle>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <div
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-colors whitespace-nowrap",
                          isKioskLocked
                            ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800"
                            : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800"
                        )}
                        aria-label={isKioskLocked ? 'Kiosk locked' : `Auto logout in ${logoutTimer} seconds`}
                      >
                        <span>
                          {isKioskLocked ? 'Kiosk Locked • ' : ''}
                          {isKioskLocked ? 'Stays signed in' : `Auto-logout: ${logoutTimer}s`}
                        </span>
                      </div>
                      <div className="relative">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="relative h-8 px-3.5 rounded-full text-[11px] font-bold uppercase tracking-widest whitespace-nowrap"
                          onClick={handleManualLogout}
                          aria-label="Log out now."
                        >
                          Logout
                        </Button>
                      </div>
                    </div>
                  </div>
                </Helper>
              </CardHeader>
              <CardContent className="pt-4 min-w-0 overflow-x-hidden">
                {showCouponMethodTabs ? (
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'manual' | 'camera')} className="w-full min-w-0">
                  <TabsList 
                    className={cn(
                      "grid w-full grid-cols-2 mb-4 p-1 rounded-xl h-12 overflow-hidden min-w-0",
                      !activeTheme && "bg-slate-100 dark:bg-slate-800",
                    )}
                    style={activeTheme ? { backgroundColor: 'var(--theme-bg)' } : undefined}
                  >
                    <TabsTrigger 
                      value="manual" 
                      className={cn(
                        "text-[12px] font-bold rounded-lg data-[state=active]:shadow-sm flex items-center gap-1.5 py-1 min-w-0",
                        !activeTheme && "data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700",
                      )}
                      style={activeTheme && activeTab === 'manual' ? { backgroundColor: 'var(--theme-card)', color: 'var(--theme-text)' } : undefined}
                    >
                      <Type className="w-3.5 h-3.5" /> Manual / USB
                    </TabsTrigger>
                    <TabsTrigger 
                      value="camera" 
                      className={cn(
                        "text-[12px] font-bold rounded-lg data-[state=active]:shadow-sm flex items-center gap-1.5 py-1 min-w-0",
                        !activeTheme && "data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700",
                      )}
                      style={activeTheme && activeTab === 'camera' ? { backgroundColor: 'var(--theme-card)', color: 'var(--theme-text)' } : undefined}
                    >
                      <Camera className="w-3.5 h-3.5" /> Webcam Scan
                    </TabsTrigger>
                  </TabsList>

                  {activeTab === 'manual' ? (
                    <div className="space-y-3 w-full min-w-0">
                      <div
                        className={cn(
                          'relative flex flex-wrap items-center justify-center gap-2 sm:gap-3 rounded-xl border-2 border-dashed px-3 py-4 min-h-[3.5rem] text-center motion-safe:animate-[pulse_1.35s_ease-in-out_infinite] motion-reduce:animate-none',
                          !activeTheme &&
                            'border-amber-400/80 bg-gradient-to-r from-amber-900/95 via-amber-950/92 to-amber-900/95 text-amber-50 shadow-[0_10px_44px_-10px_rgba(251,191,36,0.45)] dark:border-amber-500/55 dark:from-amber-900/95 dark:via-amber-950/92 dark:to-amber-900/95 dark:shadow-[0_10px_44px_-10px_rgba(251,191,36,0.38)]',
                        )}
                        style={
                          activeTheme
                            ? {
                                borderColor: 'color-mix(in srgb, var(--theme-primary) 50%, transparent)',
                                background: `linear-gradient(165deg, color-mix(in srgb, var(--theme-primary) 54%, var(--theme-card)), color-mix(in srgb, var(--theme-primary) 64%, var(--theme-card)) 50%, color-mix(in srgb, var(--theme-primary) 54%, var(--theme-card)))`,
                                boxShadow:
                                  '0 12px 44px -10px color-mix(in srgb, var(--theme-primary) 48%, transparent)',
                                color: 'rgba(248, 250, 252, 0.97)',
                              }
                            : undefined
                        }
                        role="status"
                        aria-live="polite"
                      >
                        <ScanBarcode
                          className={cn(
                            'h-7 w-7 shrink-0 sm:h-8 sm:w-8',
                            !activeTheme && 'text-amber-200',
                          )}
                          style={
                            activeTheme
                              ? {
                                  color: 'color-mix(in srgb, var(--theme-primary) 72%, white)',
                                }
                              : undefined
                          }
                          aria-hidden
                        />
                        <span
                          className={cn(
                            'max-w-full text-base sm:text-lg md:text-xl font-black uppercase tracking-[0.12em] sm:tracking-[0.18em] leading-snug',
                            !activeTheme && 'text-amber-50',
                          )}
                          style={activeTheme ? { color: 'rgba(248, 250, 252, 0.97)' } : undefined}
                        >
                          Scan coupon
                        </span>
                      </div>
                      <form
                        className="flex flex-col gap-2 min-w-0 w-full sm:flex-row sm:gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void handleRedeemCoupon();
                        }}
                      >
                        <Input
                          placeholder="Code appears here when scanned"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          className="w-full min-w-0 font-mono text-left tracking-widest h-12 border-2 rounded-xl text-sm sm:flex-1"
                          style={activeTheme ? { backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-primary)', color: 'var(--theme-text)' } : undefined}
                          autoFocus
                          autoComplete="one-time-code"
                        />
                        <Button
                          type="submit"
                          className="h-12 w-full sm:w-auto px-6 font-black rounded-xl shadow-lg transition-all active:scale-95 uppercase tracking-widest text-xs shrink-0"
                          style={activeTheme ? {
                            backgroundColor: 'var(--theme-primary)',
                            color: primaryForeground,
                          } : { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
                        >
                          Redeem
                        </Button>
                      </form>
                      <p 
                        className="text-[10px] text-center pt-1" 
                        style={activeTheme ? { color: 'var(--theme-text)', opacity: 0.7 } : { color: 'hsl(var(--muted-foreground))' }}
                      >
                        Available coupon codes can be viewed in the Admin panel.
                      </p>
                    </div>
                  ) : (
                    <div className="relative h-36 sm:h-40 rounded-xl overflow-hidden bg-black border-2 border-slate-100 dark:border-slate-800 shadow-inner">
                      <video ref={videoRef as RefObject<HTMLVideoElement>} className="w-full h-full object-cover" playsInline muted />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-3/4 h-3/2 border-2 border-white/40 rounded-2xl border-dashed" />
                      </div>
                      {!hasCameraPermission && (
                        <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                          <Camera className="w-12 h-12 text-destructive mb-4" />
                          <p className="text-foreground font-bold">Camera access required</p>
                          <p className="text-muted-foreground text-xs mt-2">Please enable camera in settings</p>
                        </div>
                      )}
                    </div>
                  )}
                </Tabs>
                ) : showManualCoupon ? (
                    <div className="space-y-3 w-full min-w-0">
                      <div
                        className={cn(
                          'relative flex flex-wrap items-center justify-center gap-2 sm:gap-3 rounded-xl border-2 border-dashed px-3 py-4 min-h-[3.5rem] text-center motion-safe:animate-[pulse_1.35s_ease-in-out_infinite] motion-reduce:animate-none',
                          !activeTheme &&
                            'border-amber-400/80 bg-gradient-to-r from-amber-900/95 via-amber-950/92 to-amber-900/95 text-amber-50 shadow-[0_10px_44px_-10px_rgba(251,191,36,0.45)] dark:border-amber-500/55 dark:from-amber-900/95 dark:via-amber-950/92 dark:to-amber-900/95 dark:shadow-[0_10px_44px_-10px_rgba(251,191,36,0.38)]',
                        )}
                        style={
                          activeTheme
                            ? {
                                borderColor: 'color-mix(in srgb, var(--theme-primary) 50%, transparent)',
                                background: `linear-gradient(165deg, color-mix(in srgb, var(--theme-primary) 54%, var(--theme-card)), color-mix(in srgb, var(--theme-primary) 64%, var(--theme-card)) 50%, color-mix(in srgb, var(--theme-primary) 54%, var(--theme-card)))`,
                                boxShadow:
                                  '0 12px 44px -10px color-mix(in srgb, var(--theme-primary) 48%, transparent)',
                                color: 'rgba(248, 250, 252, 0.97)',
                              }
                            : undefined
                        }
                        role="status"
                        aria-live="polite"
                      >
                        <ScanBarcode
                          className={cn(
                            'h-7 w-7 shrink-0 sm:h-8 sm:w-8',
                            !activeTheme && 'text-amber-200',
                          )}
                          style={
                            activeTheme
                              ? {
                                  color: 'color-mix(in srgb, var(--theme-primary) 72%, white)',
                                }
                              : undefined
                          }
                          aria-hidden
                        />
                        <span
                          className={cn(
                            'max-w-full text-base sm:text-lg md:text-xl font-black uppercase tracking-[0.12em] sm:tracking-[0.18em] leading-snug',
                            !activeTheme && 'text-amber-50',
                          )}
                          style={activeTheme ? { color: 'rgba(248, 250, 252, 0.97)' } : undefined}
                        >
                          Scan coupon
                        </span>
                      </div>
                      <form
                        className="flex flex-col gap-2 min-w-0 w-full sm:flex-row sm:gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void handleRedeemCoupon();
                        }}
                      >
                        <Input
                          placeholder="Code appears here when scanned"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          className="w-full min-w-0 font-mono text-left tracking-widest h-12 border-2 rounded-xl text-sm sm:flex-1"
                          style={activeTheme ? { backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-primary)', color: 'var(--theme-text)' } : undefined}
                          autoFocus
                          autoComplete="one-time-code"
                        />
                        <Button
                          type="submit"
                          className="h-12 w-full sm:w-auto px-6 font-black rounded-xl shadow-lg transition-all active:scale-95 uppercase tracking-widest text-xs shrink-0"
                          style={activeTheme ? {
                            backgroundColor: 'var(--theme-primary)',
                            color: primaryForeground,
                          } : { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
                        >
                          Redeem
                        </Button>
                      </form>
                      <p 
                        className="text-[10px] text-center pt-1" 
                        style={activeTheme ? { color: 'var(--theme-text)', opacity: 0.7 } : { color: 'hsl(var(--muted-foreground))' }}
                      >
                        Available coupon codes can be viewed in the Admin panel.
                      </p>
                    </div>
                ) : showCameraCoupon ? (
                    <div className="relative h-36 sm:h-40 rounded-xl overflow-hidden bg-black border-2 border-slate-100 dark:border-slate-800 shadow-inner">
                      <video ref={videoRef as RefObject<HTMLVideoElement>} className="w-full h-full object-cover" playsInline muted />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-3/4 h-3/2 border-2 border-white/40 rounded-2xl border-dashed" />
                      </div>
                      {!hasCameraPermission && (
                        <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                          <Camera className="w-12 h-12 text-destructive mb-4" />
                          <p className="text-foreground font-bold">Camera access required</p>
                          <p className="text-muted-foreground text-xs mt-2">Please enable camera in settings</p>
                        </div>
                      )}
                    </div>
                ) : null}

              </CardContent>
            </Card>
            )}

            {/* Eligible Rewards */}
            <Card
                className={cn(
                  'flex flex-col overflow-hidden rounded-2xl border-2 shadow-md ring-1 ring-black/5 dark:ring-white/10',
                  !activeTheme && 'border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900',
                )}
                style={
                  activeTheme
                    ? {
                        backgroundColor: 'var(--theme-card)',
                        color: 'var(--theme-text)',
                        borderColor: 'color-mix(in srgb, var(--theme-primary) 42%, transparent)',
                        boxShadow: 'inset 0 1px 0 0 color-mix(in srgb, var(--theme-text) 6%, transparent)',
                      }
                    : undefined
                }
              >
              <CardHeader
                className="shrink-0 border-b pb-2.5 pt-3.5 px-3 sm:px-4 rounded-t-2xl bg-muted/25 dark:bg-slate-800/35"
                style={
                  activeTheme
                    ? {
                        borderColor: 'color-mix(in srgb, var(--theme-primary) 28%, transparent)',
                        backgroundColor: 'color-mix(in srgb, var(--theme-bg) 50%, var(--theme-card))',
                      }
                    : undefined
                }
              >
                          <Helper content="Rewards you can afford right now. Tap a box to redeem, or use “Click here for more prizes” below for the full rewards shop.">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={activeTheme ? { backgroundColor: 'var(--theme-bg)' } : undefined}>
                      <Award className="w-4 h-4" style={activeTheme ? { color: 'var(--theme-primary)' } : undefined} />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-black">Eligible Rewards</CardTitle>
                      <CardDescription className="text-[10px] font-medium leading-snug" style={activeTheme ? { color: 'var(--theme-text)', opacity: 0.7 } : undefined}>Tap a reward box to redeem.</CardDescription>
                    </div>
                  </div>
                </Helper>
              </CardHeader>
              <CardContent className="px-3 pb-3 pt-2 sm:px-4">
                <div className="w-full pr-0.5">
                <div
                  ref={rewardGridRef}
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-2.5"
                >
                  {prizesLoading ? (
                    [...Array(8)].map((_, i) => <Skeleton key={i} className="min-h-[7.5rem] sm:min-h-[8rem] w-full rounded-xl" />)
                  ) : rewardPrizes
                    .filter(p =>
                      prizeAppearsInRewardsShop(p, { enablePrizeAiSurprise: kioskAiFunInShop }) &&
                      prizeIsListed(p) &&
                      p.points <= student.points &&
                      studentSeesPrizeByTeachers(student, p) &&
                      (!p.classId || student.classId === p.classId))
                    .sort((a, b) => b.points - a.points)
                    .map((reward) => (
                      <button
                        type="button"
                        key={reward.id}
                        data-stagger-card
                        onClick={() => {
                          playSound('click');
                          setConfirmingPrize(reward);
                        }}
                        aria-label={`Redeem ${reward.name || 'prize'}`}
                        className={cn(
                          "reward-card min-h-[7.5rem] sm:min-h-[8rem] min-w-0 p-2 sm:p-2.5 rounded-2xl flex flex-col items-stretch justify-between text-center gap-1 shadow-sm border will-change-transform transition-[transform,box-shadow] duration-500 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] hover:-translate-y-1 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:hover:translate-y-0 group relative overflow-visible cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                          !activeTheme && "border-slate-100 dark:border-slate-800 bg-white/40 dark:bg-slate-800/40",
                        )}
                        style={activeTheme ? { backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text)', borderColor: 'var(--theme-primary)', borderWidth: 1, borderStyle: 'solid' } : undefined}
                      >
                        {reward.name && (
                          <div className="absolute inset-0 overflow-hidden rounded-2xl opacity-5 pointer-events-none">
                            <img src={`https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(reward.name)}&backgroundColor=transparent`} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <p
                          className={cn(
                            "text-sm sm:text-base md:text-lg font-black leading-tight line-clamp-2 break-words [overflow-wrap:anywhere] z-10 min-h-0 shrink",
                            !activeTheme && "text-slate-800 dark:text-white",
                          )}
                          style={activeTheme ? { color: 'var(--theme-text)' } : undefined}
                        >
                          {reward.name}
                        </p>
                        <div className="flex flex-col items-center gap-1.5 z-10 w-full shrink-0 mt-auto pt-0.5">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "font-black text-[10px] tracking-wider rounded-full px-2 py-0.5",
                              !activeTheme && "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
                            )}
                            style={activeTheme ? { backgroundColor: 'var(--theme-primary)', color: primaryForeground } : undefined}
                          >
                            {(reward.points || 0).toLocaleString()} PTS
                          </Badge>
                          <span
                            className={cn(
                              'inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-widest',
                              !activeTheme && 'bg-primary/10 text-primary ring-1 ring-inset ring-primary/25 dark:bg-primary/20 dark:text-primary',
                            )}
                            style={
                              activeTheme
                                ? {
                                    backgroundColor: 'color-mix(in srgb, var(--theme-primary) 18%, transparent)',
                                    color: 'var(--theme-primary)',
                                    boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--theme-primary) 38%, transparent)',
                                  }
                                : undefined
                            }
                          >
                            Click here
                          </span>
                        </div>
                      </button>
                    ))}
                  {!prizesLoading && rewardPrizes.filter(p =>
                      prizeAppearsInRewardsShop(p, { enablePrizeAiSurprise: kioskAiFunInShop }) &&
                      prizeIsListed(p) &&
                      p.points <= student.points).length === 0 && (
                    <div
                      className={cn(
                        "col-span-full py-8 flex flex-col items-center justify-center text-center space-y-3 rounded-xl border border-dashed mx-2 mb-2",
                        !activeTheme && "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700",
                      )}
                      style={activeTheme ? { backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-primary)', color: 'var(--theme-text)' } : undefined}
                    >
                      <div
                        className={cn("w-12 h-12 rounded-full flex items-center justify-center", !activeTheme && "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-500 dark:text-indigo-400")}
                        style={activeTheme ? { backgroundColor: 'var(--theme-card)', color: 'var(--theme-primary)' } : undefined}
                      >
                        <Star className="w-6 h-6" />
                      </div>
                      <div>
                        <p className={cn("text-xs font-black", !activeTheme && "text-slate-700 dark:text-slate-300")} style={activeTheme ? { color: 'var(--theme-text)' } : undefined}>Almost there!</p>
                        <p className={cn("text-[10px] font-medium uppercase tracking-widest mt-1", !activeTheme && "text-slate-500 dark:text-slate-400")} style={activeTheme ? { color: 'var(--theme-text)', opacity: 0.7 } : undefined}>Keep earning points to unlock rewards</p>
                      </div>
                    </div>
                  )}
                </div>
                </div>
              </CardContent>
            </Card>

            <EarnedBadgesShowcase
              student={student}
              badges={badges || []}
              enableBadges={settings.enableBadges}
              theme={activeTheme}
            />
            </div>

            <Button
              asChild
              className={cn(
                'w-full h-11 sm:h-12 text-xs sm:text-sm font-black rounded-xl shadow-lg transition-all active:scale-[0.99] uppercase tracking-wide shrink-0',
                !activeTheme && 'bg-gradient-to-r from-primary to-primary/90',
              )}
              style={
                activeTheme
                  ? {
                      backgroundColor: 'var(--theme-primary)',
                      color: primaryForeground,
                    }
                  : undefined
              }
            >
              <Link
                href={`/${schoolId}/prize?student=${encodeURIComponent(student.id)}`}
                onClick={() => playSound('click')}
                className="flex items-center justify-center gap-2"
              >
                <Gift className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" aria-hidden />
                Click here for more prizes
                <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 opacity-90" aria-hidden />
              </Link>
            </Button>

            <AlertDialog open={!!confirmingPrize} onOpenChange={(open) => {
              if (!open && !isRedeemingPrize) setConfirmingPrize(null);
            }}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Redeem prize?</AlertDialogTitle>
                  <AlertDialogDescription className="break-words [overflow-wrap:anywhere]">
                    Redeem{' '}
                    <span className="text-xl font-black sm:text-2xl [overflow-wrap:anywhere]">{confirmingPrize?.name}</span>
                    {confirmingPrize ? ` for ${(confirmingPrize.points || 0).toLocaleString()} points` : ''}?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {confirmingPrize?.aiFunReward === 'picker' ? (
                  <div className="py-2 space-y-2">
                    <Label htmlFor="student-fun-kind">What do you want?</Label>
                    <Select value={confirmingFunKind} onValueChange={(v) => setConfirmingFunKind(v as PrizeAiFunReward)}>
                      <SelectTrigger id="student-fun-kind">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="joke">Joke</SelectItem>
                        <SelectItem value="riddle">Riddle</SelectItem>
                        <SelectItem value="fortune">Fortune teller</SelectItem>
                        <SelectItem value="random">Surprise me</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isRedeemingPrize}>Cancel</AlertDialogCancel>
                  <Button type="button" onClick={handleRedeemPrize} disabled={isRedeemingPrize}>
                    {isRedeemingPrize ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                        Redeeming...
                      </>
                    ) : (
                      'Redeem'
                    )}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!prizeTicketData} onOpenChange={(open) => {
              if (!open) setPrizeTicketData(null);
            }}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Print redeem voucher?</AlertDialogTitle>
                  <AlertDialogDescription className="break-words [overflow-wrap:anywhere]">
                    Print a voucher for{' '}
                    <span className="text-xl font-black sm:text-2xl">{prizeTicketData?.prizeName}</span>?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <PrinterReminderCallout
                  title="Printer reminder"
                  message={settings.printerReminderPrizeVouchers}
                  className="mt-1 mb-2"
                />
                <AlertDialogFooter>
                  <AlertDialogCancel>No Thanks</AlertDialogCancel>
                  <Button type="button" onClick={handlePrintPrizeTicket}>
                    Print Voucher
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Dialog
              open={aiSurpriseOpen}
              onOpenChange={(open) => {
                if (!open) {
                  closeAiSurprise();
                }
              }}
            >
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {aiSurpriseLoading
                      ? 'Your surprise'
                      : (AI_SURPRISE_KIND_LABEL[aiSurpriseBody?.kind ?? ''] ?? 'Your surprise')}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Joke, riddle, or fortune teller line shown after redeeming a prize.
                  </DialogDescription>
                </DialogHeader>
                <div className="min-h-[100px] py-1">
                  {aiSurpriseLoading ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-8 text-muted-foreground">
                      <Loader2 className="h-10 w-10 animate-spin" aria-hidden />
                      <p className="text-sm font-medium">Loading your joke...</p>
                    </div>
                  ) : aiSurpriseBody ? (
                    <div className="space-y-4 text-base leading-relaxed">
                      <p className="font-medium">{aiSurpriseBody.text}</p>
                      {aiSurpriseBody.kind === 'riddle' && aiSurpriseBody.answer ? (
                        <p className="rounded-lg border border-border bg-muted/80 px-3 py-2 text-sm">
                          <span className="font-semibold text-muted-foreground">Answer: </span>
                          {aiSurpriseBody.answer}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <Button
                  type="button"
                  className="w-full sm:w-auto sm:justify-self-end"
                  onClick={closeAiSurprise}
                  disabled={aiSurpriseLoading}
                >
                  {aiSurpriseLoading ? 'Please wait...' : 'Awesome'}
                </Button>
              </DialogContent>
            </Dialog>
          </div>

          {/* Right Section: Activity — fills column height on lg; list count fits visible rows (no page scroll). */}
          <div className="min-w-0 flex min-h-0 flex-col pb-8 scroll-pb-8 lg:h-full lg:min-h-0 lg:overflow-hidden lg:pb-0">
          <Card
            ref={activityPanelRef}
            className={cn(
              'min-w-0 w-full max-w-sm mx-auto lg:mx-0 lg:max-w-none flex flex-col min-h-0 rounded-2xl border-2 shadow-md ring-1 ring-black/5 dark:ring-white/10 overflow-hidden',
              'lg:flex-1 lg:h-full lg:min-h-0',
              !activeTheme && 'border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900',
            )}
            style={{
              ...(activityPanelHeight
                ? {
                    height: activityPanelHeight,
                    maxHeight: activityPanelHeight,
                  }
                : null),
              ...(activeTheme
                ? {
                    backgroundColor: 'var(--theme-card)',
                    color: 'var(--theme-text)',
                    borderColor: 'color-mix(in srgb, var(--theme-primary) 42%, transparent)',
                    boxShadow: 'inset 0 1px 0 0 color-mix(in srgb, var(--theme-text) 8%, transparent)',
                  }
                : null),
            }}
          >
            <CardHeader
              className="py-2.5 pb-2 border-b shrink-0 rounded-t-2xl bg-muted/30 dark:bg-slate-800/40"
              style={
                activeTheme
                  ? {
                      borderColor: 'color-mix(in srgb, var(--theme-primary) 28%, transparent)',
                      backgroundColor: 'color-mix(in srgb, var(--theme-bg) 55%, var(--theme-card))',
                    }
                  : undefined
              }
            >
              <Helper content="A log of your most recent point transactions. Activity is truncated to what fits on-screen.">
                <CardTitle
                  className={cn("text-xs font-black flex items-center gap-1.5", !activeTheme && "text-slate-800 dark:text-white")}
                  style={activeTheme ? { color: 'var(--theme-text)' } : undefined}
                >
                  <div className="w-6 h-6 rounded-md flex items-center justify-center" style={activeTheme ? { backgroundColor: 'var(--theme-bg)' } : undefined}>
                    <ChevronRight className="w-3.5 h-3.5 text-chart-1" style={activeTheme ? { color: 'var(--theme-primary)' } : undefined} />
                  </div>
                  <span style={activeTheme ? { color: 'var(--theme-text)' } : undefined}>Activity</span>
                </CardTitle>
              </Helper>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-hidden pt-2 pb-3 px-0.5">
              <StudentActivityList
                schoolId={schoolId}
                studentId={student.id}
                themed={!!effectiveTheme}
                onReprintTicket={handleReprint}
                maxItems={activityMaxItems}
              />
            </CardContent>
          </Card>
          </div>
        </div>

        {welcomeBackdropActive && (
          <>
            {/* One composited backdrop layer — avoids filter-blurring the whole dashboard (very janky). */}
            <div
              className="fixed inset-0 z-[99] pointer-events-none bg-background/10 dark:bg-black/15 backdrop-blur-md backdrop-saturate-150 motion-reduce:bg-transparent motion-reduce:backdrop-blur-none motion-reduce:backdrop-saturate-100"
              aria-hidden
            />
            <WelcomeOverlay
              key={student.id}
              studentName={`${student.firstName} ${student.lastName}`}
              points={student.points || 0}
              photoUrl={student.photoUrl}
              visibleDurationMs={Math.min(60, Math.max(1, settings.studentWelcomeBackDurationSec ?? 3)) * 1000}
              theme={activeTheme ? {
                primary: activeTheme.primary,
                text: computedThemeText,
                background: activeTheme.background,
                accent: activeTheme.accent,
                cardBackground: activeTheme.cardBackground,
                backgroundStyle: activeTheme.backgroundStyle,
                primaryForeground,
                emoji: student.customEmojiUrl || activeTheme.emoji,
                fontFamily: activeTheme.fontFamily,
              } : undefined}
              onClose={dismissWelcome}
              playSound={playSound}
            />
          </>
        )}
        </div>
      </div>
      {birthdayToday ? (
        <>
          <div
            className="fixed inset-0 z-[40] pointer-events-none overflow-hidden"
            aria-hidden
          >
            <Confetti />
            <Balloons />
          </div>
          <div
            className="fixed top-0 left-0 right-0 z-[45] pointer-events-none flex justify-center items-center bg-gradient-to-r from-pink-600/95 via-fuchsia-600/95 to-amber-500/95 py-2.5 md:py-3 shadow-lg shadow-fuchsia-950/25 border-b border-white/25"
            role="status"
            aria-live="polite"
          >
            <span className="text-base sm:text-xl md:text-3xl font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] md:tracking-[0.4em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]">
              Happy Birthday
            </span>
          </div>
        </>
      ) : null}
      </>
    </TooltipProvider>
  );
}

export default function StudentLoginPage() {
  const { loginState, isInitialized, schoolId, login, logout, syncStatus } = useAppContext();
  const router = useRouter();
  const { toast } = useToast();
  const playSound = useArcadeSound();
  const { settings } = useSettings();
  const isGraphic = settings.graphicMode === 'graphics';
  const animBackdrop = globalAnimatedBackdropActive(settings);
  const { firestore } = useFirebase();
  const appConfigDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'appConfig', 'global');
  }, [firestore]);

  const { data: appConfig } = useDoc<{ appLogoUrl?: string }>(appConfigDocRef);

  const { activeStudentId, setActiveStudentId, handleDone, loginMeta, setLoginMeta } = useStudentKioskSession();
  const [studentTransition, setStudentTransition] = useState<{
    id: string;
    startedAt: number;
    phase: 'loading' | 'exiting';
  } | null>(null);
  const studentTransitionTimersRef = useRef<number[]>([]);
  const dashboardReadyStudentRef = useRef<string | null>(null);
  const activeStudentIdRef = useRef<string | null>(null);
  activeStudentIdRef.current = activeStudentId;

  const clearStudentTransitionTimers = useCallback(() => {
    studentTransitionTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    studentTransitionTimersRef.current = [];
  }, []);

  useEffect(() => clearStudentTransitionTimers, [clearStudentTransitionTimers]);

  const finishStudentSession = useCallback(() => {
    clearStudentTransitionTimers();
    dashboardReadyStudentRef.current = null;
    setStudentTransition(null);
    handleDone();
  }, [clearStudentTransitionTimers, handleDone]);

  const onScannerStudent = useCallback(
    (id: string, meta?: StudentFoundMeta) => {
      clearStudentTransitionTimers();
      dashboardReadyStudentRef.current = null;
      setStudentTransition({
        id,
        startedAt: typeof performance !== 'undefined' ? performance.now() : Date.now(),
        phase: 'loading',
      });
      setActiveStudentId(id);
      if (meta?.source === 'face') {
        setLoginMeta({ source: 'face', confidence: meta.confidence });
      } else {
        setLoginMeta(null);
      }
    },
    [clearStudentTransitionTimers, setActiveStudentId, setLoginMeta],
  );

  const handleDashboardReady = useCallback((readyStudentId: string) => {
    if (dashboardReadyStudentRef.current === readyStudentId) {
      return;
    }

    setStudentTransition((current) => {
      if (!current || current.id !== readyStudentId || current.phase === 'exiting') {
        return current;
      }

      dashboardReadyStudentRef.current = readyStudentId;
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const remaining = Math.max(0, STUDENT_TRANSITION_MIN_VISIBLE_MS - (now - current.startedAt));
      const revealTimer = window.setTimeout(() => {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            setStudentTransition((latest) => (
              latest?.id === readyStudentId ? { ...latest, phase: 'exiting' } : latest
            ));
            const removeTimer = window.setTimeout(() => {
              setStudentTransition((latest) => (latest?.id === readyStudentId ? null : latest));
            }, STUDENT_TRANSITION_EXIT_MS);
            studentTransitionTimersRef.current.push(removeTimer);
          });
        });
      }, remaining);
      studentTransitionTimersRef.current.push(revealTimer);

      return current;
    });
  }, []);

  const handleStudentLogout = useCallback(() => {
    playSound('swoosh');
    if (activeStudentIdRef.current) {
      finishStudentSession();
      if (loginState === 'student' && schoolId) {
        logout();
      }
      toast({ title: 'Logged Out', description: 'Returning to kiosk home.' });
    } else {
      router.push(schoolId ? `/${schoolId}/portal` : '/login');
    }
  }, [finishStudentSession, loginState, logout, playSound, router, schoolId, toast]);

  useEffect(() => {
    window.addEventListener(STUDENT_KIOSK_REQUEST_EXIT_EVENT, handleStudentLogout);
    return () => window.removeEventListener(STUDENT_KIOSK_REQUEST_EXIT_EVENT, handleStudentLogout);
  }, [handleStudentLogout]);

  /** School chooser has no kiosk token — upgrade to student session in-place so scanning works (no extra screen). */
  useEffect(() => {
    if (!isInitialized || !schoolId) return;
    if (loginState !== 'school') return;
    let cancelled = false;
    void (async () => {
      const authResult = await login('student', { schoolId });
      if (cancelled || authResult.ok) return;
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Could not start kiosk',
        description: authResult.message,
      });
      router.replace(`/${schoolId}/portal`);
    })();
    return () => {
      cancelled = true;
    };
  }, [isInitialized, login, loginState, playSound, router, schoolId, toast]);

  useEffect(() => {
    if (!isInitialized || !schoolId) return;
    if (loginState === 'prizeClerk') {
      router.replace(`/${schoolId}/admin`);
    }
  }, [isInitialized, loginState, schoolId, router]);

  if (loginState === 'prizeClerk') {
    return (
      <div
        className={cn(
          'min-h-screen flex items-center justify-center p-8',
          animBackdrop ? 'bg-transparent' : 'bg-background',
        )}
      >
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground font-medium animate-pulse">Opening staff prize desk…</p>
        </div>
      </div>
    );
  }

  if (
    !isInitialized ||
    !['student', 'teacher', 'admin', 'school', 'developer', 'secretary', 'reports'].includes(loginState)
  ) {
    return <div className={cn(
      "min-h-screen flex items-center justify-center p-8",
      animBackdrop ? "bg-transparent" : "bg-background",
    )}>
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
        <p className="text-muted-foreground font-medium animate-pulse">Loading kiosk…</p>
      </div>
    </div>;
  }

  if (activeStudentId) {
    return (
      <>
        {loginMeta?.source === 'face' && (
          <FaceMismatchBanner
            studentId={activeStudentId}
            confidence={loginMeta.confidence}
            onResolved={finishStudentSession}
          />
        )}
        {syncStatus === 'offline' && (
          <div className="no-print fixed left-0 right-0 top-0 z-[80] flex justify-center px-3 pt-2 sm:px-4 pointer-events-none">
            <Alert variant="destructive" className="pointer-events-auto max-w-md border-red-600/80 bg-red-950/90 py-2 px-3 shadow-lg">
              <AlertDescription className="text-[11px] font-semibold leading-snug sm:text-xs">
                {OFFLINE_USER_MESSAGE}
              </AlertDescription>
            </Alert>
          </div>
        )}
        <ErrorBoundary name="StudentDashboard">
          <SchoolGate>
            <StudentDashboardInner
              studentId={activeStudentId}
              onDone={finishStudentSession}
              onRequestExit={handleStudentLogout}
              onReady={handleDashboardReady}
            />
          </SchoolGate>
        </ErrorBoundary>
        {studentTransition?.id === activeStudentId && (
          <StudentKioskTransitionFlash
            className={cn(
              'transition-opacity duration-300 ease-out',
              studentTransition.phase === 'exiting' && 'opacity-0',
            )}
          />
        )}
      </>
    );
  }

  return (
    <ErrorBoundary name="StudentLoginPage">
      {/* Single column fills #screen-view so the scanner stays vertically centered in the viewport (not clustered top). */}
      <div className="flex w-full flex-1 flex-col min-h-dvh">
        <TooltipProvider>
          <div
            className={cn(
              'flex min-h-0 w-full flex-1 flex-col items-center justify-center px-4 py-4 font-sans',
              isGraphic
                ? 'animate-in fade-in zoom-in-95 duration-200 motion-reduce:animate-none motion-reduce:duration-0'
                : '',
            )}
            style={{
              ...appearanceVarsForSurface(settings, 'redeem'),
            } as any}
          >
            {syncStatus === 'offline' && (
              <Alert variant="destructive" className="no-print mb-3 w-full max-w-lg border-red-600/70 py-2 px-3">
                <AlertDescription className="text-xs font-semibold leading-snug">
                  {OFFLINE_USER_MESSAGE}
                </AlertDescription>
              </Alert>
            )}
            <StudentScanner
              onStudentFound={onScannerStudent}
              icon={<LevelUpKioskLogo className="" />}
            />
          </div>
        </TooltipProvider>
        <KioskSponsorBanner />
      </div>
    </ErrorBoundary>
  );
}





