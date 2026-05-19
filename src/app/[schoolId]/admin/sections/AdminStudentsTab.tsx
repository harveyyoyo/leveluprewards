'use client';
import { useState, type CSSProperties } from 'react';


import { Award, Cake, CheckSquare, Edit, History, IdCard, LayoutDashboard, Loader2, LogIn, Plus, Printer, ScanFace, Trash2, UploadCloud, Users, Wand2, X, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import styles from './AdminStudentsTab.module.css';
import { useAppContext } from '@/components/AppProvider';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Helper } from '@/components/ui/helper';
import { AdminRecordListHeader } from '@/components/admin/AdminRecordListHeader';
import { TabWalkthroughHeaderAction } from '@/components/tabWalkthrough/TabWalkthroughContext';
import { useToast } from '@/hooks/use-toast';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { cn } from '@/lib/utils';
import type { Class, Student, Teacher } from '@/lib/types';
import { AutoCircularToggles, type ToggleDef } from '@/components/AutoCircularToggles';
import { STUDENT_WELCOME_STYLES_LIVE } from '@/lib/studentWelcome';
import { formatStudentPointTypes } from '@/lib/studentPointTypes';

function buildStudentKioskWelcomeToggleDefs(settings: {
  enableStudentWelcome?: boolean;
  enableStudentWelcomeBackScreen?: boolean;
}): ToggleDef[] {
  const out: ToggleDef[] = [];
  if (settings.enableStudentWelcomeBackScreen) {
    out.push({
      key: 'welcomeBackScreenEnabled',
      label:
        'Welcome back splash — short full-screen greeting when this student opens the kiosk (duration is in school Settings).',
      shortLabel: 'SPL',
      missingMeansOn: true,
    });
  }
  if (STUDENT_WELCOME_STYLES_LIVE && settings.enableStudentWelcome) {
    out.push({
      key: 'welcomePageEnabled',
      label:
        'Style welcome page — when off, this student will not see the Welcome styles picker on the kiosk (school setting must stay on).',
      shortLabel: 'STY',
      missingMeansOn: true,
    });
  }
  return out;
}

