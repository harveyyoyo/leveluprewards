"use client";
import { useState } from "react";

import {
  Award,
  Cake,
  Edit,
  History,
  IdCard,
  LayoutDashboard,
  Loader2,
  LogIn,
  Plus,
  Printer,
  ScanFace,
  Trash2,
  Users,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/components/AppProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { Button } from "@/components/ui/button";
import {
  StaffPortalSectionCard,
  StaffPortalSectionCardContent,
  StaffPortalSectionCardHeader,
  StaffPortalSectionCardTitle,
} from "@/components/staff/StaffPortalSection";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Helper } from "@/components/ui/helper";
import { AdminRecordListHeader } from "@/components/admin/AdminRecordListHeader";
import { AdminRecordListScroll } from "@/components/admin/AdminRecordListScroll";
import {
  adminRecordListGridClassName,
  adminRecordListGridCompactGapClassName,
  adminRecordListGridNameCellClassName,
  adminRecordListGridStyle,
  studentsListGridColumns,
} from "@/components/admin/adminRecordListGrid";
import { StudentBulkActionsMenu } from "@/components/admin/StudentBulkActionsMenu";
import { StudentPointsTypeButton } from "@/components/admin/StudentPointsTypeButton";
import { TabWalkthroughHeaderAction } from "@/components/tabWalkthrough/TabWalkthroughContext";
import { useToast } from "@/hooks/use-toast";
import { useArcadeSound } from "@/hooks/useArcadeSound";
import { useSchoolFaceEnrollments } from "@/hooks/useSchoolFaceEnrollments";
import { cn } from "@/lib/utils";
import type { Class, Student, Teacher } from "@/lib/types";
import {
  AutoCircularToggles,
  type ToggleDef,
} from "@/components/admin/AutoCircularToggles";
import { STUDENT_WELCOME_STYLES_LIVE } from "@/lib/students/studentWelcome";

function buildStudentKioskWelcomeToggleDefs(settings: {
  enableStudentWelcome?: boolean;
  enableStudentWelcomeBackScreen?: boolean;
}): ToggleDef[] {
  const out: ToggleDef[] = [];
  if (settings.enableStudentWelcomeBackScreen) {
    out.push({
      key: "welcomeBackScreenEnabled",
      label:
        "Welcome back splash — short full-screen greeting when this student opens the kiosk (duration is in school Settings).",
      shortLabel: "SPL",
      missingMeansOn: true,
    });
  }
  if (STUDENT_WELCOME_STYLES_LIVE && settings.enableStudentWelcome) {
    out.push({
      key: "welcomePageEnabled",
      label:
        "Style welcome page — when off, this student will not see the Welcome styles picker on the kiosk (school setting must stay on).",
      shortLabel: "STY",
      missingMeansOn: true,
    });
  }
  return out;
}

