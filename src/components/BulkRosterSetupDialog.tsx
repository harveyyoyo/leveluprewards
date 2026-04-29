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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BookOpen, Download, Loader2, UploadCloud, User, Users, Wand2, FileSpreadsheet } from 'lucide-react';
import {
  downloadUtf8Csv,
  ROSTER_CLASSES_TEMPLATE,
  ROSTER_STUDENTS_TEMPLATE,
  ROSTER_TEACHERS_TEMPLATE,
} from '@/lib/rosterCsvTemplates';
import { useAuthFetch } from '@/lib/authFetch';
import { useAppContext } from '@/components/AppProvider';
import { useToast } from '@/hooks/use-toast';

export type BulkRosterKind = 'classes' | 'teachers' | 'students';

type ParsedTeacher = { name: string; username?: string; passcode?: string };
type ParsedStudent = { firstName: string; lastName: string; className?: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Known class names (helps AI match student homerooms). */
  aiClassNames: string[];
  onClassesCsv: (text: string) => Promise<void>;
  onTeachersCsv: (text: string) => Promise<void>;
  onStudentsCsv: (text: string) => Promise<void>;
  onAiCommitClasses: (names: string[]) => Promise<void>;
  onAiCommitTeachers: (rows: ParsedTeacher[]) => Promise<void>;
  onAiCommitStudents: (rows: ParsedStudent[]) => Promise<void>;
};

