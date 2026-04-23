
'use client';
import { useEffect, useState, useRef, useMemo, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useCollection, useDoc, useMemoFirebase, useFunctions } from '@/firebase';
import { collection, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import {
  Users, Gift, BookOpen, Trash2, Edit, Plus, UploadCloud, Printer, LayoutDashboard, Database,
  Settings, History, Award, CheckCircle, Tag, Trophy, ArrowRight, Loader2, Play, ShieldCheck,
  User, Ticket, Upload, Download, Activity, Zap, Clock, Palette, Wand2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import type { Student, Prize, Coupon, Category, Class, Teacher, BackupInfo, Achievement, Badge, AttendanceSettings, AttendanceLogEntry, AttendanceScheduleSlot, AttendanceRewardRule } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StudentModal } from '@/components/StudentModal';
import { PrizeModal } from '@/components/PrizeModal';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { StudentActivityModal } from '@/components/StudentActivityModal';
import DynamicIcon from '@/components/DynamicIcon';
import { Coupon as CouponPreview } from '@/components/Coupon';
import { Switch } from '@/components/ui/switch';
import { cn, getStudentNickname, getRandomColor } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSettings } from '@/components/providers/SettingsProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { ImageCropper } from '@/components/ImageCropper';
import { Helper } from '@/components/ui/helper';
import { CategoryModal } from '@/components/CategoryModal';
import { ThemeGeneratorModal } from '@/components/ThemeGeneratorModal';
import { AchievementModal } from '@/components/AchievementModal';
import { BadgeModal } from '@/components/BadgeModal';
import { addAchievement, updateAchievement, deleteAchievement, addBadge, updateBadge, deleteBadge } from '@/lib/db';
import { SAMPLE_BADGES, getSampleCategoryBadges } from '@/lib/sample-badges';
import { AdminStatsTab } from './sections/AdminStatsTab';
import { AdminBrandingTab } from './sections/AdminBrandingTab';
import { AdminClassesTab } from './sections/AdminClassesTab';
import { AdminTeachersTab } from './sections/AdminTeachersTab';
import { AdminCategoriesTab } from './sections/AdminCategoriesTab';
import { AdminPrizesTab } from './sections/AdminPrizesTab';
import { AdminCouponsTab } from './sections/AdminCouponsTab';
import { AdminBackupsTab } from './sections/AdminBackupsTab';
import { AdminStudentsTab } from './sections/AdminStudentsTab';
import { AdminAttendanceTab } from './sections/AdminAttendanceTab';
import { AdminBonusPointsTab } from './sections/AdminBonusPointsTab';
import { AdminBadgesTab } from './sections/AdminBadgesTab';

