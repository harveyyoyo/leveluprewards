'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  LayoutGrid,
  Loader2,
  MousePointerClick,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Settings } from '@/components/providers/SettingsProvider';
import type { Class, Student } from '@/lib/types';
import { cn } from '@/lib/utils';
import { buildClassroomFullscreenUrl } from '@/lib/classroomPointsUrl';
import {
  saveClassroomPrefs,
  type ClassroomDesign,
} from '@/lib/classroomSeatingChart';
import {
  applyClassroomWizardSettings,
  classroomPrefsFromDraft,
  defaultClassroomWizardDraft,
  type ClassroomSetupWizardDraft,
} from '@/lib/classroom/classroomManagementSettings';

const STEP_LABELS = ['Start', 'Roster', 'Awards', 'Done'] as const;

const DESIGN_OPTIONS: { id: ClassroomDesign; label: string; description: string }[] = [
  { id: 'aurora', label: 'Aurora', description: 'Soft gradients — great for daily use.' },
  { id: 'minimal', label: 'Minimal', description: 'Clean cards with high readability.' },
  { id: 'playful', label: 'Playful', description: 'Bright accents for elementary.' },
  { id: 'brutalist', label: 'Brutalist', description: 'Sharp borders and bold type.' },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  classes: Class[];
  students: Student[];
  updateSettings: (patch: Partial<Settings>) => void;
  onComplete?: () => void;
};

