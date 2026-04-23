
'use client';

import { useState, useEffect, useRef, useCallback, useMemo, RefObject } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useFunctions, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc } from 'firebase/firestore';
import { SchoolGate } from '@/components/SchoolGate';
import { httpsCallable } from 'firebase/functions';
import { lookupStudentId } from '@/lib/db';
import { StudentScanner } from '@/components/StudentScanner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Student, Prize, HistoryItem, AttendanceScheduleSlot, Class, AttendanceSettings, AttendanceRewardRule } from '@/lib/types';
import DynamicIcon from '@/components/DynamicIcon';
import { Progress } from '@/components/ui/progress';
import { cn, getStudentNickname, getContrastColor } from '@/lib/utils';
import {
  ArrowLeft,
  Nfc,
  Type,
  Camera,
  Star,
  BookOpen,
  Award,
  FlaskConical,
  Home,
  Wallet,
  Trophy,
  User,
  LogOut,
  ChevronRight,
  GraduationCap,
  Settings,
  Lock,
  Unlock,
  Loader2,
  Clock
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GoogleFontLoader } from '@/components/GoogleFontLoader';

import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Helper } from '@/components/ui/helper';
import { Skeleton } from '@/components/ui/skeleton';
import { BadgeShowcase } from '@/components/BadgeShowcase';
import { EarnedBadgesShowcase } from '@/components/EarnedBadgesShowcase';
import { useActiveStudentSession } from '@/hooks/useActiveStudentSession';