export function BulkRosterSetupDialog({
  open,
  onOpenChange,
  aiClassNames,
  onClassesCsv,
  onTeachersCsv,
  onStudentsCsv,
  onAiCommitClasses,
  onAiCommitTeachers,
  onAiCommitStudents,
}: Props) {
  const classesRef = useRef<HTMLInputElement>(null);
  const teachersRef = useRef<HTMLInputElement>(null);
  const studentsRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<BulkRosterKind | null>(null);

  const authFetch = useAuthFetch();
  const { schoolId } = useAppContext();
  const { toast } = useToast();

  const [aiKind, setAiKind] = useState<BulkRosterKind>('classes');
  const [aiPaste, setAiPaste] = useState('');
  const [aiParsing, setAiParsing] = useState(false);
  const [aiImporting, setAiImporting] = useState(false);
  const [aiPreviewClasses, setAiPreviewClasses] = useState<{ name: string }[]>([]);
  const [aiPreviewTeachers, setAiPreviewTeachers] = useState<ParsedTeacher[]>([]);
  const [aiPreviewStudents, setAiPreviewStudents] = useState<ParsedStudent[]>([]);

  const resetAiPreview = () => {
    setAiPreviewClasses([]);
    setAiPreviewTeachers([]);
    setAiPreviewStudents([]);
  };

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

  const handleAiParse = async () => {
    if (!aiPaste.trim() || !schoolId) return;
    setAiParsing(true);
    resetAiPreview();
    try {
      const res = await authFetch('/api/parse-roster', {
        method: 'POST',
        body: JSON.stringify({
          schoolId,
          kind: aiKind,
          prompt: aiPaste,
          model: typeof window !== 'undefined' ? localStorage.getItem('arcade_ai_model') || 'gemini-2.5-flash' : 'gemini-2.5-flash',
          classNames: aiClassNames,
        }),
      });
      const bodyText = await res.text();
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(bodyText) as Record<string, unknown>;
      } catch {
        throw new Error(bodyText?.slice(0, 200) || 'Could not parse server response.');
      }
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'AI parse failed.');
      }

      let count = 0;
      if (aiKind === 'classes') {
        const classes = (data.classes as { name: string }[]) || [];
        const filtered = classes.filter((c) => c?.name?.trim());
        setAiPreviewClasses(filtered);
        count = filtered.length;
      } else if (aiKind === 'teachers') {
        const teachers = (data.teachers as ParsedTeacher[]) || [];
        const filtered = teachers.filter((t) => t?.name?.trim());
        setAiPreviewTeachers(filtered);
        count = filtered.length;
      } else {
        const students = (data.students as ParsedStudent[]) || [];
        const filtered = students.filter(
          (s) => (s?.firstName || '').trim() && (s?.lastName || '').trim(),
        );
        setAiPreviewStudents(filtered);
        count = filtered.length;
      }

      if (count === 0) {
        toast({
          title: 'Nothing extracted',
          description: 'Try pasting more rows or a clearer table. Check API keys if this keeps failing.',
        });
      } else {
        toast({
          title: 'Roster understood',
          description: `Review the preview, then import ${count} ${aiKind === 'classes' ? 'classes' : aiKind === 'teachers' ? 'teachers' : 'students'}.`,
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ variant: 'destructive', title: 'Could not parse text', description: msg });
    } finally {
      setAiParsing(false);
    }
  };

  const handleAiImport = async () => {
    setAiImporting(true);
    try {
      if (aiKind === 'classes' && aiPreviewClasses.length > 0) {
        await onAiCommitClasses(aiPreviewClasses.map((c) => c.name.trim()));
      } else if (aiKind === 'teachers' && aiPreviewTeachers.length > 0) {
        await onAiCommitTeachers(aiPreviewTeachers);
      } else if (aiKind === 'students' && aiPreviewStudents.length > 0) {
        await onAiCommitStudents(aiPreviewStudents);
      }
      resetAiPreview();
      setAiPaste('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ variant: 'destructive', title: 'Import failed', description: msg });
    } finally {
      setAiImporting(false);
    }
  };

  const previewCount =
    aiKind === 'classes'
      ? aiPreviewClasses.length
      : aiKind === 'teachers'
        ? aiPreviewTeachers.length
        : aiPreviewStudents.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Bulk roster setup</DialogTitle>
          <DialogDescription>
            Import from CSV files, or paste any roster export, spreadsheet slice, or list and let AI interpret the columns.
          </DialogDescription>
        </DialogHeader>

        <Alert className="rounded-xl border-primary/30 bg-primary/5">
          <AlertTitle className="text-sm font-semibold">Suggested order</AlertTitle>
          <AlertDescription className="text-xs leading-relaxed pt-1">
            <strong className="font-semibold text-foreground">1.</strong> Classes{' '}
            <strong className="font-semibold text-foreground">2.</strong> Teachers{' '}
            <strong className="font-semibold text-foreground">3.</strong> Students (class column matches existing classes).
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="csv" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-xl">
            <TabsTrigger value="csv" className="rounded-lg gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              CSV files
            </TabsTrigger>
            <TabsTrigger value="ai" className="rounded-lg gap-2">
              <Wand2 className="w-4 h-4" />
              AI (any format)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="csv" className="space-y-5 pt-4 outline-none">
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
          </TabsContent>

          <TabsContent value="ai" className="space-y-4 pt-4 outline-none">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                What are you importing?
              </Label>
              <Select
                value={aiKind}
                onValueChange={(v) => {
                  setAiKind(v as BulkRosterKind);
                  resetAiPreview();
                }}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classes">Classes / groups / homerooms</SelectItem>
                  <SelectItem value="teachers">Teachers / staff logins</SelectItem>
                  <SelectItem value="students">Students</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Paste text (any format)
              </Label>
              <Textarea
                value={aiPaste}
                onChange={(e) => setAiPaste(e.target.value)}
                placeholder={
                  aiKind === 'classes'
                    ? 'Paste a column from Excel, a bullet list, SIS export, or a whole table…'
                    : aiKind === 'teachers'
                      ? 'Paste staff lists, HR CSV exports, or schedules with names…'
                      : 'Paste rosters with any column headers (First/Given/Last, homeroom, etc.)…'
                }
                className="min-h-[140px] rounded-xl text-sm font-mono"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="rounded-xl gap-2"
                disabled={aiParsing || !aiPaste.trim() || !schoolId}
                onClick={() => void handleAiParse()}
              >
                {aiParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                Understand with AI
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="rounded-xl"
                disabled={aiImporting || previewCount === 0}
                onClick={() => void handleAiImport()}
              >
                {aiImporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Import {previewCount > 0 ? `${previewCount} ` : ''}
                {aiKind === 'classes' ? 'classes' : aiKind === 'teachers' ? 'teachers' : 'students'}
              </Button>
            </div>

            {previewCount > 0 && (
              <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Preview</p>
                <ScrollArea className="h-[min(200px,35vh)] pr-3">
                  <ul className="text-sm space-y-1.5 font-mono">
                    {aiKind === 'classes' &&
                      aiPreviewClasses.map((c, i) => (
                        <li key={i} className="truncate border-b border-border/40 pb-1">
                          {c.name}
                        </li>
                      ))}
                    {aiKind === 'teachers' &&
                      aiPreviewTeachers.map((t, i) => (
                        <li key={i} className="border-b border-border/40 pb-1">
                          <span className="font-semibold">{t.name}</span>
                          {t.username ? (
                            <span className="text-muted-foreground text-xs ml-2">
                              @{t.username}
                              {t.passcode ? ` · PIN ${t.passcode}` : ''}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    {aiKind === 'students' &&
                      aiPreviewStudents.map((s, i) => (
                        <li key={i} className="border-b border-border/40 pb-1 truncate">
                          {s.firstName} {s.lastName}
                          {s.className ? (
                            <span className="text-muted-foreground text-xs ml-2">· {s.className}</span>
                          ) : null}
                        </li>
                      ))}
                  </ul>
                </ScrollArea>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
