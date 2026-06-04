'use client';

import { useState, useEffect, useRef, useCallback, useMemo, Suspense, RefObject } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useKioskAiFunAndVoucherIdleActive } from '@/hooks/useKioskAiFunAndVoucherIdle';
import { useKioskBackendWarmup } from '@/hooks/useKioskBackendWarmup';
import { useKioskSnapshotReporter } from '@/hooks/useSchoolSurfaceSnapshotReporter';
import { usePrizeAiFunAudienceCacheReset } from '@/hooks/usePrizeAiFunAudienceCacheReset';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { usePrizeShelfWedgeScan } from '@/hooks/usePrizeShelfWedgeScan';
import { preloadBarcodeScanStack } from '@/lib/barcodeCameraScan';
import { syncKioskBarcodeCameraWarm } from '@/lib/barcodeCameraSession';
import { readKioskLoginTab } from '@/lib/kiosk/kioskSessionPrefs';
import { useSettings } from '@/components/providers/SettingsProvider';
import { PrinterReminderCallout } from '@/components/coupons/PrinterReminderCallout';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useFirebase, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc, where, getDocs, updateDoc, addDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { SchoolGate } from '@/components/auth/SchoolGate';
import dynamic from 'next/dynamic';
import type { StudentFoundMeta } from '@/components/student/StudentScanner';
import { LevelUpKioskLogo } from '@/components/logos/LevelUpKioskLogo';
import { KioskSponsorBanner } from '@/components/kiosk/KioskSponsorBanner';
import { KioskWedgeCameraAssist } from '@/components/kiosk/KioskWedgeCameraAssist';

// ~32 KB (plus @vladmandic/face-api on the face tab). Load only when the
// kiosk actually needs to scan a student.
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Student, Prize, HistoryItem, Class, House, LibraryItem, PrizeAiFunReward, Category } from '@/lib/types';
import {
  computeDaysOverdue,
  getLibraryPolicyFromSettings,
  isLibraryStudentKioskCheckoutEnabled,
} from '@/lib/library/libraryPolicy';
import { StudentLibraryCheckoutsCard } from '@/components/student-kiosk/StudentLibraryCheckoutsCard';
import { StudentKioskThemeButton } from '@/components/student-kiosk/StudentKioskThemeButton';
import {
  StudentKioskEmojiBadge,
  StudentKioskProfileExtras,
} from '@/components/student-kiosk/StudentKioskProfileExtras';
import { StudentKioskActivityPreview } from '@/components/student-kiosk/StudentKioskActivityPreview';
import { StudentActivityList } from '@/components/student-kiosk/StudentActivityList';
import { StudentPrizeShopCard } from '@/components/student-kiosk/StudentPrizeShopCard';
import type { PrizeRedeemTicket } from '@/components/prizes/PrizeRedeemTicketPrintSheet';
import {
  StudentKioskTopBar,
  StudentKioskPointCategoriesPanel,
} from '@/components/student-kiosk/StudentKioskTopBar';
import { performKioskAttendanceSignIn, describeAttendanceKioskOutcome } from '@/lib/attendance/kioskSignIn';
import DynamicIcon from '@/components/DynamicIcon';
import { Progress } from '@/components/ui/progress';
import { useReducedMotion } from 'framer-motion';
import { useStaggeredCardListEntrance } from '@/hooks/useStaggeredCardListEntrance';
import { cn, getStudentNickname, getContrastColor } from '@/lib/utils';
import { ensureContrast, resolveStudentThemeWithSchoolDefault, primaryForegroundFor } from '@/lib/themeContrast';
import { globalAnimatedBackdropActive } from '@/lib/animatedBackdrop';
import { getReadableErrorMessage, OFFLINE_USER_MESSAGE } from '@/lib/errorMessage';
import { resolvePrizeShelfScanForStudent } from '@/lib/prizes/prizeShelfScan';
import { buildPrizeRedeemTicketPayload } from '@/lib/prizes/buildPrizeRedeemTicket';
import { isPrizeScanCode } from '@/lib/prizes/prizeScanCode';
import { isPrizeVoucherScanCode } from '@/lib/prizes/prizeVoucherScanCode';
import { runMotor as runVendingMotor, isConnected as motorIsConnected } from '@/lib/vendingMotor';
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
  Lock,
  Unlock,
  Loader2,
  Clock,
  Gift,
  Ticket,
  GraduationCap,
  CheckCircle2,
  LogOut,
  Printer,
  ScanBarcode,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GoogleFontLoader } from '@/components/themes/GoogleFontLoader';
import { Balloons, BirthdayHat, Confetti } from '@/components/themes/BirthdayFX';

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
import { EarnedBadgesShowcase } from '@/components/badges/EarnedBadgesShowcase';
import { useStudentKioskSession } from '@/components/providers/StudentKioskSessionProvider';
import { FaceMismatchBanner } from '@/components/student/FaceMismatchBanner';
import { appearanceVarsForSurface } from '@/lib/appearance';
import { STUDENT_KIOSK_REQUEST_EXIT_EVENT } from '@/lib/students/studentKiosk';
import { setStudentKioskSignedIn } from '@/lib/students/studentLayoutChrome';
import { studentSeesWelcomeBackOverlay, studentSeesWelcomePage } from '@/lib/students/studentWelcome';
import { prizeIsListed, studentSeesPrizeByTeachers } from '@/lib/prizes/prizeUtils';
import { prizeAppearsInRewardsShop, resolveAiFunApiMode, withUnifiedAiFunPrize } from '@/lib/aiJokePrize';
import { floorRaffleFullTickets, parseRafflePointsPerTicket } from '@/lib/raffleTickets';
import {
  canonicalAiSurpriseText,
  isAiSurpriseTextRecentlySeen,
  rememberAiSurprise,
  type AiSurpriseKind,
} from '@/lib/prizes/prizeAiFunClientStorage';
import { acrosticFirstNameFromStudent, buildFallbackAcrostic } from '@/lib/prizes/prizeAiFunAcrostic';
import { requestPrizeAiFunSurprise } from '@/lib/prizes/prizeAiFunRequest';
import { prizeAiFunAgeBandKey, studentAgeYearsFromBirthday } from '@/lib/students/studentAiFunAge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthFetch } from '@/lib/authFetch';
import { WelcomeOverlay } from '@/components/welcome/WelcomeOverlay';
import { StudentKioskTransitionFlash } from '@/components/student/StudentKioskTransitionFlash';
import { isPillarOn, isStudentRewardsUiOn } from '@/lib/productPillars';
import {
  StudentKioskWarmBackdrop,
  StudentKioskRewardRail,
  StudentKioskRedeemHero,
  StudentKioskLogoutControls,
  studentKioskCenterStackClass,
  StudentKioskMorePrizesButton,
  StudentKioskMoreActivityButton,
  StudentKioskMobileRewardsGrid,
} from '@/components/student-kiosk/StudentKioskRedeemUI';
import { StudentKioskFadeScrollPane } from '@/components/student-kiosk/StudentKioskFadeScrollPane';
import { getStudentPointTypeTotals } from '@/lib/students/studentPointTypes';
import {
  COUPON_TRASH_REMINDER,
  couponRedeemStudentMessage,
  requestCouponRedeemCompliment,
} from '@/lib/coupons/couponRedeemCompliment';

const STUDENT_TRANSITION_MIN_VISIBLE_MS = 650;
const STUDENT_TRANSITION_EXIT_MS = 320;
/** If the dashboard never signals ready (e.g. Firestore error), do not leave the full-screen transition layer up indefinitely. */
const STUDENT_TRANSITION_FAILSAFE_MS = 30_000;

const PrizeDashboard = dynamic(
  () => import('@/app/[schoolId]/prize/PrizeDashboard').then((m) => m.PrizeDashboard),
  {
    ssr: false,
    loading: () => null,
  },
);

const AI_SURPRISE_KIND_LABEL: Record<string, string> = {
  joke: 'Your joke',
  riddle: 'Your riddle',
  fortune: 'Fortune teller',
  acrostic: 'Your name poem',
};

