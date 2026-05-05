'use client';

import { useState } from 'react';
import { BookOpen, Plus, Trash2, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Helper } from '@/components/ui/helper';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import type { Class, Student, Teacher } from '@/lib/types';
import { cn } from '@/lib/utils';

export function AdminClassesTab({
  classes,
  teachers,
  students,
  onAddClass,
  onDeleteClass,
  onUpdateClass,
}: {
  classes: Class[] | null | undefined;
  teachers: Teacher[] | null | undefined;
  students: Student[] | null | undefined;
  onAddClass: () => void;
  onDeleteClass: (classId: string, students: Student[]) => void;
  onUpdateClass: (next: Class) => void;
}) {
  const [expandedClassIds, setExpandedClassIds] = useState<Set<string>>(new Set());

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
    <Card className="border-t-4 border-primary shadow-md">
      <CardHeader className="flex flex-row justify-between items-center py-6">
        <div>
          <Helper content="Manage class groups for your school.">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-destructive" /> Classes
            </CardTitle>
          </Helper>
          <CardDescription>Manage class groups for your school.</CardDescription>
        </div>
        <Button onClick={onAddClass} className="rounded-xl">
          <Plus className="mr-2 h-4 w-4" /> Add Class
        </Button>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4 h-[calc(100vh-22rem)] min-h-[400px] overflow-y-auto pr-1">
          {classes?.map((c) => {
            const classStudents = students?.filter((s) => s.classId === c.id) || [];
            const isExpanded = expandedClassIds.has(c.id);

            return (
              <li
                key={c.id}
                className="flex flex-col gap-3 bg-secondary/20 p-4 rounded-2xl border hover:border-primary/20 transition-all"
              >
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg">{c.name}</span>
                      <Badge variant="secondary" className="rounded-full px-3 py-0.5 text-xs font-medium bg-primary/10 text-primary border-primary/20">
                        <Users className="w-3 h-3 mr-1" />
                        {classStudents.length} Students
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-semibold uppercase tracking-widest">Primary Teacher:</span>
                      <Select
                        value={c.primaryTeacherId || '__none__'}
                        onValueChange={(value) => {
                          const next = value === '__none__' ? { ...c, primaryTeacherId: undefined } : { ...c, primaryTeacherId: value };
                          onUpdateClass(next);
                        }}
                      >
                        <SelectTrigger className="h-8 w-[180px] text-xs bg-background/50">
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
                  </div>
                  <div className="flex items-center gap-2 self-end md:self-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl h-9 px-4 text-xs font-medium gap-2"
                      onClick={() => toggleExpand(c.id)}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" />
                          Hide Students
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" />
                          View Students
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-xl"
                      onClick={() => onDeleteClass(c.id, students || [])}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-2 pt-4 border-t border-primary/10 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                      <Users className="w-3 h-3" /> Students in this Class
                    </div>
                    {classStudents.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {classStudents.sort((a, b) => a.lastName.localeCompare(b.lastName)).map((s) => (
                          <div 
                            key={s.id} 
                            className="text-sm py-2 px-3 bg-background/40 rounded-xl border border-primary/5 flex items-center justify-between group hover:bg-background/60 transition-colors"
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
                      <div className="py-8 text-center text-muted-foreground bg-background/20 rounded-2xl border border-dashed">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No students assigned to this class yet.</p>
                        <p className="text-[10px] mt-1">Assign students to this class in the Students tab.</p>
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

