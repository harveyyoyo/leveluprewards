
'use client';

import { useState, useEffect, useRef, useCallback, useMemo, RefObject } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useFirebase, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { useSchoolMetadataDocRef } from '@/hooks/useSchoolMetadataDocRef';
import { collection, query, orderBy, limit, doc, where, getDocs, updateDoc, addDoc } from 'firebase/firestore';
import { SchoolGate } from '@/components/SchoolGate';
import { lookupStudentId } from '@/lib/db';
import dynamic from 'next/dynamic';
import { StudentIdCard } from '@/components/StudentIdCard';
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
import type { Student, Prize, HistoryItem, AttendanceScheduleSlot, Class, AttendanceRewardRule, LibraryItem } from '@/lib/types';
import { performKioskAttendanceSignIn, describeAttendanceKioskOutcome } from '@/lib/attendance/kioskSignIn';
import DynamicIcon from '@/components/DynamicIcon';
import { Progress } from '@/components/ui/progress';
import { cn, getStudentNickname, getContrastColor } from '@/lib/utils';
import { resolveStudentThemeWithSchoolDefault, primaryForegroundFor } from '@/lib/themeContrast';
import { globalAnimatedBackdropActive } from '@/lib/animatedBackdrop';
import { getReadableErrorMessage } from '@/lib/errorMessage';
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
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GoogleFontLoader } from '@/components/GoogleFontLoader';

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
import { ScrollArea } from '@/components/ui/scroll-area';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Helper } from '@/components/ui/helper';
import { Skeleton } from '@/components/ui/skeleton';
import { StudentGoalsCard } from '@/components/goals/StudentGoalsCard';
import { EarnedBadgesShowcase } from '@/components/EarnedBadgesShowcase';
import { useStudentKioskSession } from '@/components/providers/StudentKioskSessionProvider';
import { FaceMismatchBanner } from '@/components/FaceMismatchBanner';
import { rainbowTripletForNavId, complementTripletForNavId } from '@/lib/rainbowNav';
import { STUDENT_KIOSK_REQUEST_EXIT_EVENT } from '@/lib/student-kiosk';
import { studentSeesWelcomeBackOverlay, studentSeesWelcomePage } from '@/lib/studentWelcome';
import { prizeIsListed, studentSeesPrizeByTeachers } from '@/lib/prize-utils';
import { useAuthFetch } from '@/lib/authFetch';
import { WelcomeOverlay } from '@/components/WelcomeOverlay';

const AI_SURPRISE_KIND_LABEL: Record<string, string> = {
  joke: 'Your joke',
  riddle: 'Your riddle',
  fortune: 'Your fortune',
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
  const kind = mode === 'riddle' || mode === 'fortune' ? mode : 'joke';
  const options = FALLBACK_PRIZE_SURPRISES[kind];
  const freshOptions = previousText ? options.filter((item) => item.text !== previousText) : options;
  const selected = (freshOptions.length ? freshOptions : options)[Math.floor(Math.random() * (freshOptions.length || options.length))];
  if (kind === 'fortune' && prizeName) {
    return {
      ...selected,
      text: selected.text.replace('reward moment', `${prizeName} moment`),
    };
  }
  return selected;
}