function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse p-4 md:p-8">
      <Card className="bg-card p-6 shadow-lg flex justify-between items-center">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-36" />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <Skeleton className="h-6 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function AdminDashboardInner() {
  const {
    schoolId, setCouponsToPrint, deleteStudent,
    addClass, updateClass, deleteClass, deleteCategory, addCategory, updateCategory,
    devCreateBackup, devRestoreFromBackup, devDownloadBackup, addTeacher, updateTeacher, deleteTeacher,
    addPrize, updatePrize, deletePrize, uploadStudents, setStudentsToPrint,
    updateStudent,
    achievements, achievementsLoading,
    badges, badgesLoading,
    purgeStudentProgress,
    getAttendanceConfig,
    setAttendanceConfig,
    listAttendanceLog,
    getTeacherAttendanceConfig,
    setTeacherAttendanceConfig,
    listTeacherAttendanceLog
  } = useAppContext();
  const firestore = useFirestore();
  const functions = useFunctions();
  const { toast } = useToast();
  const playSound = useArcadeSound();
  const studentCsvInputRef = useRef<HTMLInputElement>(null);
  const { settings, updateSettings } = useSettings();

  // Data fetching hooks
  const studentsQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'students') : null, [firestore, schoolId]);
  const { data: students, isLoading: studentsLoading, error: studentsError } = useCollection<Student>(studentsQuery);

  const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'classes') : null, [firestore, schoolId]);
  const { data: classes, isLoading: classesLoading, error: classesError } = useCollection<Class>(classesQuery);

  const teachersQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'teachers') : null, [firestore, schoolId]);
  const { data: teachers, isLoading: teachersLoading, error: teachersError } = useCollection<Teacher>(teachersQuery);

  const categoriesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'categories') : null, [firestore, schoolId]);
  const { data: categories, isLoading: categoriesLoading, error: categoriesError } = useCollection<Category>(categoriesQuery);

  const prizesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'prizes') : null, [firestore, schoolId]);
  const { data: prizes, isLoading: prizesLoading, error: prizesError } = useCollection<Prize>(prizesQuery);

  const couponsQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'coupons') : null, [firestore, schoolId]);
  const { data: coupons, isLoading: couponsLoading, error: couponsError } = useCollection<Coupon>(couponsQuery);

  const attendancePeriodsQuery = useMemoFirebase(
    () => (schoolId ? collection(firestore, 'schools', schoolId, 'periods') : null),
    [firestore, schoolId]
  );
  const { data: attendancePeriods, isLoading: attendancePeriodsLoading } = useCollection<AttendanceScheduleSlot>(attendancePeriodsQuery);

  const backupsQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'backups') : null, [firestore, schoolId]);
  const { data: backups, isLoading: backupsLoading, error: backupsError } = useCollection<BackupInfo>(backupsQuery);

  const schoolDocRef = useMemoFirebase(() => (firestore && schoolId ? doc(firestore, 'schools', schoolId) : null), [firestore, schoolId]);
  const { data: schoolData } = useDoc<{ name?: string; logoUrl?: string; logoHistory?: { url?: string; uploadedAt?: number }[] }>(schoolDocRef);

  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

  const previousSchoolLogos = useMemo(() => {
    const current = (logoPreviewUrl ?? schoolData?.logoUrl)?.trim();
    const fromHistory = Array.isArray(schoolData?.logoHistory)
      ? schoolData!.logoHistory!.map((e) => e?.url?.trim()).filter((u): u is string => !!u)
      : [];
    const seen = new Set<string>();
    const out: string[] = [];
    if (current) {
      seen.add(current);
      out.push(current);
    }
    fromHistory.forEach((u) => {
      if (!seen.has(u)) {
        seen.add(u);
        out.push(u);
      }
    });
    return out;
  }, [schoolData, logoPreviewUrl]);

  const [newClassName, setNewClassName] = useState('');
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherUsername, setNewTeacherUsername] = useState('');
  const [newTeacherPasscode, setNewTeacherPasscode] = useState('');
  const [newTeacherBudget, setNewTeacherBudget] = useState('');
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isPrizeModalOpen, setIsPrizeModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null);
  const [activityStudent, setActivityStudent] = useState<Student | null>(null);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [studentSortOption, setStudentSortOption] = useState<string>('lastNameAsc');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [studentFilterClass, setStudentFilterClass] = useState<string>('all');
  const [themeStudent, setThemeStudent] = useState<Student | null>(null);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  const [achievementToDelete, setAchievementToDelete] = useState<Achievement | null>(null);
  const [isAddSampleBadgesOpen, setIsAddSampleBadgesOpen] = useState(false);
  const [isAddingSamples, setIsAddingSamples] = useState(false);
  const [isCategoryBadgeModalOpen, setIsCategoryBadgeModalOpen] = useState(false);
  const [editingCategoryBadge, setEditingCategoryBadge] = useState<Badge | null>(null);
  const [categoryBadgeToDelete, setCategoryBadgeToDelete] = useState<Badge | null>(null);
  const [isAddSampleCategoryBadgesOpen, setIsAddSampleCategoryBadgesOpen] = useState(false);
  const [isAddingSampleCategoryBadges, setIsAddingSampleCategoryBadges] = useState(false);
  const [badgeEarnersFor, setBadgeEarnersFor] = useState<Badge | null>(null);
  const [badgeTogglingId, setBadgeTogglingId] = useState<string | null>(null);
  const [badgesStudent, setBadgesStudent] = useState<Student | null>(null);
  const [studentToPurge, setStudentToPurge] = useState<Student | null>(null);
  const [isPurgingStudent, setIsPurgingStudent] = useState(false);
  const [showPurgeFlash, setShowPurgeFlash] = useState(false);

  const [uploadReport, setUploadReport] = useState<{ success: number, failed: number, errors: string[] } | null>(null);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [cropLogoSrc, setCropLogoSrc] = useState<string | null>(null);
  const [isPreviousLogosOpen, setIsPreviousLogosOpen] = useState(false);
  const [isDtcAlertOpen, setIsDtcAlertOpen] = useState(false);

  const [attendanceConfig, setAttendanceConfigState] = useState<AttendanceSettings | null>(null);
  const [attendanceLog, setAttendanceLogState] = useState<AttendanceLogEntry[]>([]);
  const [attendanceConfigSaving, setAttendanceConfigSaving] = useState(false);
  const [attendanceLogLoading, setAttendanceLogLoading] = useState(false);

  const [selectedAttendanceTeacherId, setSelectedAttendanceTeacherId] = useState<string>('');
  const [teacherAttendanceConfig, setTeacherAttendanceConfigState] = useState<AttendanceSettings | null>(null);
  const [teacherAttendanceSaving, setTeacherAttendanceSaving] = useState(false);
  const [teacherAttendanceLog, setTeacherAttendanceLogState] = useState<AttendanceLogEntry[]>([]);
  const [teacherAttendanceLogLoading, setTeacherAttendanceLogLoading] = useState(false);
  const teacherAttendanceRewardsQuery = useMemoFirebase(
    () => (schoolId && selectedAttendanceTeacherId
      ? collection(firestore, 'schools', schoolId, 'teachers', selectedAttendanceTeacherId, 'attendanceRewards')
      : null),
    [firestore, schoolId, selectedAttendanceTeacherId]
  );
  const { data: teacherAttendanceRewards, isLoading: teacherAttendanceRewardsLoading } = useCollection<AttendanceRewardRule>(teacherAttendanceRewardsQuery);
  const [ruleDrafts, setRuleDrafts] = useState<Record<string, Partial<AttendanceRewardRule>>>({});
  const [savingRuleId, setSavingRuleId] = useState<string | null>(null);

  useEffect(() => {
    setRuleDrafts({});
  }, [selectedAttendanceTeacherId]);

  const filteredStudents = useMemo(() => {
    const list = (students || []).filter((s) => {
      const computedName = `${s.firstName} ${s.lastName} ${s.nickname || ''}`.toLowerCase();
      const term = studentSearchTerm.toLowerCase();
      const matchesSearch = computedName.includes(term) || (s.nfcId || '').toLowerCase().includes(term);
      const matchesClass = studentFilterClass === 'all' || s.classId === studentFilterClass;
      return matchesSearch && matchesClass;
    });

    return list.sort((a, b) => {
      if (studentSortOption === 'lastNameAsc') return a.lastName.localeCompare(b.lastName);
      if (studentSortOption === 'lastNameDesc') return b.lastName.localeCompare(a.lastName);
      if (studentSortOption === 'firstNameAsc') return a.firstName.localeCompare(b.firstName);
      if (studentSortOption === 'firstNameDesc') return b.firstName.localeCompare(a.firstName);
      if (studentSortOption === 'pointsDesc') return (b.lifetimePoints || b.points || 0) - (a.lifetimePoints || a.points || 0);
      if (studentSortOption === 'pointsAsc') return (a.lifetimePoints || a.points || 0) - (b.lifetimePoints || b.points || 0);
      return 0;
    });
  }, [students, studentSearchTerm, studentFilterClass, studentSortOption]);

  useEffect(() => {
    if (!selectionMode) return;
    if (filteredStudents.length !== 1) return;
    setSelectedStudentIds(new Set([filteredStudents[0].id]));
  }, [selectionMode, filteredStudents]);

  const isAllFilteredSelected =
    filteredStudents.length > 0 && selectedStudentIds.size === filteredStudents.length;

  const toggleSelectAllFiltered = () => {
    if (filteredStudents.length === 0) return;
    if (isAllFilteredSelected) setSelectedStudentIds(new Set());
    else setSelectedStudentIds(new Set(filteredStudents.map((s) => s.id)));
  };

  useEffect(() => {
    if (!settings.enableClassSignIn || !schoolId || !getAttendanceConfig) return;
    const defaultAttendanceConfig: AttendanceSettings = {
      pointsForSignIn: 1,
      pointsForOnTime: 1,
      onTimeWindowMinutes: 15,
      schedule: [],
    };
    getAttendanceConfig()
      .then((c) => {
        setAttendanceConfigState(c ?? defaultAttendanceConfig);
      })
      .catch(() => {
        setAttendanceConfigState(defaultAttendanceConfig);
      });
  }, [settings.enableClassSignIn, schoolId, getAttendanceConfig]);

  useEffect(() => {
    if (!teachers?.length) return;
    if (!selectedAttendanceTeacherId) setSelectedAttendanceTeacherId(teachers[0].id);
  }, [teachers, selectedAttendanceTeacherId]);

  useEffect(() => {
    if (!settings.enableClassSignIn || !schoolId || !selectedAttendanceTeacherId || !getTeacherAttendanceConfig) return;
    getTeacherAttendanceConfig(selectedAttendanceTeacherId)
      .then((cfg) => {
        setTeacherAttendanceConfigState(cfg ?? {
          pointsForSignIn: 1,
          pointsForOnTime: 1,
          onTimeWindowMinutes: 15,
          schedule: [],
          teacherId: selectedAttendanceTeacherId,
        });
      })
      .catch(() => {
        setTeacherAttendanceConfigState({
          pointsForSignIn: 1,
          pointsForOnTime: 1,
          onTimeWindowMinutes: 15,
          schedule: [],
          teacherId: selectedAttendanceTeacherId,
        });
      });
  }, [settings.enableClassSignIn, schoolId, selectedAttendanceTeacherId, getTeacherAttendanceConfig]);

  const handleSaveTeacherAttendanceConfig = async () => {
    if (!teacherAttendanceConfig || !selectedAttendanceTeacherId || !setTeacherAttendanceConfig) return;
    setTeacherAttendanceSaving(true);
    try {
      await setTeacherAttendanceConfig(selectedAttendanceTeacherId, { ...teacherAttendanceConfig, teacherId: selectedAttendanceTeacherId });
      playSound('success');
      toast({ title: 'Teacher attendance settings saved.' });
    } catch (e: unknown) {
      toast({ variant: 'destructive', title: 'Failed to save', description: (e as Error).message });
    } finally {
      setTeacherAttendanceSaving(false);
    }
  };

  const saveTeacherRewardRule = async (ruleId: string) => {
    if (!schoolId || !selectedAttendanceTeacherId) return;
    const draft = ruleDrafts[ruleId];
    if (!draft) return;
    setSavingRuleId(ruleId);
    try {
      const ref = doc(firestore, 'schools', schoolId, 'teachers', selectedAttendanceTeacherId, 'attendanceRewards', ruleId);
      await updateDoc(ref, {
        ...draft,
        // never write undefined to Firestore
        periodId: draft.periodId ?? null,
        customPeriod: draft.customPeriod ?? null,
        categoryId: draft.categoryId ?? null,
      });
      playSound('success');
      setRuleDrafts((prev) => {
        const next = { ...prev };
        delete next[ruleId];
        return next;
      });
      toast({ title: 'Reward rule updated.' });
    } catch (e: unknown) {
      toast({ variant: 'destructive', title: 'Failed to update rule', description: (e as Error).message });
    } finally {
      setSavingRuleId(null);
    }
  };

  const deleteTeacherRewardRule = async (ruleId: string) => {
    if (!schoolId || !selectedAttendanceTeacherId) return;
    try {
      await deleteDoc(doc(firestore, 'schools', schoolId, 'teachers', selectedAttendanceTeacherId, 'attendanceRewards', ruleId));
      playSound('swoosh');
      toast({ title: 'Reward rule deleted.' });
    } catch (e: unknown) {
      toast({ variant: 'destructive', title: 'Failed to delete rule', description: (e as Error).message });
    }
  };

  const loadTeacherAttendanceLog = () => {
    if (!selectedAttendanceTeacherId || !listTeacherAttendanceLog) return;
    setTeacherAttendanceLogLoading(true);
    listTeacherAttendanceLog(selectedAttendanceTeacherId, 80)
      .then(setTeacherAttendanceLogState)
      .catch(() => setTeacherAttendanceLogState([]))
      .finally(() => setTeacherAttendanceLogLoading(false));
  };

  const loadAttendanceLog = () => {
    if (!listAttendanceLog) return;
    setAttendanceLogLoading(true);
    listAttendanceLog(80)
      .then(setAttendanceLogState)
      .catch(() => setAttendanceLogState([]))
      .finally(() => setAttendanceLogLoading(false));
  };

  const handleSaveAttendanceConfig = async () => {
    if (!attendanceConfig || !setAttendanceConfig) return;
    setAttendanceConfigSaving(true);
    try {
      await setAttendanceConfig(attendanceConfig);
      playSound('success');
      toast({ title: 'Attendance settings saved.' });
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      let description = err?.message ?? String(e);
      if (description === 'internal' || err?.code?.includes('internal')) {
        description = 'Redeploy Cloud Functions (firebase deploy --only functions). If you sign in as developer, set DEV_PASSCODE in the function config. Check Firebase Console → Functions → Logs for details.';
      }
      toast({ variant: 'destructive', title: 'Failed to save', description });
    } finally {
      setAttendanceConfigSaving(false);
    }
  };

  const addScheduleSlot = () => {
    setAttendanceConfigState((prev) => ({
      ...prev!,
      schedule: [...(prev?.schedule ?? []), { id: `slot_${Date.now()}`, label: `Period ${(prev?.schedule?.length ?? 0) + 1}`, startTime: '08:00', endTime: '08:45' }],
    }));
  };

  const updateScheduleSlot = (index: number, field: keyof AttendanceScheduleSlot, value: string) => {
    setAttendanceConfigState((prev) => {
      if (!prev?.schedule) return prev;
      const next = [...prev.schedule];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, schedule: next };
    });
  };

  const removeScheduleSlot = (index: number) => {
    setAttendanceConfigState((prev) => ({
      ...prev!,
      schedule: prev?.schedule?.filter((_, i) => i !== index) ?? [],
    }));
  };

  const isDbLoading = studentsLoading || classesLoading || teachersLoading || categoriesLoading || prizesLoading || couponsLoading || backupsLoading;

  const collectionErrors = [
    { name: 'Students', error: studentsError },
    { name: 'Classes', error: classesError },
    { name: 'Teachers', error: teachersError },
    { name: 'Categories', error: categoriesError },
    { name: 'Prizes', error: prizesError },
    { name: 'Coupons', error: couponsError },
    { name: 'Backups', error: backupsError },
  ].filter(c => c.error);

  const getClassName = (classId: string) => {
    return classes?.find((c) => c.id === classId)?.name || 'Unassigned';
  };

  const getStudentName = (studentId?: string) => {
    if (!studentId) return 'N/A';
    const student = students?.find(s => s.id === studentId);
    return student ? `${student.firstName} ${student.lastName}` : `ID: ${studentId}`;
  };

  if (isDbLoading) {
    return <AdminDashboardSkeleton />;
  }

  if (collectionErrors.length > 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <Alert variant="destructive">
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Data Fetch Error</AlertTitle>
          <AlertDescription>
            Some school data could not be loaded. This may be due to temporary network issues or missing permissions.
            <ul className="mt-2 text-xs font-code list-disc pl-4">
              {collectionErrors.map((c, i) => (
                <li key={i}>{c.name}: {c.error?.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
        <Button onClick={() => window.location.reload()} className="rounded-full">
          <History className="mr-2 h-4 w-4" /> Retry Loading
        </Button>
      </div>
    );
  }

  const handleSaveClass = () => {
    if (!newClassName) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Class Name Required', description: 'Please enter a name for the new class.' });
      return;
    }
    addClass({ name: newClassName });
    setNewClassName('');
    setIsClassModalOpen(false);
  };

  const handleSaveTeacher = () => {
    if (!newTeacherName) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Teacher Name Required', description: 'Please enter a name for the teacher.' });
      return;
    }

    let username = newTeacherUsername;
    let passcode = newTeacherPasscode;
    const budgetVal = newTeacherBudget ? parseInt(newTeacherBudget, 10) : undefined;

    if (!username) {
      username = newTeacherName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
    }
    if (!passcode) {
      passcode = '1234';
    }

    if (editingTeacher) {
      updateTeacher({
        ...editingTeacher,
        name: newTeacherName,
        username,
        passcode,
        ...(budgetVal !== undefined ? { monthlyBudget: budgetVal } : { monthlyBudget: undefined }),
      });
    } else {
      addTeacher({ name: newTeacherName, username, passcode, ...(budgetVal !== undefined && { monthlyBudget: budgetVal }) });
    }

    setNewTeacherName('');
    setNewTeacherUsername('');
    setNewTeacherPasscode('');
    setNewTeacherBudget('');
    setEditingTeacher(null);
    setIsTeacherModalOpen(false);
  };

  const handleOpenCategoryModal = (category: Category | null) => {
    setEditingCategory(category);
    setIsCategoryModalOpen(true);
  };

  const handleOpenStudentModal = (student: Student | null) => {
    setEditingStudent(student);
    setIsStudentModalOpen(true);
  };

  const handleOpenPrizeModal = (prize: Prize | null) => {
    setEditingPrize(prize);
    setIsPrizeModalOpen(true);
  };

  const handleOpenActivityModal = (student: Student) => {
    setActivityStudent(student);
  };

  const handleCreateBackup = async () => {
    if (!schoolId) return;
    await devCreateBackup(schoolId);
    playSound('success');
    toast({ title: "Backup Created", description: "A new backup has been saved." });
  };

  const handleRestoreFromBackup = async (backupId: string) => {
    if (!schoolId) return;
    await devRestoreFromBackup(schoolId, backupId);
    playSound('success');
    toast({ title: "Restore Complete", description: "Data has been restored from the backup." });
  };

  const handleDownloadBackup = async (backupId: string) => {
    if (!schoolId) return;
    await devDownloadBackup(schoolId, backupId);
  };

  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!schoolId) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Cannot upload logo',
        description: 'No school selected. Refresh the page and log in again.',
      });
      e.target.value = '';
      return;
    }
    if (!functions) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Cannot upload logo',
        description: 'Server connection is not available. Refresh the page and try again.',
      });
      e.target.value = '';
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Unsupported file type',
        description: 'Please use PNG, JPG, or WebP. Your file appears to be a different format.',
      });
      e.target.value = '';
      return;
    }
    if (file.size > maxSizeBytes) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Logo must be under 5MB. Try compressing or resizing the image.',
      });
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropLogoSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input to allow same file again
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setCropLogoSrc(null);
    if (!schoolId || !functions) return;

    try {
      setIsLogoUploading(true);
      toast({ title: 'Uploading logo…', description: 'Please wait.' });

      const imageBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.includes(',') ? result.split(',')[1] : result;
          resolve(base64 || '');
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(croppedBlob);
      });

      const uploadLogo = httpsCallable<{ schoolId: string; imageBase64: string; contentType: string }, { logoUrl: string }>(functions, 'uploadSchoolLogo');
      const res = await uploadLogo({
        schoolId,
        imageBase64,
        contentType: croppedBlob.type || 'image/jpeg',
      });

      const data = res.data;
      if (!data?.logoUrl) {
        throw new Error('No logo URL returned');
      }

      setLogoPreviewUrl(data.logoUrl);
      playSound('success');
      toast({ title: 'Logo updated!', description: 'Your school logo will now appear next to the school name.' });
    } catch (error: unknown) {
      console.error('Logo upload failed', error);
      playSound('error');
      const err = error as { code?: string; message?: string; details?: unknown };
      const code = err?.code ?? '';
      const message = String(err?.message ?? '');
      let description = message;
      if (!description && err?.details) {
        try {
          description = typeof err.details === 'string' ? err.details : JSON.stringify(err.details);
        } catch {
          // ignore
        }
      }
      if (code === 'functions/unauthenticated') {
        description = 'You must be logged in as an admin. Please sign in again.';
      } else if (code === 'functions/permission-denied') {
        description = 'You need admin access to update the school logo.';
      } else if (code === 'functions/invalid-argument') {
        description = message || 'Invalid image. Use PNG, JPG, or WebP under 5MB.';
      } else if (!message || message === 'undefined') {
        description = 'Could not save the logo. Try again or use a smaller image.';
      }
      toast({
        variant: 'destructive',
        title: 'Logo upload failed',
        description,
      });
    } finally {
      setIsLogoUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!schoolId || !schoolDocRef) return;
    try {
      setIsLogoUploading(true);
      await updateDoc(schoolDocRef, { logoUrl: null });
      setLogoPreviewUrl(null);
      playSound('success');
      toast({ title: 'Logo removed', description: 'The school logo has been deleted.' });
    } catch (err: any) {
      console.error('Failed to remove logo', err);
      playSound('error');
      toast({ variant: 'destructive', title: 'Error', description: 'Could not remove the logo.' });
    } finally {
      setIsLogoUploading(false);
    }
  };

  const onStudentCsvFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const report = await uploadStudents(text, students || [], classes || []);
      if (report.failed > 0) {
        setUploadReport(report);
      }
    } catch (err: any) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Failed to process CSV file.',
        description: (err as Error).message,
      });
    }
    if (studentCsvInputRef.current) studentCsvInputRef.current.value = '';
  };

  const usedCouponsCount = coupons?.filter((c) => c.used).length || 0;
  const totalPointsAwarded = coupons?.filter((c) => c.used).reduce((sum, c) => sum + c.value, 0) || 0;

  const handleStudentCsvUpload = () => {
    studentCsvInputRef.current?.click();
  };

  const availableCoupons = coupons?.filter(c => !c.used).sort((a, b) => b.createdAt - a.createdAt) || [];
  const redeemedCoupons = coupons?.filter(c => c.used).sort((a, b) => (b.usedAt ?? 0) - (a.usedAt ?? 0)) || [];

  const handleDtcPrintClick = () => {
    if (selectionMode) {
      if (selectedStudentIds.size === 1) {
        const selected = students?.filter(s => selectedStudentIds.has(s.id)) || [];
        setStudentsToPrint({ students: selected, classes: classes || [], printerType: 'dtc4500e' });
      }
      // Button is disabled for > 1, so no action needed.
    } else {
      // This is for "Bulk Print" or "Print Class"
      setIsDtcAlertOpen(true);
    }
  };


  return (
    <TooltipProvider>
      <div className={cn("space-y-6 max-w-full mx-auto p-4 md:p-8", settings.displayMode === 'app' && 'pb-24')}>
        <Helper content="This page is for system administrators. It allows you to manage all school instances, create backups, and perform system-wide operations.">
          <h2 className="text-2xl font-bold tracking-tight">Admin</h2>
          <p className="text-muted-foreground">
            Manage students, classes, prizes, and system settings.
          </p>
        </Helper>

        <Tabs key={`${String(settings.enableAchievements)}:${String(settings.enableBadges)}`} defaultValue="students" className="space-y-6">
          <div className="flex overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="bg-muted/50 p-1.5 rounded-2xl inline-flex w-max border shadow-sm sm:mx-auto">
              {settings.enableAdminAnalytics && (
                <TabsTrigger value="stats" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <LayoutDashboard className="w-4 h-4" /> Stats
                </TabsTrigger>
              )}
              <TabsTrigger value="branding" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <UploadCloud className="w-4 h-4" /> Branding
              </TabsTrigger>
              {settings.enableClassSignIn && (
                <TabsTrigger value="attendance" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Clock className="w-4 h-4" /> Attendance
                </TabsTrigger>
              )}
              <TabsTrigger value="students" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Users className="w-4 h-4" /> Students
              </TabsTrigger>
              <TabsTrigger value="classes" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <BookOpen className="w-4 h-4" /> Classes
              </TabsTrigger>
              <TabsTrigger value="teachers" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <User className="w-4 h-4" /> Teachers
              </TabsTrigger>
              <TabsTrigger value="categories" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Tag className="w-4 h-4" /> Categories
              </TabsTrigger>
              <TabsTrigger value="prizes" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Gift className="w-4 h-4" /> Prizes
              </TabsTrigger>
              <TabsTrigger value="coupons" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Ticket className="w-4 h-4" /> Coupons
              </TabsTrigger>
              {settings.enableAchievements && (
                <TabsTrigger value="bonuspoints" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Trophy className="w-4 h-4" /> Bonus Points
                </TabsTrigger>
              )}
              {settings.enableBadges && (
                <TabsTrigger value="category-badges" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Award className="w-4 h-4" /> Badges
                </TabsTrigger>
              )}
              <TabsTrigger value="backups" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Database className="w-4 h-4" /> Backups
              </TabsTrigger>
            </TabsList>
          </div>

          {settings.enableAdminAnalytics && (
            <TabsContent value="stats" className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
              <AdminStatsTab
                students={students}
                classes={classes}
                teachers={teachers}
                coupons={coupons}
                usedCouponsCount={usedCouponsCount}
                totalPointsAwarded={totalPointsAwarded}
              />
            </TabsContent>
          )}

          <TabsContent value="branding" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <AdminBrandingTab
              schoolId={schoolId}
              schoolDocRef={schoolDocRef}
              schoolData={schoolData ?? undefined}
              logoPreviewUrl={logoPreviewUrl}
              setLogoPreviewUrl={setLogoPreviewUrl}
              previousSchoolLogos={previousSchoolLogos}
              isPreviousLogosOpen={isPreviousLogosOpen}
              setIsPreviousLogosOpen={setIsPreviousLogosOpen}
              logoDisplayMode={settings.logoDisplayMode}
              setLogoDisplayMode={(v) => updateSettings({ logoDisplayMode: v })}
              handleLogoUpload={handleLogoUpload}
              handleRemoveLogo={handleRemoveLogo}
              isLogoUploading={isLogoUploading}
              toast={toast}
              playSound={(s: any) => playSound(s)}
            />
          </TabsContent>

          {settings.enableClassSignIn && (
            <TabsContent value="attendance" className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
              <AdminAttendanceTab
                schoolId={schoolId}
                teachers={teachers}
                selectedAttendanceTeacherId={selectedAttendanceTeacherId}
                setSelectedAttendanceTeacherId={setSelectedAttendanceTeacherId}
                loadTeacherAttendanceLog={loadTeacherAttendanceLog}
                teacherAttendanceLogLoading={teacherAttendanceLogLoading}
                teacherAttendanceConfig={teacherAttendanceConfig}
                teacherAttendanceRewardsLoading={teacherAttendanceRewardsLoading}
                teacherAttendanceRewards={teacherAttendanceRewards}
                ruleDrafts={ruleDrafts}
                setRuleDrafts={setRuleDrafts}
                savingRuleId={savingRuleId}
                saveTeacherRewardRule={saveTeacherRewardRule}
                deleteTeacherRewardRule={deleteTeacherRewardRule}
                classes={classes}
                attendancePeriodsLoading={attendancePeriodsLoading}
                attendancePeriods={attendancePeriods}
                categories={categories}
                handleSaveTeacherAttendanceConfig={handleSaveTeacherAttendanceConfig}
                teacherAttendanceSaving={teacherAttendanceSaving}
                teacherAttendanceLog={teacherAttendanceLog}
                setTeacherAttendanceConfigState={setTeacherAttendanceConfigState}
                UniversalPeriodsAdmin={UniversalPeriodsAdmin}
              />
            </TabsContent>
          )}

          <TabsContent value="classes" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <AdminClassesTab
              classes={classes}
              teachers={teachers}
              students={students}
              onAddClass={() => setIsClassModalOpen(true)}
              onDeleteClass={deleteClass}
              onUpdateClass={updateClass}
            />
          </TabsContent>

          <TabsContent value="teachers" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <AdminTeachersTab
              teachers={teachers}
              onAddTeacher={() => setIsTeacherModalOpen(true)}
              onEditTeacher={(t) => {
                setEditingTeacher(t);
                setNewTeacherName(t.name);
                setNewTeacherUsername(t.username || '');
                setNewTeacherPasscode(t.passcode || '');
                setNewTeacherBudget(t.monthlyBudget?.toString() || '');
                setIsTeacherModalOpen(true);
              }}
              onDeleteTeacher={deleteTeacher}
            />
          </TabsContent>

          <TabsContent value="categories" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <AdminCategoriesTab
              categories={categories}
              teachers={teachers}
              onRandomizeColors={async () => {
                if (!confirm("This will assign a random color to all existing categories. Continue?")) return;
                try {
                  let count = 0;
                  for (const c of categories || []) {
                    await updateCategory({ ...c, color: getRandomColor() });
                    count++;
                  }
                  toast({ title: "Colors Randomized", description: `Updated ${count} categories.` });
                } catch (e) {
                  toast({ variant: "destructive", title: "Failed to randomize colors" });
                }
              }}
              onAddCategory={() => handleOpenCategoryModal(null)}
              onEditCategory={(c) => handleOpenCategoryModal(c)}
              onDeleteCategory={deleteCategory}
            />
          </TabsContent>

          <TabsContent value="students" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <AdminStudentsTab
              settings={settings}
              classes={classes}
              students={students}
              filteredStudents={filteredStudents}
              studentCsvInputRef={studentCsvInputRef}
              onStudentCsvFileChange={onStudentCsvFileChange}
              handleStudentCsvUpload={handleStudentCsvUpload}
              selectionMode={selectionMode}
              setSelectionMode={setSelectionMode}
              selectedStudentIds={selectedStudentIds}
              setSelectedStudentIds={setSelectedStudentIds}
              isAllFilteredSelected={isAllFilteredSelected}
              toggleSelectAllFiltered={toggleSelectAllFiltered}
              studentSearchTerm={studentSearchTerm}
              setStudentSearchTerm={setStudentSearchTerm}
              studentSortOption={studentSortOption}
              setStudentSortOption={setStudentSortOption}
              studentFilterClass={studentFilterClass}
              setStudentFilterClass={setStudentFilterClass}
              setStudentsToPrint={(args) => setStudentsToPrint(args as any)}
              handleDtcPrintClick={handleDtcPrintClick}
              getClassName={getClassName}
              handleOpenStudentModal={handleOpenStudentModal}
              handleOpenActivityModal={handleOpenActivityModal}
              setThemeStudent={(s) => setThemeStudent(s)}
              setBadgesStudent={(s) => setBadgesStudent(s)}
              deleteStudent={deleteStudent}
              setStudentToPurge={(s) => setStudentToPurge(s)}
            />
          </TabsContent>

          <TabsContent value="prizes" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <AdminPrizesTab
              prizes={prizes}
              onAddPrize={() => handleOpenPrizeModal(null)}
              onEditPrize={(p) => handleOpenPrizeModal(p)}
              onDeletePrize={deletePrize}
              onToggleInStock={(p, inStock) => updatePrize({ ...p, inStock })}
            />
          </TabsContent>


          <TabsContent value="coupons" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <AdminCouponsTab availableCoupons={availableCoupons} redeemedCoupons={redeemedCoupons} getStudentName={getStudentName} />
          </TabsContent>

          {settings.enableAchievements && (
          <TabsContent value="bonuspoints" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <AdminBonusPointsTab
              achievementsLoading={achievementsLoading}
              achievements={achievements}
              isAddingSamples={isAddingSamples}
              setIsAddSampleBadgesOpen={setIsAddSampleBadgesOpen}
              setEditingAchievement={setEditingAchievement}
              setIsBadgeModalOpen={setIsBadgeModalOpen}
              setAchievementToDelete={setAchievementToDelete}
            />
          </TabsContent>
          )}

          {settings.enableBadges && (
          <TabsContent value="category-badges" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <AdminBadgesTab
              categories={categories}
              badgesLoading={badgesLoading}
              badges={badges}
              students={students}
              badgeTogglingId={badgeTogglingId}
              setBadgeTogglingId={setBadgeTogglingId}
              onToggleBadge={async (b: any, checked: boolean) => {
                if (!firestore || !schoolId) return;
                await updateBadge(firestore, schoolId, { ...b, enabled: checked });
                toast({ title: checked ? 'Badge enabled' : 'Badge disabled' });
              }}
              setBadgeEarnersFor={setBadgeEarnersFor}
              setEditingCategoryBadge={setEditingCategoryBadge}
              setIsCategoryBadgeModalOpen={setIsCategoryBadgeModalOpen}
              setCategoryBadgeToDelete={setCategoryBadgeToDelete}
              setEditingCategoryBadgeNull={() => setEditingCategoryBadge(null)}
              setIsAddSampleCategoryBadgesOpen={setIsAddSampleCategoryBadgesOpen}
              isAddingSampleCategoryBadges={isAddingSampleCategoryBadges}
            />
          </TabsContent>
          )}

          <TabsContent value="backups" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <AdminBackupsTab
              backups={backups}
              onCreateBackup={handleCreateBackup}
              onDownloadBackup={handleDownloadBackup}
              onRestoreFromBackup={handleRestoreFromBackup}
            />
          </TabsContent>

        </Tabs>

        {/* Modals outside Tabs */}
        <Dialog open={isClassModalOpen} onOpenChange={setIsClassModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Class</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-1">
                <Label htmlFor="new-class-name">Class Name</Label>
                <Input id="new-class-name" value={newClassName} onChange={e => setNewClassName(e.target.value)} autoFocus />
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setIsClassModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveClass}>Add Class</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isTeacherModalOpen} onOpenChange={(open) => {
          setIsTeacherModalOpen(open);
          if (!open) {
            setEditingTeacher(null);
            setNewTeacherName('');
            setNewTeacherUsername('');
            setNewTeacherPasscode('');
            setNewTeacherBudget('');
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-1">
                <Label htmlFor="new-teacher-name">Display Name</Label>
                <Input id="new-teacher-name" value={newTeacherName} onChange={e => setNewTeacherName(e.target.value)} autoFocus placeholder="e.g. Mr. Smith" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-teacher-username">Login Username</Label>
                <Input id="new-teacher-username" value={newTeacherUsername} onChange={e => setNewTeacherUsername(e.target.value)} placeholder="e.g. jsmith" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-teacher-passcode">Login Passcode</Label>
                <Input id="new-teacher-passcode" type="password" value={newTeacherPasscode} onChange={e => setNewTeacherPasscode(e.target.value)} placeholder="Secret passcode" />
              </div>
              {settings.enableTeacherBudgets && (
                <div className="space-y-1">
                  <Label htmlFor="new-teacher-budget">Monthly Budget (Points)</Label>
                  <Input id="new-teacher-budget" type="number" value={newTeacherBudget} onChange={e => setNewTeacherBudget(e.target.value)} placeholder="Leave blank for unlimited" />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => {
                setIsTeacherModalOpen(false);
                setEditingTeacher(null);
                setNewTeacherName('');
                setNewTeacherUsername('');
                setNewTeacherPasscode('');
                setNewTeacherBudget('');
              }}>Cancel</Button>
              <Button onClick={handleSaveTeacher}>{editingTeacher ? 'Save Changes' : 'Add Teacher'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {cropLogoSrc && (
          <ImageCropper
            imageSrc={cropLogoSrc}
            aspectRatio={1}
            onCropComplete={handleCropComplete}
            onCancel={() => setCropLogoSrc(null)}
          />
        )}

        <StudentModal
          isOpen={isStudentModalOpen}
          setIsOpen={setIsStudentModalOpen}
          student={editingStudent}
          allStudents={students || []}
          allClasses={classes || []}
          allTeachers={teachers || []}
        />
        <PrizeModal
          isOpen={isPrizeModalOpen}
          setIsOpen={setIsPrizeModalOpen}
          prize={editingPrize}
          teachers={teachers || []}
          allClasses={classes || []}
        />
        <CategoryModal
          isOpen={isCategoryModalOpen}
          setIsOpen={setIsCategoryModalOpen}
          category={editingCategory}
        />
        <StudentActivityModal
          isOpen={!!activityStudent}
          setIsOpen={() => setActivityStudent(null)}
          student={activityStudent}
        />
        {settings.enableBadges && (
          <Dialog open={!!badgesStudent} onOpenChange={(open) => !open && setBadgesStudent(null)}>
            <DialogContent className="sm:max-w-lg rounded-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-500" />
                  {badgesStudent
                    ? <>Badges for {badgesStudent.firstName} {badgesStudent.lastName}</>
                    : 'Badges'}
                </DialogTitle>
                <DialogDescription>
                  Earned category badges for this student. Badges are awarded automatically when they hit the thresholds.
                </DialogDescription>
              </DialogHeader>
              {badgesStudent && (() => {
                const earned = (badgesStudent.earnedBadges || [])
                  .map((e) => {
                    const def = badges.find((b) => b.id === e.badgeId);
                    return def && def.enabled !== false ? { ...def, periodKey: e.periodKey, earnedAt: e.earnedAt } : null;
                  })
                  .filter(Boolean) as (Badge & { periodKey: string; earnedAt: number })[];
                earned.sort((a, b) => b.earnedAt - a.earnedAt);
                return (
                  <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
                    {earned.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        This student has not earned any badges yet.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {earned.map((b) => (
                          <li key={`${b.id}-${b.periodKey}-${b.earnedAt}`} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 text-sm">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center border-2 bg-primary/5"
                                style={b.accentColor ? { borderColor: b.accentColor, backgroundColor: `${b.accentColor}20` } : undefined}
                              >
                                <DynamicIcon name={b.icon} className="w-4 h-4" style={b.accentColor ? { color: b.accentColor } : undefined} />
                              </div>
                              <div>
                                <p className="font-semibold leading-tight">{b.name}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {b.period === 'month' ? 'Monthly' : b.period === 'semester' ? 'Semester' : b.period === 'year' ? 'Yearly' : 'All time'} ·{' '}
                                  {new Date(b.earnedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                              {b.tier || ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })()}
              <DialogFooter>
                <Button variant="secondary" onClick={() => setBadgesStudent(null)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        {themeStudent && (
          <ThemeGeneratorModal
            isOpen={!!themeStudent}
            onOpenChange={(open) => !open && setThemeStudent(null)}
            studentName={`${themeStudent.firstName} ${themeStudent.lastName}`}
            currentTheme={themeStudent.theme}
            onSave={async (theme) => {
              try {
                await updateStudent({ ...themeStudent, theme });
                playSound('success');
                toast({ title: 'Theme Updated!', description: `Successfully applied theme to ${themeStudent.firstName}.` });
              } catch (e) {
                console.error(e);
                playSound('error');
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to update student theme.' });
              }
            }}
          />
        )}
        <AchievementModal
          isOpen={isBadgeModalOpen}
          setIsOpen={setIsBadgeModalOpen}
          achievement={editingAchievement}
          categories={categories || []}
          onSave={async (data) => {
            if (!firestore || !schoolId) return;
            if (editingAchievement && 'id' in data) {
              await updateAchievement(firestore, schoolId, data as Achievement);
            } else {
              await addAchievement(firestore, schoolId, data as Omit<Achievement, 'id'>);
            }
            setEditingAchievement(null);
          }}
        />
        <BadgeModal
          isOpen={isCategoryBadgeModalOpen}
          setIsOpen={setIsCategoryBadgeModalOpen}
          badge={editingCategoryBadge}
          categories={categories || []}
          onSave={async (data) => {
            if (!firestore || !schoolId) return;
            if (editingCategoryBadge && 'id' in data) {
              await updateBadge(firestore, schoolId, data as Badge);
            } else {
              await addBadge(firestore, schoolId, data as Omit<Badge, 'id'>);
            }
            setEditingCategoryBadge(null);
          }}
        />
        <AlertDialog open={!!categoryBadgeToDelete} onOpenChange={(open) => !open && setCategoryBadgeToDelete(null)}>
          <AlertDialogContent className="rounded-3xl border-2">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete badge &quot;{categoryBadgeToDelete?.name}&quot;?</AlertDialogTitle>
              <AlertDialogDescription>Students will no longer earn this badge. Already earned badges are not removed.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setCategoryBadgeToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={async () => {
                  if (categoryBadgeToDelete && firestore && schoolId) {
                    await deleteBadge(firestore, schoolId, categoryBadgeToDelete.id);
                    setCategoryBadgeToDelete(null);
                    playSound('success');
                    toast({ title: 'Badge deleted' });
                  }
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Dialog open={!!badgeEarnersFor} onOpenChange={(open) => !open && setBadgeEarnersFor(null)}>
          <DialogContent className="sm:max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {badgeEarnersFor && (
                  <>
                    <Award className="h-5 w-5" style={badgeEarnersFor.accentColor ? { color: badgeEarnersFor.accentColor } : undefined} />
                    Who earned &quot;{badgeEarnersFor.name}&quot;
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                Students who have earned this badge (by period). Same student may appear multiple times if they earned it in different periods.
              </DialogDescription>
            </DialogHeader>
            {badgeEarnersFor && (() => {
              const entries = (students || []).flatMap((s) =>
                (s.earnedBadges || [])
                  .filter((e) => e.badgeId === badgeEarnersFor.id)
                  .map((e) => ({ student: s, periodKey: e.periodKey, earnedAt: e.earnedAt }))
              );
              entries.sort((a, b) => b.earnedAt - a.earnedAt);
              return (
                <div className="max-h-[320px] overflow-y-auto space-y-1 pr-1">
                  {entries.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No one has earned this badge yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {entries.map((entry, i) => (
                        <li key={`${entry.student.id}-${entry.periodKey}-${entry.earnedAt}`} className="flex justify-between items-center py-2 px-3 rounded-lg bg-muted/50 text-sm">
                          <span className="font-medium">{getStudentNickname(entry.student)} {entry.student.lastName}</span>
                          <span className="text-muted-foreground text-xs">
                            {entry.periodKey} · {new Date(entry.earnedAt).toLocaleDateString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })()}
            <DialogFooter>
              <Button variant="secondary" onClick={() => setBadgeEarnersFor(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <AlertDialog open={!!achievementToDelete} onOpenChange={(open) => !open && setAchievementToDelete(null)}>
          <AlertDialogContent className="rounded-3xl border-2">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete milestone &quot;{achievementToDelete?.name}&quot;?</AlertDialogTitle>
              <AlertDialogDescription>Students will no longer earn bonus points from this milestone. Existing bonus points already awarded are not removed.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setAchievementToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={async () => {
                  if (achievementToDelete && firestore && schoolId) {
                    await deleteAchievement(firestore, schoolId, achievementToDelete.id);
                    setAchievementToDelete(null);
                    playSound('success');
                    toast({ title: 'Milestone deleted' });
                  }
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={!!studentToPurge} onOpenChange={(open) => !open && !isPurgingStudent && setStudentToPurge(null)}>
          <AlertDialogContent className="rounded-3xl border-2">
            <AlertDialogHeader>
              <AlertDialogTitle>
                Purge points & badges for&nbsp;
                {studentToPurge ? `${getStudentNickname(studentToPurge)} ${studentToPurge.lastName}?` : 'this student?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will reset their current points, lifetime points, category totals, achievements, and badges to zero. Activity history stays for audit.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPurgingStudent} onClick={() => setStudentToPurge(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-amber-600 hover:bg-amber-700"
                disabled={isPurgingStudent}
                onClick={async () => {
                  if (!studentToPurge) return;
                  try {
                    setIsPurgingStudent(true);
                    setShowPurgeFlash(true);
                    await purgeStudentProgress(studentToPurge.id);
                    playSound('success');
                    toast({ title: 'Student purged', description: 'Points and badges have been reset.' });
                    setTimeout(() => setShowPurgeFlash(false), 600);
                    setStudentToPurge(null);
                  } catch (e: any) {
                    setShowPurgeFlash(false);
                    playSound('error');
                    toast({ variant: 'destructive', title: 'Purge failed', description: e?.message || 'Please try again.' });
                  } finally {
                    setIsPurgingStudent(false);
                  }
                }}
              >
                {isPurgingStudent ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Yes, purge now
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={isAddSampleBadgesOpen} onOpenChange={setIsAddSampleBadgesOpen}>
          <AlertDialogContent className="rounded-3xl border-2">
            <AlertDialogHeader>
              <AlertDialogTitle>Add sample milestones?</AlertDialogTitle>
              <AlertDialogDescription>
                This will add {SAMPLE_BADGES.length} ready-made bonus point milestones (Early Bird, Century, Rising Star, etc.) with point thresholds and bonus points. You can edit or delete them anytime.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsAddSampleBadgesOpen(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (!firestore || !schoolId) return;
                  setIsAddingSamples(true);
                  try {
                    for (const badge of SAMPLE_BADGES) {
                      await addAchievement(firestore, schoolId, badge);
                    }
                    playSound('success');
                    toast({ title: 'Sample milestones added', description: `${SAMPLE_BADGES.length} milestones were created.` });
                    setIsAddSampleBadgesOpen(false);
                  } catch (e: any) {
                    playSound('error');
                    toast({ variant: 'destructive', title: 'Failed to add milestones', description: e?.message || 'Please try again.' });
                  } finally {
                    setIsAddingSamples(false);
                  }
                }}
              >
                Add {SAMPLE_BADGES.length} milestones
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={isAddSampleCategoryBadgesOpen} onOpenChange={setIsAddSampleCategoryBadgesOpen}>
          <AlertDialogContent className="rounded-3xl border-2">
            <AlertDialogHeader>
              <AlertDialogTitle>Add sample badges?</AlertDialogTitle>
              <AlertDialogDescription>
                {categories?.length
                  ? `This will add 4 category-based badges (Monthly Star, Monthly Champion, Semester Standout, Yearly Excellence) for the category "${categories[0].name}". You can edit or delete them anytime.`
                  : 'Create at least one category in the Categories tab first, then add sample badges.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsAddSampleCategoryBadgesOpen(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={!categories?.length || isAddingSampleCategoryBadges}
                onClick={async () => {
                  if (!firestore || !schoolId || !categories?.length) return;
                  const categoryId = categories[0].id;
                  const samples = getSampleCategoryBadges(categoryId);
                  setIsAddingSampleCategoryBadges(true);
                  try {
                    for (const b of samples) {
                      await addBadge(firestore, schoolId, b);
                    }
                    playSound('success');
                    toast({ title: 'Sample badges added', description: `${samples.length} badges were created for ${categories[0].name}.` });
                    setIsAddSampleCategoryBadgesOpen(false);
                  } catch (e: any) {
                    playSound('error');
                    toast({ variant: 'destructive', title: 'Failed to add badges', description: e?.message || 'Please try again.' });
                  } finally {
                    setIsAddingSampleCategoryBadges(false);
                  }
                }}
              >
                {isAddingSampleCategoryBadges ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Add 4 badges
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={isDtcAlertOpen} onOpenChange={setIsDtcAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Bulk DTC Printing</AlertDialogTitle>
              <AlertDialogDescription>
                Direct-to-card (DTC) printers print one card at a time. To prevent issues, please use the &quot;Select&quot; mode to choose and print one student ID at a time.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setIsDtcAlertOpen(false)}>OK</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {showPurgeFlash && (
          <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
            <div className="absolute inset-0 bg-white/90 animate-pulse" />
            <div className="relative z-10 px-10 py-6 rounded-full border-4 border-amber-500 bg-white shadow-2xl text-amber-700 text-xl font-black tracking-[0.3em] uppercase">
              Purged
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

function UniversalPeriodsAdmin({ schoolId }: { schoolId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const periodsQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'periods') : null, [firestore, schoolId]);
  const { data: periods, isLoading } = useCollection<AttendanceScheduleSlot>(periodsQuery);

  const [label, setLabel] = useState('Period 1');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('08:45');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiImporting, setAiImporting] = useState(false);

  const normalizeTime = (raw: string): string | null => {
    const s = (raw || '').trim();
    if (!s) return null;

    const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
    if (m24) {
      const h = Number(m24[1]);
      const m = Number(m24[2]);
      if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    const m12 = s.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
    if (m12) {
      let h = Number(m12[1]);
      const m = Number(m12[2]);
      const ap = String(m12[3]).toLowerCase();
      if (Number.isNaN(h) || Number.isNaN(m)) return null;
      if (ap === 'pm' && h !== 12) h += 12;
      if (ap === 'am' && h === 12) h = 0;
      if (h < 0 || h > 23 || m < 0 || m > 59) return null;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    return null;
  };

  const importPeriodsFromAI = async () => {
    if (!schoolId) return;
    if (!aiPrompt.trim()) {
      toast({ variant: 'destructive', title: 'Paste schedule text first' });
      return;
    }

    const replaceExisting = (periods || []).length > 0;
    if (replaceExisting && !confirm('Replace ALL existing periods with the AI result?')) return;

    setAiImporting(true);
    try {
      // Delete old periods (optional).
      if (replaceExisting) {
        for (const p of periods || []) {
          await deleteDoc(doc(firestore, 'schools', schoolId, 'periods', p.id));
        }
      }

      const model = localStorage.getItem('arcade_ai_model') || 'gemini-2.5-flash';
      const res = await fetch('/api/parse-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, model }),
      });

      if (!res.ok) {
        throw new Error(`AI import failed (${res.status}).`);
      }

      const data = await res.json();
      const items = Array.isArray(data) ? data : [];
      if (!items.length) {
        toast({ variant: 'destructive', title: 'No periods found from AI', description: 'Try pasting the schedule with clearer time ranges.' });
        return;
      }

      // Map returned { className, startTime, endTime } -> our period schema { label, startTime, endTime }.
      const mapped = items
        .map((it: any, i: number) => {
          const start = normalizeTime(String(it?.startTime || ''));
          const end = normalizeTime(String(it?.endTime || ''));
          if (!start || !end) return null;
          const nextLabel = String(it?.className || '').trim() || `Period ${i + 1}`;
          return {
            id: `p_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
            label: nextLabel,
            startTime: start,
            endTime: end,
          } as AttendanceScheduleSlot;
        })
        .filter(Boolean) as AttendanceScheduleSlot[];

      if (!mapped.length) {
        toast({ variant: 'destructive', title: 'AI response had no valid time ranges' });
        return;
      }

      for (const p of mapped) {
        await setDoc(doc(firestore, 'schools', schoolId, 'periods', p.id), {
          id: p.id,
          label: p.label,
          startTime: p.startTime,
          endTime: p.endTime,
        });
      }

      toast({ title: 'Periods imported', description: `Added ${mapped.length} period(s).` });
      setAiPrompt('');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to import periods', description: e?.message || String(e) });
    } finally {
      setAiImporting(false);
    }
  };

  const addPeriod = async () => {
    try {
      const id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await setDoc(doc(firestore, 'schools', schoolId, 'periods', id), { id, label, startTime, endTime });
      toast({ title: 'Period added' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to add period', description: (e as Error).message });
    }
  };

  const updatePeriod = async (p: AttendanceScheduleSlot) => {
    try {
      await updateDoc(doc(firestore, 'schools', schoolId, 'periods', p.id), { label: p.label, startTime: p.startTime, endTime: p.endTime });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to update period', description: (e as Error).message });
    }
  };

  const removePeriod = async (id: string) => {
    if (!confirm('Delete this period?')) return;
    try {
      await deleteDoc(doc(firestore, 'schools', schoolId, 'periods', id));
      toast({ title: 'Period deleted' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to delete period', description: (e as Error).message });
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">AI import period times</Label>
        <textarea
          className="w-full rounded-xl border border-input bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Paste something like: Period 1 08:00-08:45, Period 2 08:50-09:35 ..."
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          rows={4}
        />
        <div className="flex items-center gap-3">
          <Button onClick={importPeriodsFromAI} disabled={aiImporting || !aiPrompt.trim()} className="rounded-xl font-bold uppercase tracking-widest">
            {aiImporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
            Import
          </Button>
          <p className="text-xs text-muted-foreground">Creates universal periods in Admin → Attendance.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label>Label</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} className="w-[160px]" />
        </div>
        <div className="space-y-1">
          <Label>Start</Label>
          <Input value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-[110px] font-mono" />
        </div>
        <div className="space-y-1">
          <Label>End</Label>
          <Input value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-[110px] font-mono" />
        </div>
        <Button onClick={addPeriod} className="rounded-xl">Add</Button>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (periods || []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No periods yet.</p>
        ) : (
          (periods || []).map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-muted/40 border">
              <Input
                className="w-[160px]"
                value={p.label}
                onChange={(e) => updatePeriod({ ...p, label: e.target.value })}
              />
              <Input
                className="w-[110px] font-mono"
                value={p.startTime}
                onChange={(e) => updatePeriod({ ...p, startTime: e.target.value })}
              />
              <span className="text-muted-foreground">–</span>
              <Input
                className="w-[110px] font-mono"
                value={p.endTime}
                onChange={(e) => updatePeriod({ ...p, endTime: e.target.value })}
              />
              <Button variant="ghost" size="icon" className="text-red-600" onClick={() => removePeriod(p.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AdminLogin({ onLogin }: { onLogin: (passcode: string) => Promise<boolean> }) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    const success = await onLogin(passcode);
    if (!success) {
      setError('Invalid admin passcode');
      setPasscode('');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-sm shadow-2xl border-t-8 border-destructive">
        <CardHeader className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto bg-destructive text-destructive-foreground rounded-2xl flex items-center justify-center shadow-lg">
            <LayoutDashboard className="w-8 h-8" />
          </div>
          <CardTitle className="text-2xl font-black">Admin Access</CardTitle>
          <CardDescription>Enter the school admin passcode.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="h-12 text-center text-lg font-mono tracking-widest"
                autoFocus
              />
              {error && <p className="text-sm text-red-500 text-center font-bold">{error}</p>}
            </div>
            <Button
              type="submit"
              className="w-full h-12 text-lg font-bold shadow-md"
              disabled={isLoading || !passcode}
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enter Dashboard'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  const { loginState, isInitialized, isAdmin, login, schoolId } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    if (isInitialized && !['student', 'teacher', 'admin', 'school', 'developer'].includes(loginState)) {
      router.replace('/');
    }
  }, [isInitialized, loginState, router]);

  const handleAdminLogin = async (passcode: string) => {
    if (!schoolId) return false;
    return await login('admin', { schoolId, passcode });
  };

  if (!isInitialized || !['student', 'teacher', 'admin', 'school', 'developer'].includes(loginState)) {
    return <AdminDashboardSkeleton />;
  }

  if (!isAdmin) {
    return <AdminLogin onLogin={handleAdminLogin} />;
  }

  return (
    <ErrorBoundary name="AdminPage">
      <AdminDashboardInner />
    </ErrorBoundary>
  );
}
