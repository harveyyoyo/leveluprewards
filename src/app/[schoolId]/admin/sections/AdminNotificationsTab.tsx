'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  Bell,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  ListTree,
  Mail,
  MessageSquare,
  Plus,
  RefreshCw,
  Shield,
  ShoppingBag,
  Sparkles,
  User,
  Users,
  X,
} from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  StaffPortalSectionCard,
  StaffPortalSectionCardContent,
  StaffPortalSectionCardHeader,
  StaffPortalSectionCardTitle,
} from '@/components/staff/StaffPortalSection';
import { StaffPortalTabPanel } from '@/components/staff/StaffPortalTabHeader';
import { StaffPortalTabInfoPopover, staffPortalTabInfoSection } from '@/components/staff/StaffPortalTabInfoPopover';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TabWalkthroughHeaderAction } from '@/components/tabWalkthrough/TabWalkthroughContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
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
import { ContentSectionTreeNav } from '@/components/ui/content-section-tree-nav';
import {
  NotificationSetupWizard,
  type NotificationWizardDraft,
} from './NotificationSetupWizard';
import {
  buildActiveNotificationRules,
  disableNotificationRule,
} from './notificationActiveRules';

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
  const { settings, updateSettings } = useSettings();
  const { schoolId, loginState } = useAuth();
  const { functions, firestore } = useFirebase();
  const attendancePillarOn = settings.payAttendance ?? true;
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

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardInitialDraft, setWizardInitialDraft] = useState<NotificationWizardDraft | null>(null);
  const [section, setSection] = useState<'alerts' | 'advanced'>('alerts');
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const { lines: diagnosticLines, activeRows, headlineStatus } = useMemo(
    () =>
      buildNotificationDiagnostics({
        settings,
      }),
    [settings],
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

  const activeRules = useMemo(() => buildActiveNotificationRules(settings), [settings]);

  const openCreateWizard = () => {
    setWizardInitialDraft(null);
    setWizardOpen(true);
  };

  return (
    <StaffPortalTabPanel
      tabValue="notifications"
      trailing={
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 bg-background/60 p-2 rounded-xl border border-border/50">
              {statusBadge(headlineStatus)}
              <span className="text-[10px] text-muted-foreground font-semibold leading-none max-w-[130px]">
                {headlineStatus === 'blocked' && 'Off in Settings'}
                {headlineStatus === 'limited' && 'Awaiting Alerts'}
                {headlineStatus === 'active' && 'Active Alerts'}
              </span>
            </div>
            <TabWalkthroughHeaderAction />
            <Button
              type="button"
              className="gap-2 shadow-md rounded-xl"
              disabled={!settings.enableNotifications}
              onClick={openCreateWizard}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create Alert
            </Button>
          </div>
        }
    >
    <StaffPortalSectionCard className="w-full overflow-hidden bg-background/95 backdrop-blur-md">
      <StaffPortalSectionCardContent className="p-6 space-y-6">
        <ContentSectionTreeNav
          items={[
            { id: 'alerts', label: 'Active Alerts', badge: activeRules.length },
            { id: 'advanced', label: 'Diagnostics & Logs' },
          ]}
          value={section}
          onValueChange={(id) => setSection(id as 'alerts' | 'advanced')}
          className="mb-2"
        />

        {section === 'alerts' && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            <div className="border-b pb-4">
              <div className="flex items-center gap-1.5">
                <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                  <Bell className="w-5 h-5 text-ring" /> Your Active Notifications
                </h3>
                <StaffPortalTabInfoPopover
                  sections={[staffPortalTabInfoSection('These alerts are active for your school. Turn one off or configure another anytime.')]}
                  ariaLabel="About active notifications"
                />
              </div>
            </div>

            {activeRules.length ? (
              <ul className="space-y-3">
                {activeRules.map((rule) => (
                  <li
                    key={rule.id}
                    className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border p-4 bg-muted/20 hover:bg-muted/30 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <p className="font-bold text-sm text-foreground">{rule.label}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">Who:</span> {rule.whoSummary}
                        <span className="mx-1.5 text-muted-foreground/50">·</span>
                        <span className="font-semibold text-foreground">Delivery:</span> {rule.howSummary}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-xl font-bold h-9"
                        onClick={() => {
                          setWizardInitialDraft(rule.draft);
                          setWizardOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl font-bold h-9"
                        onClick={() => disableNotificationRule(rule.trigger, updateSettings)}
                      >
                        Turn off
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-2xl border border-dashed p-8 text-center space-y-3 bg-muted/5">
                <Bell className="h-10 w-10 text-muted-foreground/50 mx-auto animate-bounce" aria-hidden="true" />
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Start with one simple alert — for example, email parents when a student redeems a prize.
                </p>
                <Button type="button" className="gap-2 rounded-xl" disabled={!settings.enableNotifications} onClick={openCreateWizard}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Create a notification
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
              <div className="space-y-4">
                <div className="border-b pb-2">
                  <h4 className="font-black text-base flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-ring" /> Event Triggers
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Select which student activities trigger an alert.</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3.5 rounded-2xl border bg-muted/20 hover:bg-muted/30 transition-colors">
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
                    <div className="flex items-center justify-between p-3.5 rounded-2xl border bg-muted/20 hover:bg-muted/30 transition-colors">
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
                    <div className="flex items-center justify-between p-3.5 rounded-2xl border bg-muted/20 hover:bg-muted/30 transition-colors">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-bold flex items-center gap-2">
                          Library Activity <BookOpenCheck className="w-3.5 h-3.5 text-indigo-500" />
                        </Label>
                        <p className="text-[11px] text-muted-foreground">Notify when a student checks out or returns a library item.</p>
                      </div>
                      <Switch
                        checked={settings.notificationLibraryEnabled}
                        onCheckedChange={(checked) => updateSettings({ notificationLibraryEnabled: checked })}
                      />
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between p-3.5 rounded-2xl border bg-muted/20 hover:bg-muted/30 transition-colors">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold flex items-center gap-2">
                        Milestones &amp; Badges <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                          <input
                            type="checkbox"
                            className="h-3 w-3 accent-sky-600 rounded"
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

                  <div className="flex items-center justify-between p-3.5 rounded-2xl border bg-muted/20 hover:bg-muted/30 transition-colors">
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
                </div>
              </div>

              <div className="space-y-4">
                <div className="border-b pb-2">
                  <h4 className="font-black text-base flex items-center gap-2">
                    <Users className="w-5 h-5 text-ring" /> Recipient Groups
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Control who receives alerts for these events.</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3.5 rounded-2xl border bg-muted/20">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold">Parents / Guardians</Label>
                      <p className="text-[11px] text-muted-foreground">
                        Default recipients when parent contact info is provided. Can be disabled per student.
                      </p>
                    </div>
                    <div className="text-[10px] uppercase font-black text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-xl border border-blue-200/50">
                      Default On
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-2xl border bg-muted/20 hover:bg-muted/30 transition-colors">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold flex items-center gap-2">
                        Students <User className="w-3.5 h-3.5 text-ring" />
                      </Label>
                      <p className="text-[11px] text-muted-foreground">Notify students directly when their student email or phone is saved.</p>
                    </div>
                    <Switch
                      checked={settings.notificationStudentsEnabled}
                      onCheckedChange={(checked) => updateSettings({ notificationStudentsEnabled: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-2xl border bg-muted/20 hover:bg-muted/30 transition-colors">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold">Staff Alerts</Label>
                      <p className="text-[11px] text-muted-foreground">Notify assigned teachers and administrators.</p>
                    </div>
                    <Switch
                      checked={settings.notificationStaffAlertsEnabled}
                      onCheckedChange={(checked) => updateSettings({ notificationStaffAlertsEnabled: checked })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-muted/10 p-5 space-y-4 shadow-sm border-t-4 border-chart-2/70">
              <div className="border-b pb-3 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-chart-2" />
                <div>
                  <h4 className="text-base font-black tracking-tight">Inventory &amp; Low Stock Alerts</h4>
                  <p className="text-xs text-muted-foreground">Notify staff when prizes are running low or when the rewards shop is empty.</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl border bg-background">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Enable stock tracking alerts</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Sends a staff alert when a prize hits low stock, and optionally when the shop is empty.
                  </p>
                </div>
                <Switch
                  checked={settings.notificationPrizeInventoryEnabled}
                  onCheckedChange={(checked) => updateSettings({ notificationPrizeInventoryEnabled: checked })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl border bg-background space-y-2">
                  <Label className="text-sm font-bold">Low stock threshold</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Alert when remaining quantity is ≤ this number.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      className="h-10 w-24 rounded-xl border bg-background px-3 text-sm font-semibold"
                      value={String(settings.notificationPrizeLowStockThreshold ?? 5)}
                      disabled={!settings.notificationPrizeInventoryEnabled}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const n = Math.max(0, Math.round(Number(raw) || 0));
                        updateSettings({ notificationPrizeLowStockThreshold: n });
                      }}
                    />
                    <span className="text-xs text-muted-foreground font-semibold">items left</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border bg-background">
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
            </div>

            <div className="rounded-2xl border bg-muted/10 p-5 space-y-4 shadow-sm">
              <div className="border-b pb-3 flex items-center gap-2">
                <Users className="w-5 h-5 text-ring" />
                <div>
                  <h4 className="text-base font-black tracking-tight">Families &amp; Shared Display Privacy</h4>
                  <p className="text-xs text-muted-foreground">Weekly parent summaries and name privacy on public boards.</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl border bg-background">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Weekly parent digest email</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Sends a Sunday summary (3:00 PM Eastern time) to opted-in parents with point tallies.
                  </p>
                </div>
                <Switch
                  checked={settings.notificationParentWeeklyDigestEnabled}
                  disabled={!settings.enableNotifications}
                  onCheckedChange={(checked) => updateSettings({ notificationParentWeeklyDigestEnabled: checked })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl border bg-background space-y-2">
                  <Label className="text-sm font-bold">Names on public leaderboards</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Hide legal surnames on shared screens to preserve student privacy.
                  </p>
                  <Select
                    value={settings.privacyStudentNameDisplayMode}
                    onValueChange={(v) =>
                      updateSettings({ privacyStudentNameDisplayMode: v === 'preferred_only' ? 'preferred_only' : 'full' })
                    }
                  >
                    <SelectTrigger className="w-full rounded-xl bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full name (preferred + last)</SelectItem>
                      <SelectItem value="preferred_only">Preferred name / nickname only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border bg-background">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">Offline teacher award queue</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Saves transactions locally when internet is offline and syncs upon reconnect.
                    </p>
                  </div>
                  <Switch
                    checked={settings.enableTeacherOfflineAwardQueue !== false}
                    onCheckedChange={(checked) => updateSettings({ enableTeacherOfflineAwardQueue: checked })}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border-2 border-primary/20 bg-primary/[0.02] overflow-hidden shadow-sm">
              <div className="grid md:grid-cols-[1fr_1.2fr]">
                <div className="p-6 bg-slate-900 text-white flex flex-col justify-center">
                  <div className="flex items-center gap-2 text-amber-400">
                    <Award className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
                    <span className="text-xs font-black uppercase tracking-[0.2em]">Artwork preview</span>
                  </div>
                  <h3 className="mt-3 text-lg font-black tracking-tight leading-tight">Milestone and badge emails feel earned.</h3>
                  <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                    Email alerts can include a polished celebration panel with the student name, achievement title, points, and badge icon.
                  </p>
                </div>
                <div className="p-6 bg-gradient-to-br from-sky-50/50 via-white to-amber-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
                  <div className="w-full max-w-sm rounded-2xl border border-amber-200 bg-white p-5 text-center shadow-md dark:bg-slate-900 dark:border-amber-500/20">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 ring-8 ring-amber-50 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/5">
                      <Sparkles className="h-7 w-7" />
                    </div>
                    <p className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-sky-600">Badge unlocked</p>
                    <p className="mt-0.5 text-xl font-black text-slate-950 dark:text-white">Monthly Champion</p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Beautiful email artwork celebrates milestones and badges.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-amber-500/5 border-l-4 border-amber-500 p-4 rounded-r-2xl flex gap-3.5 items-start">
              <Shield className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-xs text-foreground">Privacy &amp; Secure Cloud Delivery Notice</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Alerts are sent via secure Firebase Cloud Functions. Ensure you have the
                  <strong> &quot;Trigger Email&quot;</strong> or <strong>&quot;Twilio SMS&quot;</strong> extensions configured in
                  your Firebase Console to enable delivery. Contact information is stored encrypted within your school&apos;s private database.
                </p>
              </div>
            </div>
          </div>
        )}

        {section === 'advanced' && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            <div className="border-b pb-4">
              <div className="flex items-center gap-1.5">
                <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                  <ListTree className="w-5 h-5 text-ring" /> Delivery Diagnostics &amp; Logs
                </h3>
                <StaffPortalTabInfoPopover
                  sections={[staffPortalTabInfoSection('Use these tools to diagnose notification delivery gates, view enqueued mail documents, and send test payloads.')]}
                  ariaLabel="About delivery diagnostics"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="rounded-2xl border bg-muted/10 p-5 space-y-4">
                <div>
                  <h4 className="text-base font-black tracking-tight flex items-center gap-2">
                    <ListTree className="w-4 h-4 text-ring" /> Active Delivery Diagnostic Checks
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Checks that mirror Firebase Cloud Function gates in real-time.
                  </p>
                </div>
                <div className="bg-background rounded-xl border p-4">
                  <ul className="space-y-3.5 text-xs">
                    {diagnosticLines.map((line, i) => (
                      <li key={i} className="flex gap-2.5 items-start">
                        <LogIcon level={line.level} />
                        <span className="text-muted-foreground leading-normal font-medium">{line.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="rounded-2xl border bg-muted/10 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h4 className="text-base font-black tracking-tight flex items-center gap-2">
                      <Mail className="w-4 h-4 text-ring" /> Test Tool &amp; Live Mail Queue
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Enqueue test emails or monitor enqueued transactions.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5 rounded-xl h-9 font-bold"
                    disabled={mailLoading || !functions || !schoolId}
                    onClick={() => void loadMailQueue()}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${mailLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
                    Refresh Queue
                  </Button>
                </div>

                <div className="rounded-xl border bg-background p-4 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between gap-3 flex-wrap border-b pb-3">
                    <div>
                      <p className="font-bold text-xs text-foreground">Send a test email</p>
                      <p className="text-[10px] text-muted-foreground">Generates a test notification document in the database.</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="gap-1.5 rounded-xl font-bold"
                      disabled={testSending || !functions || !schoolId || !testStudentId.trim()}
                      onClick={() => void sendTestEmail()}
                    >
                      {testSending ? 'Sending…' : 'Send test'}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">Student ID</Label>
                      <Input
                        value={testStudentId}
                        onChange={(e) => setTestStudentId(e.target.value)}
                        placeholder="e.g. 12345678"
                        className="rounded-xl h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">Template</Label>
                      <Select value={testTemplate} onValueChange={(v) => setTestTemplate(v as any)}>
                        <SelectTrigger className="rounded-xl h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="reward_redemption">Reward redemption</SelectItem>
                          <SelectItem value="points_award">Points award</SelectItem>
                          <SelectItem value="milestone">Milestone</SelectItem>
                          {attendancePillarOn ? <SelectItem value="attendance">Attendance</SelectItem> : null}
                          {libraryPillarOn ? (
                            <>
                              <SelectItem value="library_checkout">Library checkout</SelectItem>
                              <SelectItem value="library_return">Library return</SelectItem>
                            </>
                          ) : null}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">Recipient</Label>
                      <Select value={testRecipient} onValueChange={(v) => setTestRecipient(v as any)}>
                        <SelectTrigger className="rounded-xl h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="parent">Parent email</SelectItem>
                          <SelectItem value="student">Student email</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {testError ? (
                    <Alert variant="destructive" className="rounded-xl">
                      <AlertTitle className="text-xs font-bold">Test tool error</AlertTitle>
                      <AlertDescription className="text-[10px] leading-relaxed">{testError}</AlertDescription>
                    </Alert>
                  ) : null}

                  {testPreview ? (
                    <div className="rounded-xl border bg-muted/10 p-3 space-y-2">
                      <div className="text-[10px] font-medium space-y-0.5">
                        <div><span className="font-bold">To</span>: {testRecipient === 'parent' ? testPreview.to.parentEmail : testPreview.to.studentEmail}</div>
                        <div><span className="font-bold">Subject</span>: {testPreview.subject}</div>
                      </div>
                      <div className="rounded-lg border bg-background p-2">
                        <div className="text-[9px] font-black uppercase text-sky-600 tracking-wider mb-1">Preview text</div>
                        <div className="text-[10px] whitespace-pre-wrap leading-normal text-muted-foreground font-medium">{testPreview.text}</div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground font-semibold italic text-center py-2">Enter student ID to preview template contents.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-muted/10 p-5 space-y-4">
              <div>
                <h4 className="text-base font-black tracking-tight">Recent Mail Queue Status</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Monitor transaction logs and delivery states from Cloud Functions.</p>
              </div>

              {mailError ? (
                <Alert variant="destructive" className="rounded-2xl">
                  <AlertTitle className="text-xs font-bold">Could not load mail queue</AlertTitle>
                  <AlertDescription className="text-xs leading-relaxed">
                    {mailError}. Deploy Cloud Functions that include <code className="text-[10px]">adminListMailQueue</code>, confirm you are signed in as admin (or developer) for this school, and try Refresh.
                  </AlertDescription>
                </Alert>
              ) : mailLoading && mailRows === null ? (
                <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-ring" /> Loading mail queue…
                </p>
              ) : mailRows !== null && !sortedMail.length ? (
                <p className="text-sm text-muted-foreground font-medium text-center py-6">
                  No mail documents for this school yet. Trigger a student action to generate mail enqueues.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border bg-background">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px] font-bold text-xs uppercase tracking-wider">Doc</TableHead>
                        <TableHead className="min-w-[140px] font-bold text-xs uppercase tracking-wider">When</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider">To</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider">Subject</TableHead>
                        <TableHead className="w-[90px] font-bold text-xs uppercase tracking-wider">Delivery</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedMail.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-mono text-[10px] align-top">{row.id.slice(0, 8)}…</TableCell>
                          <TableCell className="text-[10px] align-top text-muted-foreground whitespace-nowrap">
                            {formatWhen(row.createdAtMs)}
                          </TableCell>
                          <TableCell className="text-xs align-top font-medium">{row.toMasked}</TableCell>
                          <TableCell className="text-xs align-top font-bold max-w-[200px] break-words">{row.subject}</TableCell>
                          <TableCell className="text-[10px] align-top text-muted-foreground break-words">
                            <div className="space-y-1">
                              <div>{row.delivery}</div>
                              {row.deliveryAttempts != null || row.deliveryError || row.deliveryMessage ? (
                                <div className="text-[10px] text-muted-foreground/90 leading-snug">
                                  {row.deliveryAttempts != null ? (
                                    <span className="mr-2">attempts: {row.deliveryAttempts}</span>
                                  ) : null}
                                  {row.deliveryError ? <span className="text-destructive font-semibold">{row.deliveryError}</span> : null}
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
                </div>
              )}
            </div>

            <div className="rounded-2xl border bg-muted/10 p-5 space-y-4">
              <div>
                <h4 className="text-base font-black tracking-tight flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-ring" /> Supported Event Triggers Reference
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                  Review the exact database states and recipient queues for automated event gates.
                </p>
              </div>

              <div className="overflow-x-auto rounded-2xl border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Event</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">When it fires</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Parent Queue</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Student Queue</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">Staff Queue</TableHead>
                      <TableHead className="min-w-[180px] font-bold text-xs uppercase tracking-wider">Gate Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeRows.map((row: ActiveNotificationRow) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-bold text-sm align-top">{row.label}</TableCell>
                        <TableCell className="text-xs text-muted-foreground align-top max-w-[220px] font-medium">{row.trigger}</TableCell>
                        <TableCell className="align-top">
                          <QueueCell active={row.parentQueue} />
                        </TableCell>
                        <TableCell className="align-top">
                          <QueueCell active={row.studentQueue} />
                        </TableCell>
                        <TableCell className="align-top">
                          <QueueCell active={row.staffQueue} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground align-top font-medium">{row.gateNote}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </StaffPortalSectionCardContent>

      <NotificationSetupWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        initialDraft={wizardInitialDraft}
        attendancePillarOn={attendancePillarOn}
        libraryPillarOn={libraryPillarOn}
        notificationsEnabled={settings.enableNotifications === true}
        updateSettings={updateSettings}
      />
    </StaffPortalSectionCard>
    </StaffPortalTabPanel>
  );
}
