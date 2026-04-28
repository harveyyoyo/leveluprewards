'use client';

import { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BookOpen, Download, Loader2, UploadCloud, User, Users } from 'lucide-react';
import {
  downloadUtf8Csv,
  ROSTER_CLASSES_TEMPLATE,
  ROSTER_STUDENTS_TEMPLATE,
  ROSTER_TEACHERS_TEMPLATE,
} from '@/lib/rosterCsvTemplates';

export type BulkRosterKind = 'classes' | 'teachers' | 'students';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after user selects a CSV file for classes */
  onClassesCsv: (text: string) => Promise<void>;
  /** Called after user selects a CSV file for teachers */
  onTeachersCsv: (text: string) => Promise<void>;
  /** Called after user selects a CSV file for students */
  onStudentsCsv: (text: string) => Promise<void>;
};

export function BulkRosterSetupDialog({
  open,
  onOpenChange,
  onClassesCsv,
  onTeachersCsv,
  onStudentsCsv,
}: Props) {
  const classesRef = useRef<HTMLInputElement>(null);
  const teachersRef = useRef<HTMLInputElement>(null);
  const studentsRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<BulkRosterKind | null>(null);

  const wrap =
    (kind: BulkRosterKind, fn: (text: string) => Promise<void>) =>
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setBusy(kind);
      try {
        const text = await file.text();
        await fn(text);
      } finally {
        setBusy(null);
        e.target.value = '';
      }
    };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Bulk roster setup</DialogTitle>
          <DialogDescription>
            Import classes, teachers, and students from CSV files. Use the templates so column names match what the app expects.
          </DialogDescription>
        </DialogHeader>

        <Alert className="rounded-xl border-primary/30 bg-primary/5">
          <AlertTitle className="text-sm font-semibold">Suggested order</AlertTitle>
          <AlertDescription className="text-xs leading-relaxed pt-1">
            <strong className="font-semibold text-foreground">1.</strong> Classes (so class names exist){' '}
            <strong className="font-semibold text-foreground">2.</strong> Teachers{' '}
            <strong className="font-semibold text-foreground">3.</strong> Students (optional third column matches a class name).
          </AlertDescription>
        </Alert>

        <div className="space-y-5 pt-1">
          <section className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-start gap-3">
              <BookOpen className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden />
              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="font-bold text-sm">Classes</h3>
                <p className="text-xs text-muted-foreground">
                  One class name per row (or a single &quot;Class Name&quot; column). Duplicate names are skipped.
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg"
                    onClick={() => downloadUtf8Csv('classes-template.csv', ROSTER_CLASSES_TEMPLATE)}
                  >
                    <Download className="w-4 h-4 mr-1.5" />
                    Template
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="rounded-lg"
                    disabled={busy !== null}
                    onClick={() => classesRef.current?.click()}
                  >
                    {busy === 'classes' ? (
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    ) : (
                      <UploadCloud className="w-4 h-4 mr-1.5" />
                    )}
                    Import CSV
                  </Button>
                </div>
              </div>
            </div>
            <input
              ref={classesRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={wrap('classes', onClassesCsv)}
            />
          </section>

          <section className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden />
              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="font-bold text-sm">Teachers</h3>
                <p className="text-xs text-muted-foreground">
                  Columns: Full Name, Username, Passcode. Username and passcode can be left blank; unique logins are generated when omitted.
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg"
                    onClick={() => downloadUtf8Csv('teachers-template.csv', ROSTER_TEACHERS_TEMPLATE)}
                  >
                    <Download className="w-4 h-4 mr-1.5" />
                    Template
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="rounded-lg"
                    disabled={busy !== null}
                    onClick={() => teachersRef.current?.click()}
                  >
                    {busy === 'teachers' ? (
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    ) : (
                      <UploadCloud className="w-4 h-4 mr-1.5" />
                    )}
                    Import CSV
                  </Button>
                </div>
              </div>
            </div>
            <input
              ref={teachersRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={wrap('teachers', onTeachersCsv)}
            />
          </section>

          <section className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden />
              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="font-bold text-sm">Students</h3>
                <p className="text-xs text-muted-foreground">
                  Columns: First Name, Last Name, Class Name (optional). Class Name must match an existing class.
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg"
                    onClick={() => downloadUtf8Csv('students-template.csv', ROSTER_STUDENTS_TEMPLATE)}
                  >
                    <Download className="w-4 h-4 mr-1.5" />
                    Template
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="rounded-lg"
                    disabled={busy !== null}
                    onClick={() => studentsRef.current?.click()}
                  >
                    {busy === 'students' ? (
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    ) : (
                      <UploadCloud className="w-4 h-4 mr-1.5" />
                    )}
                    Import CSV
                  </Button>
                </div>
              </div>
            </div>
            <input
              ref={studentsRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={wrap('students', onStudentsCsv)}
            />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