function StudentActivityList({ schoolId, studentId }: { schoolId: string; studentId: string }) {
  const firestore = useFirestore();
  const activitiesQuery = useMemoFirebase(() => (
    query(
      collection(firestore, `schools/${schoolId}/students/${studentId}/activities`),
      orderBy('date', 'desc'),
      limit(20)
    )
  ), [firestore, schoolId, studentId]);
  const { data: history, isLoading } = useCollection<HistoryItem>(activitiesQuery);

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex justify-between items-center py-3 border-b border-border/50 animate-pulse">
            <div className="space-y-2">
              <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div className="h-3 w-16 bg-slate-100 dark:bg-slate-900 rounded"></div>
            </div>
            <div className="h-6 w-12 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] w-full pr-4">
      <ul className="space-y-3">
        {history && history.length > 0 ? (
          history.map((item, index) => {
            const isRedemption = item.desc.startsWith('Redeemed:');
            const isPointGain = item.amount > 0;

            return (
              <li
                key={index}
                className="group p-4 rounded-2xl border border-slate-50 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all duration-300"
              >
                <div className="flex justify-between items-start mb-2">
                  <p className="font-bold text-slate-800 dark:text-slate-200 leading-tight">
                    {item.desc}
                  </p>
                  <Badge
                    variant={isPointGain ? 'default' : 'secondary'}
                    className={cn(
                      "font-black text-[10px] px-2 py-0.5 rounded-full tracking-tighter",
                      isPointGain ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                    )}
                  >
                    {isPointGain ? `+${item.amount}` : item.amount} PTS
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 opacity-40">
                    <Clock className="w-3 h-3" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {item.date ? format(new Date(item.date), 'MMM d, h:mm a') : 'Recently'}
                    </span>
                  </div>
                  {isRedemption && (
                    <div className={cn(
                      "flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter",
                      item.fulfilled
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                    )}>
                      {item.fulfilled ? 'Delivered' : 'Pending'}
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
  const { redeemCoupon, schoolId, isKioskLocked, achievements, badges, getAttendanceConfig, getTeacherAttendanceConfig, recordClassSignIn } = useAppContext();
  const firestore = useFirestore();
  const functions = useFunctions();
  const { toast } = useToast();
  const { settings } = useSettings();
  const isGraphic = settings.graphicMode === 'graphics';
  const signInRecordedRef = useRef(false);

  const studentDocRef = useMemoFirebase(() => schoolId ? doc(firestore, 'schools', schoolId, 'students', studentId) : null, [firestore, schoolId, studentId]);
  const { data: student, isLoading: studentLoading } = useDoc<Student>(studentDocRef);

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
  const [logoutTimer, setLogoutTimer] = useState(15);
  const [flyPointsValue, setFlyPointsValue] = useState<number | null>(null);
  const [celebrationMessage, setCelebrationMessage] = useState<string | null>(null);
  const animationKey = useRef(0);
  const playSound = useArcadeSound();

  const [showRedeem, setShowRedeem] = useState(true);

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
    if (!settings.enableClassSignIn || !student || signInRecordedRef.current || !recordClassSignIn) return;
    signInRecordedRef.current = true;

    const resolveConfigAndSignIn = async () => {
      try {
        const studentClassId = student.classId;
        const classForStudent = studentClassId && classes ? classes.find((c) => c.id === studentClassId) : undefined;
        const teacherId = classForStudent?.primaryTeacherId;

        // Prefer teacher-created attendance reward rules.
        const enabledRules = (teacherRewards || []).filter(r => r.enabled);
        const now = Date.now();
        const nowMinutes = new Date(now).getHours() * 60 + new Date(now).getMinutes();

        const resolveRulePeriod = (rule: AttendanceRewardRule) => {
          if (rule.customPeriod) return rule.customPeriod;
          const slot = (periods || []).find(p => p.id === rule.periodId);
          return slot ? { label: slot.label, startTime: slot.startTime, endTime: slot.endTime } : null;
        };

        const parse = (hhmm: string) => {
          const [h, m] = hhmm.split(':').map(Number);
          return (h || 0) * 60 + (m || 0);
        };

        const matchingRule = enabledRules.find((r) => {
          if (!studentClassId || r.classId !== studentClassId) return false;
          const period = resolveRulePeriod(r);
          if (!period) return false;
          const start = parse(period.startTime);
          const end = parse(period.endTime);
          return nowMinutes >= start && nowMinutes <= end;
        });

        if (matchingRule && teacherId) {
          const period = resolveRulePeriod(matchingRule);
          if (!period) return;
          const slotId = matchingRule.periodId || `custom_${matchingRule.id}`;
          const configFromRule: AttendanceSettings = {
            pointsForSignIn: matchingRule.pointsForSignIn,
            pointsForOnTime: matchingRule.pointsForOnTime,
            onTimeWindowMinutes: matchingRule.onTimeWindowMinutes ?? 15,
            enabledClassIds: [studentClassId!],
            classPeriodAssignments: { [studentClassId!]: slotId },
            schedule: [{
              id: slotId,
              label: period.label,
              startTime: period.startTime,
              endTime: period.endTime,
            }],
            categoryId: matchingRule.categoryId,
            teacherId,
          };
          const result = await recordClassSignIn(student.id, student, configFromRule);
          if (result && result.pointsAwarded > 0) {
            playSound('success');
            toast({ title: 'Attendance recorded', description: `+${result.pointsAwarded} pts${result.onTime ? ' (on time!)' : ''}.` });
            animationKey.current += 1;
            setFlyPointsValue(result.pointsAwarded);
            setTimeout(() => { setFlyPointsValue(null); }, 1500);
          }
          return;
        }

        // Fallback to legacy configs.
        let config: AttendanceSettings | null = null;
        if (teacherId && getTeacherAttendanceConfig) config = await getTeacherAttendanceConfig(teacherId);
        if (!config && getAttendanceConfig) config = await getAttendanceConfig();
        if (!config) return;
        const configWithUniversalPeriods: AttendanceSettings = { ...config, schedule: Array.isArray(periods) ? periods : [] };
        const result = await recordClassSignIn(student.id, student, configWithUniversalPeriods);
        if (result && result.pointsAwarded > 0) {
          playSound('success');
          toast({ title: 'Class sign-in recorded', description: `+${result.pointsAwarded} pts${result.onTime ? ' (on time!)' : ''}.` });
          animationKey.current += 1;
          setFlyPointsValue(result.pointsAwarded);
          setTimeout(() => { setFlyPointsValue(null); }, 1500);
        }
      } catch (err) {
        console.error('Attendance sign-in failed', err);
      }
    };

    resolveConfigAndSignIn();
  }, [settings.enableClassSignIn, student, classes, periods, teacherRewards, getAttendanceConfig, getTeacherAttendanceConfig, recordClassSignIn, toast, playSound]);

  const resetTimer = useCallback(() => {
    if (!isKioskLocked) {
      setLogoutTimer(15);
    }
  }, [isKioskLocked]);

  useEffect(() => {
    if (isKioskLocked) return;
    if (logoutTimer <= 0) {
      onDone();
      return;
    }
    const timerId = setTimeout(() => {
      setLogoutTimer(logoutTimer - 1);
    }, 1000);

    return () => clearTimeout(timerId);
  }, [logoutTimer, onDone, isKioskLocked]);

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

    const result = await redeemCoupon(student.id, code);

    if (result.success) {
      playSound('redeem');
      toast({ title: 'Coupon Redeemed!', description: `You gained ${result.value} points.` });
      animationKey.current += 1;
      setFlyPointsValue(result.value || null);
      setTimeout(() => { setFlyPointsValue(null); setShowRedeem(false); }, 1500);
    } else {
      playSound('error');
      toast({ variant: 'destructive', title: 'Redemption Failed', description: result.message });
    }
    setCouponCode('');
  }, [couponCode, resetTimer, redeemCoupon, student, toast, playSound]);

  // Celebrate on login if new badges / bonus milestones were earned since last time this student opened the portal.
  useEffect(() => {
    if (!student || !schoolId) return;
    try {
      const key = `arcade:lastSeenCelebrations:${schoolId}:${student.id}`;
      const prev = JSON.parse(localStorage.getItem(key) || '{}') as { badgeAt?: number; bonusAt?: number };

      const latestBadgeAt = Math.max(0, ...(student.earnedBadges || []).map((e) => e.earnedAt || 0));
      const latestBonusAt = Math.max(
        0,
        ...(student.earnedAchievements || [])
          .map((e) => {
            const ach = (achievements || []).find((a) => a.id === e.achievementId);
            const isBonus = (ach?.bonusPoints ?? 0) > 0;
            return isBonus ? (e.earnedAt || 0) : 0;
          })
      );

      const newBadge = latestBadgeAt > (prev.badgeAt || 0);
      const newBonus = latestBonusAt > (prev.bonusAt || 0);

      if (newBadge || newBonus) {
        playSound('success');
        const parts: string[] = [];
        if (newBadge) parts.push('a new badge');
        if (newBonus) parts.push('a new achievement');
        setCelebrationMessage(`You earned ${parts.join(' and ')}!`);
        setTimeout(() => setCelebrationMessage(null), 2200);
      }

      localStorage.setItem(key, JSON.stringify({ badgeAt: latestBadgeAt, bonusAt: latestBonusAt }));
    } catch {
      // ignore storage / JSON errors
    }
  }, [student?.id, schoolId, achievements, toast, playSound]); // eslint-disable-line react-hooks/exhaustive-deps

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
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>
  }

  const fontScale = student.theme?.fontScale ?? 1;
  const themeBg = student.theme?.background || '#020617';
  const computedThemeText = student.theme?.text || (getContrastColor(themeBg) === 'black' ? '#020617' : '#ffffff');

  return (
    <TooltipProvider>
      <div
        className={cn("mt-6 md:mt-12 space-y-6 relative max-w-full mx-auto px-4 md:px-8", isGraphic ? 'animate-in fade-in duration-500' : '', settings.displayMode === 'app' && 'pb-24')}
        style={student.theme ? ({
          '--theme-bg': themeBg,
          '--theme-text': computedThemeText,
          '--theme-primary': student.theme.primary,
          '--theme-card': student.theme.cardBackground,
          '--theme-accent': student.theme.accent,
          ...(student.theme.backgroundStyle ? { background: student.theme.backgroundStyle } : { backgroundColor: 'var(--theme-bg)' }),
          color: 'var(--theme-text)',
          fontFamily: student.theme.fontFamily || 'inherit',
          fontSize: fontScale !== 1 ? `${fontScale}em` : undefined,
        } as unknown as React.CSSProperties) : undefined}
      >
        {student.theme?.fontFamily && <GoogleFontLoader fontFamily={student.theme.fontFamily} />}

        {celebrationMessage && (
          <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
            <div className="pointer-events-auto bg-black/70 text-white px-8 py-5 rounded-3xl shadow-2xl border border-white/20 flex flex-col items-center gap-2 animate-in fade-in zoom-in duration-300">
              <span className="text-3xl font-black tracking-widest uppercase">Yay!</span>
              <span className="text-sm font-medium text-center max-w-xs">{celebrationMessage}</span>
            </div>
          </div>
        )}

        {flyPointsValue !== null && (
          <div key={animationKey.current} className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
            <div className="animate-fly-up text-4xl md:text-6xl font-black tracking-widest text-emerald-400 drop-shadow-[0_0_14px_rgba(52,211,153,0.75)]">
              +{flyPointsValue} PTS
            </div>
          </div>
        )}

        {/* Graphic Elements */}
        {isGraphic && !student.theme && (
          <div className="absolute -top-12 right-0 w-32 h-32 opacity-20 pointer-events-none z-0">
            <Star className="w-full h-full text-amber-400 fill-amber-400 animate-pulse" />
          </div>
        )}

        {/* Hero Welcome Section */}
        <Card
          className={cn("overflow-hidden shadow-xl border-t-8 border-chart-1", isGraphic && !student.theme ? 'bg-gradient-to-br from-indigo-100/50 to-indigo-50/30 dark:from-indigo-950/40 dark:to-slate-900/40' : !student.theme ? 'bg-card dark:bg-slate-800' : '')}
          style={student.theme ? { backgroundColor: 'var(--theme-card)', color: 'var(--theme-text)', borderColor: 'var(--theme-primary)' } : undefined}
        >
          <CardContent className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="space-y-1 text-center md:text-left">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: student.theme ? 'var(--theme-text)' : undefined, opacity: student.theme ? 0.7 : undefined }}>Welcome back,</p>
              <div className="flex items-center gap-4 mt-1">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-primary/10 border border-border/60 flex items-center justify-center font-bold text-primary flex-shrink-0">
                  {student.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={student.photoUrl} alt={`${student.firstName} ${student.lastName}`} className={settings.photoDisplayMode === 'cover' ? 'h-full w-full object-cover' : 'h-full w-full object-contain'} />
                  ) : (
                    <span>{(student.firstName[0] || '')}{(student.lastName[0] || '')}</span>
                  )}
                </div>
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl md:text-4xl font-black">
                      {student.firstName} {student.lastName}
                    </h2>
                    {student.theme?.emoji && (
                      <span
                        className="text-4xl md:text-5xl leading-none"
                        style={{ filter: student.theme?.primary ? `drop-shadow(0 0 8px ${student.theme.primary}) drop-shadow(0 0 16px ${student.theme.primary})` : undefined }}
                      >
                        {student.theme.emoji}
                      </span>
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
              <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: student.theme ? 'var(--theme-text)' : undefined, opacity: student.theme ? 0.7 : undefined }}>Current Balance</p>
              <div className="flex items-baseline gap-1.5" style={{ color: student.theme ? 'var(--theme-primary)' : undefined }}>
                <span className="text-5xl md:text-7xl font-black leading-none" style={{ color: student.theme ? 'var(--theme-primary)' : 'hsl(var(--primary))' }}>
                  {(student.points || 0).toLocaleString()}
                </span>
                <span className="text-xl md:text-2xl font-bold uppercase tracking-widest" style={{ color: student.theme ? 'var(--theme-primary)' : 'hsl(var(--primary) / 0.6)', opacity: 0.6 }}>pts</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
          {/* Left Section: Content */}
          <div className="lg:col-span-2 space-y-5">
            <Card
              className={cn("border-none shadow-lg overflow-hidden", !student.theme ? "bg-white dark:bg-slate-900" : "")}
              style={student.theme ? { backgroundColor: 'var(--theme-card)', color: 'var(--theme-text)' } : undefined}
            >
              <CardHeader className="pb-3 border-b" style={student.theme ? { borderColor: 'var(--theme-bg)' } : undefined}>
                <Helper content="Enter a coupon code to add points to your account. You can type it in manually or use the camera to scan a QR code.">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base font-black flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={student.theme ? { backgroundColor: 'var(--theme-bg)' } : { backgroundColor: 'var(--theme-bg)' /* Will be overridden by classes if no theme */ }}>
                        <Wallet className="w-4 h-4" style={student.theme ? { color: 'var(--theme-primary)' } : undefined} />
                      </div>
                      Redeem Coupon Code
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-colors whitespace-nowrap",
                        isKioskLocked
                          ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800"
                          : "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800"
                      )}>
                        <span>{isKioskLocked ? 'Kiosk Locked • ' : ''}Auto-logout in {logoutTimer}s</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-3 rounded-full text-[10px] font-bold uppercase tracking-widest"
                        onClick={onRequestExit}
                      >
                        Logout
                      </Button>
                    </div>
                  </div>
                </Helper>
              </CardHeader>
              <CardContent className="pt-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl h-12">
                    <TabsTrigger value="manual" className="text-xs font-bold rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm flex items-center gap-2">
                      <Type className="w-4 h-4" /> Manual / USB
                    </TabsTrigger>
                    <TabsTrigger value="camera" className="text-xs font-bold rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm flex items-center gap-2">
                      <Camera className="w-4 h-4" /> Webcam Scan
                    </TabsTrigger>
                  </TabsList>

                  {activeTab === 'manual' ? (
                    <div className="space-y-6">
                      <div className="flex gap-3">
                        <Input
                          placeholder="Enter coupon code..."
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          onKeyDown={(e) => e.key === 'Enter' && handleRedeemCoupon()}
                          className="font-mono text-left tracking-widest h-14 border-2 rounded-xl"
                          style={student.theme ? { backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-primary)', color: 'var(--theme-text)' } : undefined}
                          autoFocus
                        />
                        <Button
                          onClick={() => handleRedeemCoupon()}
                          className="h-14 px-10 font-black rounded-xl shadow-lg transition-all active:scale-95 uppercase tracking-widest"
                          style={student.theme ? {
                            backgroundColor: 'var(--theme-primary)',
                            color: getContrastColor(student.theme.primary) === 'black' ? '#000' : '#fff'
                          } : { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
                        >
                          Redeem
                        </Button>
                      </div>
                      <p className="text-xs text-center text-muted-foreground pt-2">
                        Available coupon codes can be viewed in the Admin panel.
                      </p>
                    </div>
                  ) : (
                    <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border-4 border-slate-100 dark:border-slate-800 shadow-inner">
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
              className={cn("border-none shadow-lg", !student.theme ? "bg-white dark:bg-slate-900" : "")}
              style={student.theme ? { backgroundColor: 'var(--theme-card)', color: 'var(--theme-text)' } : undefined}
            >
              <CardHeader className="pb-3">
                <Helper content="These are prizes you currently have enough points to redeem. Go to the Prize Shop to make a purchase.">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={student.theme ? { backgroundColor: 'var(--theme-bg)' } : undefined}>
                      <Award className="w-4 h-4" style={student.theme ? { color: 'var(--theme-primary)' } : undefined} />
                    </div>
                    <div>
                      <CardTitle className="text-base font-black">Eligible Rewards</CardTitle>
                      <CardDescription className="text-xs font-medium" style={student.theme ? { color: 'var(--theme-text)', opacity: 0.7 } : undefined}>You have enough points for these items! Go to the Prize Shop to redeem them.</CardDescription>
                    </div>
                  </div>
                </Helper>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {prizesLoading ? (
                    [...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)
                  ) : (prizes || [])
                    .filter(p => p.inStock && p.points <= student.points && (!p.teacherId || (student.teacherIds || []).includes(p.teacherId)) && (!p.classId || student.classId === p.classId))
                    .sort((a, b) => b.points - a.points)
                    .slice(0, 3)
                    .map((reward) => (
                      <div key={reward.id} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 transition-all flex flex-col items-center text-center gap-2 bg-white/40 dark:bg-slate-800/40 shadow-sm hover:shadow-md hover:-translate-y-0.5 transform duration-300 group">
                        <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                          <DynamicIcon name={reward.icon} className="w-6 h-6 text-primary" />
                        </div>
                        <p className="text-xs font-black text-slate-800 dark:text-white leading-tight line-clamp-1">{reward.name}</p>
                        <Badge variant="secondary" className="font-black text-[9px] tracking-widest rounded-md px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {(reward.points || 0).toLocaleString()} PTS
                        </Badge>
                      </div>
                    ))}
                  {!prizesLoading && (prizes || []).filter(p => p.inStock && p.points <= student.points).length === 0 && (
                    <div className="col-span-full py-6 text-center text-muted-foreground text-xs font-medium uppercase tracking-widest opacity-60">
                      Keep earning points to unlock rewards!
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <BadgeShowcase
              student={student}
              achievements={achievements || []}
              enableAchievements={settings.enableAchievements}
              theme={student.theme}
            />
            <EarnedBadgesShowcase
              student={student}
              badges={badges || []}
              enableBadges={settings.enableBadges}
              theme={student.theme}
            />
          </div>

          {/* Right Section: Activity */}
          <Card
            className={cn("lg:col-span-1 border-none shadow-lg flex flex-col", !student.theme ? "bg-white dark:bg-slate-900" : "")}
            style={student.theme ? { backgroundColor: 'var(--theme-card)', color: 'var(--theme-text)' } : undefined}
          >
            <CardHeader className="pb-3 border-b" style={student.theme ? { borderColor: 'var(--theme-bg)' } : undefined}>
              <Helper content="A log of your most recent point transactions, including coupons redeemed and prizes purchased.">
                <CardTitle className="text-base font-black flex items-center gap-2 text-slate-800 dark:text-white">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={student.theme ? { backgroundColor: 'var(--theme-bg)' } : undefined}>
                    <ChevronRight className="w-5 h-5 text-chart-1" style={student.theme ? { color: 'var(--theme-primary)' } : undefined} />
                  </div>
                  <span style={student.theme ? { color: 'var(--theme-text)' } : undefined}>Activity</span>
                </CardTitle>
              </Helper>
            </CardHeader>
            <CardContent className="flex-1 pt-4">
              <StudentActivityList schoolId={schoolId} studentId={student.id} />
            </CardContent>
            <div className="p-4 border-t" style={student.theme ? { borderColor: 'var(--theme-bg)', backgroundColor: 'var(--theme-bg)' } : undefined}>
              <Button variant="outline" onClick={onDone} className="w-full h-11 font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                style={student.theme ? { color: 'var(--theme-text)', borderColor: 'var(--theme-text)', backgroundColor: 'transparent' } : undefined}
              >
                <LogOut className="h-4 w-4" /> Log Out Now
              </Button>
            </div>
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
  const functions = useFunctions();

  const { activeStudentId, setActiveStudentId, handleDone } = useActiveStudentSession();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [logoutPasscode, setLogoutPasscode] = useState('');

  const handleConfirmLogout = useCallback(async () => {
    if (!schoolId) return;
    try {
      const verify = httpsCallable(functions, 'verifySchoolPasscode');
      await verify({ schoolId, passcode: logoutPasscode });
      playSound('swoosh');

      if (activeStudentId) {
        // Logging out from student dashboard, go back to scanner
        setActiveStudentId(null);
        toast({ title: "Logged Out", description: "Returning to kiosk home." });
      } else {
        // Exiting from scanner page, go back to main portal
        router.push('/portal');
      }

    } catch (e) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Incorrect Passcode',
        description: 'The passcode you entered is incorrect.',
      });
    } finally {
      setLogoutPasscode('');
      setIsLogoutDialogOpen(false);
    }
  }, [schoolId, functions, logoutPasscode, activeStudentId, playSound, router, toast, setActiveStudentId]);

  if (!isInitialized || !['student', 'teacher', 'admin', 'school'].includes(loginState)) {
    return <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
        <p className="text-muted-foreground font-medium animate-pulse">Loading Student Portal...</p>
      </div>
    </div>;
  }

  if (activeStudentId) {
    return (
      <ErrorBoundary name="StudentDashboard">
        <SchoolGate>
          <StudentDashboardInner
            studentId={activeStudentId}
            onDone={handleDone}
            onRequestExit={() => setIsLogoutDialogOpen(true)}
          />
        </SchoolGate>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary name="StudentLoginPage">
      <TooltipProvider>
        <div className={cn(
          "flex flex-col items-center justify-center min-h-[80vh] py-8 px-4 font-sans",
          isGraphic ? 'animate-in fade-in zoom-in-95 duration-500' : '',
          settings.displayMode === 'app' && 'pb-24'
        )}>
          <StudentScanner
            onStudentFound={setActiveStudentId}
            title="Student Portal"
            icon={<GraduationCap className="w-8 h-8 text-chart-1" />}
          />
        </div>
        <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl shadow-2xl border-none">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-slate-800">Exit Kiosk?</DialogTitle>
              <DialogDescription className="text-slate-500 font-medium text-sm">
                To protect student privacy, a passcode is required to exit the student kiosk.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="logout-passcode-unified" className="font-black text-slate-700 uppercase tracking-widest text-[10px] ml-1">School Passcode</Label>
              <Input
                id="logout-passcode-unified"
                type="password"
                className="mt-2 text-xl rounded-xl h-14 border-2 border-slate-200 bg-slate-50 focus-visible:ring-primary font-mono tracking-widest text-center shadow-inner"
                value={logoutPasscode}
                onChange={(e) => setLogoutPasscode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirmLogout()}
                autoFocus
              />
            </div>
            <DialogFooter className="flex gap-2 sm:justify-between">
              <Button variant="ghost" className="rounded-xl flex-1 h-11 font-bold text-slate-500 text-sm" onClick={() => { setIsLogoutDialogOpen(false); setLogoutPasscode(''); }}>Cancel</Button>
              <Button onClick={handleConfirmLogout} className="rounded-xl flex-1 h-11 bg-red-500 hover:bg-red-600 text-white font-bold text-sm shadow-lg shadow-red-200">Confirm Exit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </ErrorBoundary>
  );
}