function formatAssignedTeachers(
  student: Student,
  teachers: Teacher[],
): string | null {
  const ids = student.teacherIds;
  if (!ids?.length) return null;
  const names = ids
    .map((id) => teachers.find((t) => t.id === id)?.name)
    .filter((n): n is string => !!n?.trim());
  if (names.length === 0)
    return `${ids.length} teacher link${ids.length === 1 ? "" : "s"}`;
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} · ${names[1]}`;
  return `${names.length} teachers`;
}

function kioskToggleHeaderLabel(def: ToggleDef): string {
  if (def.key === "welcomeBackScreenEnabled") return "Splash";
  if (def.key === "welcomePageEnabled") return "Style";
  return def.shortLabel;
}

function isBirthdayToday(birthdayIso?: string): boolean {
  if (!birthdayIso || birthdayIso.length < 10) return false;
  const md = birthdayIso.slice(5, 10);
  const now = new Date();
  const todayMd = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return md === todayMd;
}

export function AdminStudentsTab({
  schoolId,
  settings,
  classes,
  students,
  filteredStudents,
  studentCsvInputRef,
  onStudentCsvFileChange,
  handleStudentCsvUpload,
  csvImportBusy = false,
  selectionMode: _selectionMode,
  setSelectionMode: _setSelectionMode,
  selectedStudentIds,
  setSelectedStudentIds,
  isAllFilteredSelected,
  toggleSelectAllFiltered,
  studentSearchTerm,
  setStudentSearchTerm,
  studentSortOption,
  setStudentSortOption,
  studentFilterClass,
  setStudentFilterClass,
  onOpenIdPrintSetup,
  getClassName,
  teachers,
  handleOpenStudentModal,
  onOpenFaceTraining,
  handleOpenActivityModal,
  setThemeStudent,
  setBadgesStudent,
  deleteStudent,
  setStudentToPurge,
  previewIdCardStudent,
  onUpdateStudent,
}: {
  schoolId: string;
  settings: {
    photoDisplayMode?: "cover" | "contain";
    enableBadges?: boolean;
    enableFaceLogin?: boolean;
    enableStudentWelcome?: boolean;
    enableStudentWelcomeBackScreen?: boolean;
  };
  classes: Class[] | null | undefined;
  students: Student[] | null | undefined;
  filteredStudents: Student[];
  studentCsvInputRef: React.RefObject<HTMLInputElement>;
  onStudentCsvFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleStudentCsvUpload: () => void;
  csvImportBusy?: boolean;
  selectionMode: boolean;
  setSelectionMode: (v: boolean) => void;
  selectedStudentIds: Set<string>;
  setSelectedStudentIds: (
    updater: Set<string> | ((prev: Set<string>) => Set<string>),
  ) => void;
  isAllFilteredSelected: boolean;
  toggleSelectAllFiltered: () => void;
  studentSearchTerm: string;
  setStudentSearchTerm: (v: string) => void;
  studentSortOption: string;
  setStudentSortOption: (v: string) => void;
  studentFilterClass: string;
  setStudentFilterClass: (v: string) => void;
  onOpenIdPrintSetup: (args: { students: Student[]; classes: Class[] }) => void;
  getClassName: (id: string) => string;
  teachers: Teacher[];
  handleOpenStudentModal?: (s: Student | null) => void;
  onOpenFaceTraining?: (s: Student) => void;
  handleOpenActivityModal?: (s: Student) => void;
  setThemeStudent?: (s: Student) => void;
  setBadgesStudent?: (s: Student) => void;
  deleteStudent?: (studentId: string) => void;
  setStudentToPurge?: (s: Student) => void;
  previewIdCardStudent?: (s: Student) => void;
  onUpdateStudent?: (s: Student) => Promise<void> | void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();
  const playSound = useArcadeSound();
  const { purgeStudentsProgress, deleteStudent: deleteStudentRecord } =
    useAppContext();
  const [bulkPurgeOpen, setBulkPurgeOpen] = useState(false);
  const [isBulkPurging, setIsBulkPurging] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  // Preserve the current visible/sorted list order for bulk actions (especially printing).
  // Fall back to the full students list for any selected IDs that aren't currently visible.
  const selectedStudents = (() => {
    if (!selectedStudentIds || selectedStudentIds.size === 0) return [];
    const visibleSelected = filteredStudents.filter((s) =>
      selectedStudentIds.has(s.id),
    );
    const visibleIds = new Set(visibleSelected.map((s) => s.id));
    const hiddenSelected =
      students?.filter(
        (s) => selectedStudentIds.has(s.id) && !visibleIds.has(s.id),
      ) || [];
    return [...visibleSelected, ...hiddenSelected];
  })();
  const studentsForIdPrint =
    selectedStudentIds.size > 0 ? selectedStudents : filteredStudents;
  const bulkBusy = isBulkPurging || isBulkDeleting || isBulkUpdating;
  const toggleStudentSelected = (studentId: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };
  const studentKioskWelcomeToggleDefs =
    buildStudentKioskWelcomeToggleDefs(settings);
  const { activeByStudentId, isStudentFaceEnrolled } = useSchoolFaceEnrollments(students, {
    enabled: !!settings.enableFaceLogin,
  });
  const hasWelcomeBackToggle = studentKioskWelcomeToggleDefs.some(
    (d) => d.key === "welcomeBackScreenEnabled",
  );
  const hasWelcomeStyleToggle = studentKioskWelcomeToggleDefs.some(
    (d) => d.key === "welcomePageEnabled",
  );

  const bulkUpdateSelected = async (
    label: string,
    updater: (student: Student) => Partial<Student> | null,
  ) => {
    if (!onUpdateStudent || selectedStudents.length === 0) return;
    setIsBulkUpdating(true);
    try {
      let updated = 0;
      for (const s of selectedStudents) {
        const patch = updater(s);
        if (patch) {
          await onUpdateStudent({ ...s, ...patch });
          updated += 1;
        }
      }
      playSound("success");
      toast({
        title: label,
        description: `Updated ${updated} of ${selectedStudents.length} student(s).`,
      });
      setSelectedStudentIds(new Set());
    } catch (e: unknown) {
      playSound("error");
      const message = e instanceof Error ? e.message : "Please try again.";
      toast({
        variant: "destructive",
        title: "Bulk update failed",
        description: message,
      });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedStudents.length === 0) return;
    const ok = await confirm({
      title: `Delete ${selectedStudents.length} student${selectedStudents.length === 1 ? "" : "s"}?`,
      description:
        "This permanently removes each selected student, their points history, and coupon/prize records. This cannot be undone.",
      confirmLabel: `Delete ${selectedStudents.length} student${selectedStudents.length === 1 ? "" : "s"}`,
      destructive: true,
    });
    if (!ok) return;
    setIsBulkDeleting(true);
    let deleted = 0;
    let failed = 0;
    try {
      for (const s of selectedStudents) {
        try {
          await deleteStudentRecord(s.id);
          deleted += 1;
        } catch {
          failed += 1;
        }
      }
      setSelectedStudentIds(new Set());
      playSound(deleted > 0 ? "success" : "error");
      toast({
        title: deleted > 0 ? "Students deleted" : "Delete failed",
        description:
          failed > 0
            ? `Removed ${deleted}; ${failed} could not be deleted.`
            : `Removed ${deleted} student${deleted === 1 ? "" : "s"}.`,
        variant: deleted > 0 ? "default" : "destructive",
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkPurgeConfirm = async () => {
    if (selectedStudents.length === 0) return;
    setIsBulkPurging(true);
    try {
      const result = await purgeStudentsProgress(
        selectedStudents.map((s) => s.id),
      );
      setBulkPurgeOpen(false);
      setSelectedStudentIds(new Set());
      playSound(result.success > 0 ? "success" : "error");
      toast({
        title: result.success > 0 ? "Bulk purge complete" : "Purge failed",
        description:
          result.failed > 0
            ? `Reset ${result.success} student(s); ${result.failed} failed.`
            : `Reset points and badges for ${result.success} student(s). Activity history was kept.`,
        variant: result.success > 0 ? "default" : "destructive",
      });
    } catch (e: unknown) {
      playSound("error");
      const message = e instanceof Error ? e.message : "Please try again.";
      toast({
        variant: "destructive",
        title: "Bulk purge failed",
        description: message,
      });
    } finally {
      setIsBulkPurging(false);
    }
  };

  const studentActionHeaderLabels = [
    "Pts",
    ...studentKioskWelcomeToggleDefs.map(kioskToggleHeaderLabel),
    ...(settings.enableFaceLogin ? (["Face"] as const) : []),
    "Sign in",
    "Theme",
    "ID",
    "Activity",
    ...(settings.enableBadges ? (["Badges"] as const) : []),
    "Purge",
    "Delete",
  ];
  const studentsListGridCols = studentsListGridColumns(
    studentActionHeaderLabels.length,
  );
  const studentsListGridStyle = adminRecordListGridStyle(studentsListGridCols);
  const hasBulkSelection = selectedStudentIds.size > 0;
  return (
    <>
      <StaffPortalSectionCard className="overflow-visible">
        <StaffPortalSectionCardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-4 px-4 sm:px-5 bg-secondary">
          <Helper content="Manage your enrollments, view student activity, and print ID cards. Points are awarded from the Teacher Portal.">
            <StaffPortalSectionCardTitle className="text-2xl flex items-center gap-2 text-secondary-foreground">
              <Users className="text-ring w-6 h-6" /> Students
            </StaffPortalSectionCardTitle>
          </Helper>
          <div className="flex flex-wrap items-center gap-2 w-full pb-1 sm:pb-0 justify-between">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <Button
                onClick={() => handleOpenStudentModal?.(null)}
                className="rounded-xl shrink-0"
              >
                <Plus className="mr-2 h-4 w-4" /> Add Student
              </Button>
              {hasBulkSelection ? (
                <StudentBulkActionsMenu
                  selectedStudents={selectedStudents}
                  classes={classes || undefined}
                  teachers={teachers}
                  bulkBusy={bulkBusy}
                  isBulkDeleting={isBulkDeleting}
                  hasWelcomeBackToggle={hasWelcomeBackToggle}
                  hasWelcomeStyleToggle={hasWelcomeStyleToggle}
                  onOpenIdPrintSetup={onOpenIdPrintSetup}
                  onPurgeOpen={() => setBulkPurgeOpen(true)}
                  onBulkDelete={() => void handleBulkDelete()}
                  bulkUpdateSelected={bulkUpdateSelected}
                />
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 justify-end shrink-0">
              <TabWalkthroughHeaderAction />
              <Button
                onClick={handleStudentCsvUpload}
                variant="outline"
                disabled={csvImportBusy}
                className="rounded-xl px-4 border-ring/35 bg-background/70 hover:bg-secondary hover:text-secondary-foreground"
                type="button"
              >
                {csvImportBusy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Import CSV
              </Button>
              <Button
                onClick={() => {
                  onOpenIdPrintSetup({
                    students: studentsForIdPrint,
                    classes: classes || [],
                  });
                }}
                disabled={studentsForIdPrint.length === 0}
                variant="outline"
                className={cn(
                  "rounded-xl px-4 border-ring/35 bg-background/70 hover:bg-secondary hover:text-secondary-foreground",
                  (selectedStudentIds.size > 0 ||
                    studentFilterClass !== "all") &&
                    "border-primary/55 bg-primary/12 font-semibold text-foreground shadow-sm hover:bg-primary/18 hover:text-foreground",
                )}
              >
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <input
                type="file"
                ref={studentCsvInputRef}
                onChange={onStudentCsvFileChange}
                className="hidden"
                accept=".csv"
              />
            </div>
          </div>
        </StaffPortalSectionCardHeader>
        <StaffPortalSectionCardContent className="min-w-0 overflow-visible px-3 pb-4 sm:px-4">
          <div className="mb-6 space-y-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="relative min-w-0 flex-1">
                <Input
                  placeholder="Search by name, nickname, or ID..."
                  value={studentSearchTerm}
                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                  className="rounded-full pl-10 h-11"
                />
                <LayoutDashboard className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={studentFilterClass}
                  onValueChange={setStudentFilterClass}
                >
                  <SelectTrigger className="w-full sm:w-[180px] rounded-xl h-11">
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={studentSortOption}
                  onValueChange={setStudentSortOption}
                >
                  <SelectTrigger className="w-full sm:w-[180px] rounded-xl h-11">
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="updatedAtDesc">
                      Recently changed
                    </SelectItem>
                    <SelectItem value="updatedAtAsc">Oldest changed</SelectItem>
                    <SelectItem value="lastNameAsc">Last Name (A-Z)</SelectItem>
                    <SelectItem value="lastNameDesc">
                      Last Name (Z-A)
                    </SelectItem>
                    <SelectItem value="firstNameAsc">
                      First Name (A-Z)
                    </SelectItem>
                    <SelectItem value="firstNameDesc">
                      First Name (Z-A)
                    </SelectItem>
                    <SelectItem value="pointsDesc">
                      Points (High - Low)
                    </SelectItem>
                    <SelectItem value="pointsAsc">
                      Points (Low - High)
                    </SelectItem>
                    <SelectItem value="createdAtDesc">
                      Created (Newest)
                    </SelectItem>
                    <SelectItem value="createdAtAsc">
                      Created (Oldest)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl px-4 font-semibold border-ring/35 hover:bg-secondary hover:text-secondary-foreground"
                  disabled={filteredStudents.length === 0}
                  onClick={() => toggleSelectAllFiltered()}
                >
                  {isAllFilteredSelected
                    ? `Deselect visible (${filteredStudents.length})`
                    : `Select visible (${filteredStudents.length})`}
                </Button>
              </div>
            </div>
          </div>


          <AdminRecordListScroll>
            <ul
              className={cn(
                "flex w-full min-w-0 flex-col gap-1.5 pr-12",
              )}
            >
              {filteredStudents.length === 0 ? (
                <li className="mb-2 rounded-xl border bg-secondary/60 p-4 text-sm text-muted-foreground">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">No students match the current view.</p>
                      <p>
                        Total loaded: <span className="font-mono">{students?.length ?? 0}</span> · Visible after filters:{' '}
                        <span className="font-mono">{filteredStudents.length}</span>
                      </p>
                      <p>
                        Search: <span className="font-mono">{studentSearchTerm ? JSON.stringify(studentSearchTerm) : '""'}</span> · Class:{' '}
                        <span className="font-mono">{studentFilterClass}</span> · Sort:{' '}
                        <span className="font-mono">{studentSortOption}</span>
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setStudentSearchTerm("");
                          setStudentFilterClass("all");
                          setStudentSortOption("updatedAtDesc");
                        }}
                      >
                        Clear filters
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.refresh()}
                      >
                        Refresh
                      </Button>
                    </div>
                  </div>
                </li>
              ) : null}
              {filteredStudents.length > 0 ? (
                <AdminRecordListHeader
                  gridColumns={studentsListGridCols}
                  columns={[
                    {
                      id: "hdr-select",
                      label: "Sel",
                      className: "hidden sm:block text-center",
                    },
                    {
                      id: "hdr-edit",
                      label: "",
                      className: "hidden sm:block",
                    },
                    {
                      id: "hdr-student",
                      label: "Student",
                      className: "hidden sm:block min-w-0 truncate text-left",
                    },
                    ...studentActionHeaderLabels.map((label, i) => ({
                      id: `hdr-act-${i}-${label}`,
                      label,
                      className:
                        "hidden sm:block truncate text-center whitespace-nowrap",
                    })),
                  ]}
                />
              ) : null}
              {filteredStudents.map((s) => {
                const teacherLine = formatAssignedTeachers(s, teachers);
                const hasParentContact = !!(
                  s.parentEmail?.trim() || s.parentPhone?.trim()
                );
                const hasStudentContact = !!(
                  s.studentEmail?.trim() || s.studentPhone?.trim()
                );
                const middle = s.middleName?.trim();
                return (
                  <li
                    key={s.id}
                    className={cn(
                      "flex flex-wrap items-center gap-2 overflow-visible py-1.5 px-2 rounded-xl border transition-all sm:grid sm:flex-nowrap sm:items-center",
                      adminRecordListGridClassName,
                      adminRecordListGridCompactGapClassName,
                      "cursor-default",
                      selectedStudentIds.has(s.id)
                        ? "bg-secondary border-ring/45 hover:bg-secondary"
                        : "bg-secondary/45 border-transparent hover:bg-secondary/80",
                    )}
                    style={studentsListGridStyle}
                  >
                    <div
                      className="flex items-center justify-center shrink-0 sm:justify-self-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={selectedStudentIds.has(s.id)}
                        onCheckedChange={() => toggleStudentSelected(s.id)}
                        aria-label={`Select ${s.firstName} ${s.lastName}`}
                        className="h-5 w-5 rounded-md"
                      />
                    </div>
                    <div
                      className="flex items-center gap-2 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 min-h-0 min-w-0 rounded-full sm:justify-self-center"
                        onClick={() => handleOpenStudentModal?.(s)}
                        title="Edit student"
                      >
                        <Edit className="h-3.5 w-3.5 text-primary" />
                      </Button>
                    </div>
                    <div
                      className={cn(
                        "flex max-sm:flex-[1_1_10rem] items-center gap-2",
                        adminRecordListGridNameCellClassName,
                      )}
                    >
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-secondary border border-ring/35 flex items-center justify-center text-xs font-bold text-secondary-foreground flex-shrink-0">
                        {s.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={s.photoUrl}
                            alt={`${s.firstName} ${s.lastName}`}
                            className={
                              settings.photoDisplayMode === "cover"
                                ? "h-full w-full object-cover"
                                : "h-full w-full object-contain"
                            }
                          />
                        ) : (
                          <span>
                            {s.firstName[0] || ""}
                            {s.lastName[0] || ""}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="min-w-0 max-w-full break-words font-bold text-sm leading-tight sm:text-base sm:truncate">
                            {s.lastName}, {s.firstName}
                            {middle ? (
                              <span className="font-medium text-muted-foreground">
                                {" "}
                                {middle}
                              </span>
                            ) : null}
                          </p>
                          {isBirthdayToday(s.birthday) ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest"
                              title="Birthday today"
                            >
                              <Cake className="w-3 h-3" />
                              Birthday
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[11px] sm:text-xs text-muted-foreground leading-snug truncate">
                          {getClassName(s.classId || "")}
                          <span className="text-border mx-1.5">·</span>
                          <span className="font-code">{s.nfcId || "—"}</span>
                          {teacherLine ? (
                            <>
                              <span className="text-border mx-1.5">·</span>
                              <span className="truncate" title={teacherLine}>
                                {teacherLine}
                              </span>
                            </>
                          ) : null}
                          {hasParentContact || hasStudentContact ? (
                            <>
                              <span className="text-border mx-1.5">·</span>
                              <span
                                className="inline-flex items-center gap-1"
                                title="Contact on file"
                              >
                                {hasParentContact ? (
                                  <span className="font-semibold">Parent</span>
                                ) : null}
                                {hasStudentContact ? (
                                  <span className="font-semibold">Student</span>
                                ) : null}
                              </span>
                            </>
                          ) : null}
                        </p>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "flex min-w-0 max-sm:basis-full max-sm:flex-wrap max-sm:justify-start max-sm:gap-1 max-sm:border-t max-sm:border-border/50 max-sm:pt-2 sm:contents",
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <StudentPointsTypeButton student={s} />
                      {studentKioskWelcomeToggleDefs.length > 0 ? (
                        <AutoCircularToggles
                          record={s}
                          defs={studentKioskWelcomeToggleDefs}
                          restrictToDefs
                          wrap={false}
                          containerClassName="sm:contents shrink-0 flex-nowrap gap-0.5"
                          toggleButtonClassName="h-8 w-8 min-h-0 min-w-0 text-[7px] sm:justify-self-center"
                          onToggle={(key, val) => {
                            if (onUpdateStudent) {
                              onUpdateStudent({ ...s, [key]: val });
                            }
                          }}
                        />
                      ) : null}
                      {settings.enableFaceLogin ? (
                        (() => {
                          const faceEnrollment = activeByStudentId.get(s.id);
                          const faceTrained = isStudentFaceEnrolled(s.id);
                          return (
                            <Button
                              variant={faceTrained ? "default" : "outline"}
                              size="icon"
                              className={cn(
                                "h-8 w-8 min-h-0 min-w-0 rounded-full sm:justify-self-center",
                                faceTrained
                                  ? "border-sky-600 bg-sky-600 text-white hover:bg-sky-700 hover:text-white shadow-sm"
                                  : "border-dashed border-sky-300/80 bg-background/60 hover:bg-sky-50 dark:border-sky-800 dark:hover:bg-sky-950/40",
                              )}
                              onClick={() => onOpenFaceTraining?.(s)}
                              title={
                                faceTrained
                                  ? `Face login trained (${faceEnrollment?.scanCount ?? 1} scan${(faceEnrollment?.scanCount ?? 1) === 1 ? "" : "s"}) — click to retrain`
                                  : "Train face login"
                              }
                            >
                              <ScanFace
                                className={cn(
                                  "w-4 h-4",
                                  faceTrained
                                    ? "text-white"
                                    : "text-sky-600/70 dark:text-sky-400/70",
                                )}
                              />
                            </Button>
                          );
                        })()
                      ) : null}
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 min-h-0 min-w-0 rounded-full sm:justify-self-center"
                        onClick={() => {
                          if (!schoolId?.trim()) {
                            toast({
                              variant: "destructive",
                              title: "School not ready",
                              description: "Refresh the page and try again.",
                            });
                            return;
                          }
                          router.push(
                            `/${schoolId.trim().toLowerCase()}/student?student=${encodeURIComponent(s.id)}`,
                          );
                        }}
                        title="Sign in to student kiosk"
                      >
                        <LogIn className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 min-h-0 min-w-0 rounded-full sm:justify-self-center"
                        onClick={() => setThemeStudent?.(s)}
                        title="Generate AI Theme"
                      >
                        <Wand2 className="w-4 h-4 text-purple-500" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 min-h-0 min-w-0 rounded-full sm:justify-self-center"
                        onClick={() => previewIdCardStudent?.(s)}
                        title="Preview ID Card"
                      >
                        <IdCard className="w-4 h-4 text-primary" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 min-h-0 min-w-0 rounded-full sm:justify-self-center"
                        onClick={() => handleOpenActivityModal?.(s)}
                        title="Activity history"
                      >
                        <History className="w-4 h-4" />
                      </Button>
                      {settings.enableBadges && (
                        <Button
                          variant="outline"
                          size="icon"
                          className={cn(
                            "h-8 w-8 min-h-0 min-w-0 rounded-full sm:justify-self-center",
                            (!s.earnedBadges || s.earnedBadges.length === 0) &&
                              "opacity-40",
                          )}
                          disabled={
                            !s.earnedBadges || s.earnedBadges.length === 0
                          }
                          onClick={() => setBadgesStudent?.(s)}
                          title="View badges for this student"
                        >
                          <Award
                            className={cn(
                              "w-4 h-4",
                              !s.earnedBadges || s.earnedBadges.length === 0
                                ? "text-muted-foreground"
                                : "text-primary",
                            )}
                          />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 min-h-0 min-w-0 rounded-full text-primary hover:bg-primary/10 sm:justify-self-center"
                        title="Purge points & badges"
                        onClick={() => setStudentToPurge?.(s)}
                      >
                        <Zap className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 min-h-0 min-w-0 rounded-full text-destructive hover:bg-destructive/10 sm:justify-self-center"
                        onClick={() => deleteStudent?.(s.id)}
                        title="Delete student"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </AdminRecordListScroll>
        </StaffPortalSectionCardContent>
      </StaffPortalSectionCard>
      <AlertDialog
        open={bulkPurgeOpen}
        onOpenChange={(open) => !isBulkPurging && setBulkPurgeOpen(open)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Purge points & badges for {selectedStudents.length} student
              {selectedStudents.length === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This resets current points, lifetime points, category totals,
              achievements, and badges to zero for each selected student.
              Activity history stays for audit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isBulkPurging}
              onClick={() => setBulkPurgeOpen(false)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 hover:bg-amber-700"
              disabled={isBulkPurging || selectedStudents.length === 0}
              onClick={() => void handleBulkPurgeConfirm()}
            >
              {isBulkPurging ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Purge {selectedStudents.length} student
              {selectedStudents.length === 1 ? "" : "s"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
