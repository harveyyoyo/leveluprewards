'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Award,
  BookOpenCheck,
  Check,
  Clock,
  Dices,
  ExternalLink,
  Laptop,
  LayoutGrid,
  Monitor,
  Palette,
  Projector,
  QrCode,
  RotateCcw,
  Settings as SettingsIcon,
  Shuffle,
  Sparkles,
  Timer,
  Tv,
  Users,
} from 'lucide-react';
import { cn, getStudentNickname } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useSettings, type Settings } from '@/components/providers/SettingsProvider';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore } from '@/firebase';
import { isClassroomPillarOn, isParentPortalOn, isPillarOn, isRewardsPillarOn } from '@/lib/productPillars';
import { studentsInTeacherScope } from '@/lib/reportsScope';
import { isLeadershipPersonnel } from '@/lib/teacherPersonnelRole';
import { remainingTeacherBudgetPoints, teacherWithBudgetAfterSpend } from '@/lib/teacherBudget';
import { useTodayAttendanceMap } from '@/hooks/useTodayAttendanceMap';
import { useActiveBathroomPasses } from '@/hooks/useActiveBathroomPasses';
import { endBathroomPass } from '@/lib/db/bathroom';
import { formatBathroomElapsed, isBathroomOverLimit } from '@/lib/bathroom/formatBathroomElapsed';
import { awardClassroomPoints } from '@/lib/classroom/classroomPointsClient';
import { buildClassroomFullscreenUrl } from '@/lib/classroomPointsUrl';
import {
  CLASSROOM_REALM_THEMES,
  resolveClassroomRealmTheme,
  type ClassroomRealmThemeId,
} from '@/lib/classroom/classroomRealmThemes';
import {
  loadClassroomSession,
  classroomSessionStorageKey,
  applyClassroomSessionAward,
  subscribeClassroomSessionUpdates,
  type ClassroomSessionData,
} from '@/lib/classroomSeatingChart';
import { ClassroomPointsPanel } from '@/components/points/ClassroomPointsPanel';
import { ClassroomScreenPairModal } from '@/components/classroom/ClassroomScreenPairModal';
import { RandomStudentPickerModal } from '@/components/classroom/RandomStudentPickerModal';
import { ClassroomSetupWizardTrigger } from '@/app/[schoolId]/admin/sections/ClassroomSetupWizard';
import { BehaviorTimelinePanel } from '@/components/classroom/BehaviorTimelinePanel';
import { ClassroomRoomDisplaySection } from '@/components/classroom/ClassroomRoomDisplaySection';
import { ClassAwardsLiveSettingsSection } from '@/components/classroom/ClassAwardsLiveSettingsSection';
import { useToast } from '@/hooks/use-toast';
import { AdminRaffleTab } from '@/app/[schoolId]/admin/sections/AdminRaffleTab';
import { isClassroomRaffleSectionVisible } from '@/lib/classroom/classroomTabSections';
import type { Category, Class, Student, Teacher } from '@/lib/types';

export type ClassroomWorkbenchTab = 'seating' | 'behavior' | 'display' | 'settings' | 'raffle';

export interface ClassroomCommandCenterProps {
  schoolId: string;
  classes?: Class[] | null;
  students?: Student[] | null;
  categories?: Category[] | null;
  teachers?: Teacher[] | null;
  variant?: 'admin' | 'teacher';
  activeTeacherId?: string;
  schoolWideAccess?: boolean;
  budgetOptions?: React.ComponentProps<typeof ClassroomPointsPanel>['budgetOptions'];
  canEditRaffleSettings?: boolean;
  raffleOperatorName?: string;
  initialClassId?: string;
  initialTab?: ClassroomWorkbenchTab;
  className?: string;
}

