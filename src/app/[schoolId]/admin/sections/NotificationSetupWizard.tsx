'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award,
  Bell,
  BookOpenCheck,
  Calendar,
  Check,
  ChevronRight,
  Mail,
  MessageSquare,
  Package,
  ShoppingBag,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { Settings } from '@/components/providers/SettingsProvider';
import { useToast } from '@/hooks/use-toast';
import { WizardHelpButtonClosing } from '@/components/support/WizardHelpButtonClosing';

export type NotificationRecipient = 'parents' | 'students' | 'staff';

export type NotificationTrigger =
  | 'reward_redemption'
  | 'points_award'
  | 'attendance'
  | 'library'
  | 'milestone'
  | 'inventory'
  | 'weekly_digest';

export type NotificationWizardDraft = {
  recipients: NotificationRecipient[];
  trigger: NotificationTrigger | null;
  whatsApp: boolean;
  milestoneArtwork: boolean;
};

const STEP_LABELS = ['Start', 'Who', 'When', 'How', 'Done'] as const;

const RECIPIENT_OPTIONS: {
  id: NotificationRecipient;
  label: string;
  description: string;
  icon: LucideIcon;
  alwaysOn?: boolean;
}[] = [
  {
    id: 'parents',
    label: 'Parents & guardians',
    description: 'Uses parent email or phone on the student record.',
    icon: Users,
    alwaysOn: true,
  },
  {
    id: 'students',
    label: 'Students',
    description: 'Sends to the student email or phone when saved.',
    icon: User,
  },
  {
    id: 'staff',
    label: 'Teachers & staff',
    description: 'Assigned teachers and admins with contact info.',
    icon: Users,
  },
];

function triggerOptions(attendanceOn: boolean, libraryOn: boolean) {
  const items: {
    id: NotificationTrigger;
    label: string;
    description: string;
    icon: LucideIcon;
    hidden?: boolean;
  }[] = [
    {
      id: 'reward_redemption',
      label: 'Prize redemption',
      description: 'When a student spends points on a reward.',
      icon: ShoppingBag,
    },
    {
      id: 'points_award',
      label: 'Points awarded',
      description: 'When a teacher gives points (not milestones).',
      icon: Award,
    },
    {
      id: 'attendance',
      label: 'Class sign-in',
      description: 'When a student signs in for attendance.',
      icon: Calendar,
      hidden: !attendanceOn,
    },
    {
      id: 'library',
      label: 'Library checkout or return',
      description: 'When a student borrows or returns a book.',
      icon: BookOpenCheck,
      hidden: !libraryOn,
    },
    {
      id: 'milestone',
      label: 'Milestone or badge',
      description: 'When a student unlocks an achievement or badge.',
      icon: Sparkles,
    },
    {
      id: 'inventory',
      label: 'Low prize stock',
      description: 'When a prize is running low or the shop is empty.',
      icon: Package,
    },
    {
      id: 'weekly_digest',
      label: 'Weekly parent summary',
      description: 'Sunday digest email for parents who opted in.',
      icon: Mail,
    },
  ];
  return items.filter((t) => !t.hidden);
}

function defaultDraft(): NotificationWizardDraft {
  return {
    recipients: ['parents'],
    trigger: null,
    whatsApp: false,
    milestoneArtwork: true,
  };
}

export function applyNotificationWizard(
  draft: NotificationWizardDraft,
  updateSettings: (patch: Partial<Settings>) => void,
) {
  const patch: Partial<Settings> = { enableNotifications: true };

  patch.notificationStudentsEnabled = draft.recipients.includes('students');
  patch.notificationStaffAlertsEnabled = draft.recipients.includes('staff');

  switch (draft.trigger) {
    case 'reward_redemption':
    case 'points_award':
      patch.notificationRewardsEnabled = true;
      break;
    case 'attendance':
      patch.notificationAttendanceEnabled = true;
      break;
    case 'library':
      patch.notificationLibraryEnabled = true;
      break;
    case 'milestone':
      patch.notificationMilestonesEnabled = true;
      patch.notificationArtworkEnabled = draft.milestoneArtwork;
      break;
    case 'inventory':
      patch.notificationPrizeInventoryEnabled = true;
      break;
    case 'weekly_digest':
      patch.notificationParentWeeklyDigestEnabled = true;
      break;
    default:
      break;
  }

  patch.notificationWhatsAppEnabled = draft.whatsApp;
  updateSettings(patch);
}

