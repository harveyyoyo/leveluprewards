'use client';

import { BookOpen, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Helper } from '@/components/ui/helper';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import type { Class, Student, Teacher } from '@/lib/types';

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
        <ul className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {classes?.map((c) => (
            <li
              key={c.id}
              className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 bg-secondary/20 p-4 rounded-2xl border hover:border-primary/20 transition-colors"
            >
              <div className="space-y-1">
                <span className="font-bold block">{c.name}</span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold uppercase tracking-widest">Primary Teacher:</span>
                  <Select
                    value={c.primaryTeacherId || '__none__'}
                    onValueChange={(value) => {
                      const next = value === '__none__' ? { ...c, primaryTeacherId: undefined } : { ...c, primaryTeacherId: value };
                      onUpdateClass(next);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[180px] text-xs">
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
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:bg-destructive/10 self-end md:self-auto"
                onClick={() => onDeleteClass(c.id, students || [])}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </li>
          ))}
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

