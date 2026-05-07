'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  Bell,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ClipboardList,
  Image as ImageIcon,
  ListTree,
  Mail,
  MessageSquare,
  RefreshCw,
  ShoppingBag,
  Shield,
  Sparkles,
  User,
  Users,
  X,
} from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { useFirebase } from '@/firebase';
import {
  buildNotificationDiagnostics,
  type ActiveNotificationRow,
  type DiagnosticLine,
} from './notificationDiagnostics';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { Student } from '@/lib/types';
import { doc, getDoc } from 'firebase/firestore';

type MailQueueRow = {
  id: string;
  createdAtMs?: number | null;
  toMasked: string;
  subject: string;
  delivery: string;
  deliveryState?: string | null;
  deliveryAttempts?: number | null;
  deliveryError?: string | null;
  deliveryMessage?: string | null;
  deliveryStartTimeMs?: number | null;
  deliveryEndTimeMs?: number | null;
  studentId?: string;
};

function formatWhen(ms: number | null | undefined): string {
  if (!ms || !Number.isFinite(ms)) return '—';
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return '—';
  }
}

function LogIcon({ level }: { level: DiagnosticLine['level'] }) {
  switch (level) {
    case 'pass':
      return <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />;
    case 'warn':
      return <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />;
    case 'fail':
      return <X className="h-4 w-4 text-destructive shrink-0 mt-0.5" aria-hidden="true" />;
    default:
      return <ClipboardList className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />;
  }
}

function QueueCell({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold text-xs">
      <Check className="h-3.5 w-3.5" aria-hidden="true" /> Yes
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
      <X className="h-3.5 w-3.5" aria-hidden="true" /> No
    </span>
  );
}

function statusBadge(headlineStatus: 'blocked' | 'limited' | 'active') {
  switch (headlineStatus) {
    case 'blocked':
      return (
        <Badge variant="destructive" className="uppercase tracking-wider text-[10px]">
          Blocked
        </Badge>
      );
    case 'limited':
      return (
        <Badge variant="outline" className="uppercase tracking-wider text-[10px] border-amber-500 text-amber-800 dark:text-amber-300">
          Partially on
        </Badge>
      );
    default:
      return (
        <Badge className="uppercase tracking-wider text-[10px] bg-emerald-600 hover:bg-emerald-600">
          Gates open
        </Badge>
      );
  }
}

