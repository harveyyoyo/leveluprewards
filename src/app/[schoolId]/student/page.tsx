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
import { isCompactDisplayMode } from '@/lib/displayMode';
import { useTranslation } from '@/components/providers/LocaleProvider';
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
import { KioskLoginPrizeTeasers } from '@/components/kiosk/KioskLoginPrizeTeasers';
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
import type { AiSurpriseKind } from '@/lib/prizes/prizeAiFunClientStorage';
import {
  computeDaysOverdue,
  getLibraryPolicyFromSettings,
  isLibraryStudentKioskCheckoutEnabled,
} from '@/lib/library/libraryPolicy';
import { StudentLibraryCheckoutsCard } from '@/components/student-kiosk/StudentLibraryCheckoutsCard';
import { StudentKioskRecessCheckoutCard } from '@/components/student-kiosk/StudentKioskRecessCheckoutCard';
import {
  isRecessStudentKioskEnabled,
  resolveRecessMaxMinutes,
} from '@/lib/recess/recessKioskSettings';
import { RECESS_REASON_BY_VALUE } from '@/lib/recess/recessReasons';
import { StudentKioskThemeButton } from '@/components/student-kiosk/StudentKioskThemeButton';
import { StudentKioskProfileExtras } from '@/components/student-kiosk/StudentKioskProfileExtras';
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
import { studentCanAffordPrizeByCategory } from '@/lib/prizes/prizeCategoryEligibility';
import { prizeAppearsInRewardsShop, resolveAiFunApiMode, withUnifiedAiFunPrize } from '@/lib/aiJokePrize';
import { floorRaffleFullTickets, parseRafflePointsPerTicket } from '@/lib/raffleTickets';
import {
  canonicalAiSurpriseText,
  isAiSurpriseTextRecentlySeen,
  rememberAiSurprise,
} from '@/lib/prizes/prizeAiFunClientStorage';
import { acrosticFirstNameFromStudent } from '@/lib/prizes/prizeAiFunAcrostic';
import { fallbackPrizeSurprise, type PrizeSurprise } from '@/lib/prizes/studentKioskSurprises';
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
import { StudentDashboardInner } from '@/components/student-kiosk/StudentDashboardInner';

const STUDENT_TRANSITION_MIN_VISIBLE_MS = 650;
const STUDENT_TRANSITION_EXIT_MS = 320;
/** If the dashboard never signals ready (e.g. Firestore error), do not leave the full-screen transition layer up indefinitely. */
const STUDENT_TRANSITION_FAILSAFE_MS = 30_000;

function StudentKioskPageFallback() {
  const { settings } = useSettings();
  const { t } = useTranslation();
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
        <p className="text-muted-foreground font-medium animate-pulse">{t('student.kiosk.loading')}</p>
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
  const { t } = useTranslation();
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
        <p className="text-muted-foreground font-medium animate-pulse">{t('student.kiosk.loading')}</p>
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
          <h1 className="text-xl font-black">{t('student.kiosk.off')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('student.kiosk.offDescription')}
          </p>
        </div>
        {schoolId ? (
          <Button asChild variant="outline">
            <Link href={`/${schoolId}/portal`}>{t('student.kiosk.backToPortal')}</Link>
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
      <div className="relative flex w-full flex-1 flex-col min-h-dvh" data-kiosk-snapshot-root>
        <KioskLoginPrizeTeasers schoolId={schoolId} />
        <TooltipProvider>
          <div
            className={cn(
              'relative z-10 flex min-h-0 w-full flex-1 flex-col items-center justify-center px-4 py-4 font-sans [@media(max-height:720px)]:py-2',
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



