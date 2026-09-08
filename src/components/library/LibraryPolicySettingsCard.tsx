'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  Bell,
  BookMarked,
  Camera,
  CheckCircle2,
  Coins,
  MessageSquare,
  Play,
  Printer,
  ScanBarcode,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  StaffPortalTabInfoPopover,
  staffPortalTabInfoSection,
} from '@/components/staff/StaffPortalTabInfoPopover';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useToast } from '@/hooks/use-toast';
import {
  LIBRARY_REWARD_MODE_LABELS,
  resolveLibraryRewardMode,
  type LibraryRewardMode,
} from '@/lib/library/libraryPolicy';
import {
  LIBRARY_LATE_RESPONSES,
  LIBRARY_LATE_SOUNDS,
  LIBRARY_ON_TIME_RESPONSES,
  LIBRARY_ON_TIME_SOUNDS,
  playLibraryReturnAudio,
  resolveLibraryReturnFeedback,
  type LibraryReturnResponseLateMode,
  type LibraryReturnResponseOnTimeMode,
  type LibraryReturnSoundLateId,
  type LibraryReturnSoundOnTimeId,
} from '@/lib/library/libraryAudio';
import type { Category } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

export function LibraryPolicySettingsCard({ categories }: { categories?: Category[] | null }) {
  const { settings, updateSettings } = useSettings();
  const [testingSound, setTestingSound] = useState<string | null>(null);
  const categoryList = categories ?? [];
  const rewardMode = resolveLibraryRewardMode(settings);

  const handleTestSound = (soundId: LibraryReturnSoundOnTimeId | LibraryReturnSoundLateId) => {
    setTestingSound(soundId);
    playLibraryReturnAudio(soundId, { volume: 0.18 });
    setTimeout(() => {
      setTestingSound((curr) => (curr === soundId ? null : curr));
    }, 900);
  };

  const onTimeSound: LibraryReturnSoundOnTimeId =
    settings.libraryReturnSoundOnTime || 'chime_bright';
  const lateSound: LibraryReturnSoundLateId =
    settings.libraryReturnSoundLate || 'gentle_warning';
  const onTimeMode: LibraryReturnResponseOnTimeMode =
    settings.libraryReturnResponseOnTimeMode || 'cheerful';
  const lateMode: LibraryReturnResponseLateMode =
    settings.libraryReturnResponseLateMode || 'gentle';

  const onTimeFeedback = resolveLibraryReturnFeedback(
    { isOverdue: false, daysOverdue: 0, bookTitle: 'The Phantom Tollbooth' },
    settings,
  );

  const lateFeedback = resolveLibraryReturnFeedback(
    { isOverdue: true, daysOverdue: 3, bookTitle: "Charlotte's Web" },
    settings,
  );

  const setRewardMode = (mode: LibraryRewardMode) => {
    const updates: Parameters<typeof updateSettings>[0] = { libraryRewardMode: mode };
    if (mode === 'none') {
      updates.libraryLateFeesEnabled = false;
      updates.libraryOnTimeReturnPoints = 0;
    }
    updateSettings(updates);
  };

  const kioskCheckoutOn = settings.libraryStudentKioskCheckoutEnabled !== false;
  const standalonePortalOn = settings.libraryAutoStudentPortalEnabled !== false;
  const autoDetectOn = settings.libraryAutoDetectCirculation !== false;
  const cameraScanOn = settings.libraryCameraScanEnabled === true;
  const allowSelfReturnOn = settings.libraryKioskAllowSelfReturn !== false;
  const dropBoxOn = settings.libraryKioskAllowDropBoxReturn !== false;
  const soundEffectsOn = settings.libraryKioskSoundEffects !== false;
  const recommendationsOn = settings.libraryKioskShowRecommendations !== false;
  const activeLoansOn = settings.libraryKioskShowActiveLoans !== false;
  const allowOverdueRenewals = settings.libraryAllowRenewIfOverdue === true;
  const allowMultiCopies = settings.libraryAllowMultipleCopiesOfSameTitle === true;
  const autoLookupGoogleBooks = settings.libraryAutoLookupGoogleBooks !== false;
  const notifyTeacherOnOverdue = settings.libraryNotifyTeacherOnOverdue !== false;
  const milestonesOn = settings.libraryReadingMilestonesEnabled !== false;

  return (
    <div className="space-y-6">
      {/* 1. Circulation & Loan Policies */}
      <Card className="border-dashed shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <BookMarked className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  Circulation &amp; Loan Policies
                  <Badge variant="outline" className="font-normal text-xs">
                    {settings.libraryLoanPeriodDays ?? 14} days
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Configure borrowing limits, renewal rules, and loan duration for students.
                </CardDescription>
              </div>
            </div>
            <StaffPortalTabInfoPopover
              sections={[
                staffPortalTabInfoSection(
                  'Set loan lengths, checkout quotas per student, and allow smart auto-detection of borrows and returns.',
                ),
              ]}
              ariaLabel="About circulation policies"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Smart Auto-Detect Borrow/Return Toggle */}
          <div className="flex items-center justify-between gap-3 rounded-xl border bg-primary/5 p-3.5 border-primary/20">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 font-bold text-sm text-foreground">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>Smart Auto-Detect Borrow vs Return</span>
                <Badge variant="secondary" className="text-[10px] font-semibold bg-primary/10 text-primary">
                  Recommended
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Automatically determines whether to borrow or return when a book is scanned: available copies check out, while books currently borrowed by the student are returned without needing manual mode toggles.
              </p>
            </div>
            <Switch
              checked={autoDetectOn}
              onCheckedChange={(v) => updateSettings({ libraryAutoDetectCirculation: v })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="lib-loan-days" className="text-xs font-bold">
                Loan period (days)
              </Label>
              <Input
                id="lib-loan-days"
                type="number"
                min={1}
                max={365}
                value={settings.libraryLoanPeriodDays ?? 14}
                onChange={(e) =>
                  updateSettings({ libraryLoanPeriodDays: Math.max(1, parseInt(e.target.value, 10) || 14) })
                }
              />
              <p className="text-[11px] text-muted-foreground">Days before book is overdue</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lib-max-books" className="text-xs font-bold">
                Max books per student
              </Label>
              <Input
                id="lib-max-books"
                type="number"
                min={0}
                max={50}
                value={settings.libraryMaxCheckoutsPerStudent ?? 3}
                onChange={(e) =>
                  updateSettings({
                    libraryMaxCheckoutsPerStudent: Math.max(0, parseInt(e.target.value, 10) || 0),
                  })
                }
              />
              <p className="text-[11px] text-muted-foreground">0 = no borrowing limit</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lib-max-renewals" className="text-xs font-bold">
                Max renewals per loan
              </Label>
              <Input
                id="lib-max-renewals"
                type="number"
                min={0}
                max={10}
                value={settings.libraryMaxRenewals ?? 2}
                onChange={(e) =>
                  updateSettings({
                    libraryMaxRenewals: Math.max(0, parseInt(e.target.value, 10) || 0),
                  })
                }
              />
              <p className="text-[11px] text-muted-foreground">0 = renewals disabled</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lib-grace-days" className="text-xs font-bold">
                Grace period (days)
              </Label>
              <Input
                id="lib-grace-days"
                type="number"
                min={0}
                max={30}
                value={settings.libraryGracePeriodDays ?? 0}
                onChange={(e) =>
                  updateSettings({
                    libraryGracePeriodDays: Math.max(0, parseInt(e.target.value, 10) || 0),
                  })
                }
              />
              <p className="text-[11px] text-muted-foreground">Extra days before late fees apply</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 pt-1">
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
              <div>
                <p className="text-xs font-bold">Allow renewals for overdue books</p>
                <p className="text-[11px] text-muted-foreground">
                  Permit extending due dates even after a book has passed its due date.
                </p>
              </div>
              <Switch
                checked={allowOverdueRenewals}
                onCheckedChange={(v) => updateSettings({ libraryAllowRenewIfOverdue: v })}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
              <div>
                <p className="text-xs font-bold">Allow multiple copies of same title</p>
                <p className="text-[11px] text-muted-foreground">
                  Permit students to borrow more than one copy of the same book at once.
                </p>
              </div>
              <Switch
                checked={allowMultiCopies}
                onCheckedChange={(v) => updateSettings({ libraryAllowMultipleCopiesOfSameTitle: v })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Self-Checkout Station & Hardware Scanning */}
      <Card className="border-dashed shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <ScanBarcode className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  Station &amp; Hardware Scanning
                </CardTitle>
                <CardDescription>
                  Configure camera scanning, station modes, sound effects, and kiosk screen behaviors.
                </CardDescription>
              </div>
            </div>
            <StaffPortalTabInfoPopover
              sections={[
                staffPortalTabInfoSection(
                  'Control camera barcode scanning and manage how student kiosks and dedicated library stations behave.',
                ),
              ]}
              ariaLabel="About station and scanning settings"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Camera Scanning Switch */}
          <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-primary/30 bg-primary/5 p-3.5">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                <Camera className="h-4 w-4 text-primary" />
                <span>Camera Barcode Scanning</span>
                {cameraScanOn && (
                  <Badge variant="default" className="text-[10px] font-semibold bg-emerald-600">
                    Live
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Enable built-in device webcam/camera to scan student ID cards and book barcodes directly on library stations, circulation desk, and catalog intake without an external handheld scanner.
              </p>
            </div>
            <Switch
              checked={cameraScanOn}
              onCheckedChange={(v) => updateSettings({ libraryCameraScanEnabled: v })}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
              <div>
                <p className="text-xs font-bold">Library station (shared device)</p>
                <p className="text-[11px] text-muted-foreground">
                  Dedicated self-checkout flow at /library/self-checkout &amp; /library/kiosk.
                </p>
              </div>
              <Switch
                checked={standalonePortalOn}
                onCheckedChange={(v) => updateSettings({ libraryAutoStudentPortalEnabled: v })}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
              <div>
                <p className="text-xs font-bold">Student kiosk (signed in)</p>
                <p className="text-[11px] text-muted-foreground">
                  Borrow and return books using the barcode scanner on personal student rewards kiosk.
                </p>
              </div>
              <Switch
                checked={kioskCheckoutOn}
                onCheckedChange={(v) => updateSettings({ libraryStudentKioskCheckoutEnabled: v })}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
              <div>
                <p className="text-xs font-bold">Allow student self-returns</p>
                <p className="text-[11px] text-muted-foreground">
                  Allow students to return borrowed books themselves at the kiosk station.
                </p>
              </div>
              <Switch
                checked={allowSelfReturnOn}
                onCheckedChange={(v) => updateSettings({ libraryKioskAllowSelfReturn: v })}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
              <div>
                <p className="text-xs font-bold">Quick Drop Box mode</p>
                <p className="text-[11px] text-muted-foreground">
                  Allow returning books without requiring a student ID card swipe.
                </p>
              </div>
              <Switch
                checked={dropBoxOn}
                onCheckedChange={(v) => updateSettings({ libraryKioskAllowDropBoxReturn: v })}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs font-bold">Sound effects &amp; audio chimes</p>
                  <p className="text-[11px] text-muted-foreground">
                    Play celebratory sounds on successful checkouts, returns, and bonus points.
                  </p>
                </div>
              </div>
              <Switch
                checked={soundEffectsOn}
                onCheckedChange={(v) => updateSettings({ libraryKioskSoundEffects: v })}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
              <div>
                <p className="text-xs font-bold">Show book recommendations</p>
                <p className="text-[11px] text-muted-foreground">
                  Suggest related books from the catalog on screen after borrowing or returning.
                </p>
              </div>
              <Switch
                checked={recommendationsOn}
                onCheckedChange={(v) => updateSettings({ libraryKioskShowRecommendations: v })}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
              <div>
                <p className="text-xs font-bold">Show active loans on screen</p>
                <p className="text-[11px] text-muted-foreground">
                  Display the student&apos;s current loans and due dates on their kiosk session.
                </p>
              </div>
              <Switch
                checked={activeLoansOn}
                onCheckedChange={(v) => updateSettings({ libraryKioskShowActiveLoans: v })}
              />
            </div>

            <div className="space-y-1.5 rounded-lg border bg-muted/30 px-3 py-2">
              <Label htmlFor="lib-reset-sec" className="text-xs font-bold">
                Station auto-reset countdown (seconds)
              </Label>
              <Select
                value={String(settings.libraryKioskAutoResetSeconds ?? 8)}
                onValueChange={(v) => updateSettings({ libraryKioskAutoResetSeconds: parseInt(v, 10) || 8 })}
              >
                <SelectTrigger id="lib-reset-sec" className="h-8 rounded-lg text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 seconds (high traffic)</SelectItem>
                  <SelectItem value="8">8 seconds (recommended)</SelectItem>
                  <SelectItem value="12">12 seconds (relaxed)</SelectItem>
                  <SelectItem value="20">20 seconds (long preview)</SelectItem>
                  <SelectItem value="0">Disabled (manual tap only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Return Audio Sounds & Student Responses */}
      <Card className="border-dashed shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Volume2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  Return Audio Sounds &amp; Student Responses
                  <Badge variant="outline" className="font-normal text-xs bg-emerald-500/10 text-emerald-600 border-emerald-300 dark:border-emerald-800">
                    On-Time &amp; Overdue
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Configure audio chimes and personalized on-screen messages for on-time and late/overdue returns.
                </CardDescription>
              </div>
            </div>
            <StaffPortalTabInfoPopover
              sections={[
                staffPortalTabInfoSection(
                  'Select sound effects and feedback text for when students return books. You can test each tone right from this screen or write custom feedback using {title} and {days}.',
                ),
              ]}
              ariaLabel="About return sounds and responses"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* On-Time Returns Column */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.03] p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-md bg-emerald-500/15 p-1.5 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">On-Time Returns</h4>
                    <p className="text-[11px] text-muted-foreground">Played when books are returned by their due date</p>
                  </div>
                </div>
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-[10px]">
                  Positive Reinforcement
                </Badge>
              </div>

              {/* Sound Selector with Preview Button */}
              <div className="space-y-1.5">
                <Label htmlFor="ontime-sound-select" className="text-xs font-semibold flex items-center justify-between">
                  <span>Audio Chime</span>
                  <span className="text-[11px] font-normal text-muted-foreground">Web Audio synthesized</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Select
                    value={onTimeSound}
                    onValueChange={(val) =>
                      updateSettings({ libraryReturnSoundOnTime: val as LibraryReturnSoundOnTimeId })
                    }
                  >
                    <SelectTrigger id="ontime-sound-select" className="flex-1 h-9 text-xs rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LIBRARY_ON_TIME_SOUNDS.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">
                          <span className="mr-1.5">{s.icon}</span>
                          <span className="font-medium">{s.label}</span>
                          <span className="ml-2 text-muted-foreground text-[10px]">({s.tagline})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 text-xs gap-1.5 shrink-0 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                    onClick={() => handleTestSound(onTimeSound)}
                    disabled={onTimeSound === 'none'}
                    title="Play and test this chime"
                  >
                    <Play className={`h-3.5 w-3.5 ${testingSound === onTimeSound ? 'animate-spin' : ''}`} />
                    <span>Preview</span>
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {LIBRARY_ON_TIME_SOUNDS.find((s) => s.id === onTimeSound)?.description}
                </p>
              </div>

              {/* Response Message Mode */}
              <div className="space-y-1.5">
                <Label htmlFor="ontime-response-mode" className="text-xs font-semibold">
                  Student Feedback Message Preset
                </Label>
                <Select
                  value={onTimeMode}
                  onValueChange={(val) =>
                    updateSettings({ libraryReturnResponseOnTimeMode: val as LibraryReturnResponseOnTimeMode })
                  }
                >
                  <SelectTrigger id="ontime-response-mode" className="h-9 text-xs rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LIBRARY_ON_TIME_RESPONSES.map((r) => (
                      <SelectItem key={r.id} value={r.id} className="text-xs">
                        <span className="font-medium">{r.label}</span>
                        <span className="ml-2 text-muted-foreground text-[10px]">({r.tagline})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom message input if custom mode */}
              {onTimeMode === 'custom' && (
                <div className="space-y-1.5">
                  <Label htmlFor="ontime-custom-msg" className="text-xs font-semibold">
                    Custom On-Time Message Text
                  </Label>
                  <Input
                    id="ontime-custom-msg"
                    placeholder='Thank you for returning "{title}" on time!'
                    value={settings.libraryReturnResponseOnTimeCustom ?? ''}
                    onChange={(e) => updateSettings({ libraryReturnResponseOnTimeCustom: e.target.value })}
                    className="h-9 text-xs rounded-lg"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Supported tags: <code className="bg-muted px-1 rounded font-mono">{"{title}"}</code> for book title, <code className="bg-muted px-1 rounded font-mono">{"{days}"}</code> for days.
                  </p>
                </div>
              )}

              {/* Live Banner Preview */}
              <div className="space-y-1 pt-1">
                <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-emerald-500" />
                  <span>Station Screen Preview</span>
                </p>
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs space-y-1 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      {onTimeFeedback.title}
                    </span>
                    <Badge variant="outline" className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]">
                      {onTimeFeedback.badgeText}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    &ldquo;{onTimeFeedback.message}&rdquo;
                  </p>
                </div>
              </div>
            </div>

            {/* Late / Overdue Returns Column */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.03] p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-md bg-amber-500/15 p-1.5 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Late &amp; Overdue Returns</h4>
                    <p className="text-[11px] text-muted-foreground">Played when books are returned after their due date</p>
                  </div>
                </div>
                <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 hover:bg-amber-500/30 text-[10px] border border-amber-500/30">
                  Reminder &amp; Notice
                </Badge>
              </div>

              {/* Sound Selector with Preview Button */}
              <div className="space-y-1.5">
                <Label htmlFor="late-sound-select" className="text-xs font-semibold flex items-center justify-between">
                  <span>Audio Alert Tone</span>
                  <span className="text-[11px] font-normal text-muted-foreground">Web Audio synthesized</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Select
                    value={lateSound}
                    onValueChange={(val) =>
                      updateSettings({ libraryReturnSoundLate: val as LibraryReturnSoundLateId })
                    }
                  >
                    <SelectTrigger id="late-sound-select" className="flex-1 h-9 text-xs rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LIBRARY_LATE_SOUNDS.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">
                          <span className="mr-1.5">{s.icon}</span>
                          <span className="font-medium">{s.label}</span>
                          <span className="ml-2 text-muted-foreground text-[10px]">({s.tagline})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 text-xs gap-1.5 shrink-0 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                    onClick={() => handleTestSound(lateSound)}
                    disabled={lateSound === 'none'}
                    title="Play and test this tone"
                  >
                    <Play className={`h-3.5 w-3.5 ${testingSound === lateSound ? 'animate-spin' : ''}`} />
                    <span>Preview</span>
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {LIBRARY_LATE_SOUNDS.find((s) => s.id === lateSound)?.description}
                </p>
              </div>

              {/* Response Message Mode */}
              <div className="space-y-1.5">
                <Label htmlFor="late-response-mode" className="text-xs font-semibold">
                  Student Feedback Message Preset
                </Label>
                <Select
                  value={lateMode}
                  onValueChange={(val) =>
                    updateSettings({ libraryReturnResponseLateMode: val as LibraryReturnResponseLateMode })
                  }
                >
                  <SelectTrigger id="late-response-mode" className="h-9 text-xs rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LIBRARY_LATE_RESPONSES.map((r) => (
                      <SelectItem key={r.id} value={r.id} className="text-xs">
                        <span className="font-medium">{r.label}</span>
                        <span className="ml-2 text-muted-foreground text-[10px]">({r.tagline})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom message input if custom mode */}
              {lateMode === 'custom' && (
                <div className="space-y-1.5">
                  <Label htmlFor="late-custom-msg" className="text-xs font-semibold">
                    Custom Overdue Message Text
                  </Label>
                  <Input
                    id="late-custom-msg"
                    placeholder='"{title}" was returned {days} day(s) late. Please return books on time!'
                    value={settings.libraryReturnResponseLateCustom ?? ''}
                    onChange={(e) => updateSettings({ libraryReturnResponseLateCustom: e.target.value })}
                    className="h-9 text-xs rounded-lg"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Supported tags: <code className="bg-muted px-1 rounded font-mono">{"{title}"}</code> for book title, <code className="bg-muted px-1 rounded font-mono">{"{days}"}</code> for days late.
                  </p>
                </div>
              )}

              {/* Live Banner Preview */}
              <div className="space-y-1 pt-1">
                <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  <span>Station Screen Preview</span>
                </p>
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs space-y-1 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" />
                      {lateFeedback.title}
                    </span>
                    <Badge variant="outline" className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30 text-[10px]">
                      {lateFeedback.badgeText}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    &ldquo;{lateFeedback.message}&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Fines, Rewards & Point Balances */}
      <Card className="border-dashed shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  Fines, Rewards &amp; Point Balances
                </CardTitle>
                <CardDescription>
                  Choose how returns affect student balances, reward on-time returns, and control fine caps.
                </CardDescription>
              </div>
            </div>
            <StaffPortalTabInfoPopover
              sections={[
                staffPortalTabInfoSection(
                  'Choose whether late or on-time returns affect fines, school reward points, a separate library balance, or nothing at all.',
                ),
              ]}
              ariaLabel="About loans and returns"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold">When books are returned</Label>
            <Select value={rewardMode} onValueChange={(v) => setRewardMode(v as LibraryRewardMode)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(LIBRARY_REWARD_MODE_LABELS) as LibraryRewardMode[]).map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {LIBRARY_REWARD_MODE_LABELS[mode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {rewardMode === 'app_points' ? (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs font-bold">Points category</Label>
                <StaffPortalTabInfoPopover
                  sections={[
                    staffPortalTabInfoSection(
                      'Points in this category go up or down when books are returned on time or late.',
                    ),
                  ]}
                  ariaLabel="About points category"
                />
              </div>
              <Select
                value={settings.libraryPointsCategoryId || '_none'}
                onValueChange={(v) => updateSettings({ libraryPointsCategoryId: v === '_none' ? undefined : v })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None (no point changes)</SelectItem>
                  {settings.libraryPointsCategoryId &&
                  categoryList.length > 0 &&
                  !categoryList.some((c) => c.id === settings.libraryPointsCategoryId) ? (
                    <SelectItem value={settings.libraryPointsCategoryId}>Unknown category (deleted)</SelectItem>
                  ) : null}
                  {categoryList.map((c) => {
                    const points = Number(c.points ?? 0);
                    return (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({points > 0 ? `+${points}` : points} default)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {rewardMode !== 'none' ? (
            <>
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
                <div>
                  <p className="text-xs font-bold">
                    {rewardMode === 'fines' ? 'Late fines enabled' : 'Late deductions enabled'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {rewardMode === 'fines'
                      ? 'Accumulate a student library fine balance per calendar day overdue'
                      : 'Deduct points per calendar day overdue upon book return'}
                  </p>
                </div>
                <Switch
                  checked={settings.libraryLateFeesEnabled !== false}
                  onCheckedChange={(v) => updateSettings({ libraryLateFeesEnabled: v })}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="lib-late-ppd" className="text-xs font-bold">
                    {rewardMode === 'fines' ? 'Fine per day overdue' : 'Late deduction per day'}
                  </Label>
                  <Input
                    id="lib-late-ppd"
                    type="number"
                    min={0}
                    max={100}
                    disabled={settings.libraryLateFeesEnabled === false}
                    value={settings.libraryLatePointsPerDay ?? 2}
                    onChange={(e) =>
                      updateSettings({ libraryLatePointsPerDay: Math.max(0, parseInt(e.target.value, 10) || 0) })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lib-max-fine" className="text-xs font-bold">
                    Maximum fine cap per book
                  </Label>
                  <Input
                    id="lib-max-fine"
                    type="number"
                    min={0}
                    max={500}
                    value={settings.libraryMaxFineCap ?? 20}
                    onChange={(e) =>
                      updateSettings({ libraryMaxFineCap: Math.max(0, parseInt(e.target.value, 10) || 0) })
                    }
                  />
                  <p className="text-[10px] text-muted-foreground">0 = no fine limit</p>
                </div>

                {rewardMode !== 'fines' ? (
                  <div className="space-y-2">
                    <Label htmlFor="lib-ontime" className="text-xs font-bold">
                      On-time return bonus points
                    </Label>
                    <Input
                      id="lib-ontime"
                      type="number"
                      min={0}
                      max={500}
                      value={settings.libraryOnTimeReturnPoints ?? 0}
                      onChange={(e) =>
                        updateSettings({
                          libraryOnTimeReturnPoints: Math.max(0, parseInt(e.target.value, 10) || 0),
                        })
                      }
                    />
                    <p className="text-[10px] text-muted-foreground">0 = disabled</p>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* 4. Cataloging & Label Printing Defaults */}
      <Card className="border-dashed shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Printer className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  Cataloging &amp; Spine Label Printing
                </CardTitle>
                <CardDescription>
                  Set default book shelves, genres, barcode formats, and automatic catalog lookup.
                </CardDescription>
              </div>
            </div>
            <StaffPortalTabInfoPopover
              sections={[
                staffPortalTabInfoSection(
                  'Streamline book intake by pre-populating shelf locations and choosing how stickers and spine labels are printed.',
                ),
              ]}
              ariaLabel="About cataloging defaults"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
            <div>
              <p className="text-xs font-bold">Automatic book info lookup</p>
              <p className="text-[11px] text-muted-foreground">
                Automatically retrieve title, author, description, and cover artwork from Google Books upon scanning an ISBN.
              </p>
            </div>
            <Switch
              checked={autoLookupGoogleBooks}
              onCheckedChange={(v) => updateSettings({ libraryAutoLookupGoogleBooks: v })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="lib-default-shelf" className="text-xs font-bold">
                Default shelf location
              </Label>
              <Input
                id="lib-default-shelf"
                placeholder="e.g. Main Stacks, Fiction"
                value={settings.libraryDefaultShelf ?? ''}
                onChange={(e) => updateSettings({ libraryDefaultShelf: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lib-default-category" className="text-xs font-bold">
                Default genre / category
              </Label>
              <Input
                id="lib-default-category"
                placeholder="e.g. General, Graphic Novel"
                value={settings.libraryDefaultCategory ?? 'General'}
                onChange={(e) => updateSettings({ libraryDefaultCategory: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lib-label-format" className="text-xs font-bold">
                Default label format
              </Label>
              <Select
                value={settings.libraryLabelFormat ?? 'sticker'}
                onValueChange={(v) =>
                  updateSettings({ libraryLabelFormat: v as 'sticker' | 'spine' | 'pocket' })
                }
              >
                <SelectTrigger id="lib-label-format" className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sticker">Adhesive Barcode Sticker</SelectItem>
                  <SelectItem value="spine">Narrow Book Spine Label</SelectItem>
                  <SelectItem value="pocket">Checkout Card Pocket Slip</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lib-barcode-format" className="text-xs font-bold">
                Barcode standard
              </Label>
              <Select
                value={settings.libraryBarcodeFormat ?? 'CODE128'}
                onValueChange={(v) =>
                  updateSettings({ libraryBarcodeFormat: v as 'CODE128' | 'QR' })
                }
              >
                <SelectTrigger id="lib-barcode-format" className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CODE128">Code 128 (Standard Barcode)</SelectItem>
                  <SelectItem value="QR">QR Code (High Density)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. Alerts & Behavior Feedback */}
      <Card className="border-dashed shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  Alerts &amp; Reading Feedback
                </CardTitle>
                <CardDescription>
                  Send overdue warnings, sync with classroom rosters, and celebrate reading habits.
                </CardDescription>
              </div>
            </div>
            <StaffPortalTabInfoPopover
              sections={[
                staffPortalTabInfoSection(
                  'Keep students and homeroom teachers informed about overdue books and encourage positive reading habits.',
                ),
              ]}
              ariaLabel="About alerts and feedback"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
              <div>
                <p className="text-xs font-bold">Notify teachers on overdue books</p>
                <p className="text-[11px] text-muted-foreground">
                  Flag overdue books on teacher classroom seating charts and attendance rosters.
                </p>
              </div>
              <Switch
                checked={notifyTeacherOnOverdue}
                onCheckedChange={(v) => updateSettings({ libraryNotifyTeacherOnOverdue: v })}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
              <div>
                <p className="text-xs font-bold">Reading milestone streaks</p>
                <p className="text-[11px] text-muted-foreground">
                  Track and award reading badges when students return books consistently on time.
                </p>
              </div>
              <Switch
                checked={milestonesOn}
                onCheckedChange={(v) => updateSettings({ libraryReadingMilestonesEnabled: v })}
              />
            </div>

            <div className="space-y-1.5 rounded-lg border bg-muted/30 px-3 py-2 sm:col-span-2">
              <Label htmlFor="lib-overdue-warn" className="text-xs font-bold">
                Due soon warning alert (days before due date)
              </Label>
              <Select
                value={String(settings.libraryOverdueWarningDays ?? 3)}
                onValueChange={(v) => updateSettings({ libraryOverdueWarningDays: parseInt(v, 10) || 3 })}
              >
                <SelectTrigger id="lib-overdue-warn" className="h-8 rounded-lg text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day before due</SelectItem>
                  <SelectItem value="2">2 days before due</SelectItem>
                  <SelectItem value="3">3 days before due (recommended)</SelectItem>
                  <SelectItem value="5">5 days before due</SelectItem>
                  <SelectItem value="0">Disabled (overdue notice only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

