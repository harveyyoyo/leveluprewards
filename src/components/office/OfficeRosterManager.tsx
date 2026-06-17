'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { OfficeClass, OfficeStudent, OfficeTeacher } from '@/lib/office/types';
import { OfficeCsvImportDialog } from '@/components/office/OfficeCsvImportDialog';
import { OfficeTeacherSelect } from '@/components/office/OfficeTeacherSelect';
import { useOfficeWrite } from '@/lib/office/useOfficeWrite';

type OfficeRosterManagerProps = {
  schoolId: string;
  classes: OfficeClass[];
  teachers: OfficeTeacher[];
};

export function OfficeRosterManager({ schoolId, classes, teachers }: OfficeRosterManagerProps) {
  const { toast } = useToast();
  const write = useOfficeWrite(schoolId);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [classId, setClassId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [addAnother, setAddAnother] = useState(false);

  const reset = () => {
    setFirstName('');
    setLastName('');
    setNickname('');
    setClassId('');
    setTeacherId('');
  };

  const handleSave = async () => {
    if (!write.ctx || !firstName.trim() || !lastName.trim()) {
      toast({ variant: 'destructive', title: 'First and last name are required.' });
      return;
    }
    setBusy(true);
    try {
      await write.createOfficeStudentWithFamily(write.ctx, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        nickname: nickname.trim() || null,
        classId: classId || null,
        teacherId: teacherId || null,
        teacherName: null,
        photoUrl: null,
        dateOfBirth: null,
        busRoute: null,
        notes: null,
        updatedAt: Date.now(),
      });
      toast({ title: 'Student added' });
      if (addAnother) {
        reset();
      } else {
        setOpen(false);
        reset();
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not save student', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <OfficeCsvImportDialog
        schoolId={schoolId}
        mode="students"
        classes={classes}
        teachers={teachers}
        disabled={busy}
      />
      <Button type="button" className="rounded-xl gap-2" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add student
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add office student</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>First name</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Last name</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nickname (optional)</Label>
              <Input value={nickname} onChange={(e) => setNickname(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={classId || '__none__'} onValueChange={(v) => setClassId(v === '__none__' ? '' : v)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="No class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No class</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <OfficeTeacherSelect
              schoolId={schoolId}
              teachers={teachers}
              value={teacherId}
              onChange={setTeacherId}
            />
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={addAnother}
                onChange={(e) => setAddAnother(e.target.checked)}
                className="h-4 w-4 accent-teal-700"
              />
              Add another after save
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={busy}>
              Save student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
