
'use client';
import { useEffect, useState, useRef, ChangeEvent } from 'react';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useCollection, useMemoFirebase, useFunctions } from '@/firebase';
import { useAdminDashboardData } from './hooks/useAdminDashboardData';
import { useStudentRoster } from './hooks/useStudentRoster';
import { useAdminAttendance } from './hooks/useAdminAttendance';
import { useSchoolLogoUpload } from './hooks/useSchoolLogoUpload';
import { useAuthFetch } from '@/lib/authFetch';
import { collection, doc, updateDoc, setDoc, deleteDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';

import {
  Users, Gift, BookOpen, Trash2, Edit, Plus, UploadCloud, Printer, LayoutDashboard, Database,
  Settings, History, Award, CheckCircle, Tag, Trophy, ArrowRight, Loader2, Play, ShieldCheck,
  User, Ticket, Upload, Download, Activity, Zap, Clock, Palette, Wand2, TableProperties, Headset,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import type { Student, Prize, Coupon, Category, Class, Teacher, BackupInfo, Achievement, Badge, AttendanceScheduleSlot, TeacherBudgetPeriod, StaffAccount } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StudentModal } from '@/components/StudentModal';
import { AttendanceTimeZoneField } from '@/components/attendance/AttendanceTimeZoneField';
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
import { rainbowTripletForNavId, rainbowForNavId, complementTripletForNavId } from '@/lib/rainbowNav';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { ImageCropper } from '@/components/ImageCropper';
import { Helper } from '@/components/ui/helper';
import dynamic from 'next/dynamic';
import { CategoryModal } from '@/components/CategoryModal';
import { StudentIdCard } from '@/components/StudentIdCard';
import { AchievementModal } from '@/components/AchievementModal';
import { BadgeModal } from '@/components/BadgeModal';

const ThemeGeneratorModal = dynamic(
  () => import('@/components/ThemeGeneratorModal').then((m) => m.ThemeGeneratorModal),
  { ssr: false },
);
import { addAchievement, updateAchievement, deleteAchievement, addBadge, updateBadge, deleteBadge, addStaffAccount, updateStaffAccount, deleteStaffAccount } from '@/lib/db';
import { SAMPLE_BADGES, getSampleCategoryBadges } from '@/lib/sample-badges';
// The Students tab is the default tab, so keep it eager. Every other tab is
// code-split with `next/dynamic` so its chunk is only fetched when the admin
// actually clicks into it — this dramatically reduces the initial admin JS.
import { AdminStudentsTab } from './sections/AdminStudentsTab';
import { budgetWindowKeyForDate } from '@/lib/teacherBudget';

const tabLoader = () => (
  <div className="animate-pulse h-64 w-full rounded-xl bg-muted/40" aria-hidden="true" />
);

const AdminStatsTab = dynamic(
  () => import('./sections/AdminStatsTab').then((m) => m.AdminStatsTab),
  { loading: tabLoader, ssr: false },
);
const AdminBrandingTab = dynamic(
  () => import('./sections/AdminBrandingTab').then((m) => m.AdminBrandingTab),
  { loading: tabLoader, ssr: false },
);
const AdminClassesTab = dynamic(
  () => import('./sections/AdminClassesTab').then((m) => m.AdminClassesTab),
  { loading: tabLoader, ssr: false },
);
const AdminTeachersTab = dynamic(
  () => import('./sections/AdminTeachersTab').then((m) => m.AdminTeachersTab),
  { loading: tabLoader, ssr: false },
);
const AdminStaffAccountsTab = dynamic(
  () => import('./sections/AdminStaffAccountsTab').then((m) => m.AdminStaffAccountsTab),
  { loading: tabLoader, ssr: false },
);
const AdminCategoriesTab = dynamic(
  () => import('./sections/AdminCategoriesTab').then((m) => m.AdminCategoriesTab),
  { loading: tabLoader, ssr: false },
);
const AdminPrizesTab = dynamic(
  () => import('./sections/AdminPrizesTab').then((m) => m.AdminPrizesTab),
  { loading: tabLoader, ssr: false },
);
const AdminCouponsTab = dynamic(
  () => import('./sections/AdminCouponsTab').then((m) => m.AdminCouponsTab),
  { loading: tabLoader, ssr: false },
);
const AdminBackupsTab = dynamic(
  () => import('./sections/AdminBackupsTab').then((m) => m.AdminBackupsTab),
  { loading: tabLoader, ssr: false },
);
const AdminAttendanceTab = dynamic(
  () => import('./sections/AdminAttendanceTab').then((m) => m.AdminAttendanceTab),
  { loading: tabLoader, ssr: false },
);
const AdminBonusPointsTab = dynamic(
  () => import('./sections/AdminBonusPointsTab').then((m) => m.AdminBonusPointsTab),
  { loading: tabLoader, ssr: false },
);
const AdminBadgesTab = dynamic(
  () => import('./sections/AdminBadgesTab').then((m) => m.AdminBadgesTab),
  { loading: tabLoader, ssr: false },
);
import { getReadableErrorMessage } from '@/lib/errorMessage';
import { BulkRosterSetupDialog } from '@/components/BulkRosterSetupDialog';

function describeCsvImportReport(
  report: { success: number; failed: number; errors: string[] },
  noun: string,
): { title: string; description: string; variant: 'default' | 'destructive' } {
  const lines: string[] = [];
  if (report.success > 0) lines.push(`Added ${report.success}.`);
  if (report.failed > 0) lines.push(`${report.failed} row(s) skipped or not imported.`);
  const errPreview = report.errors.slice(0, 10).join('\n');
  if (errPreview) lines.push(errPreview);
  const description = lines.join('\n') || 'Nothing changed.';
  const title = report.success > 0 ? `${noun} imported` : `No ${noun.toLowerCase()} imported`;
  const variant =
    report.success === 0 && (report.failed > 0 || report.errors.length > 0) ? 'destructive' : 'default';
  return { title, description, variant };
}

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
    addPrize, updatePrize, deletePrize, uploadStudents, uploadClassesFromCsv, uploadTeachersFromCsv, setStudentsToPrint,
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
  const functions = useFunctions();
  const { toast } = useToast();
  const confirm = useConfirm();
  const playSound = useArcadeSound();
  const studentCsvInputRef = useRef<HTMLInputElement>(null);
  const { settings, updateSettings } = useSettings();

  // All Firestore reads the dashboard needs live in a single hook so this
  // component only has to worry about orchestration and UI state.
  const {
    firestore,
    students, studentsLoading, studentsError,
    classes, classesLoading, classesError,
    teachers, teachersLoading, teachersError,
    staffAccounts, staffAccountsLoading, staffAccountsError,
    categories, categoriesLoading, categoriesError,
    prizes, prizesLoading, prizesError,
    coupons, couponsLoading, couponsError,
    attendancePeriods, attendancePeriodsLoading,
    backups, backupsLoading, backupsError,
    schoolData, schoolDocRef,
    appConfigGlobal,
  } = useAdminDashboardData(schoolId);

  // School logo state + upload/crop/remove pipeline (see hook for details).
  const {
    logoPreviewUrl,
    setLogoPreviewUrl,
    previousSchoolLogos,
    isLogoUploading,
    cropLogoSrc,
    setCropLogoSrc,
    handleLogoUpload,
    handleCropComplete,
    handleRemoveLogo,
  } = useSchoolLogoUpload({
    schoolId,
    schoolDocRef,
    firestore,
    schoolData,
    functions,
    toast,
    playSound,
  });

  const [newClassName, setNewClassName] = useState('');
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherUsername, setNewTeacherUsername] = useState('');
  const [newTeacherPasscode, setNewTeacherPasscode] = useState('');
  const [newTeacherBudget, setNewTeacherBudget] = useState('');
  const [newTeacherBudgetPeriod, setNewTeacherBudgetPeriod] = useState<TeacherBudgetPeriod>('month');
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
  const {
    studentSearchTerm, setStudentSearchTerm,
    studentSortOption, setStudentSortOption,
    studentFilterClass, setStudentFilterClass,
    selectionMode, setSelectionMode,
    selectedStudentIds, setSelectedStudentIds,
    filteredStudents,
    isAllFilteredSelected,
    toggleSelectAllFiltered,
  } = useStudentRoster(students);
  const [idPreviewStudent, setIdPreviewStudent] = useState<Student | null>(null);
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

  const [bulkRosterOpen, setBulkRosterOpen] = useState(false);
  const [isPreviousLogosOpen, setIsPreviousLogosOpen] = useState(false);
  const [isDtcAlertOpen, setIsDtcAlertOpen] = useState(false);

  // All attendance dashboard state + orchestration lives behind one hook so
  // this component only worries about the tab's presentation. It covers:
  //   * school-level config + save + log loader
  //   * teacher-level config + save + log loader
  //   * reward-rule drafts / save / delete
  //   * schedule-slot mutators
  //   * student activity snapshot (auto-loaded when the tab is enabled)
  const {
    attendanceConfig, setAttendanceConfigState,
    attendanceLog, attendanceConfigSaving, attendanceLogLoading,
    loadAttendanceLog, handleSaveAttendanceConfig,
    addScheduleSlot, updateScheduleSlot, removeScheduleSlot,
    selectedAttendanceTeacherId, setSelectedAttendanceTeacherId,
    teacherAttendanceConfig, setTeacherAttendanceConfigState,
    teacherAttendanceSaving, teacherAttendanceLog, teacherAttendanceLogLoading,
    loadTeacherAttendanceLog, handleSaveTeacherAttendanceConfig,
    teacherAttendanceRewards, teacherAttendanceRewardsLoading,
    ruleDrafts, setRuleDrafts, savingRuleId,
    saveTeacherRewardRule, deleteTeacherRewardRule,
    studentActivityLog, studentActivityLogLoading, loadStudentActivityLog,
  } = useAdminAttendance({
    enabled: !!settings.enableClassSignIn,
    schoolId,
    firestore,
    teachers,
    students,
    toast,
    playSound,
    getAttendanceConfig,
    setAttendanceConfig,
    listAttendanceLog,
    getTeacherAttendanceConfig,
    setTeacherAttendanceConfig,
    listTeacherAttendanceLog,
  });

  const isDbLoading = studentsLoading || classesLoading || teachersLoading || staffAccountsLoading || categoriesLoading || prizesLoading || couponsLoading || backupsLoading;

  const collectionErrors = [
    { name: 'Students', error: studentsError },
    { name: 'Classes', error: classesError },
    { name: 'Teachers', error: teachersError },
    { name: 'Desk staff', error: staffAccountsError },
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
    if (!username) {
      username = newTeacherName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
    }
    if (!passcode) {
      passcode = '1234';
    }
    const budgetRaw = newTeacherBudget.trim();
    const budgetVal = budgetRaw === '' ? undefined : parseInt(budgetRaw, 10);
    if (budgetVal !== undefined && (Number.isNaN(budgetVal) || budgetVal < 0)) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Invalid budget', description: 'Enter a non-negative whole number or leave the cap blank.' });
      return;
    }

    const periodForSave: TeacherBudgetPeriod | undefined =
      budgetVal !== undefined ? newTeacherBudgetPeriod : undefined;

    if (editingTeacher) {
      if (budgetVal === undefined) {
        updateTeacher(
          { ...editingTeacher, name: newTeacherName, username, passcode },
          { clearTeacherBudget: true },
        );
      } else {
        const prevPeriod = editingTeacher.budgetPeriod ?? 'month';
        const prevCap = editingTeacher.monthlyBudget;
        const budgetChanged = prevCap !== budgetVal || prevPeriod !== (periodForSave ?? 'month');
        const base: Teacher = {
          ...editingTeacher,
          name: newTeacherName,
          username,
          passcode,
          monthlyBudget: budgetVal,
          budgetPeriod: periodForSave,
        };
        if (budgetChanged) {
          updateTeacher({
            ...base,
            spentThisMonth: 0,
            budgetWindowKey: budgetWindowKeyForDate(periodForSave ?? 'month'),
          });
        } else {
          updateTeacher(base);
        }
      }
    } else if (budgetVal === undefined) {
      addTeacher({ name: newTeacherName, username, passcode });
    } else {
      addTeacher({
        name: newTeacherName,
        username,
        passcode,
        monthlyBudget: budgetVal,
        budgetPeriod: periodForSave,
        spentThisMonth: 0,
        budgetWindowKey: budgetWindowKeyForDate(periodForSave ?? 'month'),
      });
    }

    setNewTeacherName('');
    setNewTeacherUsername('');
    setNewTeacherPasscode('');
    setNewTeacherBudget('');
    setNewTeacherBudgetPeriod('month');
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

  const onStudentCsvFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const report = await uploadStudents(text, students || [], classes || []);
      playSound(report.success > 0 ? 'success' : 'error');
      const msg = describeCsvImportReport(report, 'Students');
      toast({ variant: msg.variant, title: msg.title, description: msg.description });
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

  const handleBulkClassesCsv = async (text: string) => {
    try {
      const report = await uploadClassesFromCsv(text, classes || []);
      playSound(report.success > 0 ? 'success' : 'error');
      const msg = describeCsvImportReport(report, 'Classes');
      toast({ variant: msg.variant, title: msg.title, description: msg.description });
    } catch (err: unknown) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Failed to import classes',
        description: getReadableErrorMessage(err, 'Import failed.'),
      });
    }
  };

  const handleBulkTeachersCsv = async (text: string) => {
    try {
      const report = await uploadTeachersFromCsv(text, teachers || []);
      playSound(report.success > 0 ? 'success' : 'error');
      const msg = describeCsvImportReport(report, 'Teachers');
      toast({ variant: msg.variant, title: msg.title, description: msg.description });
    } catch (err: unknown) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Failed to import teachers',
        description: getReadableErrorMessage(err, 'Import failed.'),
      });
    }
  };

  const handleBulkStudentsCsv = async (text: string) => {
    try {
      const report = await uploadStudents(text, students || [], classes || []);
      playSound(report.success > 0 ? 'success' : 'error');
      const msg = describeCsvImportReport(report, 'Students');
      toast({ variant: msg.variant, title: msg.title, description: msg.description });
    } catch (err: unknown) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Failed to import students',
        description: getReadableErrorMessage(err, 'Import failed.'),
      });
    }
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
      <div
        className={cn("space-y-6 max-w-full mx-auto p-4 md:p-8", settings.displayMode === 'app' && 'pb-24')}
        style={{
          ['--primary' as any]: rainbowTripletForNavId('admin', settings.colorScheme),
          ['--chart-1' as any]: rainbowTripletForNavId('admin', settings.colorScheme),
          ['--chart-2' as any]: complementTripletForNavId('admin', settings.colorScheme),
          ['--chart-3' as any]: rainbowTripletForNavId('admin', settings.colorScheme),
          ['--chart-4' as any]: complementTripletForNavId('admin', settings.colorScheme),
          ['--chart-5' as any]: rainbowTripletForNavId('admin', settings.colorScheme),
          ['--ring' as any]: complementTripletForNavId('admin', settings.colorScheme),
        } as any}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <Helper content="This page is for system administrators. It allows you to manage all school instances, create backups, and perform system-wide operations.">
            <h2
              className="text-2xl font-bold tracking-tight"
              style={{ color: rainbowForNavId('admin', settings.colorScheme) }}
            >
              Admin
            </h2>
            <p className="text-muted-foreground">
              Manage students, classes, prizes, and system settings.
            </p>
          </Helper>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl shrink-0 font-semibold gap-2"
            onClick={() => setBulkRosterOpen(true)}
          >
            <TableProperties className="w-4 h-4" aria-hidden />
            Bulk roster setup
          </Button>
        </div>

        <BulkRosterSetupDialog
          open={bulkRosterOpen}
          onOpenChange={setBulkRosterOpen}
          onClassesCsv={handleBulkClassesCsv}
          onTeachersCsv={handleBulkTeachersCsv}
          onStudentsCsv={handleBulkStudentsCsv}
        />

        <Tabs key={`${String(settings.enableAchievements)}:${String(settings.enableBadges)}`} defaultValue="students" className="space-y-6">
          {/*
            Tabs wrap onto multiple rows when they don't fit on a single line,
            so every section is always visible without horizontal scrolling.
          */}
          <div className="w-full">
            <TabsList className="bg-muted/50 p-1.5 rounded-2xl flex flex-wrap justify-center border shadow-sm gap-x-0.5 gap-y-1 h-auto w-full"
              style={{ ['--admin-accent' as any]: rainbowForNavId('admin', settings.colorScheme) }}
              aria-label="Admin sections"
            >
              {settings.enableAdminAnalytics && (
                <>
                  <TabsTrigger value="stats" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-[color:var(--admin-accent)]">
                    <LayoutDashboard className="w-4 h-4" aria-hidden="true" /> Stats
                  </TabsTrigger>
                  <span aria-hidden="true" className="self-stretch w-px bg-border/60 mx-1" />
                </>
              )}
              <TabsTrigger value="students" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-[color:var(--admin-accent)]">
                <Users className="w-4 h-4" aria-hidden="true" /> Students
              </TabsTrigger>
              <TabsTrigger value="classes" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-[color:var(--admin-accent)]">
                <BookOpen className="w-4 h-4" aria-hidden="true" /> Classes
              </TabsTrigger>
              <TabsTrigger value="teachers" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-[color:var(--admin-accent)]">
                <User className="w-4 h-4" aria-hidden="true" /> Teachers
              </TabsTrigger>
              <TabsTrigger value="desk-staff" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-[color:var(--admin-accent)]">
                <Headset className="w-4 h-4" aria-hidden="true" /> Desk staff
              </TabsTrigger>
              <TabsTrigger value="categories" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-[color:var(--admin-accent)]">
                <Tag className="w-4 h-4" aria-hidden="true" /> Categories
              </TabsTrigger>

              <span aria-hidden="true" className="self-stretch w-px bg-border/60 mx-1" />

              <TabsTrigger value="prizes" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-[color:var(--admin-accent)]">
                <Gift className="w-4 h-4" aria-hidden="true" /> Prizes
              </TabsTrigger>
              <TabsTrigger value="coupons" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-[color:var(--admin-accent)]">
                <Ticket className="w-4 h-4" aria-hidden="true" /> Coupons
              </TabsTrigger>
              {settings.enableAchievements && (
                <TabsTrigger value="bonuspoints" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-[color:var(--admin-accent)]">
                  <Trophy className="w-4 h-4" aria-hidden="true" /> Bonus Points
                </TabsTrigger>
              )}
              {settings.enableBadges && (
                <TabsTrigger value="category-badges" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-[color:var(--admin-accent)]">
                  <Award className="w-4 h-4" aria-hidden="true" /> Badges
                </TabsTrigger>
              )}

              {settings.enableClassSignIn && (
                <>
                  <span aria-hidden="true" className="self-stretch w-px bg-border/60 mx-1" />
                  <TabsTrigger value="attendance" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-[color:var(--admin-accent)]">
                    <Clock className="w-4 h-4" aria-hidden="true" /> Attendance
                  </TabsTrigger>
                </>
              )}

              <span aria-hidden="true" className="self-stretch w-px bg-border/60 mx-1" />

              <TabsTrigger value="branding" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-[color:var(--admin-accent)]">
                <UploadCloud className="w-4 h-4" aria-hidden="true" /> Branding
              </TabsTrigger>
              <TabsTrigger value="backups" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-[color:var(--admin-accent)]">
                <Database className="w-4 h-4" aria-hidden="true" /> Backups
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
              previewIdCardStudent={(s) => setIdPreviewStudent(s)}
              deleteStudent={async (id) => {
                const student = (students || []).find((s) => s.id === id);
                const studentName = student ? `${student.firstName}${student.lastName ? ` ${student.lastName}` : ''}` : '';
                const ok = await confirm({
                  title: studentName ? `Delete ${studentName}?` : 'Delete this student?',
                  description: 'This permanently removes the student, their points history, and coupon/prize records. This cannot be undone.',
                  confirmLabel: 'Delete student',
                  destructive: true,
                });
                if (!ok) return;
                await deleteStudent(id);
              }}
              setStudentToPurge={(s) => setStudentToPurge(s)}
            />
          </TabsContent>

          <TabsContent value="classes" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <AdminClassesTab
              classes={classes}
              teachers={teachers}
              students={students}
              onAddClass={() => setIsClassModalOpen(true)}
              onDeleteClass={async (id, classStudents) => {
                const klass = (classes || []).find((c) => c.id === id);
                const ok = await confirm({
                  title: klass ? `Delete class "${klass.name}"?` : 'Delete this class?',
                  description: classStudents.length > 0
                    ? `${classStudents.length} student${classStudents.length === 1 ? ' is' : 's are'} assigned to this class. They will be unassigned but not deleted.`
                    : 'No students are assigned to this class.',
                  confirmLabel: 'Delete class',
                  destructive: true,
                });
                if (!ok) return;
                await deleteClass(id, classStudents);
              }}
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
                const p = t.budgetPeriod;
                setNewTeacherBudgetPeriod(p === 'day' || p === 'week' || p === 'month' ? p : 'month');
                setIsTeacherModalOpen(true);
              }}
              onDeleteTeacher={async (id) => {
                const teacher = (teachers || []).find((t) => t.id === id);
                const ok = await confirm({
                  title: teacher ? `Remove ${teacher.name}?` : 'Remove this teacher?',
                  description: 'Classes and reward rules they own will remain but they will lose teacher access until re-added.',
                  confirmLabel: 'Remove teacher',
                  destructive: true,
                });
                if (!ok) return;
                await deleteTeacher(id);
              }}
            />
          </TabsContent>

          <TabsContent value="desk-staff" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <AdminStaffAccountsTab
              staffAccounts={staffAccounts}
              onSave={async (account) => {
                if (!firestore || !schoolId) return;
                try {
                  if ('id' in account && account.id) {
                    await updateStaffAccount(firestore, schoolId, account as StaffAccount);
                    toast({ title: 'Account updated' });
                  } else {
                    await addStaffAccount(firestore, schoolId, account);
                    toast({ title: 'Account created' });
                  }
                } catch (e) {
                  toast({ variant: 'destructive', title: 'Save failed', description: getReadableErrorMessage(e, 'Save failed.') });
                }
              }}
              onDelete={async (id) => {
                const row = (staffAccounts || []).find((a) => a.id === id);
                const ok = await confirm({
                  title: row ? `Remove ${row.displayName}?` : 'Remove this account?',
                  description: 'They will no longer be able to sign in until you add them again.',
                  confirmLabel: 'Remove',
                  destructive: true,
                });
                if (!ok || !firestore || !schoolId) return;
                try {
                  await deleteStaffAccount(firestore, schoolId, id);
                  toast({ title: 'Account removed' });
                } catch (e) {
                  toast({ variant: 'destructive', title: 'Delete failed', description: getReadableErrorMessage(e, 'Delete failed.') });
                }
              }}
            />
          </TabsContent>

          <TabsContent value="categories" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <AdminCategoriesTab
              categories={categories}
              teachers={teachers}
              onRandomizeColors={async () => {
                const ok = await confirm({
                  title: 'Randomize category colors?',
                  description: 'Every existing category will get a new random color. You can always change each one manually after.',
                  confirmLabel: 'Randomize',
                });
                if (!ok) return;
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
              onDeleteCategory={async (id) => {
                const cat = (categories || []).find((c) => c.id === id);
                const ok = await confirm({
                  title: cat ? `Delete category "${cat.name}"?` : 'Delete this category?',
                  description: 'Past activity entries that referenced this category will keep their label but you won\'t be able to award with it anymore.',
                  confirmLabel: 'Delete category',
                  destructive: true,
                });
                if (!ok) return;
                await deleteCategory(id);
              }}
            />
          </TabsContent>

          <TabsContent value="prizes" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <AdminPrizesTab
              prizes={prizes}
              teachers={teachers}
              classes={classes}
              schoolId={schoolId!}
              onCreatePrize={(p) => addPrize(p)}
              onEditPrize={(p) => handleOpenPrizeModal(p)}
              onDeletePrize={async (id) => {
                const prize = (prizes || []).find((p) => p.id === id);
                const ok = await confirm({
                  title: prize ? `Delete prize "${prize.name}"?` : 'Delete this prize?',
                  description: 'Students who already redeemed this prize keep their redemption. It will disappear from the shop immediately.',
                  confirmLabel: 'Delete prize',
                  destructive: true,
                });
                if (!ok) return;
                await deletePrize(id);
              }}
              onUpdatePrize={(p) => updatePrize(p)}
              onOpenSimpleNewPrize={() => handleOpenPrizeModal(null)}
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
          )}          {settings.enableBadges && (
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
                studentActivityLog={studentActivityLog}
                studentActivityLogLoading={studentActivityLogLoading}
                loadStudentActivityLog={loadStudentActivityLog}
                setTeacherAttendanceConfigState={setTeacherAttendanceConfigState}
                UniversalPeriodsAdmin={UniversalPeriodsAdmin}
              />
            </TabsContent>
          )}

          <TabsContent value="branding" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <AdminBrandingTab
              schoolId={schoolId}
              firestore={firestore}
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
            setNewTeacherBudgetPeriod('month');
          }
        }}>
          <DialogContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSaveTeacher();
              }}
            >
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
                  <Input id="new-teacher-username" value={newTeacherUsername} onChange={e => setNewTeacherUsername(e.target.value)} placeholder="e.g. jsmith" autoComplete="username" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new-teacher-passcode">Login Passcode</Label>
                  <Input id="new-teacher-passcode" type="password" value={newTeacherPasscode} onChange={e => setNewTeacherPasscode(e.target.value)} placeholder="Secret passcode" autoComplete="new-password" />
                </div>
                {settings.enableTeacherBudgets && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="new-teacher-budget">Budget cap (points)</Label>
                      <Input
                        id="new-teacher-budget"
                        type="number"
                        min={0}
                        value={newTeacherBudget}
                        onChange={(e) => setNewTeacherBudget(e.target.value)}
                        placeholder="Leave blank for unlimited"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="new-teacher-budget-period">Budget resets</Label>
                      <Select
                        value={newTeacherBudgetPeriod}
                        onValueChange={(v) => setNewTeacherBudgetPeriod(v as TeacherBudgetPeriod)}
                        disabled={!newTeacherBudget.trim()}
                      >
                        <SelectTrigger id="new-teacher-budget-period">
                          <SelectValue placeholder="How often the cap resets" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="day">Each day</SelectItem>
                          <SelectItem value="week">Each week (Mon-Sun)</SelectItem>
                          <SelectItem value="month">Each calendar month</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-muted-foreground leading-snug">
                        Uses this browser&apos;s local date. Changing the cap or period resets spend tracking for that teacher.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => {
                  setIsTeacherModalOpen(false);
                  setEditingTeacher(null);
                  setNewTeacherName('');
                  setNewTeacherUsername('');
                  setNewTeacherPasscode('');
                  setNewTeacherBudget('');
                  setNewTeacherBudgetPeriod('month');
                }}>Cancel</Button>
                <Button type="submit">{editingTeacher ? 'Save Changes' : 'Add Teacher'}</Button>
              </DialogFooter>
            </form>
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
            <DialogContent>
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
            studentName={
              `${themeStudent.firstName}${themeStudent.lastName ? ` ${themeStudent.lastName}` : ''}`.trim() || themeStudent.firstName
            }
            previewStudent={themeStudent}
            classLabel={getClassName(themeStudent.classId || '')}
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
            onRemoveTheme={async () => {
              try {
                await updateStudent({ ...themeStudent, theme: undefined });
                playSound('success');
                toast({
                  title: 'Theme removed',
                  description: `Cleared custom theme for ${themeStudent.firstName}.`,
                });
              } catch (e) {
                console.error(e);
                playSound('error');
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove student theme.' });
                throw e;
              }
            }}
          />
        )}
        {idPreviewStudent && (
          <Dialog open={!!idPreviewStudent} onOpenChange={(open) => !open && setIdPreviewStudent(null)}>
            <DialogContent size="xl" className="!flex flex-col gap-2 overflow-x-hidden pt-12 sm:pt-14">
              <DialogHeader className="shrink-0 space-y-1 pr-8">
                <DialogTitle className="text-lg">ID Card Preview</DialogTitle>
                <DialogDescription className="text-xs leading-snug">
                  Same layout as print; click outside or ✕ to close.
                </DialogDescription>
              </DialogHeader>
              {/* Extra vertical padding: scale() draws outside the layout box — without it, top/bottom get clipped */}
              <div className="flex shrink-0 flex-col items-center justify-center overflow-visible px-2 pb-6 pt-2 sm:pb-10 sm:pt-4">
                <div className="student-id-card-screen-preview flex justify-center origin-center scale-[1.1] sm:scale-[1.18]">
                  <StudentIdCard
                    student={idPreviewStudent}
                    schoolName={schoolData?.name?.trim() || 'School'}
                    schoolLogoUrl={schoolData?.logoUrl ?? null}
                    className={getClassName(idPreviewStudent.classId || '')}
                    isColorEnabled={settings.enableColorPrinting}
                    appLogoUrl={appConfigGlobal?.appLogoUrl ?? null}
                    appName={appConfigGlobal?.appName?.trim() || undefined}
                    appTagline={appConfigGlobal?.appTagline?.trim() || undefined}
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete badge &quot;{categoryBadgeToDelete?.name}&quot;?</AlertDialogTitle>
              <AlertDialogDescription>Students will no longer earn this badge. Already earned badges are not removed.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setCategoryBadgeToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
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
            <DialogContent>
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
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete milestone &quot;{achievementToDelete?.name}&quot;?</AlertDialogTitle>
              <AlertDialogDescription>Students will no longer earn bonus points from this milestone. Existing bonus points already awarded are not removed.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setAchievementToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
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
            <AlertDialogContent>
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
              <AlertDialogContent>
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
              <AlertDialogContent>
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
  const authFetch = useAuthFetch();
  const { toast } = useToast();
  const confirm = useConfirm();
  const { getAttendanceConfig, setAttendanceConfig } = useAppContext();
  const periodsQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'periods') : null, [firestore, schoolId]);
  const { data: periods, isLoading } = useCollection<AttendanceScheduleSlot>(periodsQuery);

  const [label, setLabel] = useState('Period 1');
  // Display-only values in AM/PM; we still store HH:mm in Firestore.
  const [startTime, setStartTime] = useState('8:00 AM');
  const [endTime, setEndTime] = useState('8:45 AM');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiImporting, setAiImporting] = useState(false);
  const [aiImportModeOpen, setAiImportModeOpen] = useState(false);

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

  const formatTimeToAmPm = (hhmm: string): string => {
    const s = (hhmm || '').trim();
    const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
    if (!m24) return hhmm;
    let h = Number(m24[1]);
    const mins = m24[2];
    if (Number.isNaN(h)) return hhmm;
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${mins} ${ap}`;
  };

  const requestAiPeriodImport = () => {
    if (!schoolId) return;
    if (!aiPrompt.trim()) {
      toast({ variant: 'destructive', title: 'Paste schedule text first' });
      return;
    }
    if ((periods || []).length > 0) {
      setAiImportModeOpen(true);
    } else {
      void runAiPeriodImport('add');
    }
  };

  const runAiPeriodImport = async (mode: 'add' | 'replace') => {
    if (!schoolId) return;
    if (!aiPrompt.trim()) {
      toast({ variant: 'destructive', title: 'Paste schedule text first' });
      return;
    }

    setAiImporting(true);
    try {
      if (mode === 'replace' && (periods || []).length > 0) {
        for (const p of periods || []) {
          await deleteDoc(doc(firestore, 'schools', schoolId, 'periods', p.id));
        }
      }

      const model = localStorage.getItem('arcade_ai_model') || 'gemini-2.5-flash';
      const res = await authFetch('/api/parse-schedule', {
        method: 'POST',
        body: JSON.stringify({ prompt: aiPrompt, model, schoolId }),
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

      toast({
        title: 'Periods imported',
        description:
          mode === 'replace'
            ? `Replaced with ${mapped.length} period(s) from AI.`
            : `Added ${mapped.length} period(s)${(periods || []).length > 0 ? ' alongside existing ones' : ''}.`,
      });
      setAiPrompt('');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to import periods', description: e?.message || String(e) });
    } finally {
      setAiImporting(false);
    }
  };

  const addPeriod = async () => {
    try {
      const start = normalizeTime(startTime);
      const end = normalizeTime(endTime);
      if (!start || !end) {
        toast({ variant: 'destructive', title: 'Invalid start/end time', description: 'Use formats like 8:00 AM and 8:45 AM.' });
        return;
      }
      const id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await setDoc(doc(firestore, 'schools', schoolId, 'periods', id), { id, label, startTime: start, endTime: end });
      toast({ title: 'Period added' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to add period', description: (e as Error).message });
    }
  };

  const updatePeriod = async (p: AttendanceScheduleSlot) => {
    try {
      const start = normalizeTime(p.startTime);
      const end = normalizeTime(p.endTime);
      if (!start || !end) {
        toast({ variant: 'destructive', title: 'Invalid time(s)', description: 'Use formats like 8:00 AM and 8:45 AM.' });
        return;
      }
      await updateDoc(doc(firestore, 'schools', schoolId, 'periods', p.id), { label: p.label, startTime: start, endTime: end });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to update period', description: (e as Error).message });
    }
  };

  const removePeriod = async (id: string) => {
    const ok = await confirm({
      title: 'Delete this period?',
      description: 'Class schedule slots assigned to this period will become unassigned. This can be restored by creating a new period with the same label.',
      confirmLabel: 'Delete period',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(firestore, 'schools', schoolId, 'periods', id));
      toast({ title: 'Period deleted' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to delete period', description: (e as Error).message });
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
        <AttendanceTimeZoneField
          schoolId={schoolId}
          getAttendanceConfig={getAttendanceConfig}
          setAttendanceConfig={setAttendanceConfig}
          enabled
          className="!space-y-2"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">AI import period times</Label>
        <textarea
          className="w-full rounded-xl border border-input bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Paste something like: Period 1 8:00 AM-8:45 AM, Period 2 8:50 AM-9:35 AM ..."
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          rows={4}
        />
        <div className="flex items-center gap-3">
          <Button onClick={requestAiPeriodImport} disabled={aiImporting || !aiPrompt.trim()} className="rounded-xl font-bold uppercase tracking-widest">
            {aiImporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
            Import
          </Button>
          <p className="text-xs text-muted-foreground">
            If you already have periods, you&apos;ll be asked to <span className="font-semibold">add</span> AI results or <span className="font-semibold">replace all</span>.
          </p>
        </div>
      </div>

      <AlertDialog open={aiImportModeOpen} onOpenChange={setAiImportModeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import AI periods</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-left text-sm text-muted-foreground">
                <p>
                  You already have <span className="font-semibold text-foreground">{(periods || []).length}</span> universal period
                  {(periods || []).length === 1 ? '' : 's'}. How should the AI result be applied?
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>
                    <span className="font-medium text-foreground">Add to existing</span> — keep current periods and append the new ones from AI.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Replace all</span> — delete every existing period, then save only what AI returns.
                  </li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:justify-end">
            <AlertDialogCancel disabled={aiImporting}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="secondary"
              className="sm:mr-auto"
              disabled={aiImporting}
              onClick={() => {
                setAiImportModeOpen(false);
                void runAiPeriodImport('add');
              }}
            >
              Add to existing
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={aiImporting}
              onClick={() => {
                setAiImportModeOpen(false);
                void runAiPeriodImport('replace');
              }}
            >
              Replace all
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label>Label</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} className="w-[160px]" />
        </div>
        <div className="space-y-1">
          <Label>Start</Label>
          <Input
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            placeholder="8:00 AM"
            className="w-[110px] font-mono"
          />
        </div>
        <div className="space-y-1">
          <Label>End</Label>
          <Input
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            placeholder="8:45 AM"
            className="w-[110px] font-mono"
          />
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
                value={formatTimeToAmPm(p.startTime)}
                onChange={(e) => {
                  const normalized = normalizeTime(e.target.value);
                  if (!normalized) return;
                  void updatePeriod({ ...p, startTime: normalized });
                }}
              />
              <span className="text-muted-foreground">–</span>
              <Input
                className="w-[110px] font-mono"
                value={formatTimeToAmPm(p.endTime)}
                onChange={(e) => {
                  const normalized = normalizeTime(e.target.value);
                  if (!normalized) return;
                  void updatePeriod({ ...p, endTime: normalized });
                }}
              />
              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removePeriod(p.id)}>
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
      setError('Invalid admin passcode.');
      setPasscode('');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-sm shadow-2xl border-t-4 border-primary">
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
                name="adminPasscode"
                placeholder="Passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="h-12 text-center text-lg font-mono tracking-widest"
                autoFocus
                autoComplete="current-password"
              />
              {error && <p className="text-sm text-destructive text-center font-bold">{error}</p>}
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
      router.replace('/login');
    }
  }, [isInitialized, loginState, router]);

  const handleAdminLogin = async (passcode: string): Promise<boolean> => {
    if (!schoolId) return false;
    return login('admin', { schoolId, passcode });
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
