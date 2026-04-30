'use client';

import { Award, Bell, CheckCircle2, Image, Mail, MessageSquare, Shield, Sparkles, User, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSettings } from '@/components/providers/SettingsProvider';

export function AdminNotificationsTab() {
  const { settings, updateSettings } = useSettings();

  return (
    <div className="space-y-6">
      <Card className="border-t-4 border-blue-500 shadow-md">
        <CardHeader className="py-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-500" /> Notification System
              </CardTitle>
              <CardDescription>
                Configure automated alerts for parents, teachers, and administrators.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-green-600 dark:text-green-400">System Active</span>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity">
        {/* EVENT TRIGGERS */}
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

            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold flex items-center gap-2">
                  Milestones & Badges <Sparkles className="w-3.5 h-3.5 text-amber-500" />
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
                  Celebration Artwork <Image className="w-3.5 h-3.5 text-sky-500" />
                </Label>
                <p className="text-[11px] text-muted-foreground">Include badge-style artwork in milestone and badge emails.</p>
              </div>
              <Switch
                checked={settings.notificationArtworkEnabled}
                onCheckedChange={(checked) => updateSettings({ notificationArtworkEnabled: checked })}
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

        {/* RECIPIENT SETTINGS */}
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
                <p className="text-[11px] text-muted-foreground">Always notified if student contact info is provided.</p>
              </div>
              <div className="text-[10px] uppercase font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">Always On</div>
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
              <strong> "Trigger Email"</strong> or <strong>"Twilio SMS"</strong> extensions configured in 
              your Firebase Console to enable delivery. Contact information is stored encrypted 
              within your school's private database.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
