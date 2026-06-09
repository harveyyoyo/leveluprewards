'use client';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState, useRef, ChangeEvent, Suspense, type ComponentType } from 'react';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useCollection, useMemoFirebase, useFunctions } from '@/firebase';
import { useAdminDashboardData } from './hooks/useAdminDashboardData';
import { useStudentRoster } from './hooks/useStudentRoster';
import { useAdminAttendance } from './hooks/useAdminAttendance';
import { useSchoolLogoUpload } from './hooks/useSchoolLogoUpload';
import { useAuthFetch } from '@/lib/authFetch';
import { getArcadeAiModelFromStorage } from '@/lib/aiModelPreference';
import { collection, doc, updateDoc, setDoc, deleteDoc, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import {
   Users, Gift, BookOpen, Trash2, Edit, UploadCloud, Printer, LayoutDashboard,
   Settings, History, Award, CheckCircle, Tag, Trophy, ArrowRight, Loader2, Play, ShieldCheck,
   User, Upload, Download, Activity, Zap, Clock, Palette, Wand2,
   FileText, Bell, Target, Megaphone, Monitor, ChevronDown, X, Plug, GraduationCap, Home, Ticket, Dices, DoorOpen,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAdminGooglePasscodeBypass } from '@/hooks/useAdminGooglePasscodeBypass';
import type { Student, Prize, Coupon, Category, Class, House, Teacher, Achievement, Badge, AttendanceScheduleSlot, TeacherBudgetPeriod, TeacherPersonnelRole, StaffAccount, LibraryItem, LibraryItemInput } from '@/lib/types';
import { isLeadershipPersonnel, leadershipPersonnelLabel, normalizeTeacherPersonnelRole } from '@/lib/teacherPersonnelRole';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StudentModal } from '@/components/student/StudentModal';
import { AdminFaceEnrollmentPanel } from '@/components/admin/AdminFaceEnrollmentPanel';
import { AttendanceTimeZoneField } from '@/components/attendance/AttendanceTimeZoneField';
import { PrizeModal } from '@/components/prizes/PrizeModal';
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
import { StudentActivityModal } from '@/components/student/StudentActivityModal';
import DynamicIcon from '@/components/DynamicIcon';
import { Switch } from '@/components/ui/switch';
import { cn, getStudentNickname } from '@/lib/utils';
import { obfuscateField, deobfuscateField } from '@/lib/crypto';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSettings, type Settings as AppSettings } from '@/components/providers/SettingsProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { ImageCropper } from '@/components/admin/ImageCropper';
import { TabWalkthroughProvider } from '@/components/tabWalkthrough/TabWalkthroughContext';
import dynamic from 'next/dynamic';
import { CategoryModal } from '@/components/admin/CategoryModal';
import { LibraryItemModal } from '@/components/library/LibraryItemModal';
import { normalizeLibraryUpc } from '@/lib/library/libraryScanCode';
import { syncSchoolStaffDirectory } from '@/lib/syncSchoolStaffDirectory';
import { StudentIdCard } from '@/components/student/StudentIdCard';
import { IdCardPrintSetupDialog } from '@/components/admin/IdCardPrintSetupDialog';
import { StaffIdCardPreviewDialog } from '@/components/staff/StaffIdCardPreviewDialog';
import type { StaffIdCardSubject } from '@/lib/staff/staffIdCardSubject';
import { AdminMainTabsList } from '@/components/admin/AdminMainTabsList';
import { StaffPortalAddFeatureTabsMenu } from '@/components/staff/StaffPortalAddFeatureTabsMenu';
import { StaffPortalSidebarTabRow } from '@/components/staff/StaffPortalSidebarTabRow';
import { StaffPortalShellFrame } from '@/components/staff/StaffPortalShellFrame';
import { StaffPortalContentWidth } from '@/components/staff/StaffPortalContentWidth';
import { StaffPortalWorkspace } from '@/components/staff/StaffPortalWorkspace';
import { StaffPortalTeacherToolNotice } from '@/components/staff/StaffPortalTeacherToolNotice';
import { StaffPortalLayoutProvider } from '@/components/staff/StaffPortalLayoutContext';
import {
  staffPortalAddOnTabTriggerClassName,
  staffPortalSidebarRailClassName,
  staffPortalTabTriggerClassName,
  staffPortalWorkspaceMainClassName,
} from '@/components/staff/staffPortalNavStyles';
import { normalizeStaffPortalTabValue, normalizeStaffPortalTabValues, staffPortalAdminAddOnIsOn, staffPortalAllAddOnTabValues, staffPortalCoreTabs, staffPortalMergePinnedAddOnValues, staffPortalOrderMainTabs, staffPortalSortPinnedTabDefs, staffPortalSortTabs } from '@/lib/staffPortal';
import { StaffPortalWelcomeTab } from '@/components/staff/StaffPortalWelcomeTab';
import { prizeIsListed } from '@/lib/prizes/prizeUtils';
import { StaffPortalDocumentTitle } from '@/components/staff/StaffPortalDocumentTitle';
import { AchievementModal } from '@/components/badges/AchievementModal';
import { BadgeModal } from '@/components/badges/BadgeModal';

const ThemeGeneratorModal = dynamic(
  () => import('@/components/themes/ThemeGeneratorModal').then((m) => m.ThemeGeneratorModal),
  { ssr: false },
);
import { addAchievement, updateAchievement, deleteAchievement, addBadge, updateBadge, deleteBadge, addStaffAccount, updateStaffAccount, deleteStaffAccount, ensureDefaultAttendanceRules } from '@/lib/db';
import {
  importParsedSchoolSnapshot,
  type ParsedSchoolSnapshot,
  type SchoolSnapshotImportResult,
} from '@/lib/schoolDataImport';
import { SAMPLE_BADGES, getSampleCategoryBadges } from '@/lib/sampleBadges';

// The Students and Library tabs are eager. Other admin tabs are
// code-split with `next/dynamic` so its chunk is only fetched when the admin
// actually clicks into it — this dramatically reduces the initial admin JS.
import { AdminStudentsTab } from './sections/AdminStudentsTab';
import { AdminLibraryTab } from './sections/AdminLibraryTab';
import { budgetWindowKeyForDate } from '@/lib/teacherBudget';
import { resolveIdCardPrintJobOptions } from '@/lib/idCardPrintCatalog';
import {
  adminAddOnTabMenuItemStyle,
  adminAddOnTabTriggerStyle,
  adminPerTabAppearanceProps,
  isAdminAddOnTabValue,
} from '@/lib/adminTabColorScheme';
import { ADMIN_SETTINGS_TAB_VALUES } from '@/components/settings/settingsModalConfig';
import { useIntroTourStaffTabListener } from '@/lib/introTourStaffTab';

import {
  AdminAttendanceTab,
  AdminBadgesTab,
  AdminBonusPointsTab,
  AdminBrandingTab,
  AdminCategoriesTab,
  AdminClassesTab,
  AdminClassroomTab,
  AdminDisplaysTab,
  AdminGoalsTab,
  AdminHousesTab,
  AdminIntegrationsTab,
  AdminNotificationsTab,
  AdminPrizesTab,
  AdminRaffleTab,
  AdminRecessTab,
  AdminReportsTab,
  AdminStatsTab,
  AdminStudentPortalTab,
  AdminTeachersTab,
} from './adminTabDynamics';
import { getReadableErrorMessage } from '@/lib/errorMessage';
import { BulkRosterSetupDialog } from '@/components/admin/BulkRosterSetupDialog';
import { StudentCsvColumnMapDialog } from '@/components/student/StudentCsvColumnMapDialog';
import { guessStudentCsvColumnMap, parseStudentCsvToMatrix } from '@/lib/students/studentCsvColumnMap';
import { AdminPrizeDeskDashboard } from './AdminPrizeDeskDashboard';

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

function describeSnapshotImport(result: SchoolSnapshotImportResult): {
  title: string;
  description: string;
  variant: 'default' | 'destructive';
} {
  const lines: string[] = [];
  let totalAdded = 0;
  let anyErr = false;
  const rows: [string, keyof SchoolSnapshotImportResult][] = [
    ['Classes', 'classes'],
    ['Teachers', 'teachers'],
    ['Students', 'students'],
    ['Periods', 'periods'],
    ['Point categories', 'categories'],
    ['Prizes', 'prizes'],
    ['Desk staff', 'staffAccounts'],
  ];
  for (const [label, key] of rows) {
    const r = result[key];
    if (!r) continue;
    totalAdded += r.success;
    if (r.errors.length) anyErr = true;
    lines.push(`${label}: +${r.success}${r.failed > 0 ? ` (${r.failed} skipped)` : ''}`);
    const errPreview = r.errors.slice(0, 5).join('\n');
    if (errPreview) lines.push(errPreview);
  }
  const description = lines.join('\n') || 'Nothing was written.';
  const title = totalAdded > 0 ? 'School data imported' : 'Nothing new imported';
  const variant =
    totalAdded === 0 && anyErr ? 'destructive' : 'default';
  return { title, description, variant };
}

const fittedAdminTabClassName =
  'transition-opacity duration-150 mt-0 w-full min-w-0 flex-col pb-6 focus-visible:outline-none';
const scrollingAdminTabClassName = fittedAdminTabClassName;

