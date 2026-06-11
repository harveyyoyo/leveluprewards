'use client';

import { useRef, useState, useMemo, useEffect } from 'react';
import {
  BookOpen,
  CreditCard,
  FileSpreadsheet,
  GraduationCap,
  Headset,
  Loader2,
  Paperclip,
  Users,
  Wand2,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuthFetch } from '@/lib/authFetch';
import { useToast } from '@/hooks/use-toast';
import { getArcadeAiModelFromStorage } from '@/lib/aiModelPreference';
import {
  applyOfficeAiSnapshot,
  formatOfficeImportReport,
  officeSnapshotCounts,
  totalOfficeSnapshotItems,
  type ParsedOfficeSnapshot,
} from '@/lib/office/officeAiImport';
import { getOfficeStudentFullName } from '@/lib/office/officeUtils';
import type {
  OfficeBillingAccount,
  OfficeClass,
  OfficeGradeEntry,
  OfficeStudent,
  OfficeTeacher,
} from '@/lib/office/types';
import { useFirestore } from '@/firebase';
import { cn } from '@/lib/utils';

type OfficeAiImportSectionProps = {
  schoolId: string;
  classes: OfficeClass[];
  teachers: OfficeTeacher[];
  students: OfficeStudent[];
  gradeEntries: OfficeGradeEntry[];
  billingAccounts: OfficeBillingAccount[];
  canImportStaff: boolean;
  userName?: string | null;
};

