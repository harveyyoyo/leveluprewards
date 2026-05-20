'use client';

import { useState } from 'react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { Download, Plus } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { useAppContext } from '@/components/AppProvider';
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
import type { OfficeClass, OfficeStudent } from '@/lib/office/types';
import { importRewardsRosterToOffice } from '@/lib/office/importRewardsRoster';

type OfficeRosterManagerProps = {
  schoolId: string;
  classes: OfficeClass[];
};

export function OfficeRosterManager({ schoolId, classes }: OfficeRosterManagerProps) {
  const firestore = useFirestore();
  const { isAdmin } = useAppContext();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [classId, setClassId] = useState('');
  const [teacherName, setTeacherName] = useState('');

  const reset = () => {
    setFirstName('');
    setLastName('');
    setNickname('');
    setClassId('');
    setTeacherName('');
  };

  const handleImport = async () => {
    if (!firestore || !isAdmin) return;
    if (!confirm('Copy the current rewards roster into School Office? This does not keep syncing.')) return;
    setBusy(true);
    try {
      const result = await importRewardsRosterToOffice(firestore, schoolId);
      toast({
        title: 'Roster imported',
        description: `${result.students} students and ${result.classes} classes copied.`,
      });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Import failed', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!firestore || !firstName.trim() || !lastName.trim()) {
      toast({ variant: 'destructive', title: 'First and last name are required.' });
      return;
    }
    setBusy(true);
    try {
      const payload: Omit<OfficeStudent, 'id'> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        nickname: nickname.trim() || null,
        classId: classId || null,
        teacherName: teacherName.trim() || null,
        notes: null,
        updatedAt: Date.now(),
      };
      await setDoc(doc(collection(firestore, 'schools', schoolId, 'officeStudents')), payload);
      toast({ title: 'Student added' });
      setOpen(false);
      reset();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not save student', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {isAdmin ? (
        <Button type="button" variant="outline" className="rounded-xl gap-2" disabled={busy} onClick={() => void handleImport()}>
          <Download className="h-4 w-4" />
          Import from rewards
        </Button>
      ) : null}
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
            <div className="space-y-2">
              <Label>Teacher (optional)</Label>
              <Input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} className="rounded-xl" />
            </div>
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