function AdminDashboardSkeleton() {
  return (
    <div
      className="mx-auto flex h-full min-h-0 min-w-0 w-full max-w-7xl flex-col gap-6 p-4 md:p-8"
      aria-busy="true"
      aria-hidden="true"
    >
      <p className="sr-only" role="status">
        Loading admin dashboard…
      </p>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
        <Skeleton className="h-10 w-40 shrink-0 rounded-xl" />
      </div>

      <div
        className="hidden h-[3.25rem] w-full flex-nowrap items-center justify-center gap-2 overflow-hidden rounded-2xl border bg-muted/50 p-2 shadow-sm md:flex"
        aria-hidden
      >
        <Skeleton className="h-10 w-[5.5rem] rounded-xl" />
        <Skeleton className="h-10 w-20 rounded-xl" />
        <Skeleton className="h-10 w-24 rounded-xl" />
        <Skeleton className="h-10 w-20 rounded-xl" />
        <Skeleton className="h-10 w-[4.5rem] rounded-xl" />
        <Skeleton className="ml-1 h-10 w-28 rounded-xl" />
      </div>
      <Skeleton className="h-12 w-full rounded-xl md:hidden" aria-hidden />

      <Card className="w-full overflow-hidden border-t-4 border-primary shadow-md">
        <CardHeader className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-7 w-32" />
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
            <Skeleton className="h-10 w-32 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="hidden h-10 w-36 rounded-xl sm:block" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-6 pt-0">
          <Skeleton className="h-11 w-full rounded-full" />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Skeleton className="h-11 w-full rounded-xl sm:w-[180px]" />
            <Skeleton className="h-11 w-full rounded-xl sm:w-[180px]" />
          </div>
          <Skeleton className="h-10 w-full rounded-xl" />
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function AdminDashboardInner() {
  const {
    loginState,
    schoolId: ctxSchoolId, setCouponsToPrint, deleteStudent,
    addClass, updateClass, deleteClass,
    addHouse, updateHouse, deleteHouse,
    deleteCategory, addCategory, updateCategory,
    addTeacher, updateTeacher, deleteTeacher,
    addPrize, updatePrize, deletePrize, uploadStudents, uploadClassesFromCsv, uploadTeachersFromCsv, setStudentsToPrint, setStaffIdCardsToPrint,
    updateStudent,
    achievements, achievementsLoading,
    badges, badgesLoading,
    purgeStudentProgress,
    getAttendanceConfig,
    setAttendanceConfig,
    listAttendanceLog,
    getTeacherAttendanceConfig,
    setTeacherAttendanceConfig,
    listTeacherAttendanceLog,
    deleteCoupon,
    deleteCoupons,
  } = useAppContext();
  const params = useParams<{ schoolId?: string }>();
  const schoolId = (typeof params?.schoolId === 'string' && params.schoolId.trim())
    ? params.schoolId.trim().toLowerCase()
    : ctxSchoolId;
  const searchParams = useSearchParams();
  const functions = useFunctions();
  const { toast } = useToast();
  const confirm = useConfirm();
  const playSound = useArcadeSound();
  const authFetch = useAuthFetch();
  const studentCsvInputRef = useRef<HTMLInputElement>(null);
  const [csvColumnMapOpen, setCsvColumnMapOpen] = useState(false);
  const [csvColumnMapText, setCsvColumnMapText] = useState('');
  const [csvImportBusy, setCsvImportBusy] = useState(false);
  const { settings, updateSettings } = useSettings();
  const couponsTabMigratedRef = useRef(false);
  const displaysTabMigratedRef = useRef(false);

  useEffect(() => {
    if (couponsTabMigratedRef.current) return;
    const pinned = settings.adminPinnedAddOnTabs || [];
    const order = settings.adminMainTabOrder || [];
    const hadCouponsTab = pinned.includes('coupons') || order.includes('coupons');
    if (!hadCouponsTab) {
      couponsTabMigratedRef.current = true;
      return;
    }
    couponsTabMigratedRef.current = true;
    const mapTab = (v: string) => (v === 'coupons' ? 'categories' : v);
    const nextPinned = Array.from(new Set(pinned.map(mapTab)));
    const nextOrder = Array.from(new Set(order.map(mapTab)));
    updateSettings({
      adminPinnedAddOnTabs: nextPinned,
      adminMainTabOrder: nextOrder,
    });
  }, [settings.adminMainTabOrder, settings.adminPinnedAddOnTabs, updateSettings]);

  useEffect(() => {
    if (displaysTabMigratedRef.current) return;
    const pinned = settings.adminPinnedAddOnTabs || [];
    const order = settings.adminMainTabOrder || [];
    const hidden = settings.adminHiddenAddOnTabs || [];
    const hadLegacyDisplaysTab =
      pinned.some((v) => v === 'bulletinboard' || v === 'smart-screen') ||
      order.some((v) => v === 'bulletinboard' || v === 'smart-screen') ||
      hidden.some((v) => v === 'bulletinboard' || v === 'smart-screen');
    if (!hadLegacyDisplaysTab) {
      displaysTabMigratedRef.current = true;
      return;
    }
    displaysTabMigratedRef.current = true;
    updateSettings({
      adminPinnedAddOnTabs: normalizeStaffPortalTabValues(pinned),
      adminMainTabOrder: normalizeStaffPortalTabValues(order),
      adminHiddenAddOnTabs: normalizeStaffPortalTabValues(hidden),
    });
  }, [
    settings.adminHiddenAddOnTabs,
    settings.adminMainTabOrder,
    settings.adminPinnedAddOnTabs,
    updateSettings,
  ]);

  // All Firestore reads the dashboard needs live in a single hook so this
  // component only has to worry about orchestration and UI state.
  const {
    firestore,
    students, studentsLoading, studentsError,
    classes, classesLoading, classesError,
    houses, housesLoading, housesError,
    teachers, teachersLoading, teachersError,
    staffAccounts, staffAccountsLoading, staffAccountsError,
    categories, categoriesLoading, categoriesError,
    library, libraryLoading, libraryError,
    prizes, prizesLoading, prizesError,
    coupons, couponsLoading, couponsError,
    attendancePeriods, attendancePeriodsLoading,
    schoolData, schoolDocRef,
    appConfigGlobal,
  } = useAdminDashboardData(schoolId, settings.payLibrary, settings.enableHouses);

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
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherPhone, setNewTeacherPhone] = useState('');
  const [newTeacherPersonnelRole, setNewTeacherPersonnelRole] = useState<TeacherPersonnelRole>('teacher');
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [faceTrainingOnlyStudent, setFaceTrainingOnlyStudent] = useState<Student | null>(null);
  const [isPrizeModalOpen, setIsPrizeModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [editingLibraryItem, setEditingLibraryItem] = useState<LibraryItem | null>(null);
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

  const [activeMainTab, setActiveMainTab] = useState('welcome');

  const handleIntroTourStaffTab = useCallback((tabValue: string) => {
    setActiveMainTab(tabValue);
  }, []);
  useIntroTourStaffTabListener(handleIntroTourStaffTab);

  useEffect(() => {
    const tab = normalizeStaffPortalTabValue(searchParams.get('tab')?.trim().toLowerCase() || '');
    if (tab && ADMIN_SETTINGS_TAB_VALUES.has(tab)) {
      setActiveMainTab(tab);
    }
  }, [searchParams]);

  type AdminAddOnTabDef = {
    value: string;
    label: string;
    icon: LucideIcon;
    /** Whether this additional feature is enabled. */
    isOn: (s: typeof settings) => boolean;
    enable: () => void;
    disable: () => void;
  };

  const addOnTabDefs = useMemo<AdminAddOnTabDef[]>(() => {
    const hiddenNow = settings.adminHiddenAddOnTabs || [];
    const addHidden = (v: string) => Array.from(new Set([...hiddenNow, v]));
    const removeHidden = (v: string) => hiddenNow.filter((x) => x !== v);
    const pinnedNow = settings.adminPinnedAddOnTabs || [];
    const removePinned = (v: string) => pinnedNow.filter((x) => x !== v);

    return [
      {
        value: 'insights',
        label: 'Analytics',
        icon: Activity,
        isOn: (s) => staffPortalAdminAddOnIsOn(s, 'insights'),
        enable: () => updateSettings({ enableAdminAnalytics: true, adminHiddenAddOnTabs: removeHidden('insights') }),
        disable: () =>
          updateSettings({
            enableAdminAnalytics: false,
            adminHiddenAddOnTabs: removeHidden('insights'),
            adminPinnedAddOnTabs: removePinned('insights'),
          }),
      },
      {
        value: 'attendance',
        label: 'Attendance',
        icon: Clock,
        isOn: (s) => staffPortalAdminAddOnIsOn(s, 'attendance'),
        enable: () =>
          updateSettings({
            payAttendance: true,
            enableAttendance: true,
            enableClassSignIn: true,
            enableBathroomTimer: true,
            adminHiddenAddOnTabs: removeHidden('attendance'),
          }),
        disable: () =>
          updateSettings({
            enableAttendance: false,
            enableClassSignIn: false,
            adminHiddenAddOnTabs: removeHidden('attendance'),
            adminPinnedAddOnTabs: removePinned('attendance'),
          }),
      },
      {
        value: 'displays',
        label: 'Displays',
        icon: Monitor,
        isOn: (s) => staffPortalAdminAddOnIsOn(s, 'displays'),
        enable: () =>
          updateSettings({
            bulletinEnabled: true,
            smartScreenEnabled: true,
            enableClassLeaderboard: true,
            adminHiddenAddOnTabs: removeHidden('displays'),
          }),
        disable: () =>
          updateSettings({
            bulletinEnabled: false,
            smartScreenEnabled: false,
            enableClassLeaderboard: false,
            adminHiddenAddOnTabs: removeHidden('displays'),
            adminPinnedAddOnTabs: removePinned('displays'),
          }),
      },
      {
        value: 'library',
        label: 'Library',
        icon: BookOpen,
        isOn: (s) => staffPortalAdminAddOnIsOn(s, 'library'),
        enable: () => updateSettings({ payLibrary: true, adminHiddenAddOnTabs: removeHidden('library') }),
        disable: () => updateSettings({ payLibrary: false, adminHiddenAddOnTabs: removeHidden('library'), adminPinnedAddOnTabs: removePinned('library') }),
      },
      {
        value: 'bonuspoints',
        label: 'Bonus Points',
        icon: Trophy,
        isOn: (s) => !!s.enableAchievements,
        enable: () => updateSettings({ enableAchievements: true, adminHiddenAddOnTabs: removeHidden('bonuspoints') }),
        disable: () => updateSettings({ enableAchievements: false, adminHiddenAddOnTabs: removeHidden('bonuspoints'), adminPinnedAddOnTabs: removePinned('bonuspoints') }),
      },
      {
        value: 'category-badges',
        label: 'Badges',
        icon: Award,
        isOn: (s) => staffPortalAdminAddOnIsOn(s, 'category-badges'),
        enable: () => updateSettings({ enableBadges: true, adminHiddenAddOnTabs: removeHidden('category-badges') }),
        disable: () => updateSettings({ enableBadges: false, adminHiddenAddOnTabs: removeHidden('category-badges'), adminPinnedAddOnTabs: removePinned('category-badges') }),
      },
      {
        value: 'goals',
        label: 'Goals',
        icon: Target,
        isOn: (s) => staffPortalAdminAddOnIsOn(s, 'goals'),
        enable: () => updateSettings({ enableGoals: true, adminHiddenAddOnTabs: removeHidden('goals') }),
        disable: () => updateSettings({ enableGoals: false, adminHiddenAddOnTabs: removeHidden('goals'), adminPinnedAddOnTabs: removePinned('goals') }),
      },
      {
        value: 'raffle',
        label: 'Raffle',
        icon: Dices,
        isOn: (s) => staffPortalAdminAddOnIsOn(s, 'raffle'),
        enable: () => updateSettings({ enableWeeklyRaffle: true, adminHiddenAddOnTabs: removeHidden('raffle') }),
        disable: () =>
          updateSettings({
            enableWeeklyRaffle: false,
            adminHiddenAddOnTabs: removeHidden('raffle'),
            adminPinnedAddOnTabs: removePinned('raffle'),
          }),
      },
      {
        value: 'houses',
        label: 'Houses',
        icon: Home,
        isOn: (s) => staffPortalAdminAddOnIsOn(s, 'houses'),
        enable: () => updateSettings({ enableHouses: true, adminHiddenAddOnTabs: removeHidden('houses') }),
        disable: () =>
          updateSettings({
            enableHouses: false,
            adminHiddenAddOnTabs: removeHidden('houses'),
            adminPinnedAddOnTabs: removePinned('houses'),
          }),
      },
      {
        value: 'recess',
        label: 'Recess',
        icon: DoorOpen,
        isOn: (s) => s.enableRecess !== false,
        enable: () =>
          updateSettings({
            enableRecess: true,
            recessStudentKioskEnabled: true,
            adminHiddenAddOnTabs: removeHidden('recess'),
          }),
        disable: () =>
          updateSettings({
            enableRecess: false,
            recessStudentKioskEnabled: false,
            adminHiddenAddOnTabs: removeHidden('recess'),
            adminPinnedAddOnTabs: removePinned('recess'),
          }),
      },
      {
        value: 'notifications',
        label: 'Notifications',
        icon: Bell,
        isOn: (s) => staffPortalAdminAddOnIsOn(s, 'notifications'),
        enable: () => updateSettings({ enableNotifications: true, adminHiddenAddOnTabs: removeHidden('notifications') }),
        disable: () => updateSettings({ enableNotifications: false, adminHiddenAddOnTabs: removeHidden('notifications'), adminPinnedAddOnTabs: removePinned('notifications') }),
      },
      {
        value: 'branding',
        label: 'Branding',
        icon: Palette,
        isOn: (s) => staffPortalAdminAddOnIsOn(s, 'branding'),
        enable: () => updateSettings({ adminHiddenAddOnTabs: removeHidden('branding') }),
        disable: () => updateSettings({ adminHiddenAddOnTabs: addHidden('branding'), adminPinnedAddOnTabs: removePinned('branding') }),
      },
      {
        value: 'integrations',
        label: 'Integrations',
        icon: Plug,
        isOn: (s) => staffPortalAdminAddOnIsOn(s, 'integrations'),
        enable: () => updateSettings({ adminHiddenAddOnTabs: removeHidden('integrations') }),
        disable: () =>
          updateSettings({
            adminHiddenAddOnTabs: addHidden('integrations'),
            adminPinnedAddOnTabs: removePinned('integrations'),
          }),
      },
      {
        value: 'student-portal',
        label: 'Student home portal',
        icon: GraduationCap,
        /** Tab visibility only — portal on/off is the switch inside the tab (`enableStudentPortal`). */
        isOn: (s) => staffPortalAdminAddOnIsOn(s, 'student-portal'),
        enable: () => updateSettings({ adminHiddenAddOnTabs: removeHidden('student-portal') }),
        disable: () =>
          updateSettings({
            adminHiddenAddOnTabs: addHidden('student-portal'),
            adminPinnedAddOnTabs: removePinned('student-portal'),
          }),
      },
    ];
  }, [settings.adminHiddenAddOnTabs, settings.adminPinnedAddOnTabs, updateSettings]);

  /** Recover from older builds that pinned Houses without setting enableHouses. */
  useEffect(() => {
    const pinned = settings.adminPinnedAddOnTabs || [];
    if (pinned.includes('houses') && !settings.enableHouses) {
      updateSettings({ enableHouses: true });
    }
  }, [settings.adminPinnedAddOnTabs, settings.enableHouses, updateSettings]);

  /** Publish teachers + desk staff (including librarians) to the portal staff sign-in list. */
  useEffect(() => {
    if (!firestore || !schoolId || teachersLoading || staffAccountsLoading) return;
    if (!teachers || !staffAccounts) return;
    void syncSchoolStaffDirectory(firestore, schoolId, teachers, staffAccounts).catch(() => {
      // Best effort — staff can still sign in via direct librarian URL if needed.
    });
  }, [firestore, schoolId, teachers, staffAccounts, teachersLoading, staffAccountsLoading]);

  const visibleAddOnTabs = useMemo(() => {
    return addOnTabDefs.filter((t) => t.isOn(settings));
  }, [addOnTabDefs, settings]);

  const adminWelcomeStats = useMemo(
    () => ({
      studentCount: students?.length ?? 0,
      classCount: classes?.length ?? 0,
      staffCount: (teachers?.length ?? 0) + (staffAccounts?.length ?? 0),
      activePrizeCount: (prizes ?? []).filter(prizeIsListed).length,
    }),
    [students, classes, teachers, staffAccounts, prizes],
  );

  const pinnedAddOnTabs = useMemo(() => {
    const pinned = settings.adminPinnedAddOnTabs || [];
    if (pinned.length === 0) return [];
    const byValue = new Map(visibleAddOnTabs.map((t) => [t.value, t]));
    return staffPortalSortPinnedTabDefs(pinned, byValue);
  }, [settings.adminPinnedAddOnTabs, visibleAddOnTabs]);

  type AdminMainTabDef = {
    value: string;
    label: string;
    icon: ComponentType<{ className?: string }>;
    title?: string;
  };

  const orderedMainTabs = useMemo<AdminMainTabDef[]>(() => {
    const base: AdminMainTabDef[] = staffPortalCoreTabs('admin', settings).map((t) => ({
      value: t.value,
      label: t.label,
      icon: t.icon,
      title: t.title,
    }));

    const pinnedExtras: AdminMainTabDef[] = pinnedAddOnTabs.map((t) => ({
      value: t.value,
      label: t.label,
      icon: t.icon,
      title: `${t.label} (pinned from Add more)`,
    }));

    const available = [...base, ...pinnedExtras];

    return staffPortalOrderMainTabs(available, settings.adminMainTabOrder);
  }, [pinnedAddOnTabs, settings]);

  const adminTabTriggerClassName = staffPortalTabTriggerClassName();
  const adminPerTabColors = !!settings.adminPerTabColorScheme;
  const activeTabUsesAddOnColors = adminPerTabColors && isAdminAddOnTabValue(activeMainTab);
  const adminTabAppearance = useMemo(
    () => adminPerTabAppearanceProps(settings, activeMainTab, activeTabUsesAddOnColors),
    [settings, activeMainTab, activeTabUsesAddOnColors],
  );
  const adminAddOnTabMenuStyle = useCallback(
    (tabValue: string) =>
      adminPerTabColors ? adminAddOnTabMenuItemStyle(tabValue, settings) : undefined,
    [adminPerTabColors, settings],
  );

  const mobileMoreTabOptions = useMemo(() => {
    const mainTabValues = new Set(orderedMainTabs.map((t) => t.value));
    return staffPortalSortTabs(addOnTabDefs.filter((t) => !mainTabValues.has(t.value)));
  }, [addOnTabDefs, orderedMainTabs]);

  const adminCoreTabValues = useMemo(
    () => new Set(staffPortalCoreTabs('admin', settings).map((t) => t.value)),
    [settings],
  );

  const adminPinnedAddOnSet = useMemo(
    () => new Set(settings.adminPinnedAddOnTabs || []),
    [settings.adminPinnedAddOnTabs],
  );

  const isRemovableAdminAddOnTab = (tabValue: string) =>
    adminPinnedAddOnSet.has(tabValue) && !adminCoreTabValues.has(tabValue);

  const unpinAdminAddOnTab = (tabValue: string) => {
    const pinnedNow = settings.adminPinnedAddOnTabs || [];
    if (!pinnedNow.includes(tabValue)) return;
    updateSettings({ adminPinnedAddOnTabs: pinnedNow.filter((x) => x !== tabValue) });
    if (activeMainTab === tabValue) {
      setActiveMainTab('welcome');
    }
  };

  const handleMobileMainTabChange = (value: string) => {
    if (orderedMainTabs.some((t) => t.value === value)) {
      setActiveMainTab(value);
      return;
    }

    if (addOnTabDefs.some((t) => t.value === value)) {
      toggleAddOnTab(value, true);
      return;
    }

    setActiveMainTab(value);
  };

  const persistMainTabOrder = (next: string[]) => {
    // Keep storage small + resilient (no unknown values / no duplicates).
    const available = new Set(orderedMainTabs.map((t) => t.value));
    const seen = new Set<string>();
    const cleaned = next.filter((v) => available.has(v) && !seen.has(v) && (seen.add(v), true));
    updateSettings({ adminMainTabOrder: cleaned });
  };

  // Extra-tab ordering is no longer used; feature tabs are added directly into the main row.
  const persistExtraTabOrder = (_next: string[]) => {};

  const moveInArray = <T,>(arr: T[], from: number, to: number) => {
    if (from === to) return arr;
    const next = arr.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  };

  const draggingMainTabValueRef = useRef<string | null>(null);
  const draggingAddOnTabValueRef = useRef<string | null>(null);

  const pinAddOnTab = (value: string) => {
    const def = addOnTabDefs.find((t) => t.value === value);
    if (!def) return;
    if (!def.isOn(settings)) return;
    const now = settings.adminPinnedAddOnTabs || [];
    if (now.includes(value)) return;
    updateSettings({
      adminPinnedAddOnTabs: staffPortalMergePinnedAddOnValues(now, value),
    });
  };

  const addOnTabEnablePatch = (tabValue: string): Partial<AppSettings> => {
    const patch: Partial<AppSettings> = {};
    switch (tabValue) {
      case 'insights':
        patch.enableAdminAnalytics = true;
        break;
      case 'attendance':
        patch.payAttendance = true;
        patch.enableAttendance = true;
        patch.enableClassSignIn = true;
        break;
      case 'displays':
        patch.bulletinEnabled = true;
        patch.smartScreenEnabled = true;
        patch.enableClassLeaderboard = true;
        break;
      case 'library':
        patch.payLibrary = true;
        break;
      case 'bonuspoints':
        patch.enableAchievements = true;
        break;
      case 'category-badges':
        patch.enableBadges = true;
        break;
      case 'goals':
        patch.enableGoals = true;
        break;
      case 'raffle':
        patch.enableWeeklyRaffle = true;
        break;
      case 'houses':
        patch.enableHouses = true;
        break;
      case 'recess':
        patch.enableRecess = true;
        patch.recessStudentKioskEnabled = true;
        break;
      case 'notifications':
        patch.enableNotifications = true;
        break;
      default:
        break;
    }
    return patch;
  };

  const toggleAddOnTab = (tabValue: string, enabled: boolean) => {
    const def = addOnTabDefs.find((t) => t.value === tabValue);
    if (!def) return;

    const hiddenNow = settings.adminHiddenAddOnTabs || [];
    const pinnedNow = settings.adminPinnedAddOnTabs || [];
    
    const patch: Partial<AppSettings> = {};

    if (enabled) {
      patch.adminHiddenAddOnTabs = hiddenNow.filter((x) => x !== tabValue);
      patch.adminPinnedAddOnTabs = staffPortalMergePinnedAddOnValues(pinnedNow, tabValue);
      Object.assign(patch, addOnTabEnablePatch(tabValue));
      
      updateSettings(patch);
      setActiveMainTab(tabValue);
    } else {
      patch.adminPinnedAddOnTabs = pinnedNow.filter((x) => x !== tabValue);
      let nextHidden = [...hiddenNow];
      
      switch (tabValue) {
        case 'insights':
          patch.enableAdminAnalytics = false;
          nextHidden = nextHidden.filter((x) => x !== 'insights');
          break;
        case 'attendance':
          patch.payAttendance = false;
          patch.enableAttendance = false;
          patch.enableClassSignIn = false;
          nextHidden = nextHidden.filter((x) => x !== 'attendance');
          break;
        case 'displays':
          patch.bulletinEnabled = false;
          patch.smartScreenEnabled = false;
          patch.enableClassLeaderboard = false;
          nextHidden = nextHidden.filter((x) => x !== 'displays');
          break;
        case 'library':
          patch.payLibrary = false;
          nextHidden = nextHidden.filter((x) => x !== 'library');
          break;
        case 'bonuspoints':
          patch.enableAchievements = false;
          nextHidden = nextHidden.filter((x) => x !== 'bonuspoints');
          break;
        case 'category-badges':
          patch.enableBadges = false;
          nextHidden = nextHidden.filter((x) => x !== 'category-badges');
          break;
        case 'goals':
          patch.enableGoals = false;
          nextHidden = nextHidden.filter((x) => x !== 'goals');
          break;
        case 'raffle':
          patch.enableWeeklyRaffle = false;
          nextHidden = nextHidden.filter((x) => x !== 'raffle');
          break;
        case 'houses':
          patch.enableHouses = false;
          nextHidden = nextHidden.filter((x) => x !== 'houses');
          break;
        case 'recess':
          patch.enableRecess = false;
          patch.recessStudentKioskEnabled = false;
          nextHidden = nextHidden.filter((x) => x !== 'recess');
          break;
        case 'notifications':
          patch.enableNotifications = false;
          nextHidden = nextHidden.filter((x) => x !== 'notifications');
          break;
        case 'student-portal':
          if (!nextHidden.includes('student-portal')) nextHidden = [...nextHidden, 'student-portal'];
          break;
        case 'integrations':
          if (!nextHidden.includes('integrations')) nextHidden = [...nextHidden, 'integrations'];
          break;
        case 'branding':
          if (!nextHidden.includes('branding')) nextHidden = [...nextHidden, 'branding'];
          break;
        default:
          break;
      }
      
      patch.adminHiddenAddOnTabs = nextHidden;
      updateSettings(patch);
      
      if (activeMainTab === tabValue) {
        setActiveMainTab('welcome');
      }
    }
  };

  /** Single merged write — looping `setAddOnEnabled` + `pinAddOnTab` overwrote `adminHiddenAddOnTabs` / pins (stale closures). */
  const enableAllAddOnTabs = () => {
    const toEnable = addOnTabDefs;
    if (toEnable.length === 0) return;

    const hiddenNow = settings.adminHiddenAddOnTabs || [];
    const pinnedNow = settings.adminPinnedAddOnTabs || [];
    const valueSet = new Set(toEnable.map((d) => d.value));
    const nextHidden = hiddenNow.filter((v) => !valueSet.has(v));
    const nextPinned = staffPortalAllAddOnTabValues(toEnable);

    const patch: Partial<AppSettings> = {
      adminHiddenAddOnTabs: nextHidden,
      adminPinnedAddOnTabs: nextPinned,
    };

    for (const def of toEnable) {
      switch (def.value) {
        case 'insights':
          patch.enableAdminAnalytics = true;
          break;
        case 'attendance':
          patch.payAttendance = true;
          patch.enableAttendance = true;
          patch.enableClassSignIn = true;
          break;
        case 'displays':
          patch.bulletinEnabled = true;
          patch.smartScreenEnabled = true;
          patch.enableClassLeaderboard = true;
          break;
        case 'library':
          patch.payLibrary = true;
          break;
        case 'bonuspoints':
          patch.enableAchievements = true;
          break;
        case 'category-badges':
          patch.enableBadges = true;
          break;
        case 'goals':
          patch.enableGoals = true;
          break;
        case 'raffle':
          patch.enableWeeklyRaffle = true;
          break;
        case 'houses':
          patch.enableHouses = true;
          break;
        case 'notifications':
          patch.enableNotifications = true;
          break;
        case 'student-portal':
        case 'integrations':
        case 'branding':
          break;
        default:
          break;
      }
    }

    updateSettings(patch);
  };

  /** Single merged write — same stale-closure issue as enable-all. */
  const disableAllAddOnTabs = () => {
    const toDisable = addOnTabDefs.filter((def) => def.isOn(settings));
    if (toDisable.length === 0) return;

    let nextHidden = [...(settings.adminHiddenAddOnTabs || [])];
    const offIds = new Set(toDisable.map((d) => d.value));
    const nextPinned = (settings.adminPinnedAddOnTabs || []).filter((v) => !offIds.has(v));

    const patch: Partial<AppSettings> = {
      adminPinnedAddOnTabs: nextPinned,
    };

    for (const def of toDisable) {
      switch (def.value) {
        case 'insights':
          patch.enableAdminAnalytics = false;
          nextHidden = nextHidden.filter((x) => x !== 'insights');
          break;
        case 'attendance':
          patch.payAttendance = false;
          patch.enableAttendance = false;
          patch.enableClassSignIn = false;
          nextHidden = nextHidden.filter((x) => x !== 'attendance');
          break;
        case 'displays':
          patch.bulletinEnabled = false;
          patch.smartScreenEnabled = false;
          patch.enableClassLeaderboard = false;
          nextHidden = nextHidden.filter((x) => x !== 'displays');
          break;
        case 'library':
          patch.payLibrary = false;
          nextHidden = nextHidden.filter((x) => x !== 'library');
          break;
        case 'bonuspoints':
          patch.enableAchievements = false;
          nextHidden = nextHidden.filter((x) => x !== 'bonuspoints');
          break;
        case 'category-badges':
          patch.enableBadges = false;
          nextHidden = nextHidden.filter((x) => x !== 'category-badges');
          break;
        case 'goals':
          patch.enableGoals = false;
          nextHidden = nextHidden.filter((x) => x !== 'goals');
          break;
        case 'raffle':
          patch.enableWeeklyRaffle = false;
          nextHidden = nextHidden.filter((x) => x !== 'raffle');
          break;
        case 'houses':
          patch.enableHouses = false;
          nextHidden = nextHidden.filter((x) => x !== 'houses');
          break;
        case 'recess':
          patch.enableRecess = false;
          patch.recessStudentKioskEnabled = false;
          nextHidden = nextHidden.filter((x) => x !== 'recess');
          break;
        case 'notifications':
          patch.enableNotifications = false;
          nextHidden = nextHidden.filter((x) => x !== 'notifications');
          break;
        case 'student-portal':
          if (!nextHidden.includes('student-portal')) nextHidden = [...nextHidden, 'student-portal'];
          break;
        case 'integrations':
          if (!nextHidden.includes('integrations')) nextHidden = [...nextHidden, 'integrations'];
          break;
        case 'branding':
          if (!nextHidden.includes('branding')) nextHidden = [...nextHidden, 'branding'];
          break;
        default:
          break;
      }
    }

    patch.adminHiddenAddOnTabs = nextHidden;
    updateSettings(patch);

    if (offIds.has(activeMainTab)) setActiveMainTab('welcome');
  };

  useLayoutEffect(() => {
    const allowedTabs = new Set(orderedMainTabs.map((t) => t.value));
    if (!allowedTabs.has(activeMainTab)) setActiveMainTab('welcome');
  }, [activeMainTab, orderedMainTabs]);

  const [bulkRosterOpen, setBulkRosterOpen] = useState(false);
  const [isPreviousLogosOpen, setIsPreviousLogosOpen] = useState(false);
  const [idCardPrintJob, setIdCardPrintJob] = useState<{ students: Student[]; classes: Class[] } | null>(null);
  const [staffIdPrintJob, setStaffIdPrintJob] = useState<StaffIdCardSubject[] | null>(null);
  const [staffIdPreview, setStaffIdPreview] = useState<StaffIdCardSubject | null>(null);

  const handleOpenIdCardPrintSetup = (args: { students: Student[]; classes: Class[] }) => {
    if (args.students.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No students to print',
        description: 'Adjust filters or selection and try again.',
      });
      return;
    }
    setIdCardPrintJob(args);
  };

  const handleOpenStaffIdPrintSetup = (subjects: StaffIdCardSubject[]) => {
    if (subjects.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No staff to print',
        description: 'Add teachers or desk staff first.',
      });
      return;
    }
    setStaffIdPrintJob(subjects);
  };

  const handlePrintStaffIdCards = (subjects: StaffIdCardSubject[], cornerStyle?: 'rounded' | 'rectangular') => {
    if (!schoolId) {
      toast({ variant: 'destructive', title: 'Cannot print staff ID cards', description: 'Missing schoolId.' });
      return;
    }
    setStaffIdCardsToPrint({
      subjects,
      schoolId,
      cornerStyle,
      ...resolveIdCardPrintJobOptions(settings),
    });
  };

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
    enabled: (settings.payAttendance ?? true) && !!settings.enableClassSignIn,
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

  /** Show shell as soon as the default Students tab can render; other collections load in background. */
  const isShellLoading = studentsLoading || classesLoading;

  const collectionErrors = [
    { name: 'Students', error: studentsError },
    { name: 'Classes', error: classesError },
    { name: 'Teachers', error: teachersError },
    { name: 'Desk staff', error: staffAccountsError },
    { name: 'Categories', error: categoriesError },
    { name: 'Prizes', error: prizesError },
    { name: 'Coupons', error: couponsError },
    { name: 'Library', error: libraryError },
  ].filter(c => c.error);

  const getClassName = (classId: string) => {
    return classes?.find((c) => c.id === classId)?.name || 'Unassigned';
  };

  const getStudentName = (studentId?: string) => {
    if (!studentId) return 'N/A';
    const student = students?.find(s => s.id === studentId);
    return student ? `${student.firstName} ${student.lastName}` : `ID: ${studentId}`;
  };

  if (isShellLoading) {
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
      const roleLabel = leadershipPersonnelLabel(newTeacherPersonnelRole);
      toast({
        variant: 'destructive',
        title: `${roleLabel} name required`,
        description: `Please enter a name for the ${roleLabel.toLowerCase()}.`,
      });
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
    const personnelRole = normalizeTeacherPersonnelRole(newTeacherPersonnelRole);
    const personnelFields = { personnelRole: personnelRole === 'teacher' ? undefined : personnelRole };
    const updateTeacherOptions = {
      clearTeacherBudget: budgetVal === undefined,
      clearPersonnelRole: personnelRole === 'teacher',
    };

    if (editingTeacher) {
      if (budgetVal === undefined) {
        updateTeacher(
          {
            ...editingTeacher,
            name: newTeacherName,
            username,
            passcode,
            email: obfuscateField(newTeacherEmail),
            phone: obfuscateField(newTeacherPhone),
            ...personnelFields,
          },
          updateTeacherOptions,
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
          email: obfuscateField(newTeacherEmail),
          phone: obfuscateField(newTeacherPhone),
          ...personnelFields,
        };
        if (budgetChanged) {
          updateTeacher({
            ...base,
            spentThisMonth: 0,
            budgetWindowKey: budgetWindowKeyForDate(periodForSave ?? 'month'),
          }, updateTeacherOptions);
        } else {
          updateTeacher(base, updateTeacherOptions);
        }
      }
    } else if (budgetVal === undefined) {
      addTeacher({
        name: newTeacherName,
        username,
        passcode,
        email: obfuscateField(newTeacherEmail),
        phone: obfuscateField(newTeacherPhone),
        ...personnelFields,
      });
    } else {
      addTeacher({
        name: newTeacherName,
        username,
        passcode,
        email: obfuscateField(newTeacherEmail),
        phone: obfuscateField(newTeacherPhone),
        monthlyBudget: budgetVal,
        budgetPeriod: periodForSave,
        spentThisMonth: 0,
        budgetWindowKey: budgetWindowKeyForDate(periodForSave ?? 'month'),
        ...personnelFields,
      });
    }

    setNewTeacherName('');
    setNewTeacherUsername('');
    setNewTeacherPasscode('');
    setNewTeacherBudget('');
    setNewTeacherBudgetPeriod('month');
    setNewTeacherEmail('');
    setNewTeacherPhone('');
    setNewTeacherPersonnelRole('teacher');
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

  const handleOpenFaceTrainingStudent = (student: Student) => {
    setFaceTrainingOnlyStudent(student);
  };

  const handleOpenPrizeModal = (prize: Prize | null) => {
    setEditingPrize(prize);
    setIsPrizeModalOpen(true);
  };

  const handleOpenActivityModal = (student: Student) => {
    setActivityStudent(student);
  };

  const importStudentsCsvWithAi = async (text: string) => {
    if (!schoolId) return;
    setCsvImportBusy(true);
    try {
      const res = await authFetch('/api/parse-students', {
        method: 'POST',
        body: JSON.stringify({
          prompt: text,
          model: getArcadeAiModelFromStorage(),
          classNames: (classes || []).map((c) => c.name),
          schoolId,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'AI could not read this CSV.');
      }
      const parsed = await res.json();
      if (!Array.isArray(parsed) || parsed.length === 0) {
        playSound('error');
        toast({
          variant: 'destructive',
          title: 'No students found',
          description: 'AI could not extract any students from this file. Try a different export or paste into Bulk setup.',
        });
        return;
      }
      await handleAiCommitSnapshot({ students: parsed });
    } catch (err: unknown) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Failed to import CSV',
        description: getReadableErrorMessage(err, 'AI import failed.'),
      });
    } finally {
      setCsvImportBusy(false);
    }
  };

  const onStudentCsvFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const { rows } = parseStudentCsvToMatrix(text);
      if (rows.length === 0) {
        playSound('error');
        toast({ variant: 'destructive', title: 'Empty file', description: 'The CSV has no rows to import.' });
        return;
      }
      const map = guessStudentCsvColumnMap(rows[0] || []);
      const firstIdx = map.indexOf('firstName');
      const lastIdx = map.indexOf('lastName');
      if (firstIdx >= 0 && lastIdx >= 0 && firstIdx !== lastIdx) {
        setCsvColumnMapText(text);
        setCsvColumnMapOpen(true);
        return;
      }
      toast({
        title: 'Reading CSV with AI…',
        description: 'Column headers were not recognized; using AI to extract students.',
      });
      await importStudentsCsvWithAi(text);
    } catch (err: unknown) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Failed to read CSV file.',
        description: getReadableErrorMessage(err, 'Could not read file.'),
      });
    } finally {
      if (studentCsvInputRef.current) studentCsvInputRef.current.value = '';
    }
  };

  const handleCsvColumnMapConfirm = async (canonicalCsv: string) => {
    try {
      const report = await uploadStudents(canonicalCsv, students || [], classes || []);
      playSound(report.success > 0 ? 'success' : 'error');
      const msg = describeCsvImportReport(report, 'Students');
      toast({ variant: msg.variant, title: msg.title, description: msg.description });
    } catch (err: unknown) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Import failed',
        description: getReadableErrorMessage(err, 'Import failed.'),
      });
    }
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

  const handleAiCommitSnapshot = async (snapshot: ParsedSchoolSnapshot, options?: { upsertStudents?: boolean }) => {
    if (!firestore || !schoolId) return;
    try {
      const result = await importParsedSchoolSnapshot(firestore, schoolId, snapshot, {
        classes: classes || [],
        teachers: teachers || [],
        students: students || [],
        periods: attendancePeriods || [],
        categories: categories || [],
        prizes: prizes || [],
        staffAccounts: staffAccounts || [],
      }, options);
      const anySuccess = Object.values(result).some((r) => r && r.success > 0);
      playSound(anySuccess ? 'success' : 'error');
      const msg = describeSnapshotImport(result);
      toast({ variant: msg.variant, title: msg.title, description: msg.description });
    } catch (err: unknown) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Import failed',
        description: getReadableErrorMessage(err, 'Import failed.'),
      });
    }
  };

  const usedCouponsCount = coupons?.filter((c) => c.used).length || 0;
  const totalPointsAwarded = coupons?.filter((c) => c.used).reduce((sum, c) => sum + c.value, 0) || 0;

  const handleStudentCsvUpload = () => {
    studentCsvInputRef.current?.click();
  };

  const libraryUpcTaken = async (upc: string, excludeId?: string) => {
    if (!firestore || !schoolId) return false;
    const snap = await getDocs(
      query(collection(firestore, 'schools', schoolId, 'library'), where('upc', '==', upc), limit(5)),
    );
    return snap.docs.some((d) => d.id !== excludeId);
  };

  const handleSaveLibraryItem = async (data: LibraryItemInput, existingId?: string) => {
    if (!firestore || !schoolId) throw new Error('School not ready.');
    const upc = normalizeLibraryUpc(data.upc);
    if (await libraryUpcTaken(upc, existingId)) {
      throw new Error('Another item already uses this barcode.');
    }
    const payload = {
      name: data.name.trim(),
      upc,
      author: data.author ?? null,
      isbn: data.isbn ?? null,
      category: data.category ?? null,
      shelfLocation: data.shelfLocation ?? null,
      copyNumber: data.copyNumber ?? null,
      notes: data.notes ?? null,
    };
    if (existingId) {
      await updateDoc(doc(firestore, 'schools', schoolId, 'library', existingId), payload);
    } else {
      await setDoc(doc(collection(firestore, 'schools', schoolId, 'library')), {
        ...payload,
        status: 'available',
        checkedOutTo: null,
        checkedOutAt: null,
        createdAt: Date.now(),
        addedBy: 'Admin',
      });
    }
  };

  const handleAddLibraryItem = () => {
    setEditingLibraryItem(null);
    setIsLibraryModalOpen(true);
  };

  const handleEditLibraryItem = (item: LibraryItem) => {
    setEditingLibraryItem(item);
    setIsLibraryModalOpen(true);
  };

  const handleDeleteLibraryItem = async (itemId: string) => {
    if (!firestore || !schoolId) return;
    if (await confirm({ title: 'Delete Library Item?', description: 'Are you sure you want to remove this item? This cannot be undone.' })) {
      deleteDoc(doc(firestore, 'schools', schoolId, 'library', itemId));
      playSound('trash');
      toast({ title: 'Item Deleted', description: 'The library item has been removed.' });
    }
  };

  const handleReturnLibraryItem = async (itemId: string) => {
    if (!firestore || !schoolId) return;
    const item = library?.find((i) => i.id === itemId);
    if (!item) return;
    if (await confirm({ title: 'Force Return Item?', description: 'This will check the item back in and apply any late/on-time library points. Proceed?' })) {
      const { forceReturnLibraryItem } = await import('@/lib/library/libraryOperations');
      const { getLibraryPolicyFromSettings } = await import('@/lib/library/libraryPolicy');
      const policy = getLibraryPolicyFromSettings(settings, categories);
      const res = await forceReturnLibraryItem(firestore, schoolId, item, {
        policy,
        functions,
      });
      playSound('success');
      toast({
        title: 'Item Returned',
        description: res.message || 'The item is now available.',
      });
    }
  };

  const availableCoupons = coupons?.filter(c => !c.used).sort((a, b) => b.createdAt - a.createdAt) || [];
  const redeemedCoupons = coupons?.filter(c => c.used).sort((a, b) => (b.usedAt ?? 0) - (a.usedAt ?? 0)) || [];

  return (
    <TooltipProvider>
      <StaffPortalDocumentTitle title="School admin" />
      <StaffPortalLayoutProvider>
        <StaffPortalShellFrame
          className={cn(activeTabUsesAddOnColors && 'transition-[color,background-color] duration-300')}
          style={adminTabAppearance.style}
        >
        <StaffPortalContentWidth className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-3">

        <StaffPortalWorkspace>
          <div className={staffPortalSidebarRailClassName()}>
              <div className="lg:hidden">
                <Label htmlFor="admin-portal-section" className="sr-only">
                  Admin portal section
                </Label>
                <Select value={activeMainTab} onValueChange={handleMobileMainTabChange}>
                  <SelectTrigger
                    id="admin-portal-section"
                    className="h-12 w-full rounded-xl font-bold"
                    aria-label="Admin portal section"
                  >
                    <SelectValue placeholder="Choose a section" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-[min(70vh,440px)]">
                    <SelectGroup>
                      <SelectLabel className="pl-8 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                        Current tabs
                      </SelectLabel>
                      {orderedMainTabs.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    {mobileMoreTabOptions.length > 0 ? (
                      <>
                        <SelectSeparator />
                        <SelectGroup>
                          <SelectLabel className="pl-8 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                            Add more tabs
                          </SelectLabel>
                          {mobileMoreTabOptions.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </>
                    ) : null}
                  </SelectContent>
                </Select>
              </div>
              <div className="hidden w-full min-w-0 lg:block">
              <AdminMainTabsList
                activeTabValue={activeMainTab}
                orientation="vertical"
                inWorkspace
                autoScrollActiveTab={false}
                style={{ ['--admin-accent' as any]: 'hsl(var(--primary))' }}
                aria-label="Admin portal main tabs"
                endAction={
                  <StaffPortalAddFeatureTabsMenu
                    tabs={mobileMoreTabOptions.map((t) => ({
                      value: t.value,
                      label: t.label,
                      icon: t.icon,
                    }))}
                    onAddTab={(value) => toggleAddOnTab(value, true)}
                    onTurnAllOn={enableAllAddOnTabs}
                    onTurnAllOff={disableAllAddOnTabs}
                    getTabStyle={adminAddOnTabMenuStyle}
                    align="end"
                  />
                }
                onDragOver={(e) => {
                  // Allow dropping add-on tabs here to "pin" them into the main row.
                  if (draggingAddOnTabValueRef.current || e.dataTransfer.types.includes('text/admin-addon-tab')) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }
                }}
                onDrop={(e) => {
                  const v = draggingAddOnTabValueRef.current || e.dataTransfer.getData('text/admin-addon-tab');
                  if (!v) return;
                  e.preventDefault();
                  pinAddOnTab(v);
                  draggingAddOnTabValueRef.current = null;
                }}
              >
                {orderedMainTabs.map((t) => {
                  const Icon = t.icon;
                  const removable = isRemovableAdminAddOnTab(t.value);
                  const isColoredAddOn = adminPerTabColors && isAdminAddOnTabValue(t.value);
                  const isTabActive = activeMainTab === t.value;
                  return (
                    <StaffPortalSidebarTabRow
                      key={t.value}
                      value={t.value}
                      isActive={isTabActive}
                      onSelect={() => setActiveMainTab(t.value)}
                      triggerClassName={
                        isColoredAddOn
                          ? cn(
                              staffPortalAddOnTabTriggerClassName(),
                              'border-solid data-[state=inactive]:shadow-none',
                            )
                          : adminTabTriggerClassName
                      }
                      triggerStyle={
                        isColoredAddOn
                          ? adminAddOnTabTriggerStyle(t.value, settings, isTabActive)
                          : undefined
                      }
                      title={t.title ?? 'Drag to reorder'}
                      removable={removable}
                      removeLabel={`Remove ${t.label} from sidebar`}
                      onRemove={removable ? () => unpinAdminAddOnTab(t.value) : undefined}
                      wrapperClassName="flex w-full shrink-0"
                      wrapperProps={{
                        draggable: true,
                        title: t.title ?? 'Drag to reorder',
                        onDragStart: (e) => {
                          e.dataTransfer.setData('text/admin-main-tab', t.value);
                          e.dataTransfer.effectAllowed = 'move';
                          draggingMainTabValueRef.current = t.value;
                        },
                        onDragEnd: () => {
                          draggingMainTabValueRef.current = null;
                        },
                        onDrop: () => {
                          draggingMainTabValueRef.current = null;
                        },
                        onDragOver: (e) => {
                          const dragged = draggingMainTabValueRef.current;
                          if (!dragged) return;
                          e.preventDefault();

                          if (!dragged || dragged === t.value) return;

                          const values = orderedMainTabs.map((x) => x.value);
                          const from = values.indexOf(dragged);
                          const to = values.indexOf(t.value);
                          if (from < 0 || to < 0 || from === to) return;

                          persistMainTabOrder(moveInArray(values, from, to));
                        },
                      }}
                    >
                      <Icon className="w-4 h-4 shrink-0" /> {t.label}
                    </StaffPortalSidebarTabRow>
                  );
                })}
              </AdminMainTabsList>
              </div>
          </div>

          <Tabs
            key={`admin-tabs-${schoolId ?? 'unknown'}`}
            value={activeMainTab}
            onValueChange={setActiveMainTab}
            className={staffPortalWorkspaceMainClassName()}
          >
          <TabWalkthroughProvider scope="admin" tabId={activeMainTab}>
          <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col">
          <StaffPortalTeacherToolNotice activeTab={activeMainTab} />
          <TabsContent value="welcome" className={scrollingAdminTabClassName}>
            <StaffPortalWelcomeTab
              role="admin"
              settings={settings}
              onGoToTab={setActiveMainTab}
              onBulkRoster={() => setBulkRosterOpen(true)}
              schoolName={schoolData?.name?.trim() || null}
              welcomeStats={adminWelcomeStats}
            />
          </TabsContent>

          <TabsContent value="students" className={fittedAdminTabClassName}>
            <AdminStudentsTab
              schoolId={schoolId!}
              settings={settings}
              classes={classes}
              students={students}
              filteredStudents={filteredStudents}
              studentCsvInputRef={studentCsvInputRef}
              onStudentCsvFileChange={onStudentCsvFileChange}
              handleStudentCsvUpload={handleStudentCsvUpload}
              csvImportBusy={csvImportBusy}
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
              onOpenIdPrintSetup={handleOpenIdCardPrintSetup}
              getClassName={getClassName}
              teachers={teachers || []}
              handleOpenStudentModal={handleOpenStudentModal}
              onOpenFaceTraining={handleOpenFaceTrainingStudent}
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
              onUpdateStudent={(s) => updateStudent(s)}
            />
          </TabsContent>

          <TabsContent value="classes" className={fittedAdminTabClassName}>
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
              onUpdateStudent={updateStudent}
            />
          </TabsContent>

          <TabsContent value="teachers" className={fittedAdminTabClassName}>
            <AdminTeachersTab
              teachers={teachers}
              staffAccounts={staffAccounts}
              students={students ?? []}
              classes={classes ?? []}
              schoolId={schoolId!}
              onAddTeacher={() => {
                setNewTeacherPersonnelRole('teacher');
                setIsTeacherModalOpen(true);
              }}
              onAddLeadership={() => {
                setNewTeacherPersonnelRole('principal');
                setIsTeacherModalOpen(true);
              }}
              onEditTeacher={(t) => {
                setEditingTeacher(t);
                setNewTeacherName(t.name);
                setNewTeacherUsername(t.username || '');
                setNewTeacherPasscode(t.passcode || '');
                setNewTeacherBudget(t.monthlyBudget?.toString() || '');
                const p = t.budgetPeriod;
                setNewTeacherBudgetPeriod(p === 'day' || p === 'week' || p === 'month' ? p : 'month');
                setNewTeacherEmail(deobfuscateField(t.email) || '');
                setNewTeacherPhone(deobfuscateField(t.phone) || '');
                setNewTeacherPersonnelRole(
                  isLeadershipPersonnel(t) ? normalizeTeacherPersonnelRole(t.personnelRole) : 'teacher',
                );
                setIsTeacherModalOpen(true);
              }}
              onUpdateStudent={updateStudent}
              onUpdateClass={updateClass}
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
              onSaveStaffAccount={async (account) => {
                if (!firestore || !schoolId) return;
                try {
                  if ('id' in account && account.id) {
                    const updated = account as StaffAccount;
                    await updateStaffAccount(firestore, schoolId, updated);
                    toast({ title: 'Account updated' });
                    if (teachers && staffAccounts) {
                      const merged = staffAccounts.map((row) => (row.id === updated.id ? updated : row));
                      void syncSchoolStaffDirectory(firestore, schoolId, teachers, merged).catch(() => undefined);
                    }
                  } else {
                    const created = await addStaffAccount(firestore, schoolId, account);
                    toast({ title: 'Account created' });
                    if (teachers) {
                      void syncSchoolStaffDirectory(firestore, schoolId, teachers, [
                        ...(staffAccounts || []),
                        created,
                      ]).catch(() => undefined);
                    }
                  }
                } catch (e) {
                  toast({ variant: 'destructive', title: 'Save failed', description: getReadableErrorMessage(e, 'Save failed.') });
                }
              }}
              onDeleteStaffAccount={async (id) => {
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
                  if (teachers && staffAccounts) {
                    const remaining = staffAccounts.filter((row) => row.id !== id);
                    void syncSchoolStaffDirectory(firestore, schoolId, teachers, remaining).catch(() => undefined);
                  }
                } catch (e) {
                  toast({ variant: 'destructive', title: 'Delete failed', description: getReadableErrorMessage(e, 'Delete failed.') });
                }
              }}
              onPreviewStaffIdCard={(subject) => setStaffIdPreview(subject)}
              onOpenStaffIdPrintSetup={handleOpenStaffIdPrintSetup}
            />
          </TabsContent>

          <TabsContent value="prizes" className={fittedAdminTabClassName}>
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

          <TabsContent value="insights" className={`${scrollingAdminTabClassName} space-y-6`}>
            {settings.enableAdminAnalytics ? (
              <AdminStatsTab
                students={students}
                classes={classes}
                teachers={teachers}
                coupons={coupons}
                usedCouponsCount={usedCouponsCount}
                totalPointsAwarded={totalPointsAwarded}
              />
            ) : null}
          </TabsContent>

          <TabsContent value="categories" className={`${scrollingAdminTabClassName} space-y-6`}>
            <AdminCategoriesTab
              categories={categories}
              teachers={teachers}
              classes={classes}
              students={students}
              schoolId={schoolId!}
              showCouponManagement={settings.payRewards ?? true}
              availableCoupons={availableCoupons}
              redeemedCoupons={redeemedCoupons}
              getStudentName={getStudentName}
              onDeleteCoupon={deleteCoupon}
              onPurgeRedeemed={async () => {
                const ids = redeemedCoupons.map((c) => c.id);
                if (ids.length > 0) {
                  await deleteCoupons(ids);
                  toast({ title: 'Redeemed coupons purged', description: `Successfully deleted ${ids.length} coupons.` });
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

          <TabsContent
            value="classroom"
            className={`${scrollingAdminTabClassName} space-y-6 motion-reduce:data-[state=active]:animate-none data-[state=active]:!animate-none`}
          >
            {activeMainTab === 'classroom' ? (
              <AdminClassroomTab
                categories={categories}
                classes={classes}
                students={students}
                schoolId={schoolId!}
              />
            ) : null}
          </TabsContent>

          <TabsContent value="reports" className={scrollingAdminTabClassName}>
            <AdminReportsTab
              schoolName={schoolData?.name?.trim() || 'School'}
              students={students}
              classes={classes}
              teachers={teachers}
              coupons={coupons}
              prizes={prizes}
              categories={categories}
              rafflePointsPerTicket={settings.rafflePointsPerTicket}
            />
          </TabsContent>

          <TabsContent value="attendance" className={scrollingAdminTabClassName}>
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
              attendanceConfig={attendanceConfig}
              setAttendanceConfigState={setAttendanceConfigState}
              attendanceConfigSaving={attendanceConfigSaving}
              handleSaveAttendanceConfig={handleSaveAttendanceConfig}
              getAttendanceConfig={getAttendanceConfig}
              setAttendanceConfig={setAttendanceConfig}
              UniversalPeriodsAdmin={UniversalPeriodsAdmin}
              enableBathroomTimer={settings.enableBathroomTimer ?? true}
              bathroomMaxMinutes={settings.bathroomMaxMinutes ?? 5}
              bathroomRequirePresent={settings.bathroomRequirePresent ?? true}
              classSignInEnabled={!!settings.enableClassSignIn}
              onBathroomSettingsChange={(patch: Parameters<typeof updateSettings>[0]) => updateSettings(patch)}
            />
          </TabsContent>

          <TabsContent value="displays" className={scrollingAdminTabClassName}>
            <AdminDisplaysTab
              schoolId={schoolId!}
              schoolLogoUrl={schoolData?.logoUrl ?? null}
              settings={settings}
              updateSettings={updateSettings}
            />
          </TabsContent>

          <TabsContent value="library" className={fittedAdminTabClassName}>
            <AdminLibraryTab
              libraryItems={library}
              students={students}
              categories={categories}
              schoolId={schoolId}
              getStudentName={getStudentName}
              onAddLibraryItem={handleAddLibraryItem}
              onEditLibraryItem={handleEditLibraryItem}
              onDeleteLibraryItem={handleDeleteLibraryItem}
              onReturnLibraryItem={handleReturnLibraryItem}
              onRegisterFromScan={handleSaveLibraryItem}
              upcTaken={(upc) => libraryUpcTaken(upc)}
            />
          </TabsContent>

          <TabsContent value="bonuspoints" className={fittedAdminTabClassName}>
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

          <TabsContent value="category-badges" className={fittedAdminTabClassName}>
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

          <TabsContent value="goals" className={scrollingAdminTabClassName}>
            <AdminGoalsTab
              schoolId={schoolId!}
              students={students || []}
              classes={classes || []}
              categories={categories || []}
              prizes={prizes || []}
            />
          </TabsContent>

          <TabsContent value="raffle" className={scrollingAdminTabClassName}>
            {activeMainTab === 'raffle' ? (
              <AdminRaffleTab schoolId={schoolId!} students={students ?? []} />
            ) : null}
          </TabsContent>

          <TabsContent value="houses" className={scrollingAdminTabClassName}>
            <AdminHousesTab
              schoolId={schoolId!}
              houses={houses}
              students={students}
              teachers={teachers}
              onAddHouse={addHouse}
              onUpdateHouse={updateHouse}
              onDeleteHouse={async (id, houseStudents) => {
                const house = (houses || []).find((h: House) => h.id === id);
                const ok = await confirm({
                  title: house ? `Delete house "${house.name}"?` : 'Delete this house?',
                  description:
                    houseStudents.length > 0
                      ? `${houseStudents.length} student(s) will be unassigned from this house.`
                      : 'No students are assigned to this house.',
                  confirmLabel: 'Delete house',
                  destructive: true,
                });
                if (!ok) return;
                await deleteHouse(id, houseStudents);
              }}
              onUpdateStudent={updateStudent}
              onUpdateTeacher={updateTeacher}
            />
          </TabsContent>

          <TabsContent value="recess" className={scrollingAdminTabClassName}>
            {activeMainTab === 'recess' ? (
              <AdminRecessTab schoolId={schoolId!} students={students ?? []} />
            ) : null}
          </TabsContent>

          <TabsContent value="notifications" className={scrollingAdminTabClassName}>
            <AdminNotificationsTab />
          </TabsContent>

          <TabsContent value="integrations" className={scrollingAdminTabClassName}>
            <AdminIntegrationsTab />
          </TabsContent>

          <TabsContent value="student-portal" className={scrollingAdminTabClassName}>
            <AdminStudentPortalTab schoolId={schoolId!} students={students ?? []} />
          </TabsContent>

          <TabsContent value="branding" className={scrollingAdminTabClassName}>
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
          </div>
          </TabWalkthroughProvider>
        </Tabs>
        </StaffPortalWorkspace>
        </StaffPortalContentWidth>

        <BulkRosterSetupDialog
          open={bulkRosterOpen}
          onOpenChange={setBulkRosterOpen}
          aiClassNames={(classes || []).map((c) => c.name)}
          onClassesCsv={handleBulkClassesCsv}
          onTeachersCsv={handleBulkTeachersCsv}
          onStudentsCsv={handleBulkStudentsCsv}
          onAiCommitSnapshot={handleAiCommitSnapshot}
        />

        <StudentCsvColumnMapDialog
          open={csvColumnMapOpen}
          onOpenChange={setCsvColumnMapOpen}
          csvText={csvColumnMapText}
          onConfirm={handleCsvColumnMapConfirm}
        />

        {idCardPrintJob ? (
          <IdCardPrintSetupDialog
            open
            onOpenChange={(o) => {
              if (!o) setIdCardPrintJob(null);
            }}
            students={idCardPrintJob.students}
            classes={idCardPrintJob.classes}
            onConfirm={(args) => {
              if (!schoolId) {
                toast({ variant: 'destructive', title: 'Cannot print ID cards', description: 'Missing schoolId.' });
                return;
              }
              setStudentsToPrint({ ...args, schoolId });
              setIdCardPrintJob(null);
            }}
          />
        ) : null}

        {staffIdPrintJob ? (
          <IdCardPrintSetupDialog
            variant="staff"
            open
            onOpenChange={(o) => {
              if (!o) setStaffIdPrintJob(null);
            }}
            subjects={staffIdPrintJob}
            onConfirm={(args) => {
              handlePrintStaffIdCards(args.subjects, args.cornerStyle);
              setStaffIdPrintJob(null);
            }}
          />
        ) : null}

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
            setNewTeacherEmail('');
            setNewTeacherPhone('');
            setNewTeacherPersonnelRole('teacher');
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
                <DialogTitle>
                  {editingTeacher
                    ? `Edit ${leadershipPersonnelLabel(newTeacherPersonnelRole).toLowerCase()}`
                    : newTeacherPersonnelRole === 'teacher'
                      ? 'Add classroom teacher'
                      : 'Add principal / division head'}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-1">
                  <Label htmlFor="new-teacher-role">Staff category</Label>
                  <Select
                    value={newTeacherPersonnelRole}
                    onValueChange={(v) => setNewTeacherPersonnelRole(v as TeacherPersonnelRole)}
                  >
                    <SelectTrigger id="new-teacher-role">
                      <SelectValue placeholder="Choose staff category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teacher">Classroom teacher</SelectItem>
                      <SelectItem value="principal">Principal</SelectItem>
                      <SelectItem value="divisionHead">Division head</SelectItem>
                    </SelectContent>
                  </Select>
                  {newTeacherPersonnelRole !== 'teacher' ? (
                    <p className="text-[10px] text-muted-foreground leading-snug">
                      Leadership staff use the teacher portal with school-wide student and category access.
                    </p>
                  ) : null}
                </div>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="new-teacher-email">Email (Optional)</Label>
                    <Input id="new-teacher-email" type="email" value={newTeacherEmail} onChange={e => setNewTeacherEmail(e.target.value)} placeholder="teacher@school.edu" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-teacher-phone">Phone (Optional)</Label>
                    <Input id="new-teacher-phone" type="tel" value={newTeacherPhone} onChange={e => setNewTeacherPhone(e.target.value)} placeholder="555-0123" />
                  </div>
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
                  setNewTeacherEmail('');
                  setNewTeacherPhone('');
                  setNewTeacherPersonnelRole('teacher');
                }}>Cancel</Button>
                <Button type="submit">
                  {editingTeacher
                    ? 'Save changes'
                    : newTeacherPersonnelRole === 'teacher'
                      ? 'Add teacher'
                      : 'Add leadership staff'}
                </Button>
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
          allHouses={houses || []}
          allTeachers={teachers || []}
        />
        {settings.enableFaceLogin && faceTrainingOnlyStudent ? (
          <AdminFaceEnrollmentPanel
            key={faceTrainingOnlyStudent.id}
            studentId={faceTrainingOnlyStudent.id}
            studentLabel={
              [getStudentNickname(faceTrainingOnlyStudent), faceTrainingOnlyStudent.lastName]
                .filter(Boolean)
                .join(' ')
                .trim() || undefined
            }
            trainingOnly
            onTrainingOnlyClose={() => setFaceTrainingOnlyStudent(null)}
          />
        ) : null}
        <PrizeModal
          isOpen={isPrizeModalOpen}
          setIsOpen={setIsPrizeModalOpen}
          prize={editingPrize}
          teachers={teachers || []}
          allClasses={classes || []}
          categories={categories || []}
        />
        <CategoryModal
          isOpen={isCategoryModalOpen}
          setIsOpen={setIsCategoryModalOpen}
          category={editingCategory}
        />
        <LibraryItemModal
          isOpen={isLibraryModalOpen}
          setIsOpen={setIsLibraryModalOpen}
          item={editingLibraryItem}
          onSave={handleSaveLibraryItem}
          upcTaken={libraryUpcTaken}
          schoolId={schoolId}
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
                toast({ variant: 'destructive', title: 'Failed to update student theme', description: 'Failed to update student theme.' });
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
                toast({ variant: 'destructive', title: 'Failed to remove student theme', description: 'Failed to remove student theme.' });
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
              <DialogFooter className="shrink-0">
                <Button type="button" variant="secondary" className="rounded-xl" onClick={() => setIdPreviewStudent(null)}>
                  Close
                </Button>
                <Button
                  type="button"
                  className="rounded-xl"
                  onClick={() => {
                    const s = idPreviewStudent;
                    if (!s) return;
                    // Close the preview first so it never ends up on the printout.
                    setIdPreviewStudent(null);
                    requestAnimationFrame(() => {
                      if (!schoolId) {
                        toast({ variant: 'destructive', title: 'Cannot print ID cards', description: 'Missing schoolId.' });
                        return;
                      }
                      setStudentsToPrint({
                        students: [s],
                        classes: classes ?? [],
                        schoolId,
                        ...resolveIdCardPrintJobOptions(settings),
                      });
                    });
                  }}
                >
                  <Printer className="mr-2 h-4 w-4" aria-hidden />
                  Print
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        <StaffIdCardPreviewDialog
          subject={staffIdPreview}
          open={!!staffIdPreview}
          onOpenChange={(open) => {
            if (!open) setStaffIdPreview(null);
          }}
          schoolName={schoolData?.name?.trim() || 'School'}
          schoolLogoUrl={schoolData?.logoUrl ?? null}
          appLogoUrl={appConfigGlobal?.appLogoUrl ?? null}
          appName={appConfigGlobal?.appName?.trim() || undefined}
          appTagline={appConfigGlobal?.appTagline?.trim() || undefined}
          isColorEnabled={settings.enableColorPrinting}
          onPrint={(subject) => handlePrintStaffIdCards([subject])}
        />
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
        {showPurgeFlash && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="pointer-events-none absolute inset-0 bg-white/90 animate-pulse" aria-hidden />
            <div className="pointer-events-none relative z-10 px-10 py-6 rounded-full border-4 border-amber-500 bg-white shadow-2xl text-amber-700 text-xl font-black tracking-[0.3em] uppercase">
              Purged
            </div>
          </div>
        )}
        </StaffPortalShellFrame>
      </StaffPortalLayoutProvider>
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

      const model = getArcadeAiModelFromStorage();
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

      await syncDefaultRules(mapped.map(p => p.id));
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
      await syncDefaultRules([id]);
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

  const syncDefaultRules = async (specificPeriodIds?: string[]) => {
    try {
      const targetIds = specificPeriodIds || (periods || []).map(p => p.id);
      if (!targetIds.length) {
        if (!specificPeriodIds) toast({ variant: 'destructive', title: 'No periods found to sync' });
        return;
      }
      
      const { created, skipped } = await ensureDefaultAttendanceRules(firestore, schoolId, targetIds);
      if (!specificPeriodIds) {
        toast({ 
          title: 'Attendance rules synced', 
          description: `Created ${created} default rules. ${skipped} rules already existed and were skipped.` 
        });
      }
    } catch (e: any) {
      console.error('[attendance] Sync failed:', e);
      toast({ variant: 'destructive', title: 'Failed to sync rules', description: e?.message || String(e) });
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

      <div className="flex items-center justify-between gap-4 mt-6">
        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground/80 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Attendance Periods
        </h3>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest gap-2"
          onClick={() => syncDefaultRules()}
          disabled={!periods?.length}
        >
          <Zap className="w-3 h-3" /> Sync Default Rules
        </Button>
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
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 w-5 h-5 animate-spin" aria-hidden />
                  Signing in...
                </>
              ) : (
                'Enter Dashboard'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function HouseCoordinatorDashboard() {
  const { schoolId: ctxSchoolId, addHouse, updateHouse, deleteHouse } = useAppContext();
  const params = useParams<{ schoolId?: string }>();
  const schoolId = (typeof params?.schoolId === 'string' && params.schoolId.trim())
    ? params.schoolId.trim().toLowerCase()
    : ctxSchoolId;
  const firestore = useFirestore();
  const { toast } = useToast();

  const studentsQuery = useMemoFirebase(
    () => (firestore && schoolId ? collection(firestore, 'schools', schoolId, 'students') : null),
    [firestore, schoolId],
  );
  const housesQuery = useMemoFirebase(
    () => (firestore && schoolId ? collection(firestore, 'schools', schoolId, 'houses') : null),
    [firestore, schoolId],
  );
  const teachersQuery = useMemoFirebase(
    () => (firestore && schoolId ? collection(firestore, 'schools', schoolId, 'teachers') : null),
    [firestore, schoolId],
  );

  const students = useCollection<Student>(studentsQuery);
  const houses = useCollection<House>(housesQuery);
  const teachers = useCollection<Teacher>(teachersQuery);

  const updateStudentHouse = async (student: Student) => {
    if (!firestore || !schoolId) return;
    await updateDoc(doc(firestore, 'schools', schoolId, 'students', student.id), {
      houseId: student.houseId || '',
      updatedAt: Date.now(),
    });
  };

  const updateTeacherHouseParents = async (teacher: Teacher) => {
    if (!firestore || !schoolId) return;
    await updateDoc(doc(firestore, 'schools', schoolId, 'teachers', teacher.id), {
      houseParentHouseIds: teacher.houseParentHouseIds || [],
    });
  };

  const collectionErrors = [
    { name: 'Students', error: students.error },
    { name: 'Houses', error: houses.error },
    { name: 'Teachers', error: teachers.error },
  ].filter((c) => c.error);

  if (!schoolId || students.isLoading || houses.isLoading || teachers.isLoading) {
    return <AdminDashboardSkeleton />;
  }

  if (collectionErrors.length > 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <Alert variant="destructive">
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Data Fetch Error</AlertTitle>
          <AlertDescription>
            Some house data could not be loaded. This may be due to temporary network issues or missing permissions.
            <ul className="mt-2 text-xs font-code list-disc pl-4">
              {collectionErrors.map((c) => (
                <li key={c.name}>{c.name}: {c.error?.message}</li>
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

  return (
    <div className="mx-auto flex h-full min-h-0 min-w-0 w-full max-w-7xl flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight text-primary">Houses</h1>
          <p className="text-sm text-muted-foreground">
            Houses-only access for rosters, house parents, sorting, and point totals.
          </p>
        </div>
        <Button variant="outline" className="rounded-xl" asChild>
          <Link href={`/${schoolId}/portal`}>Back to portal</Link>
        </Button>
      </div>

      <TabWalkthroughProvider scope="admin" tabId="houses">
        <AdminHousesTab
          schoolId={schoolId}
          houses={houses.data}
          students={students.data}
          teachers={teachers.data}
          onAddHouse={addHouse}
          onUpdateHouse={updateHouse}
          onDeleteHouse={deleteHouse}
          onUpdateStudent={updateStudentHouse}
          onUpdateTeacher={updateTeacherHouseParents}
        />
      </TabWalkthroughProvider>
    </div>
  );
}

function AdminPage() {
  const { loginState, isInitialized, isAdmin, isPrizeClerk, isHouseCoordinator, login, schoolId: ctxSchoolId } =
    useAppContext();
  const params = useParams<{ schoolId?: string }>();
  const schoolId = (typeof params?.schoolId === 'string' && params.schoolId.trim())
    ? params.schoolId.trim().toLowerCase()
    : ctxSchoolId;
  const router = useRouter();
  const { isAutoLoggingIn } = useAdminGooglePasscodeBypass({ schoolId, autoLogin: false });

  const prizeDeskSession = loginState === 'prizeClerk' && isPrizeClerk;
  const houseCoordinatorSession = loginState === 'houseCoordinator' && isHouseCoordinator;

  useEffect(() => {
    if (!isInitialized || !schoolId) return;
    if (loginState === 'teacher') {
      router.replace(`/${schoolId}/teacher`);
    }
  }, [isInitialized, loginState, router, schoolId]);

  useEffect(() => {
    if (
      isInitialized &&
      !['student', 'teacher', 'admin', 'school', 'developer', 'prizeClerk', 'houseCoordinator'].includes(loginState)
    ) {
      router.replace('/login');
    }
  }, [isInitialized, loginState, router]);

  const handleAdminLogin = async (passcode: string): Promise<boolean> => {
    if (!schoolId) return false;
    return login('admin', { schoolId, passcode }).then((r) => r.ok);
  };

  if (!isInitialized || !['student', 'teacher', 'admin', 'school', 'developer', 'prizeClerk', 'houseCoordinator'].includes(loginState)) {
    return <AdminDashboardSkeleton />;
  }

  if (loginState === 'teacher') {
    return <AdminDashboardSkeleton />;
  }

  if (!isAdmin && !prizeDeskSession && !houseCoordinatorSession) {
    if (isAutoLoggingIn) {
      return <AdminDashboardSkeleton />;
    }
    return <AdminLogin onLogin={handleAdminLogin} />;
  }

  if (prizeDeskSession) {
    return (
      <ErrorBoundary name="AdminPrizeDesk">
        <AdminPrizeDeskDashboard />
      </ErrorBoundary>
    );
  }

  if (houseCoordinatorSession) {
    return (
      <ErrorBoundary name="HouseCoordinatorDashboard">
        <HouseCoordinatorDashboard />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary name="AdminPage">
      <AdminDashboardInner />
    </ErrorBoundary>
  );
}

/** `useSearchParams()` must sit under Suspense or dev error recovery can loop with “missing required error components”. */
export default function AdminPageRoute() {
  return (
    <Suspense fallback={<AdminDashboardSkeleton />}>
      <AdminPage />
    </Suspense>
  );
}