export function OfficeAiImportSection({
  schoolId,
  classes,
  teachers,
  students,
  gradeEntries,
  billingAccounts,
  canImportStaff,
  userName,
}: OfficeAiImportSectionProps) {
  const firestore = useFirestore();
  const authFetch = useAuthFetch();
  const { toast } = useToast();

  const docInputRef = useRef<HTMLInputElement>(null);
  const [aiPaste, setAiPaste] = useState('');
  const [extractedDocText, setExtractedDocText] = useState('');
  const [extractedDocName, setExtractedDocName] = useState('');
  const [extractingDoc, setExtractingDoc] = useState(false);
  const [aiParsing, setAiParsing] = useState(false);
  const [aiImporting, setAiImporting] = useState(false);
  const [aiSnapshot, setAiSnapshot] = useState<ParsedOfficeSnapshot | null>(null);
  const [upsertStudents, setUpsertStudents] = useState(true);
  const [activeDiffTab, setActiveDiffTab] = useState<'students' | 'classes' | 'grades' | 'billingAccounts' | 'invoices' | 'staffAccounts' | 'teachers'>('students');

  const diffData = useMemo(() => {
    if (!aiSnapshot) return null;

    // 1. Classes Diff
    const existingClassNames = new Set(classes.map((c) => (c.name ?? '').trim().toLowerCase()));
    const classDiffs = (aiSnapshot.classes ?? []).map((c) => {
      const name = c.name.trim();
      const exists = existingClassNames.has(name.toLowerCase());
      return {
        name,
        status: exists ? 'skip' : 'new',
        message: exists ? `Class "${name}" already exists.` : `Create new class "${name}".`,
      };
    });

    // 2. Teachers Diff
    const existingTeacherNames = new Set(teachers.map((t) => (t.name ?? '').trim().toLowerCase()));
    const teacherDiffs = (aiSnapshot.teachers ?? []).map((t) => {
      const name = t.name.trim();
      const exists = existingTeacherNames.has(name.toLowerCase());
      return {
        name,
        status: exists ? 'skip' : 'new',
        message: exists ? `Teacher "${name}" already exists.` : `Create new teacher "${name}"${t.email ? ` with email ${t.email}` : ''}.`,
      };
    });

    // 3. Students Diff
    const existingStudentNames = new Set(students.map((s) => getOfficeStudentFullName(s).toLowerCase()));
    const studentByName = new Map(students.map((s) => [getOfficeStudentFullName(s).toLowerCase(), s]));

    const studentDiffs = (aiSnapshot.students ?? []).map((row) => {
      const name = getOfficeStudentFullName({
        firstName: row.firstName,
        lastName: row.lastName,
        nickname: row.nickname ?? null,
      });
      const key = name.toLowerCase();
      const exists = existingStudentNames.has(key);
      const existingObj = exists ? studentByName.get(key) : null;

      let message = '';
      let status: 'new' | 'merge' | 'skip' = 'new';

      if (exists && existingObj) {
        status = upsertStudents ? 'merge' : 'skip';
        const updates: string[] = [];
        if (!existingObj.nickname?.trim() && row.nickname) updates.push(`nickname "${row.nickname}"`);
        if (!existingObj.classId && row.className) updates.push(`homeroom "${row.className}"`);
        if (!existingObj.teacherId?.trim() && row.teacherName) updates.push(`teacher "${row.teacherName}"`);
        if (!existingObj.notes?.trim() && row.notes) updates.push(`notes "${row.notes}"`);

        if (updates.length > 0) {
          message = `Merge: will populate missing ${updates.join(', ')}.`;
        } else {
          message = `Already up to date. No updates needed.`;
          status = 'skip';
        }
      } else {
        message = `Create new student in homeroom "${row.className || 'None'}".`;
      }

      return {
        name,
        status,
        message,
      };
    });

    // 4. Grades Diff
    const existingGradeKeys = new Set(
      gradeEntries.map((e) => `${e.studentId}|${e.termLabel}|${(e.subject ?? '').toLowerCase()}`)
    );
    const studentIdByName = new Map(
      students.map((s) => [getOfficeStudentFullName(s).toLowerCase(), s.id])
    );
    // Include newly parsed students
    (aiSnapshot.students ?? []).forEach((row, idx) => {
      const fullName = getOfficeStudentFullName({
        firstName: row.firstName,
        lastName: row.lastName,
        nickname: row.nickname ?? null,
      }).toLowerCase();
      if (!studentIdByName.has(fullName)) {
        studentIdByName.set(fullName, `new-student-${idx}`);
      }
    });

    const gradeDiffs = (aiSnapshot.grades ?? []).map((row) => {
      const studentId = studentIdByName.get(row.studentName.toLowerCase());
      const gradeStr = row.letterGrade || (row.numericGrade != null ? `${row.numericGrade}%` : 'N/A');
      
      let status: 'new' | 'skip' = 'new';
      let message = '';

      if (!studentId) {
        status = 'skip';
        message = `Skip: Student "${row.studentName}" not found in current list or import roster.`;
      } else {
        const dedupeKey = `${studentId}|${row.termLabel}|${row.subject.toLowerCase()}`;
        if (existingGradeKeys.has(dedupeKey)) {
          status = 'skip';
          message = `Skip: ${row.subject} grade for ${row.studentName} in ${row.termLabel} already exists.`;
        } else {
          message = `Add grade of ${gradeStr} for ${row.studentName} in ${row.subject} (${row.termLabel}).`;
        }
      }

      return {
        name: `${row.studentName} · ${row.subject}`,
        status,
        message,
      };
    });

    // 5. Billing Accounts Diff
    const existingFamilyNames = new Set(billingAccounts.map((a) => (a.familyName ?? '').trim().toLowerCase()));
    const billingDiffs = (aiSnapshot.billingAccounts ?? []).map((row) => {
      const name = `${row.familyName} Family`;
      const exists = existingFamilyNames.has(row.familyName.trim().toLowerCase());
      return {
        name,
        status: exists ? 'skip' : 'new',
        message: exists
          ? `Billing account already exists.`
          : `Create new family account with ${row.studentNames?.length ?? 0} linked students.`,
      };
    });

    // 6. Invoices Diff
    const familyExistsMap = new Set(billingAccounts.map((a) => (a.familyName ?? '').trim().toLowerCase()));
    (aiSnapshot.billingAccounts ?? []).forEach((b) => familyExistsMap.add(b.familyName.trim().toLowerCase()));

    const invoiceDiffs = (aiSnapshot.invoices ?? []).map((row) => {
      const name = `${row.label} · $${(row.amountCents / 100).toFixed(2)}`;
      const hasFamily = familyExistsMap.has(row.familyName.trim().toLowerCase());
      
      let status: 'new' | 'skip' = 'new';
      let message = '';

      if (!hasFamily) {
        status = 'skip';
        message = `Error: Family billing account "${row.familyName}" missing and not in import roster.`;
      } else {
        message = `Generate invoice for family "${row.familyName}" due ${row.dueDate || 'immediately'}.`;
      }

      return {
        name,
        status,
        message,
      };
    });

    // 7. Staff Diff
    const staffDiffs = (aiSnapshot.staffAccounts ?? []).map((row) => {
      return {
        name: row.displayName,
        status: 'new' as const,
        message: `Create new office desk login "${row.username}".`,
      };
    });

    return {
      classes: classDiffs,
      teachers: teacherDiffs,
      students: studentDiffs,
      grades: gradeDiffs,
      billingAccounts: billingDiffs,
      invoices: invoiceDiffs,
      staffAccounts: staffDiffs,
    };
  }, [aiSnapshot, classes, teachers, students, gradeEntries, billingAccounts, upsertStudents]);

  const classNames = classes.map((c) => c.name);
  const studentNames = students.map((s) => getOfficeStudentFullName(s));

  const counts = useMemo(() => {
    return aiSnapshot ? officeSnapshotCounts(aiSnapshot) : {};
  }, [aiSnapshot]);

  useEffect(() => {
    if (aiSnapshot) {
      const keys = ['students', 'classes', 'grades', 'billingAccounts', 'invoices', 'staffAccounts'] as const;
      for (const k of keys) {
        if (counts[k]) {
          setActiveDiffTab(k);
          break;
        }
      }
    }
  }, [aiSnapshot, counts]);

  const resetAi = () => {
    setAiPaste('');
    setExtractedDocText('');
    setExtractedDocName('');
    setAiSnapshot(null);
    setUpsertStudents(true);
  };

  const buildCombinedPrompt = () => {
    const parts: string[] = [];
    if (extractedDocText.trim()) {
      parts.push(`### Uploaded document: ${extractedDocName || 'file'}\n${extractedDocText}`);
    }
    if (aiPaste.trim()) parts.push(aiPaste.trim());
    return parts.join('\n\n---\n\n');
  };

  const handleDocFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !schoolId) return;
    setExtractingDoc(true);
    try {
      const fd = new FormData();
      fd.set('schoolId', schoolId);
      fd.set('file', file);
      const res = await authFetch('/api/extract-document', { method: 'POST', body: fd });
      const raw = await res.text();
      let data: { text?: string; filename?: string; error?: string };
      try {
        data = JSON.parse(raw) as typeof data;
      } catch {
        throw new Error(raw.slice(0, 200) || 'Upload failed.');
      }
      if (!res.ok) throw new Error(data.error || 'Could not read document.');
      setExtractedDocText(data.text || '');
      setExtractedDocName(data.filename || file.name);
      setAiSnapshot(null);
      toast({ title: 'Document loaded', description: `Extracted ${(data.text || '').length} characters.` });
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Document upload failed',
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setExtractingDoc(false);
      e.target.value = '';
    }
  };

  const handleAiParse = async () => {
    const combined = buildCombinedPrompt();
    if (!combined.trim() || !schoolId) return;
    setAiParsing(true);
    setAiSnapshot(null);
    try {
      const res = await authFetch('/api/parse-office-import', {
        method: 'POST',
        body: JSON.stringify({
          schoolId,
          prompt: combined,
          model: getArcadeAiModelFromStorage(),
          classNames,
          studentNames,
        }),
      });
      const bodyText = await res.text();
      let data: { snapshot?: ParsedOfficeSnapshot; error?: string };
      try {
        data = JSON.parse(bodyText) as typeof data;
      } catch {
        throw new Error(bodyText.slice(0, 200) || 'Bad response.');
      }
      if (!res.ok) throw new Error(data.error || 'AI parse failed.');
      const snap = data.snapshot ?? {};
      setAiSnapshot(snap);
      const n = totalOfficeSnapshotItems(snap);
      if (n === 0) {
        toast({
          title: 'Nothing recognized',
          description: 'Try more detail, another export, or paste additional rows.',
        });
      } else {
        toast({ title: 'Data understood', description: `Review ${n} item(s) below, then import.` });
      }
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not parse',
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setAiParsing(false);
    }
  };

  const handleAiImport = async () => {
    if (!firestore || !aiSnapshot || totalOfficeSnapshotItems(aiSnapshot) === 0) return;
    setAiImporting(true);
    try {
      const report = await applyOfficeAiSnapshot(firestore, schoolId, aiSnapshot, {
        classes,
        teachers,
        students,
        gradeEntries,
        billingAccounts,
        upsertStudents,
        updatedBy: userName,
        canImportStaff,
      });
      const summary = formatOfficeImportReport(report);
      toast({
        title: 'Import complete',
        description: report.errors.length ? `${summary} · ${report.errors[0]}` : summary,
      });
      resetAi();
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Import failed',
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setAiImporting(false);
    }
  };

  const previewTotal = aiSnapshot ? totalOfficeSnapshotItems(aiSnapshot) : 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-base font-bold flex items-center gap-2">
        <Wand2 className="h-4 w-4 text-teal-700" />
        AI import
      </h2>
      <p className="mt-1 text-xs text-muted-foreground max-w-2xl">
        Paste or upload anything — rosters, grade exports, tuition lists, family contacts. The model figures out
        classes, students, grades, billing, invoices, and office staff logins. You do not need to label the file type.
      </p>

      <Alert className="mt-4 rounded-xl border-teal-200/60 bg-teal-50/40 dark:border-teal-900/40 dark:bg-teal-950/20">
        <AlertTitle className="text-sm font-semibold">Tip</AlertTitle>
        <AlertDescription className="text-xs leading-relaxed pt-1">
          Combine multiple snippets in one go (e.g. a grade spreadsheet plus a family billing export). Use CSV import
          on Students or Grades when columns are already standard.
        </AlertDescription>
      </Alert>

      <div className="mt-4 space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Attach document (optional)
          </Label>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl gap-2"
              disabled={extractingDoc}
              onClick={() => docInputRef.current?.click()}
            >
              {extractingDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              PDF, DOCX, TXT, CSV
            </Button>
            {extractedDocName ? (
              <span className="max-w-[220px] truncate text-xs text-muted-foreground" title={extractedDocName}>
                {extractedDocName}
              </span>
            ) : null}
            {extractedDocText ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  setExtractedDocText('');
                  setExtractedDocName('');
                }}
              >
                Remove file
              </Button>
            ) : null}
          </div>
          <input
            ref={docInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv"
            className="hidden"
            onChange={(e) => void handleDocFile(e)}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Paste anything (optional)
          </Label>
          <Textarea
            value={aiPaste}
            onChange={(e) => setAiPaste(e.target.value)}
            placeholder="Spreadsheets, report cards, billing exports, mixed tables, emails…"
            className="min-h-[120px] rounded-xl font-mono text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="rounded-xl gap-2"
            disabled={aiParsing || !buildCombinedPrompt().trim()}
            onClick={() => void handleAiParse()}
          >
            {aiParsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Understand with AI
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="rounded-xl"
            disabled={aiImporting || previewTotal === 0}
            onClick={() => void handleAiImport()}
          >
            {aiImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Import all ({previewTotal})
          </Button>
        </div>

        <div className="flex items-start gap-3 rounded-xl border bg-muted/20 p-3">
          <Checkbox
            id="office-ai-upsert-students"
            checked={upsertStudents}
            onCheckedChange={(v: boolean | 'indeterminate') => setUpsertStudents(v === true)}
          />
          <div className="space-y-1">
            <Label htmlFor="office-ai-upsert-students" className="text-xs font-bold">
              Update existing students (merge)
            </Label>
            <p className="text-[11px] leading-snug text-muted-foreground">
              Matches by full name. Fills in missing class, teacher, nickname, and notes without overwriting fields
              already set.
            </p>
          </div>
        </div>

        {previewTotal > 0 && aiSnapshot ? (
          <div className="space-y-4 rounded-xl border bg-muted/30 p-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview Summary</p>
              <div className="flex flex-wrap gap-2 text-xs mt-2">
                {counts.classes ? (
                  <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5">
                    <BookOpen className="h-3 w-3" /> {counts.classes} classes
                  </span>
                ) : null}
                {counts.students ? (
                  <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5">
                    <Users className="h-3 w-3" /> {counts.students} students
                  </span>
                ) : null}
                {counts.grades ? (
                  <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5">
                    <GraduationCap className="h-3 w-3" /> {counts.grades} grades
                  </span>
                ) : null}
                {counts.billingAccounts ? (
                  <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5">
                    <CreditCard className="h-3 w-3" /> {counts.billingAccounts} billing
                  </span>
                ) : null}
                {counts.invoices ? (
                  <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5">
                    <FileSpreadsheet className="h-3 w-3" /> {counts.invoices} invoices
                  </span>
                ) : null}
                {counts.staffAccounts ? (
                  <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5">
                    <Headset className="h-3 w-3" /> {counts.staffAccounts} staff
                  </span>
                ) : null}
                {counts.settings ? (
                  <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5">
                    Settings
                  </span>
                ) : null}
              </div>
            </div>

            {/* AI Dry-Run Difference Panel */}
            <div className="rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-950 dark:border-slate-800">
              <p className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400 mb-3">
                AI Dry-Run Diff Panel
              </p>
              
              {/* Tab Toggles */}
              <div className="flex flex-wrap gap-1 border-b pb-2 mb-3">
                {([
                  { key: 'students', label: 'Students', count: counts.students || 0 },
                  { key: 'classes', label: 'Classes', count: counts.classes || 0 },
                  { key: 'grades', label: 'Grades', count: counts.grades || 0 },
                  { key: 'billingAccounts', label: 'Billing Accounts', count: counts.billingAccounts || 0 },
                  { key: 'invoices', label: 'Invoices', count: counts.invoices || 0 },
                  { key: 'staffAccounts', label: 'Staff Logins', count: counts.staffAccounts || 0 },
                ] as const).map((tab) => {
                  if (tab.count === 0) return null;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveDiffTab(tab.key)}
                      className={cn(
                        "px-2.5 py-1 text-xs font-medium rounded-lg transition-all",
                        activeDiffTab === tab.key
                          ? "bg-teal-700 text-white dark:bg-teal-600 shadow-sm"
                          : "hover:bg-slate-100 text-muted-foreground hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                      )}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  );
                })}
              </div>

              {/* Tab Contents */}
              <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {diffData && diffData[activeDiffTab] && diffData[activeDiffTab].length > 0 ? (
                  diffData[activeDiffTab].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-lg border bg-slate-50/50 dark:bg-slate-900/30 text-[11px] leading-relaxed transition-all hover:bg-slate-50 dark:hover:bg-slate-900/50"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {item.name}
                        </span>
                        <span className="text-muted-foreground">
                          {item.message}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "inline-flex self-start sm:self-center px-1.5 py-0.5 font-bold uppercase tracking-wider rounded text-[9px] border",
                          item.status === 'new'
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/30"
                            : item.status === 'merge'
                            ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-900/30"
                            : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/50"
                        )}
                      >
                        {item.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground py-2 text-center">
                    Select an active category above to review import details.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