export function ClassroomSetupWizard({
  open,
  onOpenChange,
  schoolId,
  classes,
  students,
  updateSettings,
  onComplete,
}: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ClassroomSetupWizardDraft>(() =>
    defaultClassroomWizardDraft(classes),
  );
  const [finishing, setFinishing] = useState(false);
  const [finishSummary, setFinishSummary] = useState<string[]>([]);

  const sortedClasses = useMemo(
    () => [...classes].sort((a, b) => a.name.localeCompare(b.name)),
    [classes],
  );

  const studentsInSpotlight = useMemo(() => {
    if (!draft.spotlightClassId) return 0;
    return students.filter((s) => s.classId === draft.spotlightClassId).length;
  }, [students, draft.spotlightClassId]);

  const reset = useCallback(() => {
    setStep(0);
    setDraft(defaultClassroomWizardDraft(classes));
    setFinishSummary([]);
    setFinishing(false);
  }, [classes]);

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const canGoNext = useMemo(() => {
    if (step === 1 && sortedClasses.length > 0 && !draft.spotlightClassId) return false;
    if (step === 2 && draft.defaultPoints < 1) return false;
    return true;
  }, [step, sortedClasses.length, draft.spotlightClassId, draft.defaultPoints]);

  const stepTitle = useMemo(() => {
    switch (step) {
      case 0:
        return 'Set up Classroom Management';
      case 1:
        return 'Confirm your roster';
      case 2:
        return 'Classroom quick awards';
      default:
        return 'Ready for the classroom';
    }
  }, [step]);

  const finish = () => {
    setFinishing(true);
    const summary: string[] = [];
    try {
      applyClassroomWizardSettings(updateSettings, draft);
      summary.push('Classroom Management pillar enabled');
      if (draft.enableParentView) summary.push('Parent portal enabled');

      saveClassroomPrefs(schoolId, 'admin', classroomPrefsFromDraft(draft));
      summary.push(
        `Quick awards: ${draft.defaultPoints} pts${draft.instantTap ? ' · instant tap on' : ''}`,
      );

      if (draft.spotlightClassId) {
        const cls = sortedClasses.find((c) => c.id === draft.spotlightClassId);
        if (cls) summary.push(`Spotlight class: ${cls.name}`);
      }

      setFinishSummary(summary);
      setStep(3);
      onComplete?.();
      toast({
        title: 'Classroom Management is ready',
        description: summary.join(' · '),
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Setup could not finish',
        description: 'Try again or configure classroom tools manually.',
      });
    } finally {
      setFinishing(false);
    }
  };

  const classroomHref = buildClassroomFullscreenUrl({
    schoolId,
    classId: draft.spotlightClassId || undefined,
    scope: 'admin',
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-primary" aria-hidden />
            {stepTitle}
          </DialogTitle>
          <DialogDescription>
            Step {step + 1} of {STEP_LABELS.length}
            {step < 3 ? ' — settings save when you finish.' : ''}
          </DialogDescription>
        </DialogHeader>

        <ClassroomWizardStepIndicator step={step} />

        {step === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              This wizard turns on the Classroom Management pillar: seating charts with one-tap
              awards and a full-screen classroom view for teachers. Smart Screen hallway displays
              are separate and included with every plan.
            </p>
            <ul className="text-sm space-y-2">
              {[
                { icon: Users, text: 'Pick a class to spotlight for quick links' },
                { icon: MousePointerClick, text: 'Set default points and tap behavior' },
                { icon: LayoutGrid, text: 'Open the classroom view from the Classroom tab' },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4 text-primary shrink-0" aria-hidden />
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                  {text}
                </li>
              ))}
            </ul>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/20 p-4 text-sm space-y-1">
              <p>
                <span className="font-semibold">{sortedClasses.length}</span> class
                {sortedClasses.length === 1 ? '' : 'es'} ·{' '}
                <span className="font-semibold">{students.length}</span> student
                {students.length === 1 ? '' : 's'}
              </p>
              {sortedClasses.length === 0 ? (
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  Add at least one class and students before teachers can use the seating chart.
                </p>
              ) : null}
            </div>
            {sortedClasses.length === 0 ? (
              <Button asChild variant="outline" className="w-full rounded-xl">
                <Link href={`/${schoolId}/admin?tab=classes`}>Go to Classes</Link>
              </Button>
            ) : (
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Spotlight class
                </Label>
                <Select
                  value={draft.spotlightClassId || sortedClasses[0]?.id}
                  onValueChange={(v) => setDraft((d) => ({ ...d, spotlightClassId: v }))}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Choose a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedClasses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {studentsInSpotlight} student{studentsInSpotlight === 1 ? '' : 's'} in this class.
                  Teachers open the Classroom tab for their own roster.
                </p>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border p-4">
              <div>
                <p className="font-semibold text-sm">Instant tap</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  One tap on a desk awards default points with no menu.
                </p>
              </div>
              <Switch
                checked={draft.instantTap}
                onCheckedChange={(v) => setDraft((d) => ({ ...d, instantTap: v }))}
                aria-label="Instant tap awards"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="classroom-wizard-points" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Default points per tap
              </Label>
              <Input
                id="classroom-wizard-points"
                type="number"
                min={1}
                max={999}
                value={draft.defaultPoints}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    defaultPoints: Math.max(1, parseInt(e.target.value, 10) || 1),
                  }))
                }
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Seating chart style
              </Label>
              <p className="text-xs text-muted-foreground">
                Desk shapes and accents on the classroom chart. App light/dark mode is set in profile settings.
              </p>
              <div className="grid gap-2">
                {DESIGN_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, design: opt.id }))}
                    className={cn(
                      'w-full rounded-xl border p-3 text-left transition-colors',
                      draft.design === opt.id
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'border-border bg-muted/20 hover:bg-muted/40',
                    )}
                  >
                    <p className="font-semibold text-sm">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border p-4">
              <div>
                <p className="font-semibold text-sm">Parent portal</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Let families sign in with the parent email on file to view points and notes.
                </p>
              </div>
              <Switch
                checked={draft.enableParentView}
                onCheckedChange={(v) => setDraft((d) => ({ ...d, enableParentView: v }))}
                aria-label="Enable parent portal"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Saved as admin defaults in this browser. Each teacher can customize their own classroom
              prefs later.
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-secondary/20 p-4 space-y-2 text-sm">
              <p className="font-bold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-violet-500" aria-hidden />
                Setup complete
              </p>
              <ul className="space-y-1 text-muted-foreground">
                {finishSummary.map((line) => (
                  <li key={line}>• {line}</li>
                ))}
              </ul>
            </div>
            {sortedClasses.length > 0 ? (
              <Button asChild variant="outline" className="w-full rounded-xl">
                <Link href={classroomHref} target="_blank" rel="noopener noreferrer">
                  <LayoutGrid className="mr-2 h-4 w-4" />
                  Open classroom view
                </Link>
              </Button>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Teachers: Portal → Points → <strong>Classroom</strong> for daily quick awards.
            </p>
          </div>
        )}

        <DialogFooter className="flex flex-row justify-between gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || finishing || step === 3}
          >
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={finishing}>
              {step === 3 ? 'Close' : 'Cancel'}
            </Button>
            {step < 2 ? (
              <Button type="button" disabled={!canGoNext || finishing} onClick={() => setStep((s) => Math.min(2, s + 1))}>
                Next
              </Button>
            ) : step === 2 ? (
              <Button type="button" disabled={finishing} onClick={() => finish()}>
                {finishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Finish setup
              </Button>
            ) : (
              <Button type="button" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ClassroomWizardStepIndicator({ step }: { step: number }) {
  return (
    <div
      className="flex items-center justify-center gap-1 py-1 overflow-x-auto"
      aria-label={`Step ${step + 1} of ${STEP_LABELS.length}`}
    >
      {STEP_LABELS.map((label, i) => (
        <div key={label} className="flex flex-col items-center gap-1 shrink-0">
          <div
            className={cn(
              'h-2 rounded-full transition-all',
              i === step ? 'w-6 bg-primary' : i < step ? 'w-2 bg-primary/60' : 'w-2 bg-muted',
            )}
          />
          <span
            className={cn(
              'text-[8px] font-medium whitespace-nowrap',
              i === step ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Trigger button + dialog for admin Classroom tab setup. */
export function ClassroomSetupWizardTrigger({
  schoolId,
  classes,
  students,
  updateSettings,
  className,
}: Omit<Props, 'open' | 'onOpenChange'> & { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn('gap-2 rounded-xl shrink-0', className)}
        onClick={() => setOpen(true)}
      >
        <Sparkles className="h-4 w-4" aria-hidden />
        Classroom setup
      </Button>
      <ClassroomSetupWizard
        open={open}
        onOpenChange={setOpen}
        schoolId={schoolId}
        classes={classes}
        students={students}
        updateSettings={updateSettings}
      />
    </>
  );
}
