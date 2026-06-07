'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { emitBehaviorNoteSaved } from '@/lib/classroom/behaviorNoteEvents';
import {
  classroomNoteDialogTitle,
  getClassroomNoteShortcut,
  type ClassroomNoteShortcutKey,
} from '@/lib/classroom/classroomNoteShortcuts';
import {
  resolveBehaviorQuickOptionsForKey,
  type ClassroomBehaviorQuickOptions,
} from '@/lib/classroom/classroomQuickAwardsSettings';
import { saveBehaviorNote } from '@/lib/classroom/behaviorNotesClient';
import type { BehaviorNote, Student } from '@/lib/types';
import { cn, getStudentNickname } from '@/lib/utils';

export function BehaviorNoteDialog({
  open,
  onOpenChange,
  schoolId,
  student,
  classId,
  className,
  teacherId,
  teacherName,
  pointsLabel,
  pointsAmount,
  shortcutKey = 'c',
  suppressHeldShortcutKey = null,
  behaviorQuickOptions,
  deductPoints,
  onDeductPoints,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  student: Student;
  classId?: string;
  className?: string;
  teacherId: string;
  teacherName: string;
  pointsLabel?: string;
  pointsAmount?: number;
  shortcutKey?: ClassroomNoteShortcutKey;
  /** When set, swallow key repeat from the held shortcut until that key is released. */
  suppressHeldShortcutKey?: ClassroomNoteShortcutKey | null;
  behaviorQuickOptions?: ClassroomBehaviorQuickOptions | null;
  /** When set, teacher can optionally deduct this many points after saving the note. */
  deductPoints?: number;
  onDeductPoints?: (points: number, noteText: string) => void | Promise<void>;
  onSaved?: () => void;
}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const shortcut = getClassroomNoteShortcut(shortcutKey);
  const quickOptions = resolveBehaviorQuickOptionsForKey(shortcutKey, behaviorQuickOptions);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [note, setNote] = useState('');
  const [visibleToParent, setVisibleToParent] = useState(true);
  const [shareToBulletinBoard, setShareToBulletinBoard] = useState(false);
  const [notifyPrincipal, setNotifyPrincipal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deductOnSave, setDeductOnSave] = useState(true);
  const [heldShortcutReleased, setHeldShortcutReleased] = useState(!suppressHeldShortcutKey);

  useEffect(() => {
    if (!open) return;
    setNote('');
    setVisibleToParent(true);
    setShareToBulletinBoard(false);
    setNotifyPrincipal(false);
    setDeductOnSave(true);
    setHeldShortcutReleased(!suppressHeldShortcutKey);
  }, [open, shortcutKey, student.id, suppressHeldShortcutKey]);

  useEffect(() => {
    if (!open || !suppressHeldShortcutKey) return;
    const blockKey = suppressHeldShortcutKey;
    const swallowHeldKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== blockKey) return;
      e.preventDefault();
      e.stopPropagation();
    };
    const releaseHeldKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== blockKey) return;
      e.preventDefault();
      e.stopPropagation();
      window.removeEventListener('keydown', swallowHeldKey, true);
      window.removeEventListener('keyup', releaseHeldKey, true);
      setHeldShortcutReleased(true);
      requestAnimationFrame(() => textareaRef.current?.focus());
    };
    window.addEventListener('keydown', swallowHeldKey, true);
    window.addEventListener('keyup', releaseHeldKey, true);
    return () => {
      window.removeEventListener('keydown', swallowHeldKey, true);
      window.removeEventListener('keyup', releaseHeldKey, true);
    };
  }, [open, suppressHeldShortcutKey]);

  const studentLabel = getStudentNickname(student);
  const studentName = `${studentLabel} ${student.lastName || ''}`.trim() || student.id;

  const handleSave = async () => {
    if (!note.trim()) {
      toast({
        variant: 'destructive',
        title: `Add a ${shortcut.popupTitle.toLowerCase()}`,
        description: shortcut.placeholder,
      });
      return;
    }
    setSaving(true);
    try {
      const result = await saveBehaviorNote(firestore, {
        schoolId,
        studentId: student.id,
        studentName,
        classId,
        className,
        teacherId,
        teacherName,
        kind: shortcut.kind,
        note: note.trim(),
        visibleToParent: shortcut.showParentToggle ? visibleToParent : true,
        notifyPrincipal: shortcut.showPrincipalToggle ? notifyPrincipal : false,
        pointsLabel,
        pointsAmount,
        shareToBulletinBoard: shortcut.showBulletinToggle && shareToBulletinBoard,
      });
      if (!result.success) {
        throw new Error(result.message);
      }
      const savedNote: BehaviorNote = {
        id: result.id ?? `note-${Date.now()}`,
        studentId: student.id,
        studentName,
        classId,
        className,
        teacherId,
        teacherName,
        kind: shortcut.kind,
        note: note.trim(),
        createdAt: Date.now(),
        visibleToParent: shortcut.showParentToggle ? visibleToParent : true,
        notifyPrincipal: shortcut.showPrincipalToggle ? notifyPrincipal : false,
        pointsLabel,
        pointsAmount,
      };
      emitBehaviorNoteSaved(savedNote);
      toast({ title: shortcut.toastTitle });
      if (shortcut.kind === 'positive' && shareToBulletinBoard) {
        if (result.bulletinPosted) {
          toast({
            title: 'Shared to bulletin board',
            description: `${studentLabel}'s compliment is now on the school board.`,
          });
        } else if (result.bulletinMessage) {
          toast({
            variant: 'destructive',
            title: 'Note saved, but not shared',
            description: result.bulletinMessage,
          });
        }
      }
      if (deductPoints && deductOnSave && onDeductPoints) {
        await onDeductPoints(deductPoints, note.trim());
      }
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not save note',
        description: (e as Error).message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md rounded-2xl"
        onOpenAutoFocus={(e) => {
          if (suppressHeldShortcutKey && !heldShortcutReleased) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{classroomNoteDialogTitle(shortcut, studentLabel)}</DialogTitle>
          <DialogDescription>{shortcut.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="behavior-note-text">{shortcut.popupTitle}</Label>
            <Textarea
              ref={textareaRef}
              id="behavior-note-text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={shortcut.placeholder}
              className="min-h-[100px] rounded-xl"
            />
          </div>
          {quickOptions.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Quick options</p>
              <div className="flex flex-wrap gap-1.5">
                {quickOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={cn(
                      'rounded-full border border-border/70 bg-muted/30 px-2.5 py-1 text-left text-[11px] font-semibold leading-snug text-foreground transition-colors',
                      'hover:border-primary/40 hover:bg-primary/10',
                      note === option && 'border-primary/50 bg-primary/10 text-primary',
                    )}
                    onClick={() => setNote(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {shortcut.showParentToggle ? (
            <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-3 py-2">
              <div>
                <p className="text-sm font-semibold">Share with parent</p>
                <p className="text-xs text-muted-foreground">
                  {visibleToParent ? 'Visible in the parent portal' : 'Staff and admin only'}
                </p>
              </div>
              <Switch checked={visibleToParent} onCheckedChange={setVisibleToParent} />
            </div>
          ) : null}
          {shortcut.showBulletinToggle ? (
            <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-3 py-2">
              <div>
                <p className="text-sm font-semibold">Share to bulletin board</p>
                <p className="text-xs text-muted-foreground">
                  {shareToBulletinBoard
                    ? 'Will appear in Celebrations on the school board'
                    : 'Keep this note private'}
                </p>
              </div>
              <Switch checked={shareToBulletinBoard} onCheckedChange={setShareToBulletinBoard} />
            </div>
          ) : null}
          {shortcut.showPrincipalToggle ? (
            <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-3 py-2">
              <div>
                <p className="text-sm font-semibold">Flag for principal</p>
                <p className="text-xs text-muted-foreground">
                  {notifyPrincipal
                    ? 'Principal will be notified of this note'
                    : 'Standard teacher note'}
                </p>
              </div>
              <Switch checked={notifyPrincipal} onCheckedChange={setNotifyPrincipal} />
            </div>
          ) : null}
          {deductPoints ? (
            <div className="flex items-center justify-between rounded-xl border border-rose-500/25 bg-rose-500/5 px-3 py-2">
              <div>
                <p className="text-sm font-semibold">Deduct points</p>
                <p className="text-xs text-muted-foreground">
                  {deductOnSave
                    ? `Remove ${deductPoints} point${deductPoints === 1 ? '' : 's'} when this note is saved`
                    : 'Save the note without changing points'}
                </p>
              </div>
              <Switch checked={deductOnSave} onCheckedChange={setDeductOnSave} />
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : shortcut.saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
