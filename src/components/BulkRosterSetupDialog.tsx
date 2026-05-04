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
  BookOpen,
  Download,
  Loader2,
  UploadCloud,
  User,
  Users,
  Wand2,
  FileSpreadsheet,
  Paperclip,
  Tags,
  Clock,
  Gift,
  Headset,
} from 'lucide-react';
import {
  downloadUtf8Csv,
  ROSTER_CLASSES_TEMPLATE,
  ROSTER_STUDENTS_TEMPLATE,
  ROSTER_TEACHERS_TEMPLATE,
} from '@/lib/rosterCsvTemplates';
import { useAuthFetch } from '@/lib/authFetch';
import { useAppContext } from '@/components/AppProvider';
import { useToast } from '@/hooks/use-toast';
import type { ParsedSchoolSnapshot } from '@/lib/schoolDataImport';

export type BulkRosterKind = 'classes' | 'teachers' | 'students';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aiClassNames: string[];
  onClassesCsv: (text: string) => Promise<void>;
  onTeachersCsv: (text: string) => Promise<void>;
  onStudentsCsv: (text: string) => Promise<void>;
  onAiCommitSnapshot: (snapshot: ParsedSchoolSnapshot) => Promise<void>;
};

function snapshotCounts(s: ParsedSchoolSnapshot): Record<string, number> {
  const o: Record<string, number> = {};
  if (s.classes?.length) o.classes = s.classes.length;
  if (s.teachers?.length) o.teachers = s.teachers.length;
  if (s.students?.length) o.students = s.students.length;
  if (s.periods?.length) o.periods = s.periods.length;
  if (s.categories?.length) o.categories = s.categories.length;
  if (s.prizes?.length) o.prizes = s.prizes.length;
  if (s.staffAccounts?.length) o.staffAccounts = s.staffAccounts.length;
  return o;
}

function totalInSnapshot(s: ParsedSchoolSnapshot): number {
  return Object.values(snapshotCounts(s)).reduce((a, b) => a + b, 0);
}