type PrizeSurprise = { kind: AiSurpriseKind; text: string; answer?: string };

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
  firstName?: string,
): PrizeSurprise {
  const roll =
    mode === 'random'
      ? (['joke', 'riddle', 'fortune', 'acrostic'] as const)[Math.floor(Math.random() * 4)]
      : mode === 'picker'
        ? 'joke'
        : mode === 'riddle' || mode === 'fortune' || mode === 'acrostic'
          ? mode
          : 'joke';
  const kind = roll;
  if (kind === 'acrostic') {
    return buildFallbackAcrostic(firstName || 'Star');
  }
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
  const searchParams = useSearchParams();
  const { redeemCoupon, redeemPrize, fulfillPrizeVoucherFromScan, printPrizeTickets, schoolId, isKioskLocked, badges, syncStatus } = useAppContext();
  const firestore = useFirestore();
  const { functions, auth } = useFirebase();
  const { toast } = useToast();
  const { settings } = useSettings();
  const { kioskAiFunActive, markKioskRewardsActivity } = useKioskAiFunAndVoucherIdleActive(
    settings.kioskAiFunIdleOffSec,
    isKioskLocked,
  );
  const kioskAutoLogoutOn = settings.kioskAutoLogoutEnabled !== false;
  const kioskAiFunInShop = settings.enablePrizeAiSurprise === true && kioskAiFunActive;
  const loginScanEnabled = settings.kioskLoginTabScanEnabled !== false;
  const explicitCouponCamera =
    settings.kioskCouponRedemptionCameraEnabled === true &&
    settings.kioskCouponRedemptionManualEnabled === false;
  const kioskPrefersCameraLogin = readKioskLoginTab(schoolId) === 'camera';
  /** Camera coupons only when Scan tab is the active kiosk preference, or explicitly enabled in settings. */
  const showCameraCoupon =
    explicitCouponCamera || (loginScanEnabled && kioskPrefersCameraLogin);
  const showManualCoupon = !showCameraCoupon && settings.kioskCouponRedemptionManualEnabled !== false;
  const couponSectionEnabled = showManualCoupon || showCameraCoupon;
  const libraryKioskCheckoutOn = isLibraryStudentKioskCheckoutEnabled(settings);
  const libraryScanHint = libraryKioskCheckoutOn
    ? ' Scan the LIB sticker on a library book here to check out or return (same place as coupons).'
    : '';
  const libraryCheckoutNote = libraryKioskCheckoutOn
    ? 'Library books: scan the LIB sticker on the book cover (same scanner as coupons) to check out or return.'
    : undefined;
  const couponHelperText = showCameraCoupon
    ? `Scan a coupon with the device camera.${libraryScanHint} Use Logout on this card to exit.`
    : `Scan or type a coupon code to add points.${libraryScanHint} Use Logout on this card to exit.`;
  const prefersReducedMotion = useReducedMotion();
  const authFetch = useAuthFetch();
  const isGraphic = settings.graphicMode === 'graphics';
  const animBackdrop = globalAnimatedBackdropActive(settings);
  const signInRecordedRef = useRef(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const hasShownWelcomeRef = useRef<string | null>(null);
  const dismissWelcome = useCallback(() => setShowWelcome(false), []);

  // Wake Lock and auth token refresh are now handled globally at the top level of StudentLoginPage
  // to protect the session during both active and idle login scanner states.

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

  const houseDocRef = useMemoFirebase(
    () =>
      schoolId &&
      student?.houseId &&
      settings.enableHouses &&
      settings.showHouseOnStudentKiosk !== false
        ? doc(firestore, 'schools', schoolId, 'houses', student.houseId)
        : null,
    [firestore, schoolId, student?.houseId, settings.enableHouses, settings.showHouseOnStudentKiosk],
  );
  const { data: studentHouse } = useDoc<House>(houseDocRef);

  usePrizeAiFunAudienceCacheReset(schoolId, studentId, student);

  useEffect(() => {
    if (!schoolId || studentLoading) return;
    // Dismiss kiosk transition once the student doc subscription has settled, even when the doc is missing or errored (otherwise the full-screen flash never clears).
    onReady?.(studentId);
  }, [onReady, schoolId, studentId, studentLoading]);

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

  const categoriesQuery = useMemoFirebase(
    () => (schoolId && settings.payLibrary !== false ? collection(firestore, 'schools', schoolId, 'categories') : null),
    [firestore, schoolId, settings.payLibrary],
  );
  const { data: categories } = useCollection<Category>(categoriesQuery);

  const libraryPolicy = useMemo(
    () => getLibraryPolicyFromSettings(settings, categories),
    [settings, categories],
  );

  const libraryCheckoutsQuery = useMemoFirebase(
    () =>
      schoolId && settings.payLibrary !== false
        ? query(
            collection(firestore, 'schools', schoolId, 'library'),
            where('checkedOutTo', '==', studentId),
          )
        : null,
    [firestore, schoolId, studentId, settings.payLibrary],
  );
  const { data: libraryCheckoutsRaw } = useCollection<LibraryItem>(libraryCheckoutsQuery);
  const myLibraryBooks = useMemo(
    () => (libraryCheckoutsRaw ?? []).filter((i) => i.status === 'checked_out'),
    [libraryCheckoutsRaw],
  );
  const overdueLibraryBooks = useMemo(
    () => myLibraryBooks.filter((i) => computeDaysOverdue(i.dueAt) > 0),
    [myLibraryBooks],
  );
  const studentClassLabel = useMemo(() => {
    if (!student?.classId || !classes?.length) return 'Unassigned';
    return classes.find((c) => c.id === student.classId)?.name ?? 'Unassigned';
  }, [student?.classId, classes]);

  const rewardGridRef = useRef<HTMLDivElement>(null);

  useStaggeredCardListEntrance(rewardGridRef, {
    dependencies: [rewardPrizes, prizesLoading],
    skip: prizesLoading,
    reducedMotion: !!prefersReducedMotion,
  });

  const [couponCode, setCouponCode] = useState('');
  const [flyPointsValue, setFlyPointsValue] = useState<number | null>(null);
  const [flyCompliment, setFlyCompliment] = useState<string | null>(null);
  const [flyPointsReason, setFlyPointsReason] = useState<string | null>(null);
  const flyDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      if (flyDismissTimerRef.current) clearTimeout(flyDismissTimerRef.current);
    };
  }, []);

  const [showRedeem, setShowRedeem] = useState(true);
  const scheduleFlyDismiss = useCallback((ms: number) => {
    if (flyDismissTimerRef.current) clearTimeout(flyDismissTimerRef.current);
    flyDismissTimerRef.current = setTimeout(() => {
      setFlyPointsValue(null);
      setFlyCompliment(null);
      setFlyPointsReason(null);
      setShowRedeem(false);
      flyDismissTimerRef.current = null;
    }, ms);
  }, []);
  const [confirmingPrize, setConfirmingPrize] = useState<Prize | null>(null);
  const [confirmingFunKind, setConfirmingFunKind] = useState<PrizeAiFunReward>('joke');
  const [isRedeemingPrize, setIsRedeemingPrize] = useState(false);
  const [prizeTicketData, setPrizeTicketData] = useState<PrizeRedeemTicket | null>(null);
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
    const kind =
      s!.kind === 'riddle' || s!.kind === 'fortune' || s!.kind === 'acrostic' ? s!.kind : 'joke';
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
  }, [isKioskLocked, kioskAutoLogoutOn, logoutTimer, onDone, toast]);

  useEffect(() => {
    if (isKioskLocked || !kioskAutoLogoutOn) return;
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
  }, [isKioskLocked, kioskAutoLogoutOn, resetLogoutTimer]);

  const [hasCameraPermission, setHasCameraPermission] = useState(true);

  const couponCameraScannerOn = showRedeem && showCameraCoupon;

  useEffect(() => {
    if (loginScanEnabled || showCameraCoupon) preloadBarcodeScanStack();
    syncKioskBarcodeCameraWarm({
      loginScan: false,
      couponCamera: showCameraCoupon,
    });
  }, [loginScanEnabled, showCameraCoupon]);

  const { videoRef, hasCameraPermission: hookHasPermission, zoom: cameraZoom, setZoom: setCameraZoom, scanStatus } = useBarcodeScanner(
    couponCameraScannerOn,
    (code) => handleRedeemCoupon(code),
    (err) => {
      setHasCameraPermission(false);
      toast({ variant: 'destructive', title: 'Camera Error', description: err });
    },
    {
      cameraEnabled: showCameraCoupon,
      keepCameraWarm: showCameraCoupon,
      showScanFeedback: true,
    },
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
 
  // --- Birthday bonus points (when enabled in school settings) ---
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
    schoolId,
    functions,
    playSound,
    queueCelebration,
  ]);

  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [fullPrizeShopOpen, setFullPrizeShopOpen] = useState(false);

  const openFullPrizeShop = useCallback(() => {
    playSound('click');
    setFullPrizeShopOpen(true);
  }, [playSound]);

  const closeFullPrizeShop = useCallback(() => {
    playSound('click');
    setFullPrizeShopOpen(false);
    if (searchParams.get('shop') === 'prizes' && schoolId) {
      router.replace(`/${schoolId}/student`, { scroll: false });
    }
  }, [playSound, router, schoolId, searchParams]);

  useEffect(() => {
    setFullPrizeShopOpen(false);
  }, [studentId]);

  useEffect(() => {
    if (searchParams.get('shop') === 'prizes') {
      setFullPrizeShopOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    void import('@/app/[schoolId]/prize/PrizeDashboard');
  }, []);

  const handlePrizeShelfScan = useCallback(
    async (raw: string) => {
      if (!student || !schoolId || !firestore || isRedeemingPrize) return;
      resetLogoutTimer();

      const resolved = await resolvePrizeShelfScanForStudent(
        firestore,
        schoolId,
        raw,
        rewardPrizes,
        student,
        { enablePrizeAiSurprise: kioskAiFunInShop },
      );
      if ('error' in resolved) {
        playSound('error');
        toast({
          variant: 'destructive',
          title: resolved.error.title,
          description: resolved.error.description,
        });
        return;
      }

      playSound('click');
      setConfirmingPrize(resolved.prize);
      if (resolved.prize.aiFunReward === 'picker') {
        setConfirmingFunKind('joke');
      }
    },
    [
      firestore,
      isRedeemingPrize,
      kioskAiFunInShop,
      playSound,
      resetLogoutTimer,
      rewardPrizes,
      schoolId,
      student,
      toast,
    ],
  );

  const handlePickupVoucherScan = useCallback(
    async (raw: string) => {
      if (!student || !schoolId) return;
      resetLogoutTimer();
      try {
        const result = await fulfillPrizeVoucherFromScan(raw, student.id);
        if (!result.success) {
          playSound('error');
          toast({
            variant: 'destructive',
            title: 'Pickup failed',
            description: result.message || 'Could not use this voucher.',
          });
          return;
        }
        if (result.status === 'already_fulfilled') {
          playSound('error');
          toast({
            variant: 'destructive',
            title: 'Already used',
            description: 'This pickup voucher was already scanned.',
          });
          return;
        }

        playSound('success');
        toast({
          title: 'Pickup complete!',
          description: result.prizeName
            ? `Enjoy your ${result.prizeName}.`
            : 'Your prize is ready to collect.',
        });

        const prize =
          result.prizeId && rewardPrizes.length > 0
            ? rewardPrizes.find((p) => p.id === result.prizeId) ?? null
            : null;
        const qty = Math.max(1, result.quantity ?? 1);
        if (settings.enableVendingMachine && prize?.vendingMotor?.enabled) {
          if (!motorIsConnected()) {
            toast({
              variant: 'destructive',
              title: 'Motor not connected',
              description: 'This prize dispenses from the vending machine, but no motor is connected here.',
            });
          } else {
            for (let i = 0; i < qty; i++) {
              try {
                await runVendingMotor(prize.vendingMotor);
              } catch (motorErr) {
                console.error('Vending motor dispense failed:', motorErr);
                toast({
                  variant: 'destructive',
                  title: 'Motor error',
                  description: getReadableErrorMessage(motorErr, 'The vending motor failed.'),
                });
                break;
              }
            }
          }
        }
      } catch (e) {
        playSound('error');
        toast({
          variant: 'destructive',
          title: 'Pickup failed',
          description: getReadableErrorMessage(e, 'Could not scan this voucher.'),
        });
      }
    },
    [
      fulfillPrizeVoucherFromScan,
      playSound,
      resetLogoutTimer,
      rewardPrizes,
      schoolId,
      settings.enableVendingMachine,
      student,
      toast,
    ],
  );

  const handleRedeemCoupon = useCallback(async (codeToRedeem?: string) => {
    if (!student) return;
    const raw = (codeToRedeem || couponCode).trim();
    if (!raw) return;
    resetLogoutTimer();

    if (isPrizeVoucherScanCode(raw)) {
      await handlePickupVoucherScan(raw);
      setCouponCode('');
      return;
    }

    if (schoolId && firestore && isPrizeScanCode(raw)) {
      await handlePrizeShelfScan(raw);
      setCouponCode('');
      return;
    }

    const code = raw.toUpperCase();

    // 1. Check Library Item first (when student kiosk checkout is enabled)
    if (libraryKioskCheckoutOn && firestore && schoolId) {
      try {
        const { performLibraryCheckoutOrReturn } = await import('@/lib/library/libraryOperations');
        const result = await performLibraryCheckoutOrReturn(firestore, schoolId, student.id, code, {
          policy: libraryPolicy,
          functions,
        });
        if (result.action === 'checkout') {
          playSound('success');
          const dueHint =
            result.dueAt != null
              ? ` Due ${new Date(result.dueAt).toLocaleDateString()}.`
              : '';
          toast({
            title: 'Library — Checked out',
            description: `"${result.item.name}" is on your account.${dueHint} Scan again to return.`,
          });
          setCouponCode('');
          return;
        }
        if (result.action === 'return') {
          playSound('success');
          toast({
            title: 'Library — Returned',
            description:
              result.pointsMessage ||
              `Thank you for returning "${result.item.name}".`,
          });
          setCouponCode('');
          return;
        }
        if (result.action === 'wrong_borrower') {
          playSound('error');
          toast({
            variant: 'destructive',
            title: 'Library',
            description: 'This book is checked out to another student.',
          });
          setCouponCode('');
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
        const points = result.value || 0;
        const category = result.category || 'Coupon';
        const complimentsOn = settings.enableCouponRedeemCompliments !== false;
        let compliment: string | null = null;

        if (complimentsOn && schoolId) {
          compliment = await requestCouponRedeemCompliment(authFetch, {
            schoolId,
            category,
            points,
            firstName: getStudentNickname(student),
            birthday: student.birthday,
          });
        }

        const studentMessage = couponRedeemStudentMessage({
          points,
          compliment,
          includeTrashReminder: true,
        });

        toast({
          title: 'Coupon Redeemed!',
          description: studentMessage,
        });
        animationKey.current += 1;
        setFlyCompliment(compliment);
        setFlyPointsValue(points);
        setFlyPointsReason(category);
        scheduleFlyDismiss(complimentsOn && compliment ? 3200 : 1800);
        if (settings.enableGoals && schoolId && firestore) {
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
      setCouponCode('');
    }
  }, [
    couponCode,
    resetLogoutTimer,
    redeemCoupon,
    student,
    toast,
    playSound,
    libraryKioskCheckoutOn,
    settings.enableGoals,
    settings.enableCouponRedeemCompliments,
    authFetch,
    firestore,
    schoolId,
    libraryPolicy,
    functions,
    scheduleFlyDismiss,
    handlePrizeShelfScan,
    handlePickupVoucherScan,
  ]);

  const handleRedeemPrizePickupVoucher = useCallback(async () => {
    if (!student || !confirmingPrize || confirmingPrize.offerPrintTicketOnRedeem !== true) return;
    resetLogoutTimer();
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Offline', description: OFFLINE_USER_MESSAGE });
      return;
    }

    setIsRedeemingPrize(true);
    try {
      const prize = confirmingPrize;
      const result = await redeemPrize(student.id, prize, 1, undefined, { issuePickupVoucher: true });
      if (!result.success || !result.activityId || !result.redeemedAt || typeof result.totalCost !== 'number') {
        throw new Error(result.message || 'Could not issue pickup voucher.');
      }
      if (!result.voucherScanCode) {
        throw new Error('Pickup barcode was not created. Try again.');
      }

      playSound('redeem');
      toast({
        title: 'Pickup voucher ready',
        description: `Print the voucher, then scan its barcode at the pickup kiosk for ${prize.name}.`,
      });

      if (settings.enableGoals && schoolId && firestore) {
        void import('@/lib/goalsProgress').then((m) =>
          m.syncGoalsForStudent(firestore, schoolId, student.id).catch(() => {}),
        );
      }

      setPrizeTicketData(
        buildPrizeRedeemTicketPayload({ ...student, id: studentId }, prize, result.activityId, result.redeemedAt, result.totalCost, 1, {
          enableStudentThemes: settings.enableStudentThemes !== false,
          defaultStudentTheme: settings.defaultStudentTheme ?? undefined,
          enableStudentEmojiOnPrizeTickets: settings.enableStudentEmojiOnPrizeTickets === true,
          voucherScanCode: result.voucherScanCode,
        }),
      );
      setConfirmingPrize(null);
    } catch (e: unknown) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Voucher failed',
        description: getReadableErrorMessage(e, 'Could not issue pickup voucher.'),
      });
    } finally {
      setIsRedeemingPrize(false);
    }
  }, [
    confirmingPrize,
    firestore,
    playSound,
    redeemPrize,
    resetLogoutTimer,
    schoolId,
    settings.defaultStudentTheme,
    settings.enableGoals,
    settings.enableStudentEmojiOnPrizeTickets,
    settings.enableStudentThemes,
    student,
    toast,
  ]);

  usePrizeShelfWedgeScan({
    enabled: Boolean(student && schoolId) && !fullPrizeShopOpen,
    busy: isRedeemingPrize || !!confirmingPrize,
    onScan: (raw) => {
      if (isPrizeVoucherScanCode(raw)) void handlePickupVoucherScan(raw);
      else void handlePrizeShelfScan(raw);
    },
  });

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

      if (settings.enableGoals && schoolId && firestore) {
        void import('@/lib/goalsProgress').then((m) =>
          m.syncGoalsForStudent(firestore, schoolId, student.id).catch(() => {}),
        );
      }

      const { activityId, redeemedAt, totalCost } = result;
      let ticketPayload: typeof prizeTicketData = null;
      if (
        prize.offerPrintTicketOnRedeem === true &&
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

      if (prize.aiFunReward && schoolId && settings.enablePrizeAiSurprise === true && kioskAiFunActive) {
        const aiCooldownOk = Date.now() - lastAiSurpriseCallRef.current > 10_000;
        if (!aiCooldownOk) {
          if (ticketPayload) setPrizeTicketData(ticketPayload);
        } else {
          lastAiSurpriseCallRef.current = Date.now();
          pendingPrizeTicketAfterAiRef.current = ticketPayload;
          const apiMode = resolveAiFunApiMode(prize, prize.aiFunReward === 'picker' ? confirmingFunKind : undefined);
          const requestId = aiSurpriseRequestIdRef.current + 1;
          aiSurpriseRequestIdRef.current = requestId;
          const acrosticName = acrosticFirstNameFromStudent(student);
          const stockKind: AiSurpriseKind =
            apiMode === 'riddle' || apiMode === 'fortune' || apiMode === 'acrostic'
              ? apiMode
              : apiMode === 'joke'
                ? 'joke'
                : (['joke', 'riddle', 'fortune', 'acrostic'] as const)[Math.floor(Math.random() * 4)];
          const instantSurprise = fallbackPrizeSurprise(
            apiMode,
            prize.name,
            lastAiSurpriseTextRef.current,
            acrosticName,
          );
          const sessionExtraAvoid = lastAiSurpriseTextRef.current?.trim()
            ? [lastAiSurpriseTextRef.current.trim()]
            : [];
          const ageYears = studentAgeYearsFromBirthday(student?.birthday);
          const ageBand = prizeAiFunAgeBandKey(ageYears);
          lastAiSurpriseTextRef.current = instantSurprise.text;
          setAiSurpriseBody(instantSurprise);
          rememberAiSurprise(schoolId, instantSurprise, ageBand);
          setAiSurpriseLoading(stockKind === 'acrostic');
          setAiSurpriseOpen(true);
          void (async () => {
            const controller = new AbortController();
            const timeoutId = window.setTimeout(() => controller.abort(), stockKind === 'acrostic' ? 8000 : 1200);
            try {
              const body = await requestPrizeAiFunSurprise(authFetch, {
                schoolId,
                mode: stockKind,
                ageBand,
                ageYears,
                firstName: stockKind === 'acrostic' ? acrosticName : undefined,
                extraAvoid: [...sessionExtraAvoid, instantSurprise.text],
                signal: controller.signal,
              });
              if (!body || aiSurpriseRequestIdRef.current !== requestId) return;
              const text = body.text.trim();
              if (!text) return;
              const canonInstant = canonicalAiSurpriseText(instantSurprise.text);
              if (canonicalAiSurpriseText(text) === canonInstant) return;
              if (isAiSurpriseTextRecentlySeen(schoolId, body.kind, text, ageBand)) return;
              lastAiSurpriseTextRef.current = text;
              setAiSurpriseBody(body);
              rememberAiSurprise(schoolId, body, ageBand);
            } catch (e: unknown) {
              if ((e as { name?: string })?.name !== 'AbortError') {
                console.warn('Prize AI surprise unavailable:', e);
              }
            } finally {
              window.clearTimeout(timeoutId);
              setAiSurpriseLoading(false);
            }
          })();
        }
      } else if (ticketPayload) {
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
  }, [authFetch, confirmingFunKind, confirmingPrize, playSound, redeemPrize, resetLogoutTimer, schoolId, settings.defaultStudentTheme, settings.enableStudentThemes, settings.enablePrizeAiSurprise, settings.enableStudentEmojiOnPrizeTickets, settings.enableGoals, student, toast, firestore, kioskAiFunActive]);

  const handlePrintPrizeTicket = useCallback(() => {
    if (!prizeTicketData) return;
    setPrizeTicketData(null);
    const surpriseText = prizeTicketData.aiSurpriseText?.trim();
    const surpriseExtras = surpriseText
      ? {
          aiSurpriseKind: prizeTicketData.aiSurpriseKind ?? 'joke',
          aiSurpriseText: surpriseText,
          aiSurpriseAnswer:
            prizeTicketData.aiSurpriseKind === 'riddle' && prizeTicketData.aiSurpriseAnswer?.trim()
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
    if (!isStudentRewardsUiOn(settings)) return null;
    if (!settings.enableWeeklyRaffle) return null;
    const { isGeneralRaffle, pointsPerTicket } = parseRafflePointsPerTicket(settings.rafflePointsPerTicket);
    if (isGeneralRaffle || pointsPerTicket < 1) return null;
    return {
      count: floorRaffleFullTickets(student?.points ?? 0, pointsPerTicket),
      pointsPerTicket,
      equalOddsNote: !!settings.raffleOneEntryPerStudent,
    };
  }, [
    settings,
    student?.points,
  ]);

  const pointTypeTotals = useMemo(
    () => (student ? getStudentPointTypeTotals(student) : []),
    [student],
  );

  const eligibleRewards = useMemo(
    () => {
      if (!student) return [];
      return rewardPrizes
        .filter(
          (p) =>
            prizeAppearsInRewardsShop(p, { enablePrizeAiSurprise: kioskAiFunInShop }) &&
            prizeIsListed(p) &&
            p.points <= student.points &&
            studentSeesPrizeByTeachers(student, p) &&
            (!p.classId || student.classId === p.classId),
        )
        .sort((a, b) => b.points - a.points);
    },
    [rewardPrizes, student, kioskAiFunInShop],
  );

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

  const fontScale = effectiveTheme?.fontScale ?? 1.1;
  const themeBg = effectiveTheme?.background || '#020617';
  const themeCard = effectiveTheme?.cardBackground || themeBg;
  const computedThemeText = effectiveTheme?.text || (getContrastColor(themeBg) === 'black' ? '#020617' : '#ffffff');
  const computedThemePageText = effectiveTheme ? ensureContrast(computedThemeText, themeBg, 4.5) : computedThemeText;
  const computedThemeCardText = effectiveTheme ? ensureContrast(computedThemeText, themeCard, 4.5) : computedThemeText;
  const primaryForeground = effectiveTheme ? primaryForegroundFor(effectiveTheme) : '#ffffff';
  const portalRaffleFooter = portalRaffleTickets ? (
    <div
      className="flex items-center justify-between gap-2 text-xs font-bold sm:text-sm"
      style={effectiveTheme ? { color: 'var(--theme-text)' } : undefined}
      title={
        `Raffle: ${portalRaffleTickets.count === 1 ? '1 ticket' : `${portalRaffleTickets.count} tickets`} at ${portalRaffleTickets.pointsPerTicket} points per ticket.`
      }
    >
      <span className="flex items-center gap-1.5">
        <Ticket className="h-4 w-4 shrink-0 opacity-75" aria-hidden />
        Raffle tickets
      </span>
      <span
        className="tabular-nums"
        style={effectiveTheme ? { color: 'var(--theme-primary)' } : undefined}
      >
        {portalRaffleTickets.count.toLocaleString()}
      </span>
    </div>
  ) : undefined;
  const themeSurfaceStyle: React.CSSProperties | undefined = effectiveTheme
    ? ({
        '--theme-bg': themeBg,
        '--theme-page-text': computedThemePageText,
        '--theme-text': computedThemeCardText,
        '--theme-text-muted': `${computedThemeCardText}b3`,
        '--theme-primary': effectiveTheme.primary || 'hsl(var(--primary))',
        '--theme-primary-foreground': primaryForeground,
        '--theme-card': themeCard,
        '--theme-accent': effectiveTheme.accent || 'hsl(var(--accent))',
        backgroundColor: 'var(--theme-card)',
        color: 'var(--theme-text)',
        borderColor: 'color-mix(in srgb, var(--theme-primary) 42%, transparent)',
      } as unknown as React.CSSProperties)
    : undefined;

  const welcomeBackdropActive =
    showWelcome && studentSeesWelcomeBackOverlay(settings, student);

  const profileExtrasBlock = (
    <StudentKioskProfileExtras
      birthdayToday={birthdayToday}
      studentHouse={studentHouse}
      welcomeStylesHref={schoolId ? `/${schoolId}/student/welcome` : null}
      showWelcomeStyles={studentSeesWelcomePage(settings, student)}
      themed={!!effectiveTheme}
    />
  );

  const headerEmojiBadge = (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <StudentKioskEmojiBadge customEmojiUrl={student.customEmojiUrl} themed={!!effectiveTheme} />
      {schoolId && settings.enableStudentThemes !== false ? (
        <StudentKioskThemeButton
          schoolId={schoolId}
          student={student}
          classLabel={studentClassLabel}
          themed={!!effectiveTheme}
          primaryForeground={primaryForeground}
          layout="inline"
        />
      ) : null}
    </div>
  );

  const wedgeDemoCameraActive =
    settings.kioskWedgeDemoCameraEnabled === true &&
    showManualCoupon &&
    showRedeem &&
    couponSectionEnabled;

  return (
    <TooltipProvider>
      <>
      <KioskWedgeCameraAssist
        active={wedgeDemoCameraActive}
        onScan={(code) => void handleRedeemCoupon(code)}
        onError={(err) => {
          toast({ variant: 'destructive', title: 'Demo camera', description: err });
        }}
      />
      <div
        data-kiosk-snapshot-root
        className={cn(
          // Lock the dashboard to the viewport so inner panes scroll
          // (prevents Activity + CTA from falling below the fold).
          "student-dashboard-shell w-full h-dvh min-h-dvh relative overflow-x-hidden overflow-y-hidden flex flex-col",
          !effectiveTheme && 'student-kiosk-warm-shell',
          birthdayToday
            ? "pt-14 md:pt-16 [@media(max-height:760px)]:pt-12 [@media(max-height:760px)]:md:pt-12"
            : "pt-1 md:pt-3 [@media(max-height:760px)]:pt-1 [@media(max-height:760px)]:md:pt-2",
          settings.enableThemeAnimations && !!effectiveTheme && "theme-theme-elements-animated theme-motion-override",
          effectiveTheme && 'student-theme-surface',
          settings.displayMode === 'app' && 'pb-6',
          'pb-[max(0.5rem,env(safe-area-inset-bottom))]'
        )}
        style={effectiveTheme ? ({
          '--theme-bg': themeBg,
          '--theme-page-text': computedThemePageText,
          '--theme-text': computedThemeCardText,
          '--theme-primary': effectiveTheme.primary || 'hsl(var(--primary))',
          '--theme-primary-foreground': primaryForeground,
          '--theme-card': themeCard,
          '--theme-accent': effectiveTheme.accent || 'hsl(var(--accent))',
          ...(effectiveTheme.backgroundStyle
            ? { background: effectiveTheme.backgroundStyle }
            : {
                backgroundColor: themeBg,
                backgroundImage: `radial-gradient(circle at top left, ${effectiveTheme.primary || 'hsl(var(--primary))'}22 0, transparent 45%), radial-gradient(circle at bottom right, ${effectiveTheme.accent || 'hsl(var(--accent))'}22 0, transparent 55%)`,
              }),
          color: 'var(--theme-page-text)',
          fontFamily: effectiveTheme.fontFamily || 'inherit',
          fontSize: fontScale !== 1 ? `calc(var(--student-dashboard-density, 1) * ${fontScale}em)` : undefined,
          ...(typeof effectiveTheme.fontTracking === 'number'
            ? { letterSpacing: `${effectiveTheme.fontTracking}em` }
            : {}),
        } as unknown as React.CSSProperties) : ({
          fontSize: 'calc(var(--student-dashboard-density, 1) * 1.1em)',
          ...appearanceVarsForSurface(settings, 'redeem'),
        } as any)}
      >
        {effectiveTheme?.fontFamily && <GoogleFontLoader fontFamily={effectiveTheme.fontFamily} />}
        {!effectiveTheme ? <StudentKioskWarmBackdrop /> : null}

        <div className="relative z-10 mx-auto flex h-full min-h-0 w-full max-w-7xl flex-1 flex-col overflow-hidden px-4 md:px-8 [@media(max-height:760px)]:px-3">
        <div
          className={cn(
            "flex flex-1 flex-col min-h-0 min-w-0 w-full space-y-4 md:space-y-6 overflow-hidden [@media(max-height:760px)]:space-y-3",
            isGraphic
              ? "animate-in fade-in duration-200 motion-reduce:animate-none motion-reduce:duration-0"
              : "",
          )}
        >
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {celebrationMessage ||
            (flyPointsValue !== null
              ? couponRedeemStudentMessage({
                  points: flyPointsValue,
                  compliment: flyCompliment,
                  includeTrashReminder: true,
                })
              : '')}
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
            <div className="flex flex-col items-center gap-4 text-center px-6">
              <div className="animate-fly-up text-4xl md:text-6xl font-black tracking-widest text-emerald-400 drop-shadow-[0_0_14px_rgba(52,211,153,0.75)]">
                +{flyPointsValue} PTS
              </div>
              {flyPointsReason ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 text-2xl md:text-4xl font-black tracking-widest uppercase text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)] max-w-[28rem] leading-tight">
                  {flyPointsReason}
                </div>
              ) : null}
              {flyCompliment ? (
                <p className="animate-in fade-in slide-in-from-bottom-2 duration-500 text-sm md:text-base font-bold text-amber-100 drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] max-w-sm leading-snug">
                  {flyCompliment}
                </p>
              ) : null}
              <p className="animate-in fade-in slide-in-from-bottom-2 duration-500 text-sm md:text-base font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] max-w-xs leading-snug">
                {COUPON_TRASH_REMINDER}
              </p>
            </div>
          </div>
        )}

        {/* Graphic Elements */}
        {isGraphic && !effectiveTheme && (
          <div className="absolute -top-12 right-0 w-32 h-32 opacity-20 pointer-events-none z-0">
            <Star className="w-full h-full text-amber-400 fill-amber-400 opacity-80" />
          </div>
        )}

        <StudentKioskTopBar
            student={student}
            points={student.points ?? 0}
            themed={!!effectiveTheme}
            primaryForeground={primaryForeground}
            photoDisplayMode={settings.photoDisplayMode}
            nameExtras={headerEmojiBadge}
            trailingActions={
              <div className="flex flex-col items-end gap-2">
                {settings.enableBadges && headerBadges.length > 0 ? (
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    {headerBadges.map((b) => (
                      <div
                        key={b.id}
                        className="flex h-6 w-6 items-center justify-center rounded-full border border-border/50 bg-card/80 shadow-sm"
                        title={b.name}
                      >
                        <DynamicIcon
                          name={b.icon}
                          className="h-3.5 w-3.5"
                          style={b.accentColor ? { color: b.accentColor } : undefined}
                        />
                      </div>
                    ))}
                    {totalUniqueBadges > headerBadges.length ? (
                      <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">
                        +{totalUniqueBadges - headerBadges.length}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                <StudentKioskLogoutControls
                  themed={{ active: !!effectiveTheme }}
                  primaryForeground={primaryForeground}
                  isKioskLocked={isKioskLocked}
                  autoLogoutEnabled={kioskAutoLogoutOn}
                  logoutTimer={logoutTimer}
                  sessionTimeoutSec={settings.kioskSessionTimeoutSec ?? 10}
                  onLogout={handleManualLogout}
                />
              </div>
            }
        />
        {student.nickname?.trim() ? (
          <div className="mt-2 flex w-full shrink-0 flex-wrap items-center gap-2 px-0.5">
            <p
              className="truncate text-[10px] font-bold uppercase tracking-[0.2em] opacity-60"
              style={{ color: effectiveTheme ? 'var(--theme-page-text)' : undefined }}
            >
              {student.nickname.trim()}
            </p>
          </div>
        ) : null}

        <div className="relative z-10 flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
        <div
          className={cn(
            'relative z-10 flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-hidden pb-[max(0.75rem,env(safe-area-inset-bottom))]',
            '[@media(max-height:760px)]:gap-3 [@media(max-height:760px)]:pb-2',
            fullPrizeShopOpen && 'hidden',
          )}
        >
          {libraryKioskCheckoutOn && schoolId && myLibraryBooks.length > 0 ? (
            <StudentLibraryCheckoutsCard
              schoolId={schoolId}
              items={myLibraryBooks}
              themed={!!effectiveTheme}
              topAlert={overdueLibraryBooks.length > 0}
              kioskCheckoutEnabled
            />
          ) : null}

          <div
            className={cn(
              'grid min-h-0 w-full min-w-0 flex-1 gap-4 overflow-hidden xl:gap-5',
              'grid-cols-1 lg:grid-cols-[minmax(0,12.5rem)_minmax(0,1fr)_minmax(0,12.5rem)] lg:items-stretch',
              '[@media(max-height:760px)]:gap-2',
            )}
          >
          {/* Left prize rail (desktop) */}
          <aside className="order-2 hidden min-h-0 min-w-0 flex-col gap-2 overflow-hidden lg:order-1 lg:flex lg:max-w-[12.5rem]">
            <p
              className="shrink-0 text-center text-xs font-black uppercase tracking-[0.2em] opacity-80 sm:text-sm"
              style={effectiveTheme ? { color: 'var(--theme-page-text)' } : undefined}
            >
              Eligible prizes
            </p>
            <StudentKioskFadeScrollPane themed={!!effectiveTheme} contentRef={rewardGridRef}>
              {prizesLoading
                ? [...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="min-h-[15rem] w-full shrink-0 rounded-2xl" />
                  ))
                : eligibleRewards.map((reward) => (
                    <StudentPrizeShopCard
                      key={reward.id}
                      prize={reward}
                      studentPoints={student.points ?? 0}
                      themed={!!effectiveTheme}
                      primaryForeground={primaryForeground}
                      wholeCardClick
                      onRedeem={() => {
                        playSound('click');
                        setConfirmingPrize(reward);
                      }}
                    />
                  ))}
            </StudentKioskFadeScrollPane>
            <StudentKioskMorePrizesButton
              themed={{ active: !!effectiveTheme }}
              primaryForeground={primaryForeground}
              schoolId={schoolId}
              studentId={student.id}
              onClick={openFullPrizeShop}
            />
          </aside>

          {/* Center: redeem coupon (primary focus) */}
          <div
            className={cn(
              'order-1 flex min-h-0 min-w-0 flex-col gap-3 px-4 sm:px-6 lg:order-2 lg:min-h-full lg:justify-start lg:overflow-y-auto lg:px-8 lg:py-[clamp(0.75rem,6vh,3rem)] [@media(max-height:760px)]:gap-2',
              studentKioskCenterStackClass,
            )}
          >
          <StudentKioskRedeemHero
            themed={{ active: !!effectiveTheme }}
            primaryForeground={primaryForeground}
            couponHelperText={couponHelperText}
            libraryCheckoutNote={libraryCheckoutNote}
            couponCode={couponCode}
            setCouponCode={setCouponCode}
            showManualCoupon={showManualCoupon}
            showCameraCoupon={showCameraCoupon}
            couponSectionEnabled={couponSectionEnabled}
            onRedeemCoupon={() => void handleRedeemCoupon()}
            videoRef={videoRef}
            hasCameraPermission={hasCameraPermission}
            cameraZoom={cameraZoom}
            onCameraZoomChange={setCameraZoom}
            scanStatus={scanStatus}
          />

            <EarnedBadgesShowcase
              student={student}
              badges={badges || []}
              enableBadges={settings.enableBadges}
              theme={activeTheme}
            />

          </div>

          <aside className="order-3 hidden min-h-0 min-w-0 flex-col gap-2 overflow-hidden lg:order-3 lg:flex lg:max-w-[12.5rem]">
            <p
              className="shrink-0 text-center text-xs font-black uppercase tracking-[0.2em] opacity-80 sm:text-sm"
              style={effectiveTheme ? { color: 'var(--theme-page-text)' } : undefined}
            >
              Other info
            </p>
            <StudentKioskFadeScrollPane themed={!!effectiveTheme}>
              {profileExtrasBlock}
              <StudentKioskPointCategoriesPanel
                themed={!!effectiveTheme}
                totals={pointTypeTotals}
                footer={portalRaffleFooter}
              />
              {schoolId ? (
                <StudentKioskActivityPreview
                  schoolId={schoolId}
                  studentId={student.id}
                  themed={!!effectiveTheme}
                  variant="sidebar"
                  showFooterCta={false}
                  onViewAll={() => {
                    playSound('click');
                    setActivityDialogOpen(true);
                  }}
                />
              ) : null}
            </StudentKioskFadeScrollPane>
            {schoolId ? (
              <StudentKioskMoreActivityButton
                themed={{ active: !!effectiveTheme }}
                primaryForeground={primaryForeground}
                onClick={() => {
                  playSound('click');
                  setActivityDialogOpen(true);
                }}
              />
            ) : null}
          </aside>

          <div className="order-4 flex min-h-0 min-w-0 flex-col gap-2 overflow-hidden lg:hidden [@media(max-height:760px)]:gap-1.5">
            <p
              className="shrink-0 text-center text-xs font-black uppercase tracking-[0.2em] opacity-80 sm:text-sm"
              style={effectiveTheme ? { color: 'var(--theme-page-text)' } : undefined}
            >
              Other info
            </p>
            {profileExtrasBlock}
            <StudentKioskPointCategoriesPanel
              themed={!!effectiveTheme}
              totals={pointTypeTotals}
              footer={portalRaffleFooter}
            />
            {schoolId ? (
              <StudentKioskActivityPreview
                schoolId={schoolId}
                studentId={student.id}
                themed={!!effectiveTheme}
                variant="sidebar"
                showFooterCta={false}
                onViewAll={() => {
                  playSound('click');
                  setActivityDialogOpen(true);
                }}
              />
            ) : null}
            {schoolId ? (
              <StudentKioskMoreActivityButton
                themed={{ active: !!effectiveTheme }}
                primaryForeground={primaryForeground}
                onClick={() => {
                  playSound('click');
                  setActivityDialogOpen(true);
                }}
              />
            ) : null}
            <p className="shrink-0 text-center text-xs font-black uppercase tracking-[0.2em] text-muted-foreground sm:text-sm">
              Eligible prizes
            </p>
            <StudentKioskFadeScrollPane themed={!!effectiveTheme} className="min-h-[12rem]">
              <div className="grid grid-cols-2 gap-3">
              {prizesLoading
                ? [...Array(6)].map((_, i) => (
                    <Skeleton key={`m-${i}`} className="min-h-[15rem] w-full shrink-0 rounded-2xl" />
                  ))
                : eligibleRewards.map((reward) => (
                    <StudentPrizeShopCard
                      key={reward.id}
                      prize={reward}
                      studentPoints={student.points ?? 0}
                      themed={!!effectiveTheme}
                      primaryForeground={primaryForeground}
                      wholeCardClick
                      onRedeem={() => {
                        playSound('click');
                        setConfirmingPrize(reward);
                      }}
                    />
                  ))}
              {!prizesLoading && eligibleRewards.length === 0 ? (
                <div
                  className={cn(
                    'col-span-2 flex flex-col items-center justify-center rounded-xl border border-dashed py-8 text-center',
                    !activeTheme && 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50',
                  )}
                  style={
                    activeTheme
                      ? {
                          backgroundColor: 'var(--theme-bg)',
                          borderColor: 'var(--theme-primary)',
                          color: 'var(--theme-text)',
                        }
                      : undefined
                  }
                >
                  <Star className="mb-2 h-6 w-6 opacity-60" aria-hidden />
                  <p className="text-xs font-black">Almost there!</p>
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-widest opacity-70">
                    Keep earning points to unlock rewards
                  </p>
                </div>
              ) : null}
              </div>
            </StudentKioskFadeScrollPane>
            <StudentKioskMorePrizesButton
              themed={{ active: !!effectiveTheme }}
              primaryForeground={primaryForeground}
              schoolId={schoolId}
              studentId={student.id}
              onClick={openFullPrizeShop}
            />
          </div>
          </div>

          {settings.enableGoals ? (
            <StudentGoalsCard
              schoolId={schoolId!}
              student={student}
              enabled
              themed={!!effectiveTheme}
              themeForeground={effectiveTheme ? 'var(--theme-primary)' : undefined}
            />
          ) : null}

          <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
            <DialogContent
              className={cn('flex max-h-[min(85vh,640px)] flex-col gap-0 p-0 sm:max-w-lg', activeTheme && 'student-theme-surface')}
              style={themeSurfaceStyle}
            >
              <DialogHeader className="shrink-0 border-b px-6 py-4" style={activeTheme ? { borderColor: 'var(--theme-bg)' } : undefined}>
                <DialogTitle style={activeTheme ? { color: 'var(--theme-text)' } : undefined}>Activity</DialogTitle>
                <DialogDescription className="sr-only">Recent point transactions and redemptions.</DialogDescription>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                <StudentActivityList
                  schoolId={schoolId}
                  studentId={student.id}
                  themed={!!effectiveTheme}
                  onReprintTicket={handleReprint}
                  maxItems={20}
                />
              </div>
              <div className="shrink-0 border-t px-6 py-3" style={activeTheme ? { borderColor: 'var(--theme-bg)' } : undefined}>
                <Button
                  type="button"
                  className="w-full font-bold"
                  onClick={() => setActivityDialogOpen(false)}
                  style={activeTheme ? { backgroundColor: 'var(--theme-primary)', color: primaryForeground } : undefined}
                >
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>

            <AlertDialog open={!!confirmingPrize} onOpenChange={(open) => {
              if (!open && !isRedeemingPrize) setConfirmingPrize(null);
            }}>
              <AlertDialogContent
                className={cn(activeTheme && 'student-theme-surface')}
                style={themeSurfaceStyle}
              >
                <AlertDialogHeader>
                  <AlertDialogTitle>Redeem prize?</AlertDialogTitle>
                  <AlertDialogDescription
                    className="break-words [overflow-wrap:anywhere]"
                    style={activeTheme ? { color: 'var(--theme-text)', opacity: 0.85 } : undefined}
                  >
                    Redeem{' '}
                    <span className="text-xl font-black sm:text-2xl [overflow-wrap:anywhere]">{confirmingPrize?.name}</span>
                    {confirmingPrize ? ` for ${(confirmingPrize.points || 0).toLocaleString()} points` : ''}?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {confirmingPrize?.aiFunReward === 'picker' ? (
                  <div className="py-2 space-y-2">
                    <Label htmlFor="student-fun-kind" style={activeTheme ? { color: 'var(--theme-text)' } : undefined}>What do you want?</Label>
                    <Select value={confirmingFunKind} onValueChange={(v) => setConfirmingFunKind(v as PrizeAiFunReward)}>
                      <SelectTrigger
                        id="student-fun-kind"
                        style={activeTheme ? { backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-primary)', color: 'var(--theme-text)' } : undefined}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[360]" position="popper">
                        <SelectItem value="joke">Joke</SelectItem>
                        <SelectItem value="riddle">Riddle</SelectItem>
                        <SelectItem value="fortune">Fortune teller</SelectItem>
                        <SelectItem value="acrostic">Name poem (your first name)</SelectItem>
                        <SelectItem value="random">Surprise me</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
                  <AlertDialogCancel disabled={isRedeemingPrize} className="w-full sm:w-auto">
                    Cancel
                  </AlertDialogCancel>
                  {confirmingPrize?.offerPrintTicketOnRedeem === true &&
                  confirmingPrize.aiFunReward == null ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      disabled={isRedeemingPrize}
                      onClick={() => void handleRedeemPrizePickupVoucher()}
                    >
                      {isRedeemingPrize ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                          Processing...
                        </>
                      ) : (
                        'Print pickup voucher'
                      )}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    className="w-full sm:w-auto"
                    onClick={handleRedeemPrize}
                    disabled={isRedeemingPrize}
                    style={activeTheme ? { backgroundColor: 'var(--theme-primary)', color: primaryForeground } : undefined}
                  >
                    {isRedeemingPrize ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                        Redeeming...
                      </>
                    ) : (
                      'Redeem now'
                    )}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!prizeTicketData} onOpenChange={(open) => {
              if (!open) setPrizeTicketData(null);
            }}>
              <AlertDialogContent
                className={cn(activeTheme && 'student-theme-surface')}
                style={themeSurfaceStyle}
              >
                <AlertDialogHeader>
                  <AlertDialogTitle>Print redeem voucher?</AlertDialogTitle>
                  <AlertDialogDescription
                    className="break-words [overflow-wrap:anywhere]"
                    style={activeTheme ? { color: 'var(--theme-text)', opacity: 0.85 } : undefined}
                  >
                    Print a voucher for{' '}
                    <span className="text-xl font-black sm:text-2xl">{prizeTicketData?.prizeName}</span>?
                    {prizeTicketData?.voucherScanCode ? (
                      <> Scan the barcode at the pickup kiosk to collect your prize.</>
                    ) : null}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <PrinterReminderCallout
                  title="Printer reminder"
                  message={settings.printerReminderPrizeVouchers}
                  className="mt-1 mb-2"
                />
                <AlertDialogFooter>
                  <AlertDialogCancel>No Thanks</AlertDialogCancel>
                  <Button
                    type="button"
                    onClick={handlePrintPrizeTicket}
                    style={activeTheme ? { backgroundColor: 'var(--theme-primary)', color: primaryForeground } : undefined}
                  >
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
              <DialogContent
                className={cn("sm:max-w-md", activeTheme && 'student-theme-surface')}
                style={themeSurfaceStyle}
              >
                <DialogHeader>
                  <DialogTitle>
                    {aiSurpriseLoading
                      ? 'Your surprise'
                      : (AI_SURPRISE_KIND_LABEL[aiSurpriseBody?.kind ?? ''] ?? 'Your surprise')}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Joke, riddle, fortune teller, or name poem shown after redeeming a prize.
                  </DialogDescription>
                </DialogHeader>
                <div className="min-h-[100px] py-1">
                  {aiSurpriseLoading ? (
                    <div
                      className={cn("flex flex-col items-center justify-center gap-3 py-8", !activeTheme && "text-muted-foreground")}
                      style={activeTheme ? { color: 'var(--theme-text)', opacity: 0.7 } : undefined}
                    >
                      <Loader2 className="h-10 w-10 animate-spin" aria-hidden />
                      <p className="text-sm font-medium">Cooking up something fun…</p>
                    </div>
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
                          className={cn("rounded-lg border px-3 py-2 text-sm", !activeTheme && "border-border bg-muted/80")}
                          style={activeTheme ? { backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-primary)', color: 'var(--theme-text)' } : undefined}
                        >
                          <span className={cn("font-semibold", !activeTheme && "text-muted-foreground")} style={activeTheme ? { color: 'var(--theme-text)', opacity: 0.7 } : undefined}>Answer: </span>
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
                  style={activeTheme ? { backgroundColor: 'var(--theme-primary)', color: primaryForeground } : undefined}
                >
                  {aiSurpriseLoading ? 'Please wait...' : 'Awesome'}
                </Button>
              </DialogContent>
            </Dialog>

        </div>

        <div
          className={cn(
            'relative z-10 flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden',
            !fullPrizeShopOpen && 'hidden',
          )}
          aria-hidden={!fullPrizeShopOpen}
        >
          <PrizeDashboard
            embedded
            studentId={student.id}
            onDone={onDone}
            onRequestExit={handleManualLogout}
            onBackToKiosk={closeFullPrizeShop}
          />
        </div>
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

function StudentKioskPageFallback() {
  const { settings } = useSettings();
  const animBackdrop = globalAnimatedBackdropActive(settings);
  return (
    <div
      className={cn(
        'min-h-screen flex items-center justify-center p-8',
        animBackdrop ? 'bg-transparent' : 'bg-background',
      )}
    >
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
        <p className="text-muted-foreground font-medium animate-pulse">Loading kiosk…</p>
      </div>
    </div>
  );
}

function StudentLoginPage() {
  const { loginState, isInitialized, schoolId, login, logout, syncStatus } = useAppContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const playSound = useArcadeSound();
  const { settings } = useSettings();
  const isGraphic = settings.graphicMode === 'graphics';
  const animBackdrop = globalAnimatedBackdropActive(settings);
  const { firestore, auth, functions } = useFirebase();
  const appConfigDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'appConfig', 'global');
  }, [firestore]);

  const { data: appConfig } = useDoc<{ appLogoUrl?: string }>(appConfigDocRef);

  const { activeStudentId, setActiveStudentId, handleDone, loginMeta, setLoginMeta } = useStudentKioskSession();

  const kioskProfileId = settings.kioskProfileId ?? null;
  const kioskProfileName =
    (kioskProfileId && settings.kioskProfiles?.[kioskProfileId]?.name) || null;

  useKioskSnapshotReporter({
    schoolId,
    enabled: Boolean(schoolId && isInitialized),
    kioskProfileId,
    profileName: kioskProfileName,
  });

  useEffect(() => {
    setStudentKioskSignedIn(Boolean(activeStudentId));
    return () => setStudentKioskSignedIn(false);
  }, [activeStudentId]);

  useKioskBackendWarmup({
    enabled:
      isInitialized &&
      !!schoolId &&
      loginState !== 'loggedOut' &&
      loginState !== 'prizeClerk',
    firestore,
    functions,
    schoolId,
  });
  
  const [wakeLockStatus, setWakeLockStatus] = useState<'pending' | 'active' | 'unsupported' | 'error'>('pending');

  // Global Kiosk persistence:
  // - Keep the screen awake indefinitely (if supported) across scanner and user dashboard states.
  // - Refresh the Firebase Auth token in the background so the kiosk session doesn't timeout.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof document === 'undefined') return;

    let cancelled = false;
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      const navAny = navigator as any;
      if (!navAny?.wakeLock?.request) {
        setWakeLockStatus('unsupported');
        return;
      }

      try {
        if (cancelled) return;
        wakeLock = await navAny.wakeLock.request('screen');
        if (!cancelled) {
          setWakeLockStatus('active');
        }
        wakeLock?.addEventListener?.('release', () => {
          if (!cancelled) setWakeLockStatus('pending');
        });
      } catch (err) {
        if (!cancelled) {
          setWakeLockStatus('error');
        }
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

  useEffect(() => {
    if (!studentTransition) return;
    const t = window.setTimeout(() => {
      setStudentTransition(null);
    }, STUDENT_TRANSITION_FAILSAFE_MS);
    return () => window.clearTimeout(t);
  }, [studentTransition]);

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

  const [pendingStudentLogin, setPendingStudentLogin] = useState<{ id: string } | null>(null);

  useEffect(() => {
    const linkedStudentId = searchParams.get('student')?.trim();
    if (!linkedStudentId || activeStudentId === linkedStudentId || pendingStudentLogin?.id === linkedStudentId) {
      return;
    }
    setPendingStudentLogin({ id: linkedStudentId });
  }, [activeStudentId, pendingStudentLogin?.id, searchParams]);

  useEffect(() => {
    if (!pendingStudentLogin) return;
    onScannerStudent(pendingStudentLogin.id);
    setPendingStudentLogin(null);
    if (schoolId) {
      router.replace(`/${schoolId}/student`, { scroll: false });
    }
  }, [pendingStudentLogin, onScannerStudent, router, schoolId]);

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
      toast({ title: 'Logged Out', description: 'Returning to kiosk home.' });
    } else {
      router.push(schoolId ? `/${schoolId}/portal` : '/login');
    }
  }, [finishStudentSession, playSound, router, schoolId, toast]);

  useEffect(() => {
    window.addEventListener(STUDENT_KIOSK_REQUEST_EXIT_EVENT, handleStudentLogout);
    return () => window.removeEventListener(STUDENT_KIOSK_REQUEST_EXIT_EVENT, handleStudentLogout);
  }, [handleStudentLogout]);

  /** Admin on kiosk should use the school chooser session, not stay signed in as admin. */
  useEffect(() => {
    if (!isInitialized || !schoolId) return;
    if (loginState !== 'admin') return;
    logout({ staffNavigateTo: 'student' });
  }, [isInitialized, loginState, logout, schoolId]);

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

  if (!isStudentRewardsUiOn(settings)) {
    return (
      <div
        className={cn(
          'min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center',
          animBackdrop ? 'bg-transparent' : 'bg-background',
        )}
      >
        <GraduationCap className="h-10 w-10 text-muted-foreground" aria-hidden />
        <div className="max-w-md space-y-2">
          <h1 className="text-xl font-black">Student kiosk is off</h1>
          <p className="text-sm text-muted-foreground">
            The Rewards product is not enabled for this school. Turn on levelup rewards in Settings →
            Product pillars, or use the staff portal for classroom tools.
          </p>
        </div>
        {schoolId ? (
          <Button asChild variant="outline">
            <Link href={`/${schoolId}/portal`}>Back to portal</Link>
          </Button>
        ) : null}
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
      <div className="flex w-full flex-1 flex-col min-h-dvh" data-kiosk-snapshot-root>
        <TooltipProvider>
          <div
            className={cn(
              'flex min-h-0 w-full flex-1 flex-col items-center justify-center px-4 py-4 font-sans [@media(max-height:720px)]:py-2',
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
        
        {(wakeLockStatus === 'error' || wakeLockStatus === 'unsupported') && (
          <div 
            className="no-print fixed bottom-4 right-4 z-50 pointer-events-auto flex items-center gap-1.5 rounded-full bg-card/80 hover:bg-card border border-border/60 px-2.5 py-1 text-[9px] font-bold text-muted-foreground backdrop-blur-md shadow-md transition-all select-none cursor-help" 
            title={wakeLockStatus === 'error' ? "Browser blocked Screen Wake Lock. Kiosk device might fall asleep. Grant permission or tap user interaction." : "Wake Lock is not supported on this browser."}
          >
            <div className={`h-1.5 w-1.5 rounded-full ${wakeLockStatus === 'error' ? 'bg-amber-500 animate-pulse' : 'bg-slate-400 dark:bg-slate-600'}`} />
            <span className="uppercase tracking-wider">
              {wakeLockStatus === 'error' ? 'Wake Lock Blocked' : 'Screen Lock Unavail.'}
            </span>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

/** `useSearchParams()` must sit under Suspense or dev error recovery can loop with “missing required error components”. */
export default function StudentLoginPageRoute() {
  return (
    <Suspense fallback={<StudentKioskPageFallback />}>
      <StudentLoginPage />
    </Suspense>
  );
}



