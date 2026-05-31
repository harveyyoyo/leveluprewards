'use client';

import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { createBehaviorNote } from '@/lib/db/behaviorNotes';
import type { BehaviorNoteKind, Student } from '@/lib/types';
import { getStudentNickname } from '@/lib/utils';

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
}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [kind, setKind] = useState<BehaviorNoteKind>('concern');
  const [note, setNote] = useState('');
  const [visibleToParent, setVisibleToParent] = useState(true);
  const [saving, setSaving] = useState(false);

  const studentName = `${getStudentNickname(student)} ${student.lastName || ''}`.trim() || student.id;

  const handleSave = async () => {
    if (!note.trim()) {
      toast({ variant: 'destructive', title: 'Add a note', description: 'Describe what happened.' });
      return;
    }
    setSaving(true);
    try {
      await createBehaviorNote(firestore, schoolId, {
        studentId: student.id,
        studentName,
        classId,
        className,
        teacherId,
        teacherName,
        kind,
        note: note.trim(),
        visibleToParent: kind === 'incident' ? visibleToParent : true,
        pointsLabel,
        pointsAmount,
      });
      toast({ title: 'Behavior note saved' });
      setNote('');
      setKind('concern');
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
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Behavior note — {getStudentNickname(student)}</DialogTitle>
          <DialogDescription>
            Staff and principals can see this on the behavior timeline. Parents see notes marked for
            them.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as BehaviorNoteKind)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="concern">Concern</SelectItem>
                <SelectItem value="incident">Incident</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="behavior-note-text">Note</Label>
            <Textarea
              id="behavior-note-text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What happened in class?"
              className="min-h-[100px] rounded-xl"
            />
          </div>
          {kind === 'incident' ? (
            <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-3 py-2">
              <div>
                <p className="text-sm font-semibold">Share with parent</p>
                <p className="text-xs text-muted-foreground">Off = staff and principal only</p>
              </div>
              <Switch checked={visibleToParent} onCheckedChange={setVisibleToParent} />
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save note'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
