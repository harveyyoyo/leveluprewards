'use client';
import { useState } from 'react';


import { Award, Edit, History, IdCard, LayoutDashboard, Mail, Phone, Plus, Printer, ScanFace, Trash2, UploadCloud, Users, Wand2, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Helper } from '@/components/ui/helper';
import { cn } from '@/lib/utils';
import type { Class, Student, Teacher } from '@/lib/types';
import { AutoCircularToggles, type ToggleDef } from '@/components/AutoCircularToggles';
import { STUDENT_WELCOME_STYLES_LIVE } from '@/lib/studentWelcome';

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

export function AdminStudentsTab({
  settings,
  classes,
  students,
  filteredStudents,
  studentCsvInputRef,
  onStudentCsvFileChange,
  handleStudentCsvUpload,
  selectionMode,
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
  setStudentsToPrint,
  handleDtcPrintClick,
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
  onStudentCsvFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleStudentCsvUpload: () => void;
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
  setStudentsToPrint: (args: { students: Student[]; classes: Class[]; printerType?: 'dtc4500e' }) => void;
  handleDtcPrintClick: () => void;
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
  const [selectedTeacherIdForBulk, setSelectedTeacherIdForBulk] = useState('');
  const studentKioskWelcomeToggleDefs = buildStudentKioskWelcomeToggleDefs(settings);
  return (
    <Card className="border-t-4 border-primary shadow-md overflow-hidden">
      <CardHeader className="bg-primary/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-8">
        <Helper content="Manage your enrollments, view student activity, and print ID cards. Points are awarded from the Teacher Portal.">
          <CardTitle className="text-2xl flex items-center gap-2">
            <Users className="text-primary w-6 h-6" /> Students
          </CardTitle>
        </Helper>
        <CardDescription>Manage your enrollments and view student activity.</CardDescription>
        <div className="flex flex-wrap gap-2 w-full pb-1 sm:pb-0">
          <Button onClick={handleStudentCsvUpload} variant="outline" className="rounded-xl px-4">
            <UploadCloud className="mr-2 h-4 w-4" /> Import CSV
          </Button>
          <Button
            onClick={() => {
              const filtered = filteredStudents;

              if (selectionMode && selectedStudentIds.size > 0) {
                const selected = students?.filter((s) => selectedStudentIds.has(s.id)) || [];
                setStudentsToPrint({ students: selected, classes: classes || [] });
              } else {
                setStudentsToPrint({ students: filtered, classes: classes || [] });
              }
            }}
            variant={(selectionMode && selectedStudentIds.size >= 1) || studentFilterClass !== 'all' ? 'default' : 'outline'}
            className={cn(
              'rounded-xl px-4',
              ((selectionMode && selectedStudentIds.size >= 1) || studentFilterClass !== 'all') && 'bg-primary hover:bg-primary/90 font-bold text-primary-foreground'
            )}
          >
            <Printer className="mr-2 h-4 w-4" />
            {selectionMode && selectedStudentIds.size >= 1
              ? `Print Selected (${selectedStudentIds.size})`
              : studentFilterClass !== 'all'
                ? `Print Class (${students?.filter((s) => s.classId === studentFilterClass).length || 0})`
                : 'Bulk ID Print'}
          </Button>
          <Button
            onClick={handleDtcPrintClick}
            disabled={selectionMode && selectedStudentIds.size > 1}
            variant={selectionMode && selectedStudentIds.size === 1 ? 'default' : 'outline'}
            className={cn(
              'rounded-xl px-4',
              selectionMode && selectedStudentIds.size === 1
                ? 'bg-primary hover:bg-primary/90 font-bold text-primary-foreground'
                : 'bg-primary/10 hover:bg-primary/15 text-primary border-primary/20'
            )}
          >
            <Printer className="mr-2 h-4 w-4" />
            {selectionMode && selectedStudentIds.size === 1 ? 'Print Selected (DTC)' : 'DTC Card Print'}
          </Button>
          <Button onClick={() => handleOpenStudentModal?.(null)} className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" /> Add Student
          </Button>
          <input type="file" ref={studentCsvInputRef} onChange={onStudentCsvFileChange} className="hidden" accept=".csv" />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-grow">
            <Input
              placeholder="Search by name, nickname, or ID..."
              value={studentSearchTerm}
              onChange={(e) => setStudentSearchTerm(e.target.value)}
              className="rounded-full pl-10 h-11"
            />
            <LayoutDashboard className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            {selectedStudentIds.size > 0 && teachers && teachers.length > 0 && (
              <div className="flex gap-1 items-center bg-primary/5 p-1 rounded-xl border border-primary/20 shrink-0">
                <Select
                  value={selectedTeacherIdForBulk}
                  onValueChange={setSelectedTeacherIdForBulk}
                >
                  <SelectTrigger className="w-[160px] rounded-lg h-9 bg-background border-muted">
                    <SelectValue placeholder="Add to teacher..." />
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
                  variant="default"
                  className="h-9 rounded-lg px-3 font-semibold shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={!selectedTeacherIdForBulk}
                  onClick={async () => {
                    if (!selectedTeacherIdForBulk || !onUpdateStudent) return;
                    const selectedStudents = students?.filter((s) => selectedStudentIds.has(s.id)) || [];
                    for (const s of selectedStudents) {
                      const current = s.teacherIds || [];
                      if (!current.includes(selectedTeacherIdForBulk)) {
                        await onUpdateStudent({ ...s, teacherIds: [...current, selectedTeacherIdForBulk] });
                      }
                    }
                    setSelectedTeacherIdForBulk('');
                    setSelectedStudentIds(new Set());
                  }}
                >
                  Add Selected
                </Button>
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl px-4 font-semibold"
              disabled={selectedStudentIds.size === 0}
              onClick={() => setSelectedStudentIds(new Set())}
            >
              <X className="mr-2 h-4 w-4" />
              Deselect
            </Button>
            <Select value={studentSortOption} onValueChange={setStudentSortOption}>
              <SelectTrigger className="w-[180px] rounded-xl h-11">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
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
            <Select value={studentFilterClass} onValueChange={setStudentFilterClass}>
              <SelectTrigger className="w-[180px] rounded-xl h-11">
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
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl px-4 font-semibold"
              onClick={() => toggleSelectAllFiltered()}
            >
              {isAllFilteredSelected ? 'Deselect filtered' : 'Select all (filtered)'}
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-22rem)] min-h-[280px]">
          <ul className="flex flex-col gap-1.5 pr-4">
            {filteredStudents.map((s) => {
              const teacherLine = formatAssignedTeachers(s, teachers);
              const hasParentContact = !!(s.parentEmail?.trim() || s.parentPhone?.trim());
              const hasStudentContact = !!(s.studentEmail?.trim() || s.studentPhone?.trim());
              const middle = s.middleName?.trim();
              return (
              <li
                key={s.id}
                className={cn(
                  'flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 py-2.5 px-3 rounded-xl border transition-all',
                  selectionMode && 'cursor-pointer',
                  selectedStudentIds.has(s.id)
                    ? 'bg-primary/5 border-primary/40 ring-1 ring-primary/20 hover:bg-primary/10 hover:border-primary/50 hover:ring-primary/30'
                    : 'bg-secondary/20 border-transparent hover:bg-background'
                )}
                role={selectionMode ? 'button' : undefined}
                tabIndex={selectionMode ? 0 : undefined}
                onClick={() => {
                  if (!selectionMode) return;
                  setSelectedStudentIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(s.id)) next.delete(s.id);
                    else next.add(s.id);
                    return next;
                  });
                }}
                onKeyDown={(e) => {
                  if (!selectionMode) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedStudentIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(s.id)) next.delete(s.id);
                      else next.add(s.id);
                      return next;
                    });
                  }
                }}
              >
                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full"
                    onClick={() => handleOpenStudentModal?.(s)}
                    title="Edit student"
                  >
                    <Edit className="w-4 h-4 text-primary" />
                  </Button>
                </div>
                <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-primary/10 border border-border/40 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
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
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                      <p className="font-bold text-sm sm:text-base leading-tight truncate max-w-full">
                        {s.lastName}, {s.firstName}
                        {middle ? <span className="font-medium text-muted-foreground"> {middle}</span> : null}
                      </p>
                      <span className="text-primary font-bold text-xs tabular-nums">{s.points} pts</span>
                      {typeof s.lifetimePoints === 'number' && s.lifetimePoints !== s.points ? (
                        <span className="text-muted-foreground font-semibold text-[11px] tabular-nums" title="Lifetime points awarded">
                          · {s.lifetimePoints} career
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[11px] sm:text-xs text-muted-foreground leading-snug truncate mt-0.5">
                      {getClassName(s.classId || '')}
                      <span className="text-border mx-1.5">·</span>
                      <span className="font-code">{s.nfcId || '—'}</span>
                      {typeof s.createdAt === 'number' && s.createdAt > 0 ? (
                        <>
                          <span className="text-border mx-1.5">·</span>
                          <span className="tabular-nums" title={new Date(s.createdAt).toLocaleString()}>
                            {new Date(s.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </>
                      ) : null}
                      {s.nickname?.trim() ? (
                        <>
                          <span className="text-border mx-1.5">·</span>
                          <span title={s.nickname.trim()}>&ldquo;{s.nickname.trim()}&rdquo;</span>
                        </>
                      ) : null}
                    </p>
                    {(teacherLine || hasParentContact || hasStudentContact || s.birthday) ? (
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[10px] sm:text-[11px] text-muted-foreground">
                        {teacherLine ? (
                          <span className="truncate max-w-full" title={teacherLine}>
                            <span className="font-semibold text-foreground/80">Teachers:</span> {teacherLine}
                          </span>
                        ) : null}
                        {s.birthday ? (
                          <span className="tabular-nums shrink-0" title="Birthday on file">
                            <span className="font-semibold text-foreground/80">DOB:</span> {s.birthday}
                          </span>
                        ) : null}
                        <span className="flex items-center gap-1 shrink-0" aria-label="Contact on file">
                          {hasParentContact ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-muted/80 px-1.5 py-px" title="Parent/guardian email or phone on file">
                              <Mail className="w-3 h-3" />
                              <Phone className="w-3 h-3" />
                            </span>
                          ) : null}
                          {hasStudentContact ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-muted/80 px-1.5 py-px" title="Student email or phone on file">
                              <span className="text-[9px] font-bold text-foreground/70">Stu</span>
                              <Mail className="w-3 h-3" />
                            </span>
                          ) : null}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 justify-end sm:justify-end shrink-0 sm:pl-1" onClick={(e) => e.stopPropagation()}>
                  {studentKioskWelcomeToggleDefs.length > 0 ? (
                    <AutoCircularToggles
                      record={s}
                      defs={studentKioskWelcomeToggleDefs}
                      restrictToDefs
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
                      className="h-8 w-8 sm:h-9 sm:w-9 rounded-full"
                      onClick={() => onOpenFaceTraining?.(s)}
                      title="Face login training"
                    >
                      <ScanFace className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full"
                    onClick={() => setThemeStudent?.(s)}
                    title="Generate AI Theme"
                  >
                    <Wand2 className="w-4 h-4 text-purple-500" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full"
                    onClick={() => previewIdCardStudent?.(s)}
                    title="Preview ID Card"
                  >
                    <IdCard className="w-4 h-4 text-primary" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full"
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
                        'h-8 w-8 sm:h-9 sm:w-9 rounded-full',
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
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full text-primary hover:bg-primary/10"
                    title="Purge points & badges"
                    onClick={() => setStudentToPurge?.(s)}
                  >
                    <Zap className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full text-destructive hover:bg-destructive/10"
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
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