function formatAssignedTeachers(student: Student, teachers: Teacher[]): string | null {
  const ids = student.teacherIds;
  if (!ids?.length) return null;
  const names = ids.map((id) => teachers.find((t) => t.id === id)?.name).filter((n): n is string => !!n?.trim());
  if (names.length === 0) return `${ids.length} teacher link${ids.length === 1 ? '' : 's'}`;
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} · ${names[1]}`;
  return `${names.length} teachers`;
}

function kioskToggleHeaderLabel(def: ToggleDef): string {
  if (def.key === 'welcomeBackScreenEnabled') return 'Splash';
  if (def.key === 'welcomePageEnabled') return 'Style';
  return def.shortLabel;
}

function isBirthdayToday(birthdayIso?: string): boolean {
  if (!birthdayIso || birthdayIso.length < 10) return false;
  const md = birthdayIso.slice(5, 10);
  const now = new Date();
  const todayMd = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return md === todayMd;
}

export function AdminStudentsTab({
  schoolId,
  settings,
  classes,
  students,
  filteredStudents,
  studentCsvInputRef,
  studentCsvMapInputRef,
  onStudentCsvFileChange,
  onStudentCsvMapFileChange,
  handleStudentCsvUpload,
  handleStudentCsvMapUpload,
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
    photoDisplayMode?: 'cover' | 'contain';
    enableBadges?: boolean;
    enableFaceLogin?: boolean;
    enableStudentWelcome?: boolean;
    enableStudentWelcomeBackScreen?: boolean;
  };
  classes: Class[] | null | undefined;
  students: Student[] | null | undefined;
  filteredStudents: Student[];
  studentCsvInputRef: React.RefObject<HTMLInputElement>;
  studentCsvMapInputRef?: React.RefObject<HTMLInputElement>;
  onStudentCsvFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStudentCsvMapFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleStudentCsvUpload: () => void;
  handleStudentCsvMapUpload?: () => void;
  selectionMode: boolean;
  setSelectionMode: (v: boolean) => void;
  selectedStudentIds: Set<string>;
  setSelectedStudentIds: (updater: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
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
  const { purgeStudentsProgress, deleteStudent: deleteStudentRecord } = useAppContext();
  const [selectedTeacherIdForBulk, setSelectedTeacherIdForBulk] = useState('');
  const [selectedClassIdForBulk, setSelectedClassIdForBulk] = useState('');
  const [bulkPurgeOpen, setBulkPurgeOpen] = useState(false);
  const [isBulkPurging, setIsBulkPurging] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const filteredSelectedCount = filteredStudents.filter((s) => selectedStudentIds.has(s.id)).length;
  const selectedStudents = students?.filter((s) => selectedStudentIds.has(s.id)) || [];
  const studentsForIdPrint = selectedStudentIds.size > 0 ? selectedStudents : filteredStudents;
  const bulkBusy = isBulkPurging || isBulkDeleting || isBulkUpdating;
  const toggleStudentSelected = (studentId: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };
  const studentKioskWelcomeToggleDefs = buildStudentKioskWelcomeToggleDefs(settings);
  const hasWelcomeBackToggle = studentKioskWelcomeToggleDefs.some((d) => d.key === 'welcomeBackScreenEnabled');
  const hasWelcomeStyleToggle = studentKioskWelcomeToggleDefs.some((d) => d.key === 'welcomePageEnabled');

  const bulkUpdateSelected = async (
    label: string,
    updater: (student: Student) => Student | null,
  ) => {
    if (!onUpdateStudent || selectedStudents.length === 0) return;
    setIsBulkUpdating(true);
    try {
      let updated = 0;
      for (const s of selectedStudents) {
        const next = updater(s);
        if (next) {
          await onUpdateStudent(next);
          updated += 1;
        }
      }
      playSound('success');
      toast({
        title: label,
        description: `Updated ${updated} of ${selectedStudents.length} student(s).`,
      });
      setSelectedStudentIds(new Set());
    } catch (e: unknown) {
      playSound('error');
      const message = e instanceof Error ? e.message : 'Please try again.';
      toast({ variant: 'destructive', title: 'Bulk update failed', description: message });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedStudents.length === 0) return;
    const ok = await confirm({
      title: `Delete ${selectedStudents.length} student${selectedStudents.length === 1 ? '' : 's'}?`,
      description:
        'This permanently removes each selected student, their points history, and coupon/prize records. This cannot be undone.',
      confirmLabel: `Delete ${selectedStudents.length} student${selectedStudents.length === 1 ? '' : 's'}`,
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
      playSound(deleted > 0 ? 'success' : 'error');
      toast({
        title: deleted > 0 ? 'Students deleted' : 'Delete failed',
        description:
          failed > 0
            ? `Removed ${deleted}; ${failed} could not be deleted.`
            : `Removed ${deleted} student${deleted === 1 ? '' : 's'}.`,
        variant: deleted > 0 ? 'default' : 'destructive',
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkPurgeConfirm = async () => {
    if (selectedStudents.length === 0) return;
    setIsBulkPurging(true);
    try {
      const result = await purgeStudentsProgress(selectedStudents.map((s) => s.id));
      setBulkPurgeOpen(false);
      setSelectedStudentIds(new Set());
      playSound(result.success > 0 ? 'success' : 'error');
      toast({
        title: result.success > 0 ? 'Bulk purge complete' : 'Purge failed',
        description:
          result.failed > 0
            ? `Reset ${result.success} student(s); ${result.failed} failed.`
            : `Reset points and badges for ${result.success} student(s). Activity history was kept.`,
        variant: result.success > 0 ? 'default' : 'destructive',
      });
    } catch (e: unknown) {
      playSound('error');
      const message = e instanceof Error ? e.message : 'Please try again.';
      toast({ variant: 'destructive', title: 'Bulk purge failed', description: message });
    } finally {
      setIsBulkPurging(false);
    }
  };

  const studentActionHeaderLabels = [
    ...studentKioskWelcomeToggleDefs.map(kioskToggleHeaderLabel),
    ...(settings.enableFaceLogin ? (['Face'] as const) : []),
    'Sign in',
    'Theme',
    'ID',
    'Activity',
    ...(settings.enableBadges ? (['Badges'] as const) : []),
    'Purge',
    'Delete',
  ];
  const studentsListGridCols = `44px 44px minmax(260px, 1fr) repeat(${studentActionHeaderLabels.length}, minmax(2.25rem, auto))`;
  const studentsListGridStyle = {
    ['--students-list-cols' as string]: studentsListGridCols,
  } as CSSProperties;
  return (
    <Card className="w-full border-t-4 border-ring shadow-md overflow-hidden">
      <CardHeader className="bg-secondary flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-8">
        <Helper content="Manage your enrollments, view student activity, and print ID cards. Points are awarded from the Teacher Portal.">
          <CardTitle className="text-2xl flex items-center gap-2 text-secondary-foreground">
            <Users className="text-ring w-6 h-6" /> Students
          </CardTitle>
        </Helper>
        <CardDescription>Manage your enrollments and view student activity.</CardDescription>
        <div className="flex flex-wrap items-center gap-2 w-full pb-1 sm:pb-0 justify-between">
          <Button onClick={() => handleOpenStudentModal?.(null)} className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" /> Add Student
          </Button>
          <div className="flex flex-wrap gap-2 justify-end">
          <TabWalkthroughHeaderAction />
          <Button onClick={handleStudentCsvUpload} variant="outline" className="rounded-xl px-4 border-ring/35 bg-background/70 hover:bg-secondary hover:text-secondary-foreground">
            <UploadCloud className="mr-2 h-4 w-4" /> Import CSV
          </Button>
          {handleStudentCsvMapUpload && onStudentCsvMapFileChange && studentCsvMapInputRef ? (
            <Button
              onClick={handleStudentCsvMapUpload}
              variant="outline"
              className="rounded-xl px-4 border-ring/35 bg-background/70 hover:bg-secondary hover:text-secondary-foreground"
              type="button"
            >
              <Wand2 className="mr-2 h-4 w-4" /> Import CSV (map columns)
            </Button>
          ) : null}
          <Button
            onClick={() => {
              onOpenIdPrintSetup({ students: studentsForIdPrint, classes: classes || [] });
            }}
            disabled={studentsForIdPrint.length === 0}
            variant="outline"
            className={cn(
              'rounded-xl px-4 border-ring/35 bg-background/70 hover:bg-secondary hover:text-secondary-foreground',
              (selectedStudentIds.size > 0 || studentFilterClass !== 'all') &&
                'border-primary/55 bg-primary/12 font-semibold text-foreground shadow-sm hover:bg-primary/18 hover:text-foreground',
            )}
          >
            <Printer className="mr-2 h-4 w-4" />
            {selectedStudentIds.size > 0
              ? `Print selected IDs (${selectedStudentIds.size})`
              : studentFilterClass !== 'all'
                ? `Print class IDs (${filteredStudents.length})`
                : 'Print visible IDs'}
          </Button>
          <input type="file" ref={studentCsvInputRef} onChange={onStudentCsvFileChange} className="hidden" accept=".csv" />
          {studentCsvMapInputRef && onStudentCsvMapFileChange ? (
            <input
              type="file"
              ref={studentCsvMapInputRef}
              onChange={onStudentCsvMapFileChange}
              className="hidden"
              accept=".csv"
            />
          ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
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
              <Select value={studentFilterClass} onValueChange={setStudentFilterClass}>
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
              <Select value={studentSortOption} onValueChange={setStudentSortOption}>
                <SelectTrigger className="w-full sm:w-[180px] rounded-xl h-11">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updatedAtDesc">Recently changed</SelectItem>
                  <SelectItem value="updatedAtAsc">Oldest changed</SelectItem>
                  <SelectItem value="lastNameAsc">Last Name (A-Z)</SelectItem>
                  <SelectItem value="lastNameDesc">Last Name (Z-A)</SelectItem>
                  <SelectItem value="firstNameAsc">First Name (A-Z)</SelectItem>
                  <SelectItem value="firstNameDesc">First Name (Z-A)</SelectItem>
                  <SelectItem value="pointsDesc">Points (High - Low)</SelectItem>
                  <SelectItem value="pointsAsc">Points (Low - High)</SelectItem>
                  <SelectItem value="createdAtDesc">Created (Newest)</SelectItem>
                  <SelectItem value="createdAtAsc">Created (Oldest)</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl px-4 font-semibold border-ring/35 hover:bg-secondary hover:text-secondary-foreground"
                disabled={filteredStudents.length === 0}
                onClick={() => toggleSelectAllFiltered()}
              >
                {isAllFilteredSelected ? `Deselect visible (${filteredStudents.length})` : `Select visible (${filteredStudents.length})`}
              </Button>
            </div>
          </div>
          {selectedStudentIds.size > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-ring/35 bg-secondary px-3 py-2">
              <div className="flex items-center gap-2 pr-1 text-sm font-semibold text-secondary-foreground">
                <CheckSquare className="h-4 w-4" />
                <span>{selectedStudentIds.size} selected</span>
                {filteredSelectedCount > 0 && filteredSelectedCount !== selectedStudentIds.size ? (
                  <span className="text-muted-foreground">({filteredSelectedCount} visible)</span>
                ) : null}
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-8 rounded-lg px-3 text-xs font-semibold border-ring/35 hover:bg-secondary hover:text-secondary-foreground"
                disabled={bulkBusy}
                onClick={() => onOpenIdPrintSetup({ students: selectedStudents, classes: classes || [] })}
              >
                <Printer className="mr-1.5 h-3.5 w-3.5" />
                Print IDs
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-8 rounded-lg px-3 text-xs font-semibold border-amber-500/40 text-amber-800 hover:bg-amber-500/10 dark:text-amber-200"
                disabled={bulkBusy}
                onClick={() => setBulkPurgeOpen(true)}
              >
                <Zap className="mr-1.5 h-3.5 w-3.5" />
                Purge points
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-8 rounded-lg px-3 text-xs font-semibold border-destructive/40 text-destructive hover:bg-destructive/10"
                disabled={bulkBusy}
                onClick={() => void handleBulkDelete()}
              >
                {isBulkDeleting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />}
                Delete
              </Button>
              {teachers && teachers.length > 0 ? (
                <>
                  <Select
                    value={selectedTeacherIdForBulk}
                    onValueChange={setSelectedTeacherIdForBulk}
                    disabled={bulkBusy}
                  >
                    <SelectTrigger className="h-8 w-[165px] rounded-lg bg-background text-xs">
                      <SelectValue placeholder="Teacher..." />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-lg px-3 text-xs font-semibold border-ring/35 hover:bg-secondary hover:text-secondary-foreground"
                    disabled={!selectedTeacherIdForBulk || bulkBusy}
                    onClick={() =>
                      void bulkUpdateSelected('Teachers added', (s) => {
                        const current = s.teacherIds || [];
                        if (!selectedTeacherIdForBulk || current.includes(selectedTeacherIdForBulk)) return null;
                        return { ...s, teacherIds: [...current, selectedTeacherIdForBulk] };
                      })
                    }
                  >
                    Add teacher
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-lg px-3 text-xs font-semibold border-ring/35 hover:bg-secondary hover:text-secondary-foreground"
                    disabled={!selectedTeacherIdForBulk || bulkBusy}
                    onClick={() =>
                      void bulkUpdateSelected('Teachers removed', (s) => {
                        const current = s.teacherIds || [];
                        if (!selectedTeacherIdForBulk || !current.includes(selectedTeacherIdForBulk)) return null;
                        return { ...s, teacherIds: current.filter((id) => id !== selectedTeacherIdForBulk) };
                      })
                    }
                  >
                    Remove teacher
                  </Button>
                </>
              ) : null}
              {classes && classes.length > 0 ? (
                <>
                  <Select
                    value={selectedClassIdForBulk}
                    onValueChange={setSelectedClassIdForBulk}
                    disabled={bulkBusy}
                  >
                    <SelectTrigger className="h-8 w-[155px] rounded-lg bg-background text-xs">
                      <SelectValue placeholder="Class..." />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-lg px-3 text-xs font-semibold border-ring/35 hover:bg-secondary hover:text-secondary-foreground"
                    disabled={!selectedClassIdForBulk || bulkBusy}
                    onClick={() =>
                      void bulkUpdateSelected('Class updated', (s) => {
                        if (!selectedClassIdForBulk || s.classId === selectedClassIdForBulk) return null;
                        return { ...s, classId: selectedClassIdForBulk };
                      })
                    }
                  >
                    Move class
                  </Button>
                </>
              ) : null}
              {hasWelcomeBackToggle ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-lg px-3 text-xs font-semibold border-ring/35"
                    disabled={bulkBusy}
                    onClick={() =>
                      void bulkUpdateSelected('Welcome splash enabled', (s) =>
                        s.welcomeBackScreenEnabled === true ? null : { ...s, welcomeBackScreenEnabled: true },
                      )
                    }
                  >
                    Splash on
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-lg px-3 text-xs font-semibold border-ring/35"
                    disabled={bulkBusy}
                    onClick={() =>
                      void bulkUpdateSelected('Welcome splash disabled', (s) =>
                        s.welcomeBackScreenEnabled === false ? null : { ...s, welcomeBackScreenEnabled: false },
                      )
                    }
                  >
                    Splash off
                  </Button>
                </>
              ) : null}
              {hasWelcomeStyleToggle ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-lg px-3 text-xs font-semibold border-ring/35"
                    disabled={bulkBusy}
                    onClick={() =>
                      void bulkUpdateSelected('Style welcome enabled', (s) =>
                        s.welcomePageEnabled === true ? null : { ...s, welcomePageEnabled: true },
                      )
                    }
                  >
                    Style on
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-lg px-3 text-xs font-semibold border-ring/35"
                    disabled={bulkBusy}
                    onClick={() =>
                      void bulkUpdateSelected('Style welcome disabled', (s) =>
                        s.welcomePageEnabled === false ? null : { ...s, welcomePageEnabled: false },
                      )
                    }
                  >
                    Style off
                  </Button>
                </>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                className="ml-auto h-8 rounded-lg px-3 text-xs font-semibold"
                disabled={bulkBusy}
                onClick={() => setSelectedStudentIds(new Set())}
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                Clear
              </Button>
            </div>
          ) : null}
          </div>

        <div className="w-full overflow-x-auto">
          <ul className="flex flex-col gap-1.5 pr-4">
            {filteredStudents.length > 0 ? (
              <AdminRecordListHeader
                gridClassName={cn(styles.studentsListGrid, 'max-sm:grid-cols-1')}
                style={studentsListGridStyle}
                columns={[
                  { id: 'hdr-select', label: 'Select', className: 'hidden sm:block text-center' },
                  { id: 'hdr-edit', label: 'Edit', className: 'hidden sm:block' },
                  { id: 'hdr-student', label: 'Student', className: 'hidden sm:block' },
                  ...studentActionHeaderLabels.map((label, i) => ({
                    id: `hdr-act-${i}-${label}`,
                    label,
                    className: 'hidden sm:block text-center whitespace-nowrap',
                  })),
                ]}
              />
            ) : null}
            {filteredStudents.map((s) => {
              const teacherLine = formatAssignedTeachers(s, teachers);
              const hasParentContact = !!(s.parentEmail?.trim() || s.parentPhone?.trim());
              const hasStudentContact = !!(s.studentEmail?.trim() || s.studentPhone?.trim());
              const middle = s.middleName?.trim();
              const pointTypeLine = formatStudentPointTypes(s, 4);
              return (
              <li
                key={s.id}
                className={cn(
                  'flex flex-wrap items-center gap-3 py-2 px-3 rounded-xl border transition-all min-w-0 sm:grid sm:flex-nowrap sm:items-center',
                  styles.studentsListGrid,
                  'cursor-pointer',
                  selectedStudentIds.has(s.id)
                    ? 'bg-secondary border-ring/45 hover:bg-secondary'
                    : 'bg-secondary/45 border-transparent hover:bg-secondary/80'
                )}
                style={studentsListGridStyle}
                role="button"
                tabIndex={0}
                onClick={() => toggleStudentSelected(s.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleStudentSelected(s.id);
                  }
                }}
              >
                <div className="flex items-center justify-center shrink-0 sm:justify-self-center" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedStudentIds.has(s.id)}
                    onCheckedChange={() => toggleStudentSelected(s.id)}
                    aria-label={`Select ${s.firstName} ${s.lastName}`}
                    className="h-5 w-5 rounded-md"
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full sm:justify-self-center"
                    onClick={() => handleOpenStudentModal?.(s)}
                    title="Edit student"
                  >
                    <Edit className="w-4 h-4 text-primary" />
                  </Button>
                </div>
                <div className="flex min-w-0 flex-[1_1_10rem] items-center gap-2.5 overflow-hidden sm:min-w-0 sm:gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-secondary border border-ring/35 flex items-center justify-center text-xs font-bold text-secondary-foreground flex-shrink-0">
                    {s.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.photoUrl}
                        alt={`${s.firstName} ${s.lastName}`}
                        className={settings.photoDisplayMode === 'cover' ? 'h-full w-full object-cover' : 'h-full w-full object-contain'}
                      />
                    ) : (
                      <span>
                        {(s.firstName[0] || '')}
                        {(s.lastName[0] || '')}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="min-w-0 max-w-full break-words font-bold text-sm leading-tight sm:text-base sm:truncate">
                        {s.lastName}, {s.firstName}
                        {middle ? <span className="font-medium text-muted-foreground"> {middle}</span> : null}
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
                      <span className="shrink-0 text-ring font-bold text-xs tabular-nums">{s.points} pts</span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-muted-foreground leading-snug truncate">
                      {getClassName(s.classId || '')}
                      <span className="text-border mx-1.5">·</span>
                      <span className="font-code">{s.nfcId || '—'}</span>
                      {teacherLine ? (
                        <>
                          <span className="text-border mx-1.5">·</span>
                          <span className="truncate" title={teacherLine}>{teacherLine}</span>
                        </>
                      ) : null}
                      {hasParentContact || hasStudentContact ? (
                        <>
                          <span className="text-border mx-1.5">·</span>
                          <span className="inline-flex items-center gap-1" title="Contact on file">
                            {hasParentContact ? <span className="font-semibold">Parent</span> : null}
                            {hasStudentContact ? <span className="font-semibold">Student</span> : null}
                          </span>
                        </>
                      ) : null}
                    </p>
                    <p
                      className={cn(
                        'mt-0.5 text-[11px] sm:text-xs leading-snug truncate',
                        pointTypeLine === 'No point types yet' ? 'text-muted-foreground/75' : 'text-foreground/75',
                      )}
                      title={pointTypeLine}
                    >
                      <span className="font-semibold text-muted-foreground">Types:</span> {pointTypeLine}
                    </p>
                  </div>
                </div>
                <div
                  className="flex min-w-0 max-sm:basis-full max-sm:flex-wrap max-sm:justify-start max-sm:gap-1.5 max-sm:border-t max-sm:border-border/50 max-sm:pt-2 shrink-0 justify-end sm:contents sm:pl-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {studentKioskWelcomeToggleDefs.length > 0 ? (
                    <AutoCircularToggles
                      record={s}
                      defs={studentKioskWelcomeToggleDefs}
                      restrictToDefs
                      containerClassName="sm:contents shrink-0 flex-nowrap"
                      toggleButtonClassName="sm:justify-self-center"
                      onToggle={(key, val) => {
                        if (onUpdateStudent) {
                          onUpdateStudent({ ...s, [key]: val });
                        }
                      }}
                    />
                  ) : null}
                  {settings.enableFaceLogin ? (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 sm:h-9 sm:w-9 rounded-full sm:justify-self-center"
                      onClick={() => onOpenFaceTraining?.(s)}
                      title="Face login training"
                    >
                      <ScanFace className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full sm:justify-self-center"
                    onClick={() => {
                      if (!schoolId?.trim()) {
                        toast({
                          variant: 'destructive',
                          title: 'School not ready',
                          description: 'Refresh the page and try again.',
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
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full sm:justify-self-center"
                    onClick={() => setThemeStudent?.(s)}
                    title="Generate AI Theme"
                  >
                    <Wand2 className="w-4 h-4 text-purple-500" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full sm:justify-self-center"
                    onClick={() => previewIdCardStudent?.(s)}
                    title="Preview ID Card"
                  >
                    <IdCard className="w-4 h-4 text-primary" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full sm:justify-self-center"
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
                        'h-8 w-8 sm:h-9 sm:w-9 rounded-full sm:justify-self-center',
                        (!s.earnedBadges || s.earnedBadges.length === 0) && 'opacity-40'
                      )}
                      disabled={!s.earnedBadges || s.earnedBadges.length === 0}
                      onClick={() => setBadgesStudent?.(s)}
                      title="View badges for this student"
                    >
                      <Award
                        className={cn(
                          'w-4 h-4',
                          !s.earnedBadges || s.earnedBadges.length === 0 ? 'text-muted-foreground' : 'text-primary'
                        )}
                      />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full text-primary hover:bg-primary/10 sm:justify-self-center"
                    title="Purge points & badges"
                    onClick={() => setStudentToPurge?.(s)}
                  >
                    <Zap className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full text-destructive hover:bg-destructive/10 sm:justify-self-center"
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
        </div>
      </CardContent>
      <AlertDialog open={bulkPurgeOpen} onOpenChange={(open) => !isBulkPurging && setBulkPurgeOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Purge points & badges for {selectedStudents.length} student{selectedStudents.length === 1 ? '' : 's'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This resets current points, lifetime points, category totals, achievements, and badges to zero for each
              selected student. Activity history stays for audit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkPurging} onClick={() => setBulkPurgeOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 hover:bg-amber-700"
              disabled={isBulkPurging || selectedStudents.length === 0}
              onClick={() => void handleBulkPurgeConfirm()}
            >
              {isBulkPurging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Purge {selectedStudents.length} student{selectedStudents.length === 1 ? '' : 's'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
