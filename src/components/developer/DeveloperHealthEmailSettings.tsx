'use client';

import { useCallback, useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { Loader2, Mail, Plus, Trash2 } from 'lucide-react';
import { useFunctions } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import type {
  DeveloperHealthEmailSettings,
  SendDeveloperHealthEmailResult,
} from '@/lib/developer/developerHealthEmail';
import { formatRelativeTime } from '@/lib/developer/schoolUsageInsights';

export function DeveloperHealthEmailSettings({
  criticalCount,
  warningCount,
}: {
  criticalCount: number;
  warningCount: number;
}) {
  const functions = useFunctions();
  const { toast } = useToast();
  const [settings, setSettings] = useState<DeveloperHealthEmailSettings | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const loadSettings = useCallback(async () => {
    if (!functions) return;
    setLoading(true);
    try {
      const fn = httpsCallable<Record<string, never>, DeveloperHealthEmailSettings>(
        functions,
        'getDeveloperHealthAlertSettings',
      );
      const res = await fn({});
      setSettings(res.data);
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not load email settings',
        description: (e as Error)?.message || 'Deploy getDeveloperHealthAlertSettings.',
      });
    } finally {
      setLoading(false);
    }
  }, [functions, toast]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const saveSettings = async (patch: Partial<DeveloperHealthEmailSettings>) => {
    if (!functions || !settings) return;
    setSaving(true);
    try {
      const fn = httpsCallable<Partial<DeveloperHealthEmailSettings>, DeveloperHealthEmailSettings>(
        functions,
        'updateDeveloperHealthAlertSettings',
      );
      const res = await fn(patch);
      setSettings(res.data);
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not save settings',
        description: (e as Error)?.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const sendNow = async () => {
    if (!functions) return;
    setSending(true);
    try {
      const fn = httpsCallable<{ force?: boolean }, SendDeveloperHealthEmailResult>(
        functions,
        'sendDeveloperHealthAlertEmailNow',
      );
      const res = await fn({ force: true });
      const data = res.data;
      if (data.sent) {
        toast({
          title: 'Health alert email queued',
          description: `${data.alertCount} alert(s) → ${data.recipientCount} recipient(s) via Trigger Email.`,
        });
        await loadSettings();
      } else {
        const reason =
          data.reason === 'no_actionable_alerts'
            ? 'No critical/warning alerts to send (demo schools excluded).'
            : data.reason === 'no_recipients'
              ? 'Add at least one recipient email below.'
              : data.reason === 'disabled'
                ? 'Email alerts are turned off.'
                : `Not sent (${data.reason}).`;
        toast({ variant: 'destructive', title: 'Email not sent', description: reason });
      }
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Send failed',
        description: (e as Error)?.message || 'Deploy sendDeveloperHealthAlertEmailNow.',
      });
    } finally {
      setSending(false);
    }
  };

  const addEmail = async () => {
    if (!settings) return;
    const e = newEmail.trim().toLowerCase();
    if (!e.includes('@')) {
      toast({ variant: 'destructive', title: 'Enter a valid email address.' });
      return;
    }
    if (settings.emails.includes(e)) {
      setNewEmail('');
      return;
    }
    await saveSettings({ emails: [...settings.emails, e] });
    setNewEmail('');
  };

  const removeEmail = async (email: string) => {
    if (!settings) return;
    await saveSettings({ emails: settings.emails.filter((x) => x !== email) });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading email settings…
        </CardContent>
      </Card>
    );
  }

  if (!settings) return null;

  return (
    <Card className="border-blue-500/20 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mail className="h-5 w-5 text-blue-500" aria-hidden />
          Email alerts
        </CardTitle>
        <CardDescription>
          Sends via Firebase Trigger Email (<code className="text-xs">mail</code> queue). Daily digest at 7:00 AM
          Eastern; immediate email when critical alerts change. Current scan: {criticalCount} critical, {warningCount}{' '}
          warning.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <Label htmlFor="health-email-enabled" className="cursor-pointer text-sm font-medium">
              Enable emails
            </Label>
            <Switch
              id="health-email-enabled"
              checked={settings.enabled}
              disabled={saving}
              onCheckedChange={(v) => void saveSettings({ enabled: v })}
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <Label htmlFor="health-email-daily" className="cursor-pointer text-sm font-medium">
              Daily digest (7 AM ET)
            </Label>
            <Switch
              id="health-email-daily"
              checked={settings.dailyDigest}
              disabled={saving || !settings.enabled}
              onCheckedChange={(v) => void saveSettings({ dailyDigest: v })}
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <Label htmlFor="health-email-critical" className="cursor-pointer text-sm font-medium">
              Email on new critical alerts
            </Label>
            <Switch
              id="health-email-critical"
              checked={settings.emailOnCritical}
              disabled={saving || !settings.enabled}
              onCheckedChange={(v) => void saveSettings({ emailOnCritical: v })}
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <Label htmlFor="health-email-warnings" className="cursor-pointer text-sm font-medium">
              Include warnings in email
            </Label>
            <Switch
              id="health-email-warnings"
              checked={settings.includeWarnings}
              disabled={saving || !settings.enabled}
              onCheckedChange={(v) => void saveSettings({ includeWarnings: v })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Recipients</Label>
          <ul className="space-y-1">
            {settings.emails.length === 0 ? (
              <li className="text-sm text-muted-foreground">No recipients — add your email below.</li>
            ) : (
              settings.emails.map((email) => (
                <li
                  key={email}
                  className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm font-mono"
                >
                  {email}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    aria-label={`Remove ${email}`}
                    disabled={saving}
                    onClick={() => void removeEmail(email)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))
            )}
          </ul>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="you@school.org"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void addEmail();
              }}
            />
            <Button type="button" variant="secondary" disabled={saving} onClick={() => void addEmail()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {settings.lastSentAt ? (
          <p className="text-xs text-muted-foreground">
            Last email queued {formatRelativeTime(settings.lastSentAt)}
          </p>
        ) : null}

        <Button
          type="button"
          className="w-full sm:w-auto gap-2"
          disabled={sending || !settings.enabled}
          onClick={() => void sendNow()}
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Send health report now
        </Button>
      </CardContent>
    </Card>
  );
}
