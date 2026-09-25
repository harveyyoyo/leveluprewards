'use client';

import { useState } from 'react';
import { BookOpen, Check, ChevronsUpDown, Plus, Trash2, ChevronDown, ChevronUp, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  StaffPortalSectionCard,
  StaffPortalSectionCardContent,
  StaffPortalSectionCardHeader,
  StaffPortalSectionCardTitle,
} from '@/components/staff/StaffPortalSection';
import { StaffPortalTabPanel } from '@/components/staff/StaffPortalTabHeader';
import { StaffPortalTabInfoPopover, staffPortalTabInfoSection } from '@/components/staff/StaffPortalTabInfoPopover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { AdminRecordListHeader } from '@/components/admin/AdminRecordListHeader';
import { TabWalkthroughHeaderAction } from '@/components/tabWalkthrough/TabWalkthroughContext';
import type { Class, Student, Teacher } from '@/lib/types';
import { cn } from '@/lib/utils';

export function AdminClassesTab({
  classes,
  teachers,
  students,
  onAddClass,
  onDeleteClass,
  onUpdateClass,
  onUpdateStudent,
}: {
  classes: Class[] | null | undefined;
  teachers: Teacher[] | null | undefined;
  students: Student[] | null | undefined;
  onAddClass: () => void;
  onDeleteClass: (classId: string, students: Student[]) => void;
  onUpdateClass: (next: Class) => void;
  onUpdateStudent: (next: Student) => Promise<void> | void;
}) {
  const [expandedClassIds, setExpandedClassIds] = useState<Set<string>>(new Set());
  const [studentIdByClassId, setStudentIdByClassId] = useState<Record<string, string>>({});
  const [openStudentPickerClassId, setOpenStudentPickerClassId] = useState<string | null>(null);

  const toggleExpand = (classId: string) => {
    const next = new Set(expandedClassIds);
    if (next.has(classId)) {
      next.delete(classId);
    } else {
      next.add(classId);
    }
    setExpandedClassIds(next);
  };

  const handleAddTeacherToClass = async (c: Class, teacherId: string) => {
    const current = Array.isArray(c.teacherIds) && c.teacherIds.length > 0
      ? c.teacherIds
      : c.primaryTeacherId
        ? [c.primaryTeacherId]
        : [];
    if (current.includes(teacherId)) return;
    const nextTeacherIds = [...current, teacherId];
    const nextClass: Class = {
      ...c,
      primaryTeacherId: nextTeacherIds[0],
      teacherIds: nextTeacherIds,
    };
    onUpdateClass(nextClass);

    // Sync students in this class so they have the teacher linked
    const classStudents = (students || []).filter((s) => s.classId === c.id);
    for (const student of classStudents) {
      const studentTeacherIds = student.teacherIds || [];
      if (!studentTeacherIds.includes(teacherId)) {
        await onUpdateStudent({
          ...student,
          teacherIds: [...studentTeacherIds, teacherId],
        });
      }
    }
  };

  const handleRemoveTeacherFromClass = async (c: Class, teacherId: string) => {
    const current = Array.isArray(c.teacherIds) && c.teacherIds.length > 0
      ? c.teacherIds
      : c.primaryTeacherId
        ? [c.primaryTeacherId]
        : [];
    const nextTeacherIds = current.filter((id) => id !== teacherId);
    const nextClass: Class = {
      ...c,
      primaryTeacherId: nextTeacherIds[0] || undefined,
      teacherIds: nextTeacherIds.length > 0 ? nextTeacherIds : undefined,
    };
    onUpdateClass(nextClass);
  };

  return (
    <StaffPortalTabPanel
      tabValue="classes"
      trailing={
        <div className="flex flex-wrap items-center gap-2">
          <TabWalkthroughHeaderAction />
          <Button onClick={onAddClass} className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" /> Add Class
          </Button>
        </div>
      }
    >
    <StaffPortalSectionCard className="w-full overflow-hidden">
      <StaffPortalSectionCardContent>
        <ul className="space-y-4 overflow-x-auto pb-2 pr-1">
          {classes && classes.length > 0 ? (
            <AdminRecordListHeader
              className="min-w-[600px]"
              gridClassName="grid-cols-[minmax(160px,1.2fr)_minmax(200px,2fr)_110px_44px]"
              columns={[
                { label: 'Class Name' },
                { label: 'Assigned Teachers' },
                { label: 'Students' },
                { label: 'Delete', className: 'text-right' },
              ]}
            />
          ) : null}
          {classes?.map((c) => {
            const classStudents = students?.filter((s) => s.classId === c.id) || [];
            const availableStudents = (students || [])
              .filter((s) => s.classId !== c.id)
              .sort((a, b) => {
                const byLast = a.lastName.localeCompare(b.lastName);
                return byLast || a.firstName.localeCompare(b.firstName);
              });
            const selectedStudentId = studentIdByClassId[c.id] || '';
            const selectedStudent = availableStudents.find((s) => s.id === selectedStudentId);
            const isExpanded = expandedClassIds.has(c.id);
            const isPickerOpen = openStudentPickerClassId === c.id;

            const classTeacherIds = Array.isArray(c.teacherIds) && c.teacherIds.length > 0
              ? c.teacherIds
              : c.primaryTeacherId
                ? [c.primaryTeacherId]
                : [];
            const availableTeachers = (teachers || []).filter((t) => !classTeacherIds.includes(t.id));

            return (
              <li
                key={c.id}
                className="flex flex-col bg-secondary/45 rounded-2xl border border-ring/20 hover:border-ring/45 transition-all overflow-hidden"
              >
                <div className="grid grid-cols-[minmax(160px,1.2fr)_minmax(200px,2fr)_110px_44px] items-center gap-3 p-3">
                  <div className="truncate text-sm font-bold">{c.name}</div>
                  <div className="min-w-0 flex flex-wrap items-center gap-1.5 py-0.5">
                    {classTeacherIds.map((tid) => {
                      const t = teachers?.find((teacher) => teacher.id === tid);
                      const name = t?.name || (tid === c.primaryTeacherId ? 'Assigned teacher' : 'Unknown');
                      return (
                        <Badge
                          key={tid}
                          variant="secondary"
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-normal bg-background border border-border/80 shadow-xs"
                        >
                          <span className="truncate max-w-[120px]">{name}</span>
                          <button
                            type="button"
                            onClick={() => void handleRemoveTeacherFromClass(c, tid)}
                            className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-destructive"
                            title={`Remove ${name}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                    {availableTeachers.length > 0 ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs gap-1 rounded-lg border-dashed text-muted-foreground hover:text-foreground"
                          >
                            <Plus className="h-3 w-3" />
                            {classTeacherIds.length === 0 ? 'Assign teacher' : 'Add teacher'}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="max-h-56 overflow-y-auto">
                          {availableTeachers.map((t) => (
                            <DropdownMenuItem
                              key={t.id}
                              onSelect={() => void handleAddTeacherToClass(c, t.id)}
                            >
                              {t.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                    {classTeacherIds.length === 0 && availableTeachers.length === 0 && (
                      <span className="text-xs text-muted-foreground italic">No teachers available</span>
                    )}
                  </div>
                  <div className="flex items-center justify-start">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-full gap-1.5 rounded-lg border-ring/35 bg-background hover:bg-secondary text-primary font-semibold"
                      onClick={() => toggleExpand(c.id)}
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {isExpanded ? 'Hide' : 'Students'}
                    </Button>
                  </div>
                  <div className="flex items-center justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 min-h-0 min-w-0 text-destructive hover:bg-destructive/10"
                      onClick={() => onDeleteClass(c.id, students || [])}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-ring/15 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="mb-3 flex flex-col gap-2 rounded-2xl border border-ring/15 bg-background/50 p-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                        <UserPlus className="h-4 w-4" />
                        <span>Add existing student</span>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Popover
                          open={isPickerOpen}
                          onOpenChange={(open) => setOpenStudentPickerClassId(open ? c.id : null)}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              role="combobox"
                              aria-expanded={isPickerOpen}
                              disabled={availableStudents.length === 0}
                              className="h-9 w-full justify-between rounded-lg bg-background text-xs font-normal sm:w-[260px]"
                            >
                              <span className="truncate">
                                {availableStudents.length === 0
                                  ? 'No students available'
                                  : selectedStudent
                                    ? `${selectedStudent.lastName}, ${selectedStudent.firstName}`
                                    : 'Choose a student...'}
                              </span>
                              <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[260px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search students..." className="text-xs" />
                              <CommandList>
                                <CommandEmpty>No student found.</CommandEmpty>
                                <CommandGroup>
                                  {availableStudents.map((s) => (
                                    <CommandItem
                                      key={s.id}
                                      value={`${s.firstName} ${s.lastName}`}
                                      onSelect={() => {
                                        setStudentIdByClassId((prev) => ({ ...prev, [c.id]: s.id }));
                                        setOpenStudentPickerClassId(null);
                                      }}
                                      className="text-xs"
                                    >
                                      <Check
                                        className={cn(
                                          'mr-2 h-3.5 w-3.5',
                                          selectedStudentId === s.id ? 'opacity-100' : 'opacity-0'
                                        )}
                                      />
                                      {s.lastName}, {s.firstName}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <Button
                          type="button"
                          size="sm"
                          className="h-9 rounded-lg px-3 font-semibold"
                          disabled={!selectedStudentId}
                          onClick={async () => {
                            const student = (students || []).find((s) => s.id === selectedStudentId);
                            if (!student) return;
                            await onUpdateStudent({ ...student, classId: c.id });
                            setStudentIdByClassId((prev) => ({ ...prev, [c.id]: '' }));
                          }}
                        >
                          Add to Class
                        </Button>
                      </div>
                    </div>
                    {classStudents.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {classStudents.sort((a, b) => a.lastName.localeCompare(b.lastName)).map((s) => (
                          <div 
                            key={s.id} 
                            className="text-sm py-1.5 px-3 bg-background/40 rounded-xl border border-primary/5 flex items-center justify-between group hover:bg-background/60 transition-colors"
                          >
                            <span className="truncate">
                              {s.firstName} <span className="font-semibold">{s.lastName}</span>
                            </span>
                            <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground font-mono bg-muted/30 px-1.5 py-0.5 rounded">
                              {s.points ?? 0} pts
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-4 text-center text-muted-foreground bg-background/20 rounded-2xl border border-dashed">
                        <p className="text-xs">No students assigned yet.</p>
                      </div>
                    )}
                  </div>
                )}
              </li>

            );
          })}
          {(!classes || classes.length === 0) && (
            <EmptyState
              icon={BookOpen}
              title="No classes yet"
              description="Group students into classes so teachers can award points and take attendance by class."
              action={{ label: 'Add your first class', icon: Plus, onClick: onAddClass }}
            />
          )}
        </ul>
      </StaffPortalSectionCardContent>
    </StaffPortalSectionCard>
    </StaffPortalTabPanel>
  );
}