export function ClassroomCommandCenter({
  schoolId,
  classes: propClasses,
  students: propStudents,
  categories: propCategories,
  teachers,
  variant = 'admin',
  activeTeacherId,
  schoolWideAccess = false,
  budgetOptions: propBudgetOptions,
  canEditRaffleSettings,
  raffleOperatorName,
  initialClassId,
  initialTab = 'seating',
  className,
}: ClassroomCommandCenterProps) {
  const { settings, updateSettings } = useSettings();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { loginState, teacherDocId, userId, userName, updateTeacher } = useAppContext();

  const effectiveTeacherId = activeTeacherId || teacherDocId || userId || '';
  const currentTeacher = teachers?.find((teacher) => teacher.id === effectiveTeacherId);
  const schoolWide = variant === 'admin' || schoolWideAccess || isLeadershipPersonnel(currentTeacher);
  const budgetOptions = useMemo(() => {
    if (propBudgetOptions) return propBudgetOptions;
    if (schoolWide) return undefined;
    return {
      isAdmin: false,
      currentTeacher: currentTeacher ?? null,
      onBudgetSpend: async (cost: number) => {
        if (currentTeacher) await updateTeacher(teacherWithBudgetAfterSpend(currentTeacher, cost));
      },
    };
  }, [propBudgetOptions, schoolWide, currentTeacher, updateTeacher]);
  const rewardsMode = isRewardsPillarOn(settings);
  const classroomOn = isClassroomPillarOn(settings);
  const attendanceOn = isPillarOn(settings, 'payAttendance');
  const parentPortalOn = isParentPortalOn(settings);
  const principalTimelineOn = settings.enablePrincipalBehaviorTimeline === true;
  const raffleVisible = isClassroomRaffleSectionVisible(settings, variant);

  // Real-time school attendance & bathroom passes
  const attendanceMap = useTodayAttendanceMap(schoolId, attendanceOn);
  const activePasses = useActiveBathroomPasses(schoolId, attendanceOn && !!settings.enableClassSignIn && settings.enableBathroomTimer !== false);

  // Active view & modals
  const [activeTab, setActiveTab] = useState<ClassroomWorkbenchTab>(initialTab);
  useEffect(() => {
    setActiveTab(initialTab === 'raffle' && !raffleVisible ? 'seating' : initialTab);
  }, [initialTab, raffleVisible]);
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [isRandomModalOpen, setIsRandomModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [sessionPoints, setSessionPoints] = useState<number>(0);

  // Scope & Class Resolution
  const seatingScope = schoolWide ? 'admin' : effectiveTeacherId || 'staff';

  const scopedStudents = useMemo(() => {
    const list = propStudents ?? [];
    if (schoolWide) return list;
    return studentsInTeacherScope(effectiveTeacherId, list, propClasses ?? []);
  }, [propStudents, propClasses, schoolWide, effectiveTeacherId]);

  const availableClasses = useMemo(() => {
    const list = (propClasses ?? []).slice().sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
    if (schoolWide) return list;
    const rosterClassIds = new Set(scopedStudents.map((s) => s.classId));
    return list.filter((c) => c.primaryTeacherId === effectiveTeacherId || rosterClassIds.has(c.id));
  }, [propClasses, schoolWide, effectiveTeacherId, scopedStudents]);

  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    if (initialClassId && availableClasses.some((c) => c.id === initialClassId)) {
      return initialClassId;
    }
    return availableClasses[0]?.id || '';
  });

  // Ensure selectedClassId stays valid when classes load
  useEffect(() => {
    if (!availableClasses.some((c) => c.id === selectedClassId)) {
      setSelectedClassId(availableClasses.find((c) => c.id === initialClassId)?.id ?? availableClasses[0]?.id ?? '');
    }
  }, [availableClasses, selectedClassId, initialClassId]);

  const activeClass = useMemo(() => {
    return availableClasses.find((c) => c.id === selectedClassId) || availableClasses[0] || null;
  }, [availableClasses, selectedClassId]);

  // Students in active class
  const classStudents = useMemo(() => {
    if (!activeClass) return [];
    return scopedStudents.filter((s) => s.classId === activeClass.id);
  }, [scopedStudents, activeClass]);

  // Active session subscription
  useEffect(() => {
    if (!schoolId || !selectedClassId) return;
    const initialSession = loadClassroomSession(schoolId, seatingScope, selectedClassId);
    const sum = Object.values(initialSession.totals || {}).reduce((a, b) => a + b, 0);
    setSessionPoints(sum);

    const unsubscribe = subscribeClassroomSessionUpdates((key, data: ClassroomSessionData) => {
      if (key !== classroomSessionStorageKey(schoolId, seatingScope, selectedClassId)) return;
      const total = Object.values(data.totals || {}).reduce((a, b) => a + b, 0);
      setSessionPoints(total);
    });

    return () => unsubscribe();
  }, [schoolId, seatingScope, selectedClassId]);

  // Attendance stats for active class
  const attendanceStats = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    for (const student of classStudents) {
      const status = attendanceMap.get(student.id);
      if (status === 'on-time') present++;
      else if (status === 'late') late++;
      else if (status === 'absent') absent++;
    }
    return { present, late, absent };
  }, [classStudents, attendanceMap]);

  // Active bathroom passes in current class
  const classActivePasses = useMemo(() => {
    const classStudentIds = new Set(classStudents.map((s) => s.id));
    const list: { studentId: string; studentName: string; startedAt: number }[] = [];
    for (const [studentId, pass] of activePasses.entries()) {
      if (classStudentIds.has(studentId)) {
        const s = classStudents.find((stud) => stud.id === studentId);
        list.push({
          studentId,
          studentName: s ? getStudentNickname(s) : 'Student',
          startedAt: pass.startedAt || Date.now(),
        });
      }
    }
    return list;
  }, [classStudents, activePasses]);

  // Handle ending a bathroom pass
  const handleEndPass = async (studentId: string) => {
    try {
      await endBathroomPass(firestore, schoolId, studentId, settings.bathroomMaxMinutes || 5);
      toast({
        title: 'Pass Ended',
        description: 'Student has returned to the classroom.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error ending pass',
        description: 'Please try again.',
      });
    }
  };

  // Handle awarding a random student
  const handleRandomAward = async (studentId: string, pts: number, reason: string) => {
    if (!classStudents.some((student) => student.id === studentId)) throw new Error('Select a student in the current class.');
    if (settings.enableTeacherBudgets && budgetOptions && !budgetOptions.isAdmin) {
      const teacher = budgetOptions.currentTeacher;
      if (!teacher) throw new Error('Teacher budget is still loading. Please try again.');
      const remaining = remainingTeacherBudgetPoints(teacher);
      if (remaining !== null && pts > remaining) throw new Error('Insufficient teacher budget.');
    }
    const result = await awardClassroomPoints(firestore, {
      schoolId,
      studentIds: [studentId],
      signedDelta: pts,
      description: reason,
      rewardsMode,
      classId: selectedClassId,
      className: activeClass?.name,
      teacherId: effectiveTeacherId,
      teacherName: userName || (schoolWide ? 'Administrator' : 'Teacher'),
    });
    if (!result.success) {
      throw new Error(result.message);
    }
    if (rewardsMode && settings.enableTeacherBudgets && budgetOptions && !budgetOptions.isAdmin) {
      await budgetOptions.onBudgetSpend(pts);
    }
    applyClassroomSessionAward(schoolId, seatingScope, selectedClassId, [studentId], pts, reason);
    toast({
      title: 'Spotlight Awarded!',
      description: `Awarded +${pts} points to student.`,
    });
  };

  // Fullscreen URLs
  const liveSmartboardUrl = buildClassroomFullscreenUrl({
    schoolId,
    classId: selectedClassId,
    scope: seatingScope,
    audience: 'teacher',
  });

  const studentMirrorUrl = `/${schoolId}/classroom-screen?classId=${encodeURIComponent(selectedClassId)}&scope=${encodeURIComponent(seatingScope)}`;

  const currentTheme = resolveClassroomRealmTheme(settings.classroomRealmTheme);

  // If Classroom pillar is off, show setup invitation
  if (!classroomOn) {
    return (
      <div className={cn('rounded-3xl border border-border/80 bg-card p-8 sm:p-12 text-center space-y-5 shadow-sm', className)}>
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <LayoutGrid className="h-10 w-10" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Classroom Management
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Run your classroom in real-time with visual seating charts, 1-tap quick awards, random student spotlights, live bathroom passes, and student projector screens.
          </p>
        </div>
        <div className="pt-2">
          {schoolWide ? <ClassroomSetupWizardTrigger
            schoolId={schoolId}
            classes={availableClasses}
            students={propStudents ?? []}
            updateSettings={updateSettings}
          /> : <p className="text-sm text-muted-foreground">Ask a school administrator to enable Classroom Management.</p>}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('classroom-native-colors space-y-5 text-foreground', className)}>
      {/* Top Classroom Control & Class Bar */}
      <div className="rounded-3xl border border-border/80 bg-card p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Class Picker & Stats */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <LayoutGrid className="h-5 w-5" />
              </div>
              <div className="w-[180px] sm:w-[220px]">
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="h-10 rounded-2xl font-bold text-sm bg-muted/40 border-border">
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {availableClasses.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id} className="font-semibold text-xs sm:text-sm">
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quick Pulse Badges */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <Badge variant="outline" className="h-8 rounded-xl font-bold px-2.5 gap-1.5 border-border bg-muted/30">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                {classStudents.length} Students
              </Badge>

              {attendanceOn && (
                <Badge variant="outline" className="h-8 rounded-xl font-bold px-2.5 gap-2 border-border bg-muted/30">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {attendanceStats.present}
                  </span>
                  {attendanceStats.late > 0 && (
                    <span className="flex items-center gap-1 text-amber-500">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      {attendanceStats.late}
                    </span>
                  )}
                  {attendanceStats.absent > 0 && (
                    <span className="flex items-center gap-1 text-rose-500">
                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                      {attendanceStats.absent}
                    </span>
                  )}
                </Badge>
              )}

              {classActivePasses.length > 0 && (
                <Badge className="h-8 rounded-xl font-black px-2.5 gap-1.5 bg-amber-500 text-black animate-pulse shadow-sm">
                  <Timer className="h-3.5 w-3.5" />
                  {classActivePasses.length} Out on Pass
                </Badge>
              )}

              <Badge variant="secondary" className="h-8 rounded-xl font-bold px-2.5 gap-1.5 bg-primary/10 text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                +{sessionPoints} pts today
              </Badge>
            </div>
          </div>

          {/* Quick Action Broadcast Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Random Student Spotlight */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRandomModalOpen(true)}
              disabled={classStudents.length === 0}
              className="h-9 rounded-xl font-bold text-xs gap-1.5 border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400"
            >
              <Shuffle className="h-3.5 w-3.5" />
              Random Pick
            </Button>

            {/* Launch Smartboard (Teacher Interactive Fullscreen) */}
            <Button
              asChild
              size="sm"
              className="h-9 rounded-xl font-bold text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow"
            >
              <a href={liveSmartboardUrl} target="_blank" rel="noopener noreferrer">
                <Laptop className="h-3.5 w-3.5" />
                Live Smartboard
                <ExternalLink className="h-3 w-3 opacity-70" />
              </a>
            </Button>

            {/* Student Mirror Projector */}
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 rounded-xl font-bold text-xs gap-1.5 border-border bg-background hover:bg-muted"
            >
              <a href={studentMirrorUrl} target="_blank" rel="noopener noreferrer">
                <Projector className="h-3.5 w-3.5 text-primary" />
                Student Mirror
                <ExternalLink className="h-3 w-3 opacity-70" />
              </a>
            </Button>

            {/* Pair Screen / QR Code */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPairModalOpen(true)}
              className="h-9 rounded-xl font-bold text-xs gap-1.5 border-border bg-background hover:bg-muted"
            >
              <QrCode className="h-3.5 w-3.5" />
              Pair TV / QR
            </Button>

            {/* Look / Theme Picker */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsThemeModalOpen(true)}
              className="h-9 w-9 p-0 rounded-xl text-muted-foreground hover:text-foreground"
              title={`Classroom Theme: ${currentTheme.label}`}
            >
              <Palette className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Live Bathroom Alert Bar (if active students) */}
        {classActivePasses.length > 0 && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500 text-black font-black text-xs">
                🚻
              </span>
              <div className="text-xs">
                <span className="font-bold text-amber-900 dark:text-amber-200">Active Restroom Passes:</span>{' '}
                <span className="text-amber-800 dark:text-amber-300">
                  {classActivePasses.map((p) => p.studentName).join(', ')}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {classActivePasses.map((p) => (
                <Button
                  key={p.studentId}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleEndPass(p.studentId)}
                  className="h-7 text-[11px] font-bold rounded-lg border-amber-500/40 bg-background hover:bg-amber-500/20 text-amber-900 dark:text-amber-100"
                >
                  <Check className="mr-1 h-3 w-3 text-emerald-500" />
                  Return {p.studentName}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sub-Views Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as ClassroomWorkbenchTab)}
        className="space-y-4"
      >
        <TabsList className={cn('grid h-auto w-full grid-cols-2 gap-1 rounded-2xl p-1 bg-muted border border-border/60', raffleVisible ? 'sm:grid-cols-3 xl:grid-cols-5' : 'sm:grid-cols-4')}>
          <TabsTrigger
            value="seating"
            className="rounded-xl font-bold text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            <LayoutGrid className="mr-1.5 h-4 w-4 text-emerald-500" />
            Seating &amp; Awards
          </TabsTrigger>
          <TabsTrigger
            value="behavior"
            className="rounded-xl font-bold text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            <BookOpenCheck className="mr-1.5 h-4 w-4 text-sky-500" />
            Behavior Log
          </TabsTrigger>
          <TabsTrigger
            value="display"
            className="rounded-xl font-bold text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            <Tv className="mr-1.5 h-4 w-4 text-purple-500" />
            Class Screen
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="rounded-xl font-bold text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            <SettingsIcon className="mr-1.5 h-4 w-4 text-amber-500" />
            Rules &amp; Presets
          </TabsTrigger>
          {raffleVisible && <TabsTrigger value="raffle" className="rounded-xl font-bold text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Dices className="mr-1.5 h-4 w-4 text-purple-500" />Raffle
          </TabsTrigger>}
        </TabsList>

        {/* 1. SEATING & LIVE AWARDS TAB */}
        <TabsContent value="seating" className="focus-visible:outline-none space-y-4 mt-0">
          <div className="rounded-3xl border border-border/80 bg-card p-4 sm:p-6 shadow-sm">
            {classStudents.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <Users className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <h3 className="text-lg font-bold">No students in this class yet</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Add students to &quot;{activeClass?.name}&quot; in the Students tab to arrange your seating chart and start awarding points.
                </p>
              </div>
            ) : (
              <ClassroomPointsPanel
                variant="embedded"
                schoolId={schoolId}
                students={classStudents}
                classes={availableClasses}
                categories={propCategories ?? []}
                storageScope={seatingScope}
                initialClassId={selectedClassId}
                onClassIdChange={setSelectedClassId}
                budgetOptions={budgetOptions}
              />
            )}
          </div>
        </TabsContent>

        {/* 2. BEHAVIOR TIMELINE & LOG TAB */}
        <TabsContent value="behavior" className="focus-visible:outline-none space-y-4 mt-0">
          <div className="rounded-3xl border border-border/80 bg-card p-4 sm:p-6 shadow-sm">
            <BehaviorTimelinePanel
              schoolId={schoolId}
              refreshToken={0}
              embedded
              mode="behavior"
            />
          </div>
        </TabsContent>

        {/* 3. CLASS SCREEN & PROJECTOR CUSTOMIZATION TAB */}
        <TabsContent value="display" className="focus-visible:outline-none space-y-4 mt-0">
          <div className="rounded-3xl border border-border/80 bg-card p-4 sm:p-6 shadow-sm">
            <ClassroomRoomDisplaySection
              schoolId={schoolId}
              scope={seatingScope}
              classes={availableClasses}
              students={scopedStudents}
            />
          </div>
        </TabsContent>

        {raffleVisible && <TabsContent value="raffle" className="mt-0 focus-visible:outline-none">
          <AdminRaffleTab schoolId={schoolId} embedded students={scopedStudents} classes={availableClasses}
            canEditSettings={canEditRaffleSettings ?? variant === 'admin'} operatorName={raffleOperatorName || userName || undefined} />
        </TabsContent>}

        {/* 4. CLASSROOM RULES & PRESETS SETTINGS TAB */}
        <TabsContent value="settings" className="focus-visible:outline-none space-y-4 mt-0">
          <div className="rounded-3xl border border-border/80 bg-card p-4 sm:p-6 shadow-sm">
            <ClassAwardsLiveSettingsSection
              schoolId={schoolId}
              seatingScope={seatingScope}
              classes={availableClasses}
              settings={settings}
              updateSettings={updateSettings}
              canEdit={true}
              parentPortalOn={parentPortalOn}
              principalTimelineOn={principalTimelineOn}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* PAIR SCREEN / QR CODE MODAL */}
      <ClassroomScreenPairModal
        isOpen={isPairModalOpen}
        onClose={() => setIsPairModalOpen(false)}
        schoolId={schoolId}
        classId={selectedClassId}
        classNameLabel={activeClass?.name || 'Classroom'}
        scope={seatingScope}
      />

      {/* RANDOM STUDENT SPOTLIGHT MODAL */}
      <RandomStudentPickerModal
        key={selectedClassId}
        isOpen={isRandomModalOpen}
        onClose={() => setIsRandomModalOpen(false)}
        students={classStudents}
        onAward={handleRandomAward}
        defaultPoints={5}
        defaultReason="Random student spotlight"
      />

      {/* THEME PICKER MODAL */}
      <Dialog open={isThemeModalOpen} onOpenChange={setIsThemeModalOpen}>
        <DialogContent className="classroom-native-colors max-w-lg rounded-3xl p-6 text-foreground sm:p-8">
          <DialogHeader className="text-left space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Palette className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black">Classroom Look &amp; Theme</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Select a vibrant color palette for your classroom smartboard and desk cards
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-2">
            {CLASSROOM_REALM_THEMES.map((theme) => {
              const active = currentTheme.id === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => {
                    updateSettings({ classroomRealmTheme: theme.id as ClassroomRealmThemeId });
                    toast({
                      title: 'Theme Updated',
                      description: `Classroom theme set to ${theme.label}.`,
                    });
                    setIsThemeModalOpen(false);
                  }}
                  className={cn(
                    'flex flex-col items-start p-3.5 rounded-2xl border-2 text-left transition-all hover:scale-[1.02]',
                    active
                      ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
                      : 'border-border bg-muted/30 hover:border-border/80',
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="text-xl">{theme.icon}</span>
                    {active && <Check className="h-4 w-4 text-primary" />}
                  </div>
                  <span className="font-bold text-sm text-foreground">{theme.label}</span>
                  <span className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                    {theme.description}
                  </span>
                  <div className="flex gap-1 mt-3 w-full">
                    <div className="h-2 flex-1 rounded-full" style={{ backgroundColor: theme.tokens.base }} />
                    <div className="h-2 flex-1 rounded-full" style={{ backgroundColor: theme.tokens.accentFrom }} />
                    <div className="h-2 flex-1 rounded-full" style={{ backgroundColor: theme.tokens.accentTo }} />
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