function StudentActivityList({ schoolId, studentId, themed = false, onReprintTicket }: { schoolId: string; studentId: string; themed?: boolean; onReprintTicket?: (item: HistoryItem) => void }) {
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
      <div className="space-y-3 p-4" role="status" aria-live="polite" aria-label="Loading activity">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex justify-between items-center py-3 border-b border-border/50">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>
        ))}
        <span className="sr-only">Loading activity…</span>
      </div>
    );
  }


  return (
    <ScrollArea className="w-full min-h-[50dvh] h-[min(85dvh,calc(100dvh-9rem))] lg:min-h-[calc(100dvh-12rem)] lg:max-h-[calc(100dvh-8rem)] pr-4">
      <ul className="space-y-3">
        {history && history.length > 0 ? (
          history.map((item, index) => {
            const isRedemption = item.desc.startsWith('Redeemed:');
            const isPointGain = item.amount > 0;

            return (
                            <li
                                key={index}
                                className={cn(
                                  "group p-4 rounded-2xl transition-all duration-300",
                                  !themed && "border border-slate-50 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800/80",
                                )}
                                style={themed ? { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(127,127,127,0.25)', borderWidth: 1, borderStyle: 'solid' } : undefined}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex gap-3">
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                                            isRedemption ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" :
                                                (item.desc.toLowerCase().includes('attendance') || item.desc.toLowerCase().includes('sign-in')) ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" :
                                                    "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                        )}>
                                            {isRedemption ? <Gift className="w-4 h-4" /> :
                                                (item.desc.toLowerCase().includes('attendance') || item.desc.toLowerCase().includes('sign-in')) ? <CheckCircle2 className="w-4 h-4" /> :
                                                    <Ticket className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <p
                                                className={cn("font-bold leading-tight", !themed && "text-slate-800 dark:text-slate-200")}
                                                style={themedTextStyle}
                                            >
                                                {item.desc}
                                            </p>
                                            <div
                                                className={cn("flex items-center gap-1.5 mt-1", !themed && "text-muted-foreground")}
                                                style={themedMutedStyle}
                                            >
                                                <Clock className="w-3 h-3" aria-hidden="true" />
                                                <span className="text-[11px] font-semibold tracking-wide">
                                                    {item.date ? format(new Date(item.date), 'MMM d, h:mm a') : 'Recently'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <Badge
                                        variant={isPointGain ? 'default' : 'secondary'}
                                        className={cn(
                                            "font-black text-[10px] px-2 py-0.5 rounded-full tracking-tighter shrink-0",
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
    </ScrollArea>
  );
}

function StudentDashboardInner({

  studentId,
  onDone,
  onRequestExit,
}: {
  studentId: string;
  onDone: () => void;
  onRequestExit: () => void;
}) {
  const router = useRouter();
  const { redeemCoupon, redeemPrize, printPrizeTickets, schoolId, isKioskLocked, badges } = useAppContext();
  const firestore = useFirestore();
  const { functions } = useFirebase();
  const { toast } = useToast();
  const { settings, isFeatureAllowed } = useSettings();
  const authFetch = useAuthFetch();
  const isGraphic = settings.graphicMode === 'graphics';
  const animBackdrop = globalAnimatedBackdropActive(settings);
  const signInRecordedRef = useRef(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const hasShownWelcomeRef = useRef<string | null>(null);

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

  const appConfigRef = useMemoFirebase(() => (firestore ? doc(firestore, 'appConfig', 'global') : null), [firestore]);
  const { data: appConfig } = useDoc<{ appLogoUrl?: string; appName?: string; appTagline?: string }>(appConfigRef);

  const schoolDocRef = useSchoolMetadataDocRef();
  const { data: schoolData } = useDoc<{ name?: string; logoUrl?: string }>(schoolDocRef);

  const previewSchoolName = schoolData?.name?.trim() || 'School';
  const previewSchoolLogoUrl = schoolData?.logoUrl ?? null;
  const previewAppLogoUrl = appConfig?.appLogoUrl ?? null;
  const previewAppName = appConfig?.appName?.trim() || undefined;
  const previewAppTagline = appConfig?.appTagline?.trim() || undefined;

  const prizesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'prizes') : null, [firestore, schoolId]);
  const { data: prizes, isLoading: prizesLoading } = useCollection<Prize>(prizesQuery);

  const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'classes') : null, [firestore, schoolId]);
  const { data: classes } = useCollection<Class>(classesQuery);

  const periodsQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'periods') : null, [firestore, schoolId]);
  const { data: periods } = useCollection<AttendanceScheduleSlot>(periodsQuery);

  const teacherRewardsQuery = useMemoFirebase(() => {
    if (!schoolId || !student?.classId || !classes) return null;
    const cls = classes.find((c) => c.id === student.classId);
    const teacherId = cls?.primaryTeacherId;
    if (!teacherId) return null;
    return collection(firestore, 'schools', schoolId, 'teachers', teacherId, 'attendanceRewards');
  }, [firestore, schoolId, student?.classId, classes]);
  const { data: teacherRewards } = useCollection<AttendanceRewardRule>(teacherRewardsQuery);

  const [couponCode, setCouponCode] = useState('');
  const [logoutTimer, setLogoutTimer] = useState(settings.kioskSessionTimeoutSec ?? 15);
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
  const [isIdPreviewOpen, setIsIdPreviewOpen] = useState(false);
  const [confirmingPrize, setConfirmingPrize] = useState<Prize | null>(null);
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

  const [activeTab, setActiveTab] = useState('manual');
  const [hasCameraPermission, setHasCameraPermission] = useState(true);

  const { videoRef, hasCameraPermission: hookHasPermission } = useBarcodeScanner(
    activeTab === 'camera' && showRedeem,
    (code) => handleRedeemCoupon(code),
    (err) => {
      setHasCameraPermission(false);
      if (activeTab === 'camera') setActiveTab('manual');
      toast({ variant: 'destructive', title: 'Camera Error', description: err });
    }
  );

  useEffect(() => {
    setHasCameraPermission(hookHasPermission);
  }, [hookHasPermission]);

  useEffect(() => {
    if (!settings.enableClassSignIn || !student || !schoolId || !functions || signInRecordedRef.current) return;
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
  }, [settings.enableClassSignIn, student, schoolId, functions, toast, playSound]);
 
  // --- Special Occasions (Birthday & School Special Day) ---
  useEffect(() => {
    if (!student || !schoolId || !firestore) return;
    
    const todayFull = format(new Date(), 'yyyy-MM-dd');
    const todayMD = format(new Date(), 'MM-dd');
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
            descriptions.push(`Happy Birthday! 🎉 (+${settings.birthdayPointsAmount} pts)`);
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
                const studentRef = doc(firestore, 'schools', schoolId, 'students', student.id);
                await updateDoc(studentRef, {
                    points: (student.points || 0) + totalAward,
                    lastSpecialDayAwarded: newLastAwarded
                });
                
                // Add activity logs
                for (const desc of descriptions) {
                    await addDoc(collection(firestore, 'schools', schoolId, 'students', student.id, 'activities'), {
                        desc,
                        amount: totalAward / descriptions.length, // Split amount if multiple events (rare)
                        date: Date.now()
                    });
                    queueCelebration(desc);
                }
                
                playSound('success');
                animationKey.current += 1;
                setFlyPointsValue(totalAward);
                setTimeout(() => { setFlyPointsValue(null); }, 2000);
            } catch (err) {
                console.error('Failed to award special day points', err);
            }
        })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.id, settings.enableBirthdayPoints, settings.enableSpecialDayPoints, schoolId, firestore, playSound, queueCelebration]);

  const resetTimer = useCallback(() => {
    if (!isKioskLocked) {
      setLogoutTimer(settings.kioskSessionTimeoutSec ?? 15);
    }
  }, [isKioskLocked, settings.kioskSessionTimeoutSec]);

  useEffect(() => {
    if (isKioskLocked || confirmingPrize || isRedeemingPrize || prizeTicketData || aiSurpriseOpen) return;
    if (logoutTimer <= 0) {
      onDone();
      return;
    }
    const timerId = setTimeout(() => {
      setLogoutTimer(logoutTimer - 1);
    }, 1000);

    return () => clearTimeout(timerId);
  }, [logoutTimer, onDone, isKioskLocked, confirmingPrize, isRedeemingPrize, prizeTicketData, aiSurpriseOpen]);

  // Also reset auto‑logout timer when there is general user activity (mouse / keyboard / touch).
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

  const handleRedeemCoupon = useCallback(async (codeToRedeem?: string) => {
    if (!student) return;
    const code = (codeToRedeem || couponCode).toUpperCase();
    if (!code) return;
    resetTimer();

    // 1. Check Library Item first (if enabled)
    if (settings.enableLibrary && firestore && schoolId) {
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
  }, [couponCode, resetTimer, redeemCoupon, student, toast, playSound, activeTab, settings.enableLibrary, settings.enableGoals, firestore, schoolId, isFeatureAllowed]);

  const handleRedeemPrize = useCallback(async () => {
    if (!student || !confirmingPrize) return;
    resetTimer();
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'No connection',
        description: 'Connect to the internet, then try redeeming again.',
      });
      return;
    }

    setIsRedeemingPrize(true);
    try {
      const result = await redeemPrize(student.id, confirmingPrize, 1);
      if (!result.success) {
        throw new Error(result.message || 'Could not redeem this prize.');
      }
      playSound('redeem');
      toast({
        title: 'Prize Redeemed!',
        description: `Successfully redeemed ${confirmingPrize.name}.`,
      });

      if (settings.enableGoals && isFeatureAllowed('enableGoals') && schoolId && firestore) {
        void import('@/lib/goalsProgress').then((m) =>
          m.syncGoalsForStudent(firestore, schoolId, student.id).catch(() => {}),
        );
      }

      const { activityId, redeemedAt, totalCost } = result;
      let ticketPayload: typeof prizeTicketData = null;
      if (
        confirmingPrize.offerPrintTicketOnRedeem === true &&
        activityId &&
        redeemedAt &&
        typeof totalCost === 'number'
      ) {
        const displayFirst = getStudentNickname(student);
        const legalFirst = (student.firstName || '').trim();
        const nick = student.nickname?.trim();
        const themeForTicket = resolveStudentThemeWithSchoolDefault(student.theme, settings.defaultStudentTheme);
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
          prizeName: confirmingPrize.name,
          prizeIcon: confirmingPrize.icon || 'Gift',
          quantity: 1,
          totalCost,
        };
      }

      if (confirmingPrize.aiFunReward && schoolId && settings.enablePrizeAiSurprise === true) {
        pendingPrizeTicketAfterAiRef.current = ticketPayload;
        const requestId = aiSurpriseRequestIdRef.current + 1;
        aiSurpriseRequestIdRef.current = requestId;
        const instantSurprise = fallbackPrizeSurprise(
          confirmingPrize.aiFunReward,
          confirmingPrize.name,
          lastAiSurpriseTextRef.current,
        );
        lastAiSurpriseTextRef.current = instantSurprise.text;
        setAiSurpriseBody(instantSurprise);
        setAiSurpriseLoading(false);
        setAiSurpriseOpen(true);
        const prizeMode = confirmingPrize.aiFunReward;
        const prizeName = confirmingPrize.name;
        void (async () => {
          const controller = new AbortController();
          const timeoutId = window.setTimeout(() => controller.abort(), 1200);
          try {
            const res = await authFetch('/api/prize-ai-fun', {
              method: 'POST',
              signal: controller.signal,
              body: JSON.stringify({
                schoolId,
                mode: prizeMode,
              }),
            });
            const j = (await res.json()) as { error?: string; kind?: string; text?: string; answer?: string };
            if (!res.ok) throw new Error(j.error || 'Could not load joke.');
            const kind = j.kind === 'riddle' || j.kind === 'fortune' ? j.kind : 'joke';
            const text = typeof j.text === 'string' ? j.text.trim() : '';
            if (!text || aiSurpriseRequestIdRef.current !== requestId) return;
            lastAiSurpriseTextRef.current = text;
            setAiSurpriseBody({
              kind,
              text,
              answer: kind === 'riddle' && typeof j.answer === 'string' ? j.answer : undefined,
            });
          } catch (e: unknown) {
            if ((e as { name?: string })?.name !== 'AbortError') {
              console.warn(`Prize AI surprise unavailable for ${prizeName}:`, e);
            }
          } finally {
            window.clearTimeout(timeoutId);
          }
        })();
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
  }, [authFetch, confirmingPrize, playSound, redeemPrize, resetTimer, schoolId, settings.defaultStudentTheme, settings.enablePrizeAiSurprise, settings.enableStudentEmojiOnPrizeTickets, settings.enableGoals, student, toast, firestore, isFeatureAllowed]);

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
    const foundPrize = prizes?.find(p => p.name === prizeName);
    const prizeIcon = foundPrize?.icon || 'Gift';

    const ticketNo = String(item.date).replace(/\D/g, '').slice(-6) || String(item.date).slice(-6);
    const displayFirst = getStudentNickname(student);
    const legalFirst = (student.firstName || '').trim();
    const nick = student.nickname?.trim();
    const themeForTicket = resolveStudentThemeWithSchoolDefault(student.theme, settings.defaultStudentTheme);
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
  }, [student, prizes, settings]);


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
  }, [student?.id, schoolId, student?.earnedBadges, playSound, queueCelebration]);

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
  const activeTheme = resolveStudentThemeWithSchoolDefault(student.theme, settings.defaultStudentTheme);
  const fontScale = activeTheme?.fontScale ?? 1.15;
  const themeBg = activeTheme?.background || '#020617';
  const computedThemeText = activeTheme?.text || (getContrastColor(themeBg) === 'black' ? '#020617' : '#ffffff');
  const primaryForeground = activeTheme ? primaryForegroundFor(activeTheme) : '#ffffff';

  return (
    <TooltipProvider>
      <div
        className={cn(
          "mt-3 md:mt-8 space-y-3 md:space-y-4 relative max-w-full mx-auto px-3 md:px-6 min-h-screen flex flex-col",
          settings.enableThemeAnimations && !!activeTheme && "theme-theme-elements-animated theme-motion-override",
          isGraphic ? 'animate-in fade-in duration-500' : '',
          // Avoid large bottom padding that leaves a visible gap.
          settings.displayMode === 'app' && 'pb-6'
        )}
        style={activeTheme ? ({
          '--theme-bg': themeBg,
          '--theme-text': computedThemeText,
          '--theme-primary': activeTheme.primary || 'hsl(var(--primary))',
          '--theme-primary-foreground': primaryForeground,
          '--theme-card': activeTheme.cardBackground || 'hsl(var(--card))',
          '--theme-accent': activeTheme.accent || 'hsl(var(--accent))',
          background: activeTheme.backgroundStyle || `radial-gradient(circle at top left, ${activeTheme.primary || 'hsl(var(--primary))'}22 0, transparent 45%), radial-gradient(circle at bottom right, ${activeTheme.accent || 'hsl(var(--accent))'}22 0, ${themeBg || 'transparent'} 55%)`,
          color: 'var(--theme-text)',
          fontFamily: activeTheme.fontFamily || 'inherit',
          fontSize: fontScale !== 1 ? `${fontScale}em` : undefined,
        } as unknown as React.CSSProperties) : ({
          fontSize: '1.15em',
          ['--primary' as any]: rainbowTripletForNavId('redeem', settings.colorScheme),
          ['--chart-1' as any]: rainbowTripletForNavId('redeem', settings.colorScheme),
          ['--chart-2' as any]: complementTripletForNavId('redeem', settings.colorScheme),
          ['--chart-3' as any]: rainbowTripletForNavId('redeem', settings.colorScheme),
          ['--chart-4' as any]: complementTripletForNavId('redeem', settings.colorScheme),
          ['--chart-5' as any]: rainbowTripletForNavId('redeem', settings.colorScheme),
          ['--ring' as any]: complementTripletForNavId('redeem', settings.colorScheme),
        } as any)}
      >
        {activeTheme?.fontFamily && <GoogleFontLoader fontFamily={activeTheme.fontFamily} />}

        {showWelcome && student && studentSeesWelcomeBackOverlay(settings, student) && (
          <WelcomeOverlay
            studentName={`${student.firstName} ${student.lastName}`}
            points={student.points || 0}
            photoUrl={student.photoUrl}
            visibleDurationMs={Math.min(60, Math.max(1, settings.studentWelcomeBackDurationSec ?? 3)) * 1000}
            theme={activeTheme ? {
              primary: activeTheme.primary,
              text: computedThemeText,
              background: activeTheme.background,
              emoji: student.customEmojiUrl || activeTheme.emoji,
            } : undefined}
            onClose={() => setShowWelcome(false)}
            playSound={playSound}
          />
        )}

        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {celebrationMessage || (flyPointsValue !== null ? `You earned ${flyPointsValue} points` : '')}
        </div>

        {celebrationMessage && (
          <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
            <div className="pointer-events-auto bg-black/70 text-white px-8 py-5 rounded-3xl shadow-2xl border border-white/20 flex flex-col items-center gap-2 animate-in fade-in zoom-in duration-300">
              <span className="text-3xl font-black tracking-widest uppercase">Yay!</span>
              <span className="text-sm font-medium text-center max-w-xs">{celebrationMessage}</span>
            </div>
          </div>
        )}

        {flyPointsValue !== null && (
          <div key={animationKey.current} className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center" aria-hidden="true">
            <div className="animate-fly-up text-4xl md:text-6xl font-black tracking-widest text-emerald-400 drop-shadow-[0_0_14px_rgba(52,211,153,0.75)]">
              +{flyPointsValue} PTS
            </div>
          </div>
        )}

        {/* Graphic Elements */}
        {isGraphic && !activeTheme && (
          <div className="absolute -top-12 right-0 w-32 h-32 opacity-20 pointer-events-none z-0">
            <Star className="w-full h-full text-amber-400 fill-amber-400 animate-pulse" />
          </div>
        )}

        {/* Hero Welcome Section */}
        <Card
          className={cn(
            "overflow-hidden shadow-xl border-t-8 border-chart-1",
            isGraphic && !activeTheme
              ? animBackdrop
                ? "bg-card/90 backdrop-blur-md border-border/40"
                : "bg-gradient-to-br from-indigo-100/50 to-indigo-50/30 dark:from-indigo-950/40 dark:to-slate-900/40"
              : !activeTheme ? "bg-card dark:bg-slate-800" : "",
          )}
          style={activeTheme ? { backgroundColor: 'var(--theme-card)', color: 'var(--theme-text)', borderColor: 'var(--theme-primary)' } : undefined}
        >
          <CardContent className="p-4 md:p-5 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="space-y-1 text-center md:text-left">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: activeTheme ? 'var(--theme-text)' : undefined, opacity: activeTheme ? 0.7 : undefined }}>Welcome back,</p>
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
                    <h2 className="text-xl md:text-2xl font-black leading-tight">
                      {student.firstName} {student.lastName}
                    </h2>
                    {(student.customEmojiUrl || activeTheme?.emoji) && (
                      student.customEmojiUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={student.customEmojiUrl}
                          alt=""
                          className="theme-animated-emoji h-9 w-9 md:h-11 md:w-11 shrink-0 object-contain"
                          style={{ filter: activeTheme?.primary ? `drop-shadow(0 0 8px ${activeTheme.primary}) drop-shadow(0 0 16px ${activeTheme.primary})` : undefined }}
                        />
                      ) : (
                        <span
                          className="theme-animated-emoji text-3xl md:text-4xl leading-none"
                          style={{ filter: activeTheme?.primary ? `drop-shadow(0 0 8px ${activeTheme.primary}) drop-shadow(0 0 16px ${activeTheme.primary})` : undefined }}
                        >
                          {activeTheme?.emoji ?? ''}
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
              <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: activeTheme ? 'var(--theme-text)' : undefined, opacity: activeTheme ? 0.7 : undefined }}>Current Balance</p>
              <div className="flex items-baseline gap-1.5" style={{ color: activeTheme ? 'var(--theme-primary)' : undefined }}>
                <span className="text-4xl md:text-5xl font-black leading-none" style={{ color: activeTheme ? 'var(--theme-primary)' : 'hsl(var(--primary))' }}>
                  {(student.points || 0).toLocaleString()}
                </span>
                <span className="text-lg md:text-xl font-bold uppercase tracking-widest" style={{ color: activeTheme ? 'var(--theme-primary)' : 'hsl(var(--primary) / 0.6)', opacity: 0.6 }}>pts</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 md:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 px-4 rounded-full text-[11px] font-bold uppercase tracking-widest"
                  style={
                    activeTheme
                      ? {
                          borderColor: 'var(--theme-primary)',
                          backgroundColor: 'transparent',
                          color: 'var(--theme-primary)',
                        }
                      : undefined
                  }
                  onClick={() => setIsIdPreviewOpen(true)}
                >
                  Preview ID
                </Button>
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

        <Dialog open={isIdPreviewOpen} onOpenChange={setIsIdPreviewOpen}>
          <DialogContent size="xl" className="!flex flex-col gap-2 overflow-x-hidden pt-12 sm:pt-14">
            <DialogHeader className="shrink-0 space-y-1 pr-8">
              <DialogTitle className="text-lg">ID Card Preview</DialogTitle>
              <DialogDescription className="text-xs leading-snug">
                Same layout as print; click outside or ✕ to close.
              </DialogDescription>
            </DialogHeader>
            <div className="flex shrink-0 flex-col items-center justify-center overflow-visible px-2 pb-6 pt-2 sm:pb-10 sm:pt-4">
              <div className="student-id-card-screen-preview flex justify-center origin-center scale-[1.1] sm:scale-[1.18]">
                <StudentIdCard
                  student={student}
                  schoolName={previewSchoolName}
                  schoolLogoUrl={previewSchoolLogoUrl}
                  className={student.classId && classes ? (classes.find((c) => c.id === student.classId)?.name || 'Unassigned') : 'Unassigned'}
                  isColorEnabled={settings.enableColorPrinting}
                  appLogoUrl={previewAppLogoUrl}
                  appName={previewAppName}
                  appTagline={previewAppTagline}
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 relative z-10 flex-1 min-h-0 lg:items-stretch">
          {/* Left Section: Content */}
          <div className="lg:col-span-2 space-y-3 flex flex-col min-h-0">
            <StudentGoalsCard
              schoolId={schoolId!}
              student={student}
              enabled={settings.enableGoals && isFeatureAllowed('enableGoals')}
              themed={!!activeTheme}
              themeForeground={activeTheme ? 'var(--theme-primary)' : undefined}
            />

            <Card
              className={cn("border-none shadow-lg overflow-hidden", !activeTheme ? "bg-white dark:bg-slate-900" : "")}
              style={activeTheme ? { backgroundColor: 'var(--theme-card)', color: 'var(--theme-text)' } : undefined}
            >
              <CardHeader className="pb-3 border-b" style={activeTheme ? { borderColor: 'var(--theme-bg)' } : undefined}>
                <Helper content="Enter a coupon code to add points to your account. You can type it in manually or use the camera to scan a QR code. Use the Logout button on this card to exit.">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-sm font-black flex items-center gap-2">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", !activeTheme && "bg-slate-100 dark:bg-slate-800")} style={activeTheme ? { backgroundColor: 'var(--theme-bg)' } : undefined}>
                        <Wallet className="w-4 h-4" style={activeTheme ? { color: 'var(--theme-primary)' } : undefined} />
                      </div>
                      Redeem Coupon Code
                    </CardTitle>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <div
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-colors whitespace-nowrap",
                          isKioskLocked
                            ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800"
                            : "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800"
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
                              strokeDashoffset={2 * Math.PI * 16 * (1 - Math.max(0, Math.min(1, logoutTimer / 15)))}
                              transform="rotate(-90 18 18)"
                              className={cn(
                                "transition-[stroke-dashoffset] duration-500 ease-linear",
                                logoutTimer <= 5 ? "text-rose-500" : "text-amber-500"
                              )}
                            />
                          </svg>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="relative h-8 px-3.5 rounded-full text-[11px] font-bold uppercase tracking-widest whitespace-nowrap"
                          onClick={handleManualLogout}
                          aria-label={`Log out now. Auto logout in ${logoutTimer} seconds.`}
                        >
                          Logout
                        </Button>
                      </div>
                    </div>
                  </div>
                </Helper>
              </CardHeader>
              <CardContent className="pt-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList 
                    className={cn("grid w-full grid-cols-2 mb-4 p-1 rounded-xl h-12", !activeTheme && "bg-slate-100 dark:bg-slate-800")}
                    style={activeTheme ? { backgroundColor: 'var(--theme-bg)' } : undefined}
                  >
                    <TabsTrigger 
                      value="manual" 
                      className={cn("text-[12px] font-bold rounded-lg data-[state=active]:shadow-sm flex items-center gap-1.5 py-1", !activeTheme && "data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700")}
                      style={activeTheme && activeTab === 'manual' ? { backgroundColor: 'var(--theme-card)', color: 'var(--theme-text)' } : undefined}
                    >
                      <Type className="w-3.5 h-3.5" /> Manual / USB
                    </TabsTrigger>
                    <TabsTrigger 
                      value="camera" 
                      className={cn("text-[12px] font-bold rounded-lg data-[state=active]:shadow-sm flex items-center gap-1.5 py-1", !activeTheme && "data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700")}
                      style={activeTheme && activeTab === 'camera' ? { backgroundColor: 'var(--theme-card)', color: 'var(--theme-text)' } : undefined}
                    >
                      <Camera className="w-3.5 h-3.5" /> Webcam Scan
                    </TabsTrigger>
                  </TabsList>

                  {activeTab === 'manual' ? (
                    <div className="space-y-3">
                      <form
                        className="flex gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void handleRedeemCoupon();
                        }}
                      >
                        <Input
                          placeholder="Enter coupon code..."
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          className="font-mono text-left tracking-widest h-12 border-2 rounded-xl text-sm"
                          style={activeTheme ? { backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-primary)', color: 'var(--theme-text)' } : undefined}
                          autoFocus
                          autoComplete="one-time-code"
                        />
                        <Button
                          type="submit"
                          className="h-12 px-6 font-black rounded-xl shadow-lg transition-all active:scale-95 uppercase tracking-widest text-xs shrink-0"
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
                        <div className="w-3/4 h-3/2 border-2 border-white/40 rounded-2xl border-dashed animate-pulse" />
                      </div>
                    </div>
                  )}
                </Tabs>

              </CardContent>
            </Card>

            {/* Eligible Rewards - Bottom Wide Section */}
            <Card
              className={cn("border-none shadow-lg", !activeTheme ? "bg-white dark:bg-slate-900" : "")}
              style={activeTheme ? { backgroundColor: 'var(--theme-card)', color: 'var(--theme-text)' } : undefined}
            >
              <CardHeader className="pb-2 pt-4">
                <Helper content="Prizes you can afford right now. Tap one to redeem it here, or use See all prizes to browse the full prize/rewards shop.">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={activeTheme ? { backgroundColor: 'var(--theme-bg)' } : undefined}>
                      <Award className="w-4 h-4" style={activeTheme ? { color: 'var(--theme-primary)' } : undefined} />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-black">Eligible Rewards</CardTitle>
                      <CardDescription className="text-[10px] font-medium leading-snug" style={activeTheme ? { color: 'var(--theme-text)', opacity: 0.7 } : undefined}>Tap a reward to redeem it here.</CardDescription>
                    </div>
                  </div>
                </Helper>
              </CardHeader>
              <CardContent className="pt-0 pb-4 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {prizesLoading ? (
                    [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)
                  ) : (prizes || [])
                    .filter(p => prizeIsListed(p) && p.points <= student.points && studentSeesPrizeByTeachers(student, p) && (!p.classId || student.classId === p.classId))
                    .sort((a, b) => b.points - a.points)
                    .map((reward) => (
                      <button
                        type="button"
                        key={reward.id}
                        onClick={() => {
                          playSound('click');
                          setConfirmingPrize(reward);
                        }}
                        aria-label={`Redeem ${reward.name || 'prize'}`}
                        className={cn(
                          "p-2.5 rounded-lg transition-all flex flex-col items-center text-center gap-1 shadow-sm hover:shadow-md hover:-translate-y-0.5 transform duration-300 group relative overflow-hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                          !activeTheme && "border border-slate-100 dark:border-slate-800 bg-white/40 dark:bg-slate-800/40",
                        )}
                        style={activeTheme ? { backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text)', borderColor: 'var(--theme-primary)', borderWidth: 1, borderStyle: 'solid' } : undefined}
                      >
                        {reward.name && (
                          <div className="absolute inset-0 opacity-5 pointer-events-none">
                            <img src={`https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(reward.name)}&backgroundColor=transparent`} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div
                          className={cn(
                            "w-9 h-9 rounded-full flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform relative overflow-hidden z-10",
                            !activeTheme && "bg-indigo-100 dark:bg-indigo-900/50",
                          )}
                          style={activeTheme ? { backgroundColor: 'var(--theme-card)' } : undefined}
                        >
                          {reward.name && (
                            <div className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none">
                              <img src={`https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(reward.name)}&backgroundColor=transparent`} alt="" className="w-full h-full object-cover" />
                            </div>
                          )}
                          <DynamicIcon
                            name={reward.icon}
                            className={cn("w-5 h-5 relative z-10", !activeTheme && "text-primary")}
                            style={activeTheme ? { color: 'var(--theme-primary)' } : undefined}
                          />
                        </div>
                        <p
                          className={cn("text-[10px] font-black leading-tight line-clamp-2", !activeTheme && "text-slate-800 dark:text-white")}
                          style={activeTheme ? { color: 'var(--theme-text)' } : undefined}
                        >
                          {reward.name}
                        </p>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "font-black text-[8px] tracking-widest rounded-md px-1.5 py-0",
                            !activeTheme && "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
                          )}
                          style={activeTheme ? { backgroundColor: 'var(--theme-primary)', color: primaryForeground } : undefined}
                        >
                          {(reward.points || 0).toLocaleString()} PTS
                        </Badge>
                      </button>
                    ))}
                  {!prizesLoading && (prizes || []).filter(p => prizeIsListed(p) && p.points <= student.points).length === 0 && (
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
                <Button
                  asChild
                  className={cn(
                    'w-full h-12 md:h-14 text-sm md:text-base font-black rounded-2xl shadow-lg transition-all active:scale-[0.99] uppercase tracking-wide',
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
                    <Gift className="h-5 w-5 md:h-6 md:w-6 shrink-0" aria-hidden />
                    See all prizes
                    <ChevronRight className="h-4 w-4 md:h-5 md:w-5 shrink-0 opacity-90" aria-hidden />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <AlertDialog open={!!confirmingPrize} onOpenChange={(open) => {
              if (!open && !isRedeemingPrize) setConfirmingPrize(null);
            }}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Redeem prize?</AlertDialogTitle>
                  <AlertDialogDescription className="break-words [overflow-wrap:anywhere]">
                    Redeem <span className="font-bold">{confirmingPrize?.name}</span>
                    {confirmingPrize ? ` for ${(confirmingPrize.points || 0).toLocaleString()} points` : ''}?
                  </AlertDialogDescription>
                </AlertDialogHeader>
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
                    Print a voucher for <span className="font-bold">{prizeTicketData?.prizeName}</span>?
                  </AlertDialogDescription>
                </AlertDialogHeader>
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
                    Joke, riddle, or fortune shown after redeeming a prize.
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

            <EarnedBadgesShowcase
              student={student}
              badges={badges || []}
              enableBadges={settings.enableBadges}
              theme={activeTheme}
            />
          </div>

          {/* Right Section: Activity */}
          <Card
            className={cn("lg:col-span-1 border-none shadow-lg flex flex-col min-h-0 lg:min-h-[calc(100dvh-11rem)]", !activeTheme ? "bg-white dark:bg-slate-900" : "")}
            style={activeTheme ? { backgroundColor: 'var(--theme-card)', color: 'var(--theme-text)' } : undefined}
          >
            <CardHeader className="pb-2 border-b shrink-0" style={activeTheme ? { borderColor: 'var(--theme-bg)' } : undefined}>
              <Helper content="A log of your most recent point transactions, including coupons redeemed and prizes purchased.">
                <CardTitle
                  className={cn("text-sm font-black flex items-center gap-2", !activeTheme && "text-slate-800 dark:text-white")}
                  style={activeTheme ? { color: 'var(--theme-text)' } : undefined}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={activeTheme ? { backgroundColor: 'var(--theme-bg)' } : undefined}>
                    <ChevronRight className="w-4 h-4 text-chart-1" style={activeTheme ? { color: 'var(--theme-primary)' } : undefined} />
                  </div>
                  <span style={activeTheme ? { color: 'var(--theme-text)' } : undefined}>Activity</span>
                </CardTitle>
              </Helper>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 flex flex-col pt-3 pb-4">
              <StudentActivityList schoolId={schoolId} studentId={student.id} themed={!!activeTheme} onReprintTicket={handleReprint} />
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default function StudentLoginPage() {
  const { loginState, isInitialized, schoolId } = useAppContext();
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
  const activeStudentIdRef = useRef<string | null>(null);
  activeStudentIdRef.current = activeStudentId;

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

  const handleStudentLogout = useCallback(() => {
    playSound('swoosh');
    if (activeStudentIdRef.current) {
      handleDone();
      toast({ title: 'Logged Out', description: 'Returning to kiosk home.' });
    } else {
      router.push(schoolId ? `/${schoolId}/portal` : '/login');
    }
  }, [handleDone, playSound, router, schoolId, toast]);

  useEffect(() => {
    window.addEventListener(STUDENT_KIOSK_REQUEST_EXIT_EVENT, handleStudentLogout);
    return () => window.removeEventListener(STUDENT_KIOSK_REQUEST_EXIT_EVENT, handleStudentLogout);
  }, [handleStudentLogout]);

  if (!isInitialized || !['student', 'teacher', 'admin', 'school', 'developer'].includes(loginState)) {
    return <div className={cn(
      "min-h-screen flex items-center justify-center p-8",
      animBackdrop ? "bg-transparent" : "bg-background",
    )}>
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
        <p className="text-muted-foreground font-medium animate-pulse">Loading Student Portal...</p>
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
            onResolved={handleDone}
          />
        )}
        <ErrorBoundary name="StudentDashboard">
          <SchoolGate>
            <StudentDashboardInner
              studentId={activeStudentId}
              onDone={handleDone}
              onRequestExit={handleStudentLogout}
            />
          </SchoolGate>
        </ErrorBoundary>
        <KioskSponsorBanner />
      </>
    );
  }

  return (
    <ErrorBoundary name="StudentLoginPage">
      <TooltipProvider>
        <div
          className={cn(
            "flex flex-col items-center justify-center min-h-[80vh] py-8 px-4 font-sans",
            isGraphic ? 'animate-in fade-in zoom-in-95 duration-500' : '',
            settings.displayMode === 'app' && 'pb-24'
          )}
          style={{
            ['--primary' as any]: rainbowTripletForNavId('redeem', settings.colorScheme),
            ['--chart-1' as any]: rainbowTripletForNavId('redeem', settings.colorScheme),
            ['--chart-2' as any]: complementTripletForNavId('redeem', settings.colorScheme),
            ['--chart-3' as any]: rainbowTripletForNavId('redeem', settings.colorScheme),
            ['--chart-4' as any]: complementTripletForNavId('redeem', settings.colorScheme),
            ['--chart-5' as any]: rainbowTripletForNavId('redeem', settings.colorScheme),
            ['--ring' as any]: complementTripletForNavId('redeem', settings.colorScheme),
          } as any}
        >
          <StudentScanner
            onStudentFound={onScannerStudent}
            title="Student Portal"
            icon={<LevelUpKioskLogo className="" />}
          />
        </div>
      </TooltipProvider>
      <KioskSponsorBanner />
    </ErrorBoundary>
  );
}