export function AdminNotificationsTab() {
  const { settings, updateSettings, isFeatureAllowed, planLabel } = useSettings();
  const { schoolId, loginState } = useAuth();
  const { functions, firestore } = useFirebase();
  const notificationsPlanOk = isFeatureAllowed('enableNotifications');
  const attendancePillarOn = !!settings.enableAttendance || !!settings.enableClassSignIn;
  const libraryPillarOn = settings.payLibrary ?? true;

  const [mailRows, setMailRows] = useState<MailQueueRow[] | null>(null);
  const [mailLoading, setMailLoading] = useState(false);
  const [mailError, setMailError] = useState<string | null>(null);

  const [testStudentId, setTestStudentId] = useState('');
  const [testTemplate, setTestTemplate] = useState<
    'reward_redemption' | 'points_award' | 'milestone' | 'attendance' | 'library_checkout' | 'library_return'
  >('reward_redemption');
  const [testRecipient, setTestRecipient] = useState<'parent' | 'student'>('parent');
  const [testPreview, setTestPreview] = useState<{
    subject: string;
    fromEmail: string;
    html: string;
    text: string;
    to: { parentEmail: string; studentEmail: string };
  } | null>(null);
  const [testSending, setTestSending] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  const { lines: diagnosticLines, activeRows, headlineStatus } = useMemo(
    () =>
      buildNotificationDiagnostics({
        settings,
        notificationsPlanOk,
        planLabel,
      }),
    [settings, notificationsPlanOk, planLabel],
  );

  const loadMailQueue = useCallback(async () => {
    if (!functions || !schoolId) return;
    if (loginState !== 'admin' && loginState !== 'developer') return;
    setMailLoading(true);
    setMailError(null);
    try {
      const fn = httpsCallable<{ schoolId: string; limit?: number }, { items: MailQueueRow[] }>(
        functions,
        'adminListMailQueue',
      );
      const res = await fn({ schoolId: schoolId.trim().toLowerCase(), limit: 40 });
      const items = res.data?.items;
      setMailRows(Array.isArray(items) ? items : []);
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : 'Request failed';
      setMailError(msg);
      setMailRows(null);
    } finally {
      setMailLoading(false);
    }
  }, [functions, schoolId, loginState]);

  const loadTestPreview = useCallback(async () => {
    if (!functions || !schoolId) return;
    if (loginState !== 'admin' && loginState !== 'developer') return;
    if (!testStudentId.trim()) return;
    setTestError(null);
    try {
      const fn = httpsCallable<
        { schoolId: string; studentId: string; template: string; recipient?: string },
        { subject: string; fromEmail: string; html: string; text: string; to: { parentEmail: string; studentEmail: string } }
      >(functions, 'adminPreviewTestNotification');
      const res = await fn({
        schoolId: schoolId.trim().toLowerCase(),
        studentId: testStudentId.trim(),
        template: testTemplate,
        recipient: testRecipient,
      });
      setTestPreview(res.data ?? null);
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : 'Preview failed';
      setTestPreview(null);
      setTestError(msg);
    }
  }, [functions, schoolId, loginState, testStudentId, testTemplate, testRecipient]);

  const sendTestEmail = useCallback(async () => {
    if (!functions || !schoolId) return;
    if (loginState !== 'admin' && loginState !== 'developer') return;
    if (!testStudentId.trim()) return;
    setTestSending(true);
    setTestError(null);
    try {
      const fn = httpsCallable<
        { schoolId: string; studentId: string; template: string; recipient?: string },
        { mailDocId: string }
      >(functions, 'adminSendTestNotification');
      await fn({
        schoolId: schoolId.trim().toLowerCase(),
        studentId: testStudentId.trim(),
        template: testTemplate,
        recipient: testRecipient,
      });
      await loadMailQueue();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : 'Send failed';
      setTestError(msg);
    } finally {
      setTestSending(false);
    }
  }, [functions, schoolId, loginState, testStudentId, testTemplate, testRecipient, loadMailQueue]);

  useEffect(() => {
    void loadMailQueue();
  }, [loadMailQueue]);

  useEffect(() => {
    void loadTestPreview();
  }, [loadTestPreview]);

  const sortedMail = useMemo(() => {
    if (!mailRows?.length) return [];
    return [...mailRows].sort((a, b) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
  }, [mailRows]);

  return (
    <div className="space-y-6">
      <Card className="border-t-4 border-blue-500 shadow-md">
        <CardHeader className="py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-500" /> Notification System
              </CardTitle>
              <CardDescription>
                Configure automated alerts for parents, teachers, and administrators. Status below reflects saved
                school settings and your subscription plan — not Firebase extension health.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {statusBadge(headlineStatus)}
              <span className="text-[11px] text-muted-foreground max-w-[220px] leading-snug">
                {headlineStatus === 'blocked' && 'Functions will not enqueue outbound messages.'}
                {headlineStatus === 'limited' &&
                  'Master switch is on but every event trigger is off — nothing will fire.'}
                {headlineStatus === 'active' &&
                  'At least one event path can enqueue mail/SMS when activities occur.'}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-4 p-4 rounded-xl border bg-card/50">
              <div className="mt-1 bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600 dark:text-blue-400">
                <Mail className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm">Email Alerts</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Send activity summaries and milestone alerts to parent, student, and staff email addresses.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl border bg-card/50">
              <div className="mt-1 bg-green-100 dark:bg-green-900/30 p-2 rounded-lg text-green-600 dark:text-green-400">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm">SMS / Texting</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Deliver instant text notifications for high-priority events like reward redemptions.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl border bg-card/50">
              <div className="mt-1 bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg text-purple-600 dark:text-purple-400">
                <Users className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm">Multi-Channel</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  The system automatically routes alerts based on available contact info (Email first, then SMS).
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ListTree className="w-4 h-4 text-primary" /> Delivery diagnostic log
            </CardTitle>
            <CardDescription>
              Plain-language checks that mirror Cloud Function gates in this codebase. Use with Firebase Functions logs
              and the mail queue on the right.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-28rem)] pr-3">
              <ul className="space-y-3 text-sm">
                {diagnosticLines.map((line, i) => (
                  <li key={i} className="flex gap-2 items-start">
                    <LogIcon level={line.level} />
                    <span className="text-muted-foreground leading-relaxed">{line.text}</span>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" /> Recent mail queue (this school)
                </CardTitle>
                <CardDescription className="mt-1.5">
                  Loaded via the <code className="text-xs">adminListMailQueue</code> Cloud Function (Admin SDK), so it
                  does not depend on Firestore client rules for the <code className="text-xs">mail</code> collection.
                  Deploy functions after updating. Optional: deploy <code className="text-xs">firestore.rules</code>{' '}
                  if you also want direct client reads.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                disabled={mailLoading || !functions || !schoolId}
                onClick={() => void loadMailQueue()}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${mailLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-bold text-sm">Send a test email</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Generates a preview using the same HTML builder, then enqueues a test mail document.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="gap-1.5"
                  disabled={testSending || !functions || !schoolId || !testStudentId.trim()}
                  onClick={() => void sendTestEmail()}
                >
                  {testSending ? 'Sending…' : 'Send test'}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Student ID</Label>
                  <Input
                    value={testStudentId}
                    onChange={(e) => setTestStudentId(e.target.value)}
                    placeholder="e.g. 12345678"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Template</Label>
                  <Select value={testTemplate} onValueChange={(v) => setTestTemplate(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reward_redemption">Reward redemption</SelectItem>
                      <SelectItem value="points_award">Points award</SelectItem>
                      <SelectItem value="milestone">Milestone</SelectItem>
                      <SelectItem value="attendance">Attendance</SelectItem>
                      <SelectItem value="library_checkout">Library checkout</SelectItem>
                      <SelectItem value="library_return">Library return</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Recipient</Label>
                  <Select value={testRecipient} onValueChange={(v) => setTestRecipient(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="parent">Parent email</SelectItem>
                      <SelectItem value="student">Student email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {testError ? (
                <Alert variant="destructive">
                  <AlertTitle>Test tool error</AlertTitle>
                  <AlertDescription className="text-xs leading-relaxed">{testError}</AlertDescription>
                </Alert>
              ) : null}

              {testPreview ? (
                <div className="rounded-lg border bg-background p-3 space-y-2">
                  <div className="text-xs">
                    <div><span className="font-semibold">To (masked)</span>: {testRecipient === 'parent' ? testPreview.to.parentEmail : testPreview.to.studentEmail}</div>
                    <div><span className="font-semibold">Subject</span>: {testPreview.subject}</div>
                  </div>
                  <div className="rounded-md border bg-muted/10 p-2">
                    <div className="text-[11px] font-semibold mb-1">Preview</div>
                    <div className="text-xs whitespace-pre-wrap">{testPreview.text}</div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Enter a student ID to preview.</p>
              )}
            </div>

            {mailError ? (
              <Alert variant="destructive">
                <AlertTitle>Could not load mail queue</AlertTitle>
                <AlertDescription className="text-xs leading-relaxed">
                  {mailError}. Deploy Cloud Functions that include <code className="text-[10px]">adminListMailQueue</code>,
                  confirm you are signed in as admin (or developer) for this school, and try Refresh.
                </AlertDescription>
              </Alert>
            ) : mailLoading && mailRows === null ? (
              <p className="text-sm text-muted-foreground">Loading mail queue…</p>
            ) : mailRows !== null && !sortedMail.length ? (
              <p className="text-sm text-muted-foreground">
                No mail documents for this school yet. Trigger a redemption with notifications enabled, then refresh —
                if still empty, check Functions deployment and logs for <code className="text-xs">onStudentActivityCreated</code>.
              </p>
            ) : (
              <ScrollArea className="h-[calc(100vh-28rem)] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Doc</TableHead>
                      <TableHead className="min-w-[140px]">When</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead className="w-[90px]">Delivery</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedMail.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-[10px] align-top">{row.id.slice(0, 8)}…</TableCell>
                        <TableCell className="text-[10px] align-top text-muted-foreground whitespace-nowrap">
                          {formatWhen(row.createdAtMs)}
                        </TableCell>
                        <TableCell className="text-xs align-top">{row.toMasked}</TableCell>
                        <TableCell className="text-xs align-top max-w-[200px] break-words">{row.subject}</TableCell>
                        <TableCell className="text-[10px] align-top text-muted-foreground break-words">
                          <div className="space-y-1">
                            <div>{row.delivery}</div>
                            {row.deliveryAttempts != null || row.deliveryError || row.deliveryMessage ? (
                              <div className="text-[10px] text-muted-foreground/90 leading-snug">
                                {row.deliveryAttempts != null ? (
                                  <span className="mr-2">attempts: {row.deliveryAttempts}</span>
                                ) : null}
                                {row.deliveryError ? <span className="text-destructive">{row.deliveryError}</span> : null}
                                {!row.deliveryError && row.deliveryMessage ? <span>{row.deliveryMessage}</span> : null}
                              </div>
                            ) : null}
                            {row.deliveryStartTimeMs || row.deliveryEndTimeMs ? (
                              <div className="text-[10px] text-muted-foreground/80 leading-snug">
                                {row.deliveryStartTimeMs ? <span>start: {formatWhen(row.deliveryStartTimeMs)}</span> : null}
                                {row.deliveryStartTimeMs && row.deliveryEndTimeMs ? <span className="mx-1">·</span> : null}
                                {row.deliveryEndTimeMs ? <span>end: {formatWhen(row.deliveryEndTimeMs)}</span> : null}
                              </div>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" /> What can notify as of now
          </CardTitle>
          <CardDescription>
            &quot;Parent / student / staff queue&quot; means the Cloud Function will try to enqueue that channel when
            the event happens — it still skips missing email or phone on the record.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>When it fires</TableHead>
                <TableHead>Parent queue</TableHead>
                <TableHead>Student queue</TableHead>
                <TableHead>Staff queue</TableHead>
                <TableHead className="min-w-[180px]">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeRows.map((row: ActiveNotificationRow) => (
                <TableRow key={row.id}>
                  <TableCell className="font-semibold text-sm align-top">{row.label}</TableCell>
                  <TableCell className="text-xs text-muted-foreground align-top max-w-[220px]">{row.trigger}</TableCell>
                  <TableCell className="align-top">
                    <QueueCell active={row.parentQueue} />
                  </TableCell>
                  <TableCell className="align-top">
                    <QueueCell active={row.studentQueue} />
                  </TableCell>
                  <TableCell className="align-top">
                    <QueueCell active={row.staffQueue} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground align-top">{row.gateNote}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" /> Event Triggers
            </CardTitle>
            <CardDescription>Select which student activities should trigger an alert.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">Reward Redemptions</Label>
                <p className="text-[11px] text-muted-foreground">Notify when a student redeems points for a prize.</p>
              </div>
              <Switch
                checked={settings.notificationRewardsEnabled}
                onCheckedChange={(checked) => updateSettings({ notificationRewardsEnabled: checked })}
              />
            </div>

            {attendancePillarOn ? (
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Attendance Sign-ins</Label>
                  <p className="text-[11px] text-muted-foreground">Notify when a student signs in for a class period.</p>
                </div>
                <Switch
                  checked={settings.notificationAttendanceEnabled}
                  onCheckedChange={(checked) => updateSettings({ notificationAttendanceEnabled: checked })}
                />
              </div>
            ) : null}

            {libraryPillarOn ? (
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold flex items-center gap-2">
                    Library activity <BookOpenCheck className="w-3.5 h-3.5 text-indigo-500" />
                  </Label>
                  <p className="text-[11px] text-muted-foreground">Notify when a student checks out or returns a library item.</p>
                </div>
                <Switch
                  checked={settings.notificationLibraryEnabled}
                  onCheckedChange={(checked) => updateSettings({ notificationLibraryEnabled: checked })}
                />
              </div>
            ) : null}

            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold flex items-center gap-2">
                  Milestones & Badges <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                    <input
                      type="checkbox"
                      className="h-3 w-3 accent-sky-600"
                      checked={settings.notificationArtworkEnabled !== false}
                      disabled={settings.notificationMilestonesEnabled === false}
                      onChange={(e) => updateSettings({ notificationArtworkEnabled: e.target.checked })}
                      aria-label="Include celebration artwork in milestone/badge emails"
                    />
                    Artwork
                  </span>
                </Label>
                <p className="text-[11px] text-muted-foreground">Notify when a student unlocks bonus milestones or category badges.</p>
              </div>
              <Switch
                checked={settings.notificationMilestonesEnabled}
                onCheckedChange={(checked) => updateSettings({ notificationMilestonesEnabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold flex items-center gap-2">
                  WhatsApp Alerts <span className="text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">New</span>
                </Label>
                <p className="text-[11px] text-muted-foreground">Enable instant notifications via WhatsApp Business API.</p>
              </div>
              <Switch
                checked={settings.notificationWhatsAppEnabled}
                onCheckedChange={(checked) => updateSettings({ notificationWhatsAppEnabled: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Recipient Groups
            </CardTitle>
            <CardDescription>Control who receives alerts for these events.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">Parents / Guardians</Label>
                <p className="text-[11px] text-muted-foreground">
                  Default recipients when parent contact info is provided. Can be disabled per student.
                </p>
              </div>
              <div className="text-[10px] uppercase font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">
                Default On
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold flex items-center gap-2">
                  Students <User className="w-3.5 h-3.5 text-primary" />
                </Label>
                <p className="text-[11px] text-muted-foreground">Notify students directly when their student email or phone is saved.</p>
              </div>
              <Switch
                checked={settings.notificationStudentsEnabled}
                onCheckedChange={(checked) => updateSettings({ notificationStudentsEnabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">Staff Alerts</Label>
                <p className="text-[11px] text-muted-foreground">Notify assigned teachers and administrators.</p>
              </div>
              <Switch
                checked={settings.notificationStaffAlertsEnabled}
                onCheckedChange={(checked) => updateSettings({ notificationStaffAlertsEnabled: checked })}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-primary" /> Inventory Alerts
          </CardTitle>
          <CardDescription>
            Notify staff when prizes are running low or when the rewards shop is empty (requires Staff Alerts + Notifications enabled).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border bg-muted/30 overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">Inventory alerts</Label>
                <p className="text-[11px] text-muted-foreground">
                  Sends a staff alert when a prize hits low stock, and optionally when the shop is empty.
                </p>
              </div>
              <Switch
                checked={settings.notificationPrizeInventoryEnabled}
                onCheckedChange={(checked) => updateSettings({ notificationPrizeInventoryEnabled: checked })}
              />
            </div>
            <div className="border-t bg-background/40 px-4 py-2">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Tip: Low-stock alerts only apply to prizes with a Qty set. Unlimited Qty prizes won&apos;t trigger inventory alerts.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border bg-muted/30">
              <Label className="text-sm font-bold">Low stock threshold</Label>
              <p className="text-[11px] text-muted-foreground mb-2">
                Alert when remaining quantity is ≤ this number.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  className="h-9 w-24 rounded-md border bg-background px-2 text-sm font-semibold"
                  value={String(settings.notificationPrizeLowStockThreshold ?? 5)}
                  disabled={!settings.notificationPrizeInventoryEnabled}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const n = Math.max(0, Math.round(Number(raw) || 0));
                    updateSettings({ notificationPrizeLowStockThreshold: n });
                  }}
                />
                <span className="text-xs text-muted-foreground">items</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">Shop empty alert</Label>
                <p className="text-[11px] text-muted-foreground">
                  Notify staff when no prizes are available to redeem.
                </p>
              </div>
              <Switch
                checked={settings.notificationPrizeEmptyShopEnabled}
                disabled={!settings.notificationPrizeInventoryEnabled}
                onCheckedChange={(checked) => updateSettings({ notificationPrizeEmptyShopEnabled: checked })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md overflow-hidden">
        <CardContent className="p-0">
          <div className="grid md:grid-cols-[1.1fr_1.4fr]">
            <div className="p-6 bg-slate-950 text-white">
              <div className="flex items-center gap-2 text-amber-300">
                <Award className="w-5 h-5" />
                <span className="text-xs font-black uppercase tracking-[0.2em]">Artwork preview</span>
              </div>
              <h3 className="mt-3 text-xl font-black">Milestone and badge emails now feel earned.</h3>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                Email alerts can include a polished celebration panel with the student name, achievement title, points, and badge icon.
              </p>
            </div>
            <div className="p-6 bg-gradient-to-br from-sky-50 via-white to-amber-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
              <div className="mx-auto max-w-sm rounded-2xl border border-amber-200 bg-white p-5 text-center shadow-xl dark:bg-slate-900 dark:border-amber-500/30">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600 ring-8 ring-amber-50 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/10">
                  <Sparkles className="h-8 w-8" />
                </div>
                <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-sky-600">Badge unlocked</p>
                <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Monthly Champion</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Beautiful email artwork celebrates milestones and badges.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-amber-500 shadow-md">
        <CardContent className="py-6 flex gap-4 items-start">
          <Shield className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h4 className="font-bold text-sm">Privacy & Security Notice</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Alerts are sent via secure Firebase Cloud Functions. Ensure you have the
              <strong> &quot;Trigger Email&quot;</strong> or <strong>&quot;Twilio SMS&quot;</strong> extensions configured in
              your Firebase Console to enable delivery. Contact information is stored encrypted
              within your school&apos;s private database.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
