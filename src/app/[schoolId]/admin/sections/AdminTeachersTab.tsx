'use client';

import { Edit, Plus, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Helper } from '@/components/ui/helper';
import { EmptyState } from '@/components/ui/empty-state';
import type { Teacher } from '@/lib/types';

export function AdminTeachersTab({
  teachers,
  onAddTeacher,
  onEditTeacher,
  onDeleteTeacher,
}: {
  teachers: Teacher[] | null | undefined;
  onAddTeacher: () => void;
  onEditTeacher: (t: Teacher) => void;
  onDeleteTeacher: (teacherId: string) => void;
}) {
  return (
    <Card className="border-t-4 border-primary shadow-md">
      <CardHeader className="flex flex-row justify-between items-center py-6">
        <div>
          <Helper content="Add and manage teachers who can issue coupons.">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-destructive" /> Teachers
            </CardTitle>
          </Helper>
          <CardDescription>Add and manage teachers who can issue coupons.</CardDescription>
        </div>
        <Button onClick={onAddTeacher} className="rounded-xl">
          <Plus className="mr-2 h-4 w-4" /> Add Teacher
        </Button>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {teachers?.map((t) => (
            <li
              key={t.id}
              className="flex justify-between items-center bg-secondary/20 p-4 rounded-2xl border hover:border-purple-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-700">
                  {t.name[0]}
                </div>
                <div>
                  <p className="font-bold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    User: <span className="font-code">{t.username}</span> | Pass: <span className="font-code">{t.passcode}</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEditTeacher(t)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  onClick={() => onDeleteTeacher(t.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
          {(!teachers || teachers.length === 0) && (
            <EmptyState
              icon={User}
              title="No teachers yet"
              description="Add teachers so each one gets their own portal to award points and redeem coupons with students."
              action={{ label: 'Add your first teacher', icon: Plus, onClick: onAddTeacher }}
            />
          )}
        </ul>
      </CardContent>
    </Card>
  );
}

