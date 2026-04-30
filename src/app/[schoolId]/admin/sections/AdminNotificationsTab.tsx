'use client';

import { Bell, Mail, MessageSquare, Shield, User, Users, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSettings } from '@/components/providers/SettingsProvider';
import { Helper } from '@/components/ui/helper';
import { cn } from '@/lib/utils';

export function AdminNotificationsTab() {
  const { settings, updateSettings } = useSettings();

  return (
    <div className="space-y-6">
      <Card className="border-t-4 border-blue-500 shadow-md">
        <CardHeader className="py-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Helper content="Master switch for all external alerts. When off, no emails or texts will be sent.">
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-500" /> Notification System
                </CardTitle>
              </Helper>
              <CardDescription>
                Enable automated alerts for parents, teachers, and administrators.
              </CardDescription>
            </div>
            <Switch
              checked={settings.enableNotifications}
              onCheckedChange={(checked) => updateSettings({ enableNotifications: checked })}
            />
          </div>
        </CardHeader>
        <CardContent className={cn("space-y-6 transition-opacity", !settings.enableNotifications && "opacity-50 pointer-events-none")}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-4 p-4 rounded-xl border bg-card/50">
              <div className="mt-1 bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600 dark:text-blue-400">
                <Mail className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm">Email Alerts</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Send activity summaries and milestone alerts to parent and staff email addresses.
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

      <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity", !settings.enableNotifications && "opacity-50 pointer-events-none")}>
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
