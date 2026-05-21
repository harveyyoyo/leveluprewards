'use client';

import { useState } from 'react';
import { BookOpen, Plus, Trash2, ChevronDown, ChevronUp, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Helper } from '@/components/ui/helper';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

  const toggleExpand = (classId: string) => {
    const next = new Set(expandedClassIds);
    if (next.has(classId)) {
      next.delete(classId);
    } else {
      next.add(classId);
    }
    setExpandedClassIds(next);
  };

  return (
    <Card className="w-full border-t-4 border-primary shadow-md overflow-hidden">
      <CardHeader className="flex flex-row justify-between items-center py-6 bg-secondary">
        <div>
          <Helper content="Manage class groups for your school.">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-ring" /> Classes
            </CardTitle>
          </Helper>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TabWalkthroughHeaderAction />
          <Button onClick={onAddClass} className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" /> Add Class
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4 pr-1">
          {classes && classes.length > 0 ? (
            <AdminRecordListHeader
              gridClassName="grid-cols-[minmax(180px,1fr)_minmax(160px,220px)_110px_44px]"
              columns={[
                { label: 'Class Name' },
                { label: 'Assigned Teacher' },
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
            const isExpanded = expandedClassIds.has(c.id);

            return (
              <li
                key={c.id}
                className="flex flex-col bg-secondary/45 rounded-2xl border border-ring/20 hover:border-ring/45 transition-all overflow-hidden"
              >
                <div className="grid grid-cols-[minmax(180px,1fr)_minmax(160px,220px)_110px_44px] items-center gap-3 p-3">
                  <div className="truncate text-sm font-bold">{c.name}</div>
                  <div className="min-w-0">
                    <Select
                      value={c.primaryTeacherId || '__none__'}
                      onValueChange={(value) => {
                        const next = value === '__none__' ? { ...c, primaryTeacherId: undefined } : { ...c, primaryTeacherId: value };
                        onUpdateClass(next);
                      }}
                    >
                      <SelectTrigger className="h-8 w-full rounded-lg bg-background text-xs">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Unassigned</SelectItem>
                        {teachers?.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
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
                        <Select
                          value={selectedStudentId}
                          onValueChange={(value) => setStudentIdByClassId((prev) => ({ ...prev, [c.id]: value }))}
                          disabled={availableStudents.length === 0}
                        >
                          <SelectTrigger className="h-9 w-full rounded-lg bg-background text-xs sm:w-[260px]">
                            <SelectValue placeholder={availableStudents.length === 0 ? 'No students available' : 'Choose a student...'} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableStudents.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.lastName}, {s.firstName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                              {s.points} pts
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
      </CardContent>
    </Card>
  );
}