export function BulkRosterSetupDialog({
  open,
  onOpenChange,
  aiClassNames,
  onClassesCsv,
  onTeachersCsv,
  onStudentsCsv,
  onAiCommitSnapshot,
}: Props) {
  const classesRef = useRef<HTMLInputElement>(null);
  const teachersRef = useRef<HTMLInputElement>(null);
  const studentsRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<BulkRosterKind | null>(null);

  const authFetch = useAuthFetch();
  const { schoolId } = useAppContext();
  const { toast } = useToast();

  const [aiPaste, setAiPaste] = useState('');
  const [extractedDocText, setExtractedDocText] = useState('');
  const [extractedDocName, setExtractedDocName] = useState('');
  const [extractingDoc, setExtractingDoc] = useState(false);
  const [aiParsing, setAiParsing] = useState(false);
  const [aiImporting, setAiImporting] = useState(false);
  const [aiSnapshot, setAiSnapshot] = useState<ParsedSchoolSnapshot | null>(null);

  const resetAi = () => {
    setAiPaste('');
    setExtractedDocText('');
    setExtractedDocName('');
    setAiSnapshot(null);
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

  const buildCombinedPrompt = () => {
    const parts: string[] = [];
    if (extractedDocText.trim()) {
      parts.push(`### Uploaded document: ${extractedDocName || 'file'}\n${extractedDocText}`);
    }
    if (aiPaste.trim()) {
      parts.push(aiPaste.trim());
    }
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
      const res = await authFetch('/api/extract-document', {
        method: 'POST',
        body: fd,
      });
      const raw = await res.text();
      let data: { text?: string; filename?: string; error?: string };
      try {
        data = JSON.parse(raw) as typeof data;
      } catch {
        throw new Error(raw.slice(0, 200) || 'Upload failed.');
      }
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Could not read document.');
      }
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
      const res = await authFetch('/api/parse-roster', {
        method: 'POST',
        body: JSON.stringify({
          schoolId,
          kind: 'auto',
          prompt: combined,
          model: typeof window !== 'undefined' ? localStorage.getItem('arcade_ai_model') || 'gemini-2.5-pro' : 'gemini-2.5-pro',
          classNames: aiClassNames,
        }),
      });
      const bodyText = await res.text();
      let data: { mode?: string; snapshot?: ParsedSchoolSnapshot; error?: string };
      try {
        data = JSON.parse(bodyText) as typeof data;
      } catch {
        throw new Error(bodyText.slice(0, 200) || 'Bad response.');
      }
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'AI parse failed.');
      }
      const snap = data.snapshot || {};
      setAiSnapshot(snap);
      const n = totalInSnapshot(snap);
      if (n === 0) {
        toast({
          title: 'Nothing recognized',
          description: 'Try more detail, another export, or paste additional rows.',
        });
      } else {
        toast({
          title: 'Data understood',
          description: `Review ${n} item(s) below, then import.`,
        });
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
    if (!aiSnapshot || totalInSnapshot(aiSnapshot) === 0) return;
    setAiImporting(true);
    try {
      await onAiCommitSnapshot(aiSnapshot);
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

  const counts = aiSnapshot ? snapshotCounts(aiSnapshot) : {};
  const previewTotal = aiSnapshot ? totalInSnapshot(aiSnapshot) : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetAi(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-2xl rounded-2xl flex flex-col p-0 overflow-hidden max-h-[var(--dialog-max-h,min(90vh,calc(100dvh-2rem)))]">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl">Bulk roster setup</DialogTitle>
          <DialogDescription>
                  CSV templates for precise columns, or paste/upload anything and let AI detect classes, people, periods, categories, reward items, and desk staff.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            <Alert className="rounded-xl border-primary/30 bg-primary/5">
              <AlertTitle className="text-sm font-semibold">Tip</AlertTitle>
              <AlertDescription className="text-xs leading-relaxed pt-1">
                Paste exports and notes together, or attach a PDF/DOCX. You do not need to say what kind of data it is—the model sorts it into the right lists.
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
                  AI import
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
                    Attach document (optional)
                  </Label>
                  <div className="flex flex-wrap gap-2 items-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl gap-2"
                      disabled={extractingDoc || !schoolId}
                      onClick={() => docInputRef.current?.click()}
                    >
                      {extractingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                      PDF, DOCX, TXT, CSV
                    </Button>
                    {extractedDocName ? (
                      <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={extractedDocName}>
                        {extractedDocName}
                      </span>
                    ) : null}
                    {extractedDocText ? (
                      <Button type="button" variant="ghost" size="sm" className="text-xs h-8" onClick={() => { setExtractedDocText(''); setExtractedDocName(''); }}>
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
                    placeholder="Spreadsheets, schedules, mixed lists, emails… Everything above is sent together to the model."
                    className="min-h-[120px] rounded-xl text-sm font-mono"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    className="rounded-xl gap-2"
                    disabled={aiParsing || (!buildCombinedPrompt().trim()) || !schoolId}
                    onClick={() => void handleAiParse()}
                  >
                    {aiParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    Understand with AI
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="rounded-xl"
                    disabled={aiImporting || previewTotal === 0}
                    onClick={() => void handleAiImport()}
                  >
                    {aiImporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Import all ({previewTotal})
                  </Button>
                </div>

                {previewTotal > 0 && aiSnapshot && (
                  <div className="rounded-xl border bg-muted/30 p-3 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Preview</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {counts.classes ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 border">
                          <BookOpen className="w-3 h-3" /> {counts.classes} classes
                        </span>
                      ) : null}
                      {counts.teachers ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 border">
                          <User className="w-3 h-3" /> {counts.teachers} teachers
                        </span>
                      ) : null}
                      {counts.students ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 border">
                          <Users className="w-3 h-3" /> {counts.students} students
                        </span>
                      ) : null}
                      {counts.periods ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 border">
                          <Clock className="w-3 h-3" /> {counts.periods} periods
                        </span>
                      ) : null}
                      {counts.categories ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 border">
                          <Tags className="w-3 h-3" /> {counts.categories} categories
                        </span>
                      ) : null}
                      {counts.prizes ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 border">
                          <Gift className="w-3 h-3" /> {counts.prizes} reward items
                        </span>
                      ) : null}
                      {counts.staffAccounts ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 border">
                          <Headset className="w-3 h-3" /> {counts.staffAccounts} desk staff
                        </span>
                      ) : null}
                    </div>
                    <ScrollArea className="h-[min(220px,38vh)] pr-3">
                      <pre className="text-[11px] font-mono whitespace-pre-wrap break-words text-muted-foreground">
                        {JSON.stringify(aiSnapshot, null, 2)}
                      </pre>
                    </ScrollArea>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
