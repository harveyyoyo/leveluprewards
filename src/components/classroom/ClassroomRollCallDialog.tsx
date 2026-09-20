'use client';

import React from 'react';
import { CheckCircle2, Loader2, UserCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { Student } from '@/lib/types';
import { getStudentNickname } from '@/lib/utils';

type ClassroomRollCallDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  absentStudents: Student[];
  className?: string;
  isSubmitting?: boolean;
  onConfirm: () => Promise<void> | void;
};

export function ClassroomRollCallDialog({
  open,
  onOpenChange,
  absentStudents = [],
  className: classroomName,
  isSubmitting = false,
  onConfirm,
}: ClassroomRollCallDialogProps) {
  const allPresent = absentStudents.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-6">
        <DialogHeader className="space-y-2 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black tracking-tight">
                Classroom Roll Call
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {classroomName ? `${classroomName} · ` : ''}Quickly mark present for today
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-2 space-y-4">
          {allPresent ? (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400 animate-in zoom-in-50" />
              <p className="text-sm font-bold text-foreground">All students present!</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Every student on your seating chart has already checked in or been marked present today.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-xl border bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Students to mark present ({absentStudents.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto pr-1">
                  {absentStudents.map((s) => (
                    <Badge
                      key={s.id}
                      variant="secondary"
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg border bg-background/80"
                    >
                      {getStudentNickname(s)}
                      {s.lastName ? ` ${s.lastName.charAt(0)}.` : ''}
                    </Badge>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Marking these students present records attendance for today and awards regular sign-in points.
              </p>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            className="rounded-xl"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            {allPresent ? 'Close' : 'Cancel'}
          </Button>
          {!allPresent && (
            <Button
              type="button"
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-sm"
              disabled={isSubmitting}
              onClick={async () => {
                await onConfirm();
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4" />
                  Mark {absentStudents.length} Present
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
