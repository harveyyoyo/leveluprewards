'use client';

import { useRef, useState } from 'react';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { Upload } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { OfficeClass, OfficeStudent, OfficeTeacher } from '@/lib/office/types';
import { getOfficeStudentFullName, resolveOfficeTeacherIdByName } from '@/lib/office/officeUtils';
import { parseOfficeGradesCsv, parseOfficeStudentsCsv } from '@/lib/office/officeCsvImport';

type OfficeCsvImportDialogProps = {
  schoolId: string;
  mode: 'students' | 'grades';
  classes?: OfficeClass[];
  teachers?: OfficeTeacher[];
  students?: OfficeStudent[];
  userName?: string | null;
  disabled?: boolean;
};

export function OfficeCsvImportDialog({
  schoolId,
  mode,
  classes = [],
  teachers = [],
  students = [],
  userName,
  disabled,
}: OfficeCsvImportDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!firestore) return;
    const text = await file.text();
    setPreview(`${file.name} (${Math.round(file.size / 1024)} KB)`);
    setOpen(true);
    (window as unknown as { __officeCsvText?: string }).__officeCsvText = text;
  };

  const runImport = async () => {
    if (!firestore) return;
    const text = (window as unknown as { __officeCsvText?: string }).__officeCsvText;
    if (!text) {
      toast({ variant: 'destructive', title: 'Choose a CSV file first.' });
      return;
    }
    setBusy(true);
    try {
      if (mode === 'students') {
        const { rows, errors } = parseOfficeStudentsCsv(text);
        if (rows.length === 0) {
          toast({ variant: 'destructive', title: 'No rows to import', description: errors[0] });
          return;
        }
        const classIdByName = new Map(
          classes.map((c) => [(c.name ?? '').trim().toLowerCase(), c.id]),
        );
        const batch = writeBatch(firestore);
        for (const row of rows) {
          const classId = row.className
            ? classIdByName.get(row.className.toLowerCase()) ?? null
            : null;
          const ref = doc(collection(firestore, 'schools', schoolId, 'officeStudents'));
          batch.set(ref, {
            firstName: row.firstName,
            lastName: row.lastName,
            nickname: row.nickname,
            classId,
            teacherId: resolveOfficeTeacherIdByName(teachers, row.teacherName),
            teacherName: resolveOfficeTeacherIdByName(teachers, row.teacherName) ? null : row.teacherName,
            notes: row.notes,
            updatedAt: Date.now(),
          });
        }
        await batch.commit();
        toast({
          title: 'Students imported',
          description: `${rows.length} added${errors.length ? ` · ${errors.length} skipped` : ''}.`,
        });
      } else {
        const { rows, errors } = parseOfficeGradesCsv(text);
        if (rows.length === 0) {
          toast({ variant: 'destructive', title: 'No rows to import', description: errors[0] });
          return;
        }
        const studentIdByName = new Map(
          students.map((s) => [getOfficeStudentFullName(s).toLowerCase(), s.id]),
        );
        const batch = writeBatch(firestore);
        let skipped = 0;
        for (const row of rows) {
          const studentId = studentIdByName.get(row.studentName.toLowerCase());
          if (!studentId) {
            skipped += 1;
            continue;
          }
          const student = students.find((s) => s.id === studentId);
          const ref = doc(collection(firestore, 'schools', schoolId, 'officeGradeEntries'));
          batch.set(ref, {
            studentId,
            classId: student?.classId ?? null,
            termLabel: row.termLabel,
            subject: row.subject,
            letterGrade: row.letterGrade,
            numericGrade: row.numericGrade,
            notes: row.notes,
            updatedAt: Date.now(),
            updatedBy: userName ?? null,
          });
        }
        await batch.commit();
        toast({
          title: 'Grades imported',
          description: `${rows.length - skipped} saved${skipped ? ` · ${skipped} unknown students` : ''}${errors.length ? ` · ${errors.length} row errors` : ''}.`,
        });
      }
      setOpen(false);
      setPreview(null);
      delete (window as unknown as { __officeCsvText?: string }).__officeCsvText;
    } catch (e) {
      toast({ variant: 'destructive', title: 'Import failed', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
      />
      <Button
        type="button"
        variant="outline"
        className="rounded-xl gap-2"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-4 w-4" />
        Import CSV
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{mode === 'students' ? 'Import students' : 'Import grades'}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {mode === 'students'
              ? 'CSV columns: First, Last, Nickname (optional), Class, Teacher, Notes. Class names must match existing office classes.'
              : 'CSV columns: Student, Term, Subject, Letter, Percent, Notes. Student names must match the office roster.'}
          </p>
          {preview ? <p className="text-sm font-medium">{preview}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="rounded-xl" disabled={busy} onClick={() => void runImport()}>
              {busy ? 'Importing…' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
