'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  ChevronRight,
  Home,
  Link2,
  Loader2,
  Sparkles,
  Trophy,
  Tv,
  Users,
  Wand2,
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
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import type { Settings } from '@/components/providers/SettingsProvider';
import type { House, Student } from '@/lib/types';
import { cn } from '@/lib/utils';
import { collection, getDocs } from 'firebase/firestore';
import {
  assignStudentsToHousesBalanced,
  assignStudentsToHousesRandom,
  listHouses,
  seedHouseThemePack,
  syncHousePointsFromStudents,
} from '@/lib/db';
import { HOUSE_PRESET_THEMES, type HousePresetThemeId } from '@/lib/housePresets';
import {
  applyHouseWizardSettings,
  buildHouseHallOfFameHref,
  type HouseAssignMode,
  type HousePointsSource,
  type HouseSetupWizardDraft,
} from '@/lib/housePointsSettings';
import { HouseBadge } from '@/components/houses/HouseBadge';

const STEP_LABELS = ['Start', 'Houses', 'Points', 'Roster', 'Display', 'Done'] as const;

function defaultDraft(existingHouseCount: number): HouseSetupWizardDraft {
  return {
    themeId: existingHouseCount > 0 ? 'skip' : 'quick',
    pointsSource: 'studentRollup',
    assignMode: 'balanced',
    syncTotalsFromStudents: true,
    showHouseOnKiosk: true,
    hallOfFameSortBy: 'lifetimePoints',
    hallOfFamePodiumSize: 3,
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  houses: House[];
  students: Student[];
  updateSettings: (patch: Partial<Settings>) => void;
  onComplete?: () => void;
};

export function HouseSetupWizard({
  open,
  onOpenChange,
  schoolId,
  houses,
  students,
  updateSettings,
  onComplete,
}: Props) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<HouseSetupWizardDraft>(() => defaultDraft(houses.length));
  const [finishing, setFinishing] = useState(false);
  const [finishSummary, setFinishSummary] = useState<string[]>([]);

  const unassignedCount = useMemo(
    () => students.filter((s) => !s.houseId).length,
    [students],
  );

  const selectedTheme = useMemo(
    () => HOUSE_PRESET_THEMES.find((t) => t.id === draft.themeId),
    [draft.themeId],
  );

  const reset = useCallback(() => {
    setStep(0);
    setDraft(defaultDraft(houses.length));
    setFinishSummary([]);
    setFinishing(false);
  }, [houses.length]);

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const canGoNext = useMemo(() => {
    if (step === 1 && draft.themeId !== 'skip' && !selectedTheme) return false;
    return true;
  }, [step, draft.themeId, selectedTheme]);

  const stepTitle = useMemo(() => {
    switch (step) {
      case 0:
        return 'Set up school houses';
      case 1:
        return 'Choose your house teams';
      case 2:
        return 'How should house points work?';
      case 3:
        return 'Assign students to houses';
      case 4:
        return 'Lobby display & kiosk';
      default:
        return 'Review & launch';
    }
  }, [step]);

  const finish = async () => {
    if (!firestore) return;
    setFinishing(true);
    const summary: string[] = [];
    try {
      applyHouseWizardSettings(draft, updateSettings);
      summary.push('Houses enabled and settings saved');

      let currentHouses = [...houses];
      if (draft.themeId !== 'skip') {
        const seed = await seedHouseThemePack(firestore, schoolId, currentHouses, draft.themeId);
        currentHouses = await listHouses(firestore, schoolId);
        summary.push(
          `${seed.created} house${seed.created === 1 ? '' : 's'} added${seed.skipped ? ` (${seed.skipped} skipped)` : ''}`,
        );
      } else if (currentHouses.length > 0) {
        summary.push(`Using ${currentHouses.length} existing house${currentHouses.length === 1 ? '' : 's'}`);
      }

      if (currentHouses.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No houses to use',
          description: 'Pick a starter theme or add houses manually, then run the wizard again.',
        });
        setFinishing(false);
        return;
      }

      const unassigned = students.filter((s) => !s.houseId);
      if (draft.assignMode !== 'skip' && unassigned.length > 0) {
        const ids = unassigned.map((s) => s.id);
        if (draft.assignMode === 'balanced') {
          await assignStudentsToHousesBalanced(firestore, schoolId, ids, currentHouses);
        } else {
          await assignStudentsToHousesRandom(firestore, schoolId, ids, currentHouses);
        }
        summary.push(`${unassigned.length} student${unassigned.length === 1 ? '' : 's'} assigned (${draft.assignMode})`);
      } else if (draft.assignMode === 'skip') {
        summary.push('Roster assignment skipped');
      }

      if (draft.pointsSource === 'studentRollup' && draft.syncTotalsFromStudents) {
        const studentsSnap = await getDocs(collection(firestore, 'schools', schoolId, 'students'));
        const latestStudents = studentsSnap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as Student,
        );
        await syncHousePointsFromStudents(firestore, schoolId, currentHouses, latestStudents, 'both');
        summary.push('House totals synced from student points');
      } else {
        summary.push('House points entered manually on the Houses tab');
      }

      setFinishSummary(summary);
      setStep(5);
      onComplete?.();
      toast({
        title: 'Houses are ready',
        description: summary.join(' · '),
      });
    } catch {
      toast({ variant: 'destructive', title: 'Setup could not finish', description: 'Try again or configure houses manually.' });
    } finally {
      setFinishing(false);
    }
  };

  const hofHref = buildHouseHallOfFameHref(schoolId, {
    houseHallOfFameSortBy: draft.hallOfFameSortBy,
    houseHallOfFamePodiumSize: draft.hallOfFamePodiumSize,
    houseHallOfFameLimit: 50,
    houseHallOfFameAutoScroll: false,
    houseHallOfFameGridLayout: true,
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
            <Home className="h-5 w-5 text-primary" aria-hidden />
            {stepTitle}
          </DialogTitle>
          <DialogDescription>
            Step {step + 1} of {STEP_LABELS.length}
            {step < 5 ? ' — your school saves settings when you finish.' : ''}
          </DialogDescription>
        </DialogHeader>

        <HouseWizardStepIndicator step={step} />

        {step === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              This wizard sets up named houses, how points are tracked, student rosters, and the House Hall of Fame TV
              board. You can change everything later on the Houses tab.
            </p>
            <ul className="text-sm space-y-2">
              {[
                { icon: Sparkles, text: 'Create house teams from a starter theme' },
                { icon: Link2, text: 'Link house standings to student rewards (recommended)' },
                { icon: Users, text: 'Assign students and optional point sync' },
                { icon: Tv, text: 'Configure the House Hall of Fame display' },
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
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Pick a starter pack or keep houses you already created. Duplicates are skipped automatically.
            </p>
            {houses.length > 0 ? (
              <button
                type="button"
                onClick={() => setDraft((d) => ({ ...d, themeId: 'skip' }))}
                className={cn(
                  'w-full rounded-xl border p-4 text-left transition-colors',
                  draft.themeId === 'skip'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border bg-muted/20 hover:bg-muted/40',
                )}
              >
                <p className="font-semibold text-sm">Keep existing houses ({houses.length})</p>
                <p className="text-xs text-muted-foreground mt-0.5">Skip seeding — use your current roster.</p>
              </button>
            ) : null}
            {HOUSE_PRESET_THEMES.map((theme) => {
              const selected = draft.themeId === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, themeId: theme.id }))}
                  className={cn(
                    'w-full rounded-xl border p-4 text-left transition-colors',
                    selected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border bg-muted/20 hover:bg-muted/40',
                  )}
                >
                  <p className="font-semibold text-sm">{theme.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{theme.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {theme.houses.slice(0, 6).map((h) => (
                      <span
                        key={h.presetKey ?? h.name}
                        className="inline-flex items-center gap-1 rounded-full border bg-background/80 px-2 py-0.5 text-[10px] font-bold"
                        style={{ borderColor: `${h.color}44` }}
                      >
                        <span>{h.emoji}</span> {h.name}
                      </span>
                    ))}
                    {theme.houses.length > 6 ? (
                      <span className="text-[10px] text-muted-foreground self-center">+{theme.houses.length - 6} more</span>
                    ) : null}
                  </div>
                  {selected ? <Check className="h-4 w-4 text-primary mt-2" aria-hidden /> : null}
                </button>
              );
            })}
          </div>
        )}

        {step === 2 && (
          <div className="rounded-xl border bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Link house totals to student rewards
                </Label>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {draft.pointsSource === 'studentRollup'
                    ? 'On (default): house scores follow student LevelUp points.'
                    : 'Off: house points are entered manually on the Houses tab.'}
                </p>
              </div>
              <Switch
                checked={draft.pointsSource === 'studentRollup'}
                onCheckedChange={(checked) =>
                  setDraft((d) => ({
                    ...d,
                    pointsSource: checked ? 'studentRollup' : 'manual',
                    syncTotalsFromStudents: checked ? d.syncTotalsFromStudents : false,
                  }))
                }
                aria-label="Link house totals to student rewards"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {unassignedCount > 0
                ? `${unassignedCount} student${unassignedCount === 1 ? '' : 's'} not in a house yet.`
                : 'All students already have a house — you can skip this step.'}
            </p>
            {(
              [
                { id: 'balanced' as const, label: 'Balanced', desc: 'Even out roster sizes across houses.' },
                { id: 'random' as const, label: 'Random', desc: 'Shuffle for a sorting-ceremony feel.' },
                { id: 'skip' as const, label: 'Skip for now', desc: 'Assign manually or use sorting ceremony later.' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={opt.id !== 'skip' && unassignedCount === 0}
                onClick={() => setDraft((d) => ({ ...d, assignMode: opt.id }))}
                className={cn(
                  'w-full rounded-xl border p-4 text-left transition-colors disabled:opacity-50',
                  draft.assignMode === opt.id
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border bg-muted/20 hover:bg-muted/40',
                )}
              >
                <p className="font-semibold text-sm">{opt.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
              </button>
            ))}
            {draft.pointsSource === 'studentRollup' ? (
              <label className="flex items-start gap-2 rounded-xl border bg-muted/20 p-3 cursor-pointer">
                <Checkbox
                  checked={draft.syncTotalsFromStudents}
                  onCheckedChange={(v) => setDraft((d) => ({ ...d, syncTotalsFromStudents: v === true }))}
                  className="mt-0.5"
                />
                <span className="text-sm">
                  <span className="font-semibold">Sync house totals from student balances</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    Recommended after assigning rosters.
                  </span>
                </span>
              </label>
            ) : null}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border p-4">
              <div>
                <p className="font-semibold text-sm">Show house on student kiosk</p>
                <p className="text-xs text-muted-foreground mt-0.5">House badge next to the student name after sign-in.</p>
              </div>
              <Switch
                checked={draft.showHouseOnKiosk}
                onCheckedChange={(v) => setDraft((d) => ({ ...d, showHouseOnKiosk: v }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                House Hall of Fame — sort by
              </Label>
              <Select
                value={draft.hallOfFameSortBy}
                onValueChange={(v) =>
                  setDraft((d) => ({ ...d, hallOfFameSortBy: v as 'lifetimePoints' | 'points' }))
                }
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lifetimePoints">Lifetime house points</SelectItem>
                  <SelectItem value="points">Current house points</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Podium size</Label>
              <Select
                value={String(draft.hallOfFamePodiumSize)}
                onValueChange={(v) => setDraft((d) => ({ ...d, hallOfFamePodiumSize: parseInt(v, 10) || 3 }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">Top 3 on podium</SelectItem>
                  <SelectItem value="2">Top 2 on podium</SelectItem>
                  <SelectItem value="1">Champion only</SelectItem>
                  <SelectItem value="0">List only (no podium)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {houses.length > 0 && draft.themeId === 'skip' ? (
              <div className="rounded-xl border bg-muted/20 p-3 flex flex-wrap gap-2">
                {houses.slice(0, 4).map((h) => (
                  <HouseBadge key={h.id} house={h} size="sm" />
                ))}
              </div>
            ) : selectedTheme ? (
              <div className="rounded-xl border bg-muted/20 p-3 flex flex-wrap gap-2">
                {selectedTheme.houses.slice(0, 4).map((h) => (
                  <span
                    key={h.presetKey ?? h.name}
                    className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-bold"
                    style={{ borderColor: `${h.color}55`, color: h.color }}
                  >
                    {h.emoji} {h.name}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-secondary/20 p-4 space-y-2 text-sm">
              <p className="font-bold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-rose-500" aria-hidden />
                Setup complete
              </p>
              <ul className="space-y-1 text-muted-foreground">
                {finishSummary.map((line) => (
                  <li key={line}>• {line}</li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="outline" className="rounded-xl flex-1">
                <Link href={hofHref} target="_blank" rel="noopener noreferrer">
                  <Tv className="mr-2 h-4 w-4" />
                  Open House Hall of Fame
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-xl flex-1">
                <Link href={`/${schoolId}/house-sorting?mode=reveal`} target="_blank" rel="noopener noreferrer">
                  <Wand2 className="mr-2 h-4 w-4" />
                  Sorting ceremony
                </Link>
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-row justify-between gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || finishing || step === 5}
          >
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={finishing}>
              {step === 5 ? 'Close' : 'Cancel'}
            </Button>
            {step < 4 ? (
              <Button type="button" disabled={!canGoNext || finishing} onClick={() => setStep((s) => Math.min(4, s + 1))}>
                Next
              </Button>
            ) : step === 4 ? (
              <Button type="button" disabled={finishing} onClick={() => void finish()}>
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

function HouseWizardStepIndicator({ step }: { step: number }) {
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
          <span className={cn('text-[8px] font-medium whitespace-nowrap', i === step ? 'text-foreground' : 'text-muted-foreground')}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