function recipientLabel(ids: NotificationRecipient[]): string {
  const parts: string[] = ['Parents'];
  if (ids.includes('students')) parts.push('Students');
  if (ids.includes('staff')) parts.push('Staff');
  return parts.join(', ');
}

function triggerLabel(trigger: NotificationTrigger | null): string {
  return triggerOptions(true, true).find((t) => t.id === trigger)?.label ?? '—';
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDraft?: NotificationWizardDraft | null;
  attendancePillarOn: boolean;
  libraryPillarOn: boolean;
  notificationsEnabled: boolean;
  updateSettings: (patch: Partial<Settings>) => void;
};

export function NotificationSetupWizard({
  open,
  onOpenChange,
  initialDraft,
  attendancePillarOn,
  libraryPillarOn,
  notificationsEnabled,
  updateSettings,
}: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<NotificationWizardDraft>(defaultDraft);

  const triggers = useMemo(
    () => triggerOptions(attendancePillarOn, libraryPillarOn),
    [attendancePillarOn, libraryPillarOn],
  );

  const reset = useCallback(() => {
    setStep(0);
    const base = initialDraft ?? defaultDraft();
    const triggerValid =
      base.trigger !== null && triggers.some((t) => t.id === base.trigger);
    setDraft({
      ...base,
      trigger: triggerValid ? base.trigger : null,
    });
  }, [initialDraft, triggers]);

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const canGoNext = useMemo(() => {
    if (step === 1) return draft.recipients.length > 0;
    if (step === 2) return draft.trigger !== null;
    return true;
  }, [step, draft]);

  const stepTitle = useMemo(() => {
    switch (step) {
      case 0:
        return 'Set up a notification';
      case 1:
        return 'Who should we notify?';
      case 2:
        return 'When should we notify?';
      case 3:
        return 'How should we deliver it?';
      default:
        return 'Review & turn on';
    }
  }, [step]);

  const finish = () => {
    if (!draft.trigger || !notificationsEnabled) return;
    applyNotificationWizard(draft, updateSettings);
    toast({
      title: 'Notification turned on',
      description: `${triggerLabel(draft.trigger)} alerts for ${recipientLabel(draft.recipients)}.`,
    });
    onOpenChange(false);
  };

  const toggleRecipient = (id: NotificationRecipient) => {
    if (id === 'parents') return;
    setDraft((d) => {
      const has = d.recipients.includes(id);
      const recipients = has ? d.recipients.filter((r) => r !== id) : [...d.recipients, id];
      return { ...d, recipients: recipients.length ? recipients : ['parents'] };
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-500" aria-hidden="true" />
            {stepTitle}
          </DialogTitle>
          <DialogDescription>
            Step {step + 1} of {STEP_LABELS.length} — we&apos;ll save your school settings when you finish.
          </DialogDescription>
        </DialogHeader>

        <StepIndicator step={step} />

        {!notificationsEnabled ? (
          <p className="text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            Turn on the notifications master switch in Admin → Notifications before finishing this wizard.
          </p>
        ) : null}

        {step === 0 && (
          <div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We&apos;ll walk you through who gets the alert, what triggers it, and how it&apos;s delivered. Run the
              wizard again anytime to add another alert type.
            </p>
            <ul className="text-sm space-y-2 mt-3">
              <li className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-ring shrink-0" aria-hidden="true" />
                Pick who receives the message
              </li>
              <li className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-ring shrink-0" aria-hidden="true" />
                Pick what school event starts the alert
              </li>
              <li className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-ring shrink-0" aria-hidden="true" />
                Confirm email or add WhatsApp
              </li>
            </ul>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Tap each group you want to include. Parents are always included when contact info exists.
            </p>
            {RECIPIENT_OPTIONS.map((opt) => {
              const selected = draft.recipients.includes(opt.id) || opt.alwaysOn;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={opt.alwaysOn}
                  onClick={() => toggleRecipient(opt.id)}
                  className={cn(
                    'w-full flex items-start gap-3 rounded-xl border p-4 text-left transition-colors',
                    selected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border bg-muted/20 hover:bg-muted/40',
                    opt.alwaysOn && 'opacity-90 cursor-default',
                  )}
                >
                  <div
                    className={cn(
                      'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                      selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{opt.description}</p>
                    {opt.alwaysOn ? (
                      <span className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                        Always on
                      </span>
                    ) : null}
                  </div>
                  {selected ? <Check className="h-5 w-5 text-ring shrink-0 mt-1" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-2 max-h-[min(52vh,420px)] overflow-y-auto pr-1">
            <p className="text-sm text-muted-foreground mb-2">
              Choose one event. Run this wizard again to add another type later.
            </p>
            {triggers.map((opt) => {
              const selected = draft.trigger === opt.id;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, trigger: opt.id }))}
                  className={cn(
                    'w-full flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors',
                    selected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border bg-muted/20 hover:bg-muted/40',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                      selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{opt.description}</p>
                  </div>
                  {selected ? <Check className="h-5 w-5 text-ring shrink-0 mt-1" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/20 p-4 flex items-start gap-3">
              <Mail className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold text-sm">Email</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Always used when an email address is on file.
                </p>
                <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                  Included
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border p-4">
              <div className="flex items-start gap-3 pr-3">
                <MessageSquare className="h-5 w-5 text-green-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-sm">WhatsApp (optional)</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    High-priority texts when a phone number is saved.
                  </p>
                </div>
              </div>
              <Switch
                checked={draft.whatsApp}
                onCheckedChange={(checked) => setDraft((d) => ({ ...d, whatsApp: checked }))}
              />
            </div>

            {draft.trigger === 'milestone' ? (
              <div className="flex items-center justify-between rounded-xl border p-4">
                <div>
                  <p className="font-semibold text-sm">Celebration artwork in email</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Polished badge panel in milestone emails.</p>
                </div>
                <Switch
                  checked={draft.milestoneArtwork}
                  onCheckedChange={(checked) => setDraft((d) => ({ ...d, milestoneArtwork: checked }))}
                />
              </div>
            ) : null}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-secondary/20 p-4 space-y-2 text-sm">
              <p className="font-bold">Your notification</p>
              <ul className="space-y-1.5 text-muted-foreground">
                <li>
                  <span className="font-semibold text-foreground">Who:</span> {recipientLabel(draft.recipients)}
                </li>
                <li>
                  <span className="font-semibold text-foreground">When:</span> {triggerLabel(draft.trigger)}
                </li>
                <li>
                  <span className="font-semibold text-foreground">How:</span> Email
                  {draft.whatsApp ? ', WhatsApp' : ''}
                </li>
              </ul>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We&apos;ll turn on the matching switches in your school settings. Messages still skip anyone without
              contact info on file.
            </p>
            <WizardHelpButtonClosing className="text-xs" />
          </div>
        )}

        <DialogFooter className="flex flex-row justify-between gap-2 sm:justify-between">
          <Button type="button" variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {step < 4 ? (
              <Button
                type="button"
                disabled={!canGoNext || !notificationsEnabled}
                onClick={() => setStep((s) => Math.min(4, s + 1))}
              >
                Next
              </Button>
            ) : (
              <Button type="button" disabled={!notificationsEnabled || !draft.trigger} onClick={finish}>
                Turn on
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepIndicator({ step }: { step: number }) {
  return (
    <div
      className="flex items-center justify-center gap-1.5 py-1"
      aria-label={`Step ${step + 1} of ${STEP_LABELS.length}`}
    >
      {STEP_LABELS.map((label, i) => (
        <div key={label} className="flex flex-col items-center gap-1">
          <div
            className={cn(
              'h-2 rounded-full transition-all',
              i === step ? 'w-8 bg-primary' : i < step ? 'w-2 bg-primary/60' : 'w-2 bg-muted',
            )}
          />
          <span className={cn('text-[9px] font-medium', i === step ? 'text-foreground' : 'text-muted-foreground')}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

