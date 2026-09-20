'use client';

import { useState, useMemo } from 'react';
import { Sparkles, Wand2, Check, Loader2, ArrowRight, Layers } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthFetch } from '@/lib/authFetch';
import { useToast } from '@/hooks/use-toast';
import { useSchoolProfile } from '@/hooks/useSchoolProfile';
import { visibleHousePresetThemes, type HousePresetThemeId } from '@/lib/houses/housePresets';
import type { HousesRealmThemeId } from '@/lib/houses/housesRealmThemes';
import { Checkbox } from '@/components/ui/checkbox';
import { useHousesSound } from '@/hooks/useHousesSound';

export interface HouseSetupWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  onApplyPreset: (presetId: HousePresetThemeId, assignStudents: boolean) => Promise<void>;
  onApplyAiResult: (data: {
    realmTheme: HousesRealmThemeId;
    houses: { name: string; value: string; color: string; emoji: string; motto: string }[];
    assignStudents: boolean;
  }) => Promise<void>;
  unassignedCount?: number;
}

const PRESET_PROMPTS = [
  { label: 'Outer space', value: 'Outer space — planets, stars, and galaxies' },
  { label: 'Ocean & sea', value: 'The ocean and sea creatures' },
  { label: 'Sports teams', value: 'Sports teams and game-day rivalry' },
  { label: 'Four elements', value: 'The four elements: fire, water, earth, and air' },
  { label: 'Classic virtues', value: 'Classic character virtues like courage and kindness' },
  { label: 'Fantasy kingdom', value: 'A fantasy kingdom with dragons and castles' },
  { label: 'Science & STEM', value: 'Science, discovery, and STEM' },
];

export function HouseSetupWizardDialog({
  open,
  onOpenChange,
  schoolId,
  onApplyPreset,
  onApplyAiResult,
  unassignedCount = 0,
}: HouseSetupWizardDialogProps) {
  const { toast } = useToast();
  const authFetch = useAuthFetch();
  const { isJewishOrthodox } = useSchoolProfile();
  const { playUi } = useHousesSound();

  const [mode, setMode] = useState<'ai' | 'presets'>('ai');
  const [prompt, setPrompt] = useState('');
  const [houseCount, setHouseCount] = useState(4);
  const [assignStudents, setAssignStudents] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);

  const [selectedPresetId, setSelectedPresetId] = useState<HousePresetThemeId>('classic');

  const presetThemes = useMemo(
    () => visibleHousePresetThemes({ includeJewishOrthodox: isJewishOrthodox }),
    [isJewishOrthodox],
  );

  const handleGenerateAi = async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    try {
      const res = await authFetch('/api/houses/ai-setup', {
        method: 'POST',
        body: JSON.stringify({
          schoolId,
          prompt: prompt.trim(),
          count: houseCount,
          includeJewishOrthodox: isJewishOrthodox,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'AI generation failed');
      }

      setApplying(true);
      await onApplyAiResult({
        realmTheme: data.realmTheme,
        houses: data.houses,
        assignStudents,
      });
      playUi('redeem');
      toast({
        title: 'Houses generated successfully!',
        description: `Created ${data.houses?.length || houseCount} house teams.`,
      });
      onOpenChange(false);
    } catch (err) {
      playUi('error');
      toast({
        variant: 'destructive',
        title: 'Generation failed',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setGenerating(false);
      setApplying(false);
    }
  };

  const handleApplyPreset = async () => {
    if (applying) return;
    setApplying(true);
    try {
      await onApplyPreset(selectedPresetId, assignStudents);
      playUi('redeem');
      toast({
        title: 'Theme pack loaded',
        description: 'Starter houses added to your school.',
      });
      onOpenChange(false);
    } catch {
      playUi('error');
      toast({ variant: 'destructive', title: 'Could not load preset' });
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl border-white/20 bg-slate-950/95 text-white shadow-2xl backdrop-blur-xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-400">
            <Wand2 className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.25em]">
              House Setup Wizard
            </span>
          </div>
          <DialogTitle className="text-xl font-black text-white">
            Build Your School’s House Teams
          </DialogTitle>
          <DialogDescription className="text-xs text-white/60">
            Choose an instant starter pack or have AI generate custom house teams, colors, and mottos.
          </DialogDescription>
        </DialogHeader>

        {/* Mode Tabs */}
        <div className="flex rounded-xl bg-white/10 p-1 mt-1">
          <button
            type="button"
            onClick={() => {
              playUi('click');
              setMode('ai');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-colors ${
              mode === 'ai'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xs'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Generate with AI</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playUi('click');
              setMode('presets');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-colors ${
              mode === 'presets'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xs'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Starter Packs</span>
          </button>
        </div>

        {mode === 'ai' ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-white/80">Choose a Theme Topic</Label>
              <Input
                placeholder="e.g. Greek Gods, Ocean Creatures, Star Constellations"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="bg-white/5 border-white/15 text-white placeholder:text-white/30 h-10 rounded-xl"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {PRESET_PROMPTS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      playUi('click');
                      setPrompt(p.value);
                    }}
                    className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-white/80">Number of Houses</Label>
              <div className="flex gap-2">
                {[3, 4, 5, 6].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => {
                      playUi('click');
                      setHouseCount(cnt);
                    }}
                    className={`flex-1 h-9 rounded-xl font-black text-xs border transition-all ${
                      houseCount === cnt
                        ? 'border-violet-400 bg-violet-600 text-white'
                        : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {cnt} Houses
                  </button>
                ))}
              </div>
            </div>

            {unassignedCount > 0 ? (
              <label className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 p-3 cursor-pointer">
                <Checkbox
                  checked={assignStudents}
                  onCheckedChange={(checked) => setAssignStudents(Boolean(checked))}
                />
                <div className="text-xs">
                  <span className="font-bold text-white">Evenly sort unassigned students</span>
                  <p className="text-white/60 text-[11px]">
                    Assign {unassignedCount} student{unassignedCount === 1 ? '' : 's'} across the new houses automatically.
                  </p>
                </div>
              </label>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <Label className="text-xs font-bold text-white/80">Select a Starter Pack</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
              {presetThemes.map((pack) => {
                const isSelected = selectedPresetId === pack.id;
                return (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => {
                      playUi('click');
                      setSelectedPresetId(pack.id);
                    }}
                    className={`text-left rounded-xl p-3 border transition-all ${
                      isSelected
                        ? 'border-violet-400 bg-violet-600/20 ring-1 ring-violet-400/40'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm text-white">{pack.label}</span>
                      {isSelected ? <Check className="h-4 w-4 text-violet-400" /> : null}
                    </div>
                    <p className="text-[11px] text-white/60 mt-1 line-clamp-2">
                      {pack.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {unassignedCount > 0 ? (
              <label className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 p-3 cursor-pointer">
                <Checkbox
                  checked={assignStudents}
                  onCheckedChange={(checked) => setAssignStudents(Boolean(checked))}
                />
                <div className="text-xs">
                  <span className="font-bold text-white">Evenly sort unassigned students</span>
                  <p className="text-white/60 text-[11px]">
                    Assign {unassignedCount} student{unassignedCount === 1 ? '' : 's'} across the new houses automatically.
                  </p>
                </div>
              </label>
            ) : null}
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-white/70 hover:text-white hover:bg-white/10 rounded-xl"
          >
            Cancel
          </Button>

          {mode === 'ai' ? (
            <Button
              type="button"
              disabled={!prompt.trim() || generating || applying}
              onClick={() => void handleGenerateAi()}
              className="rounded-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg px-5"
            >
              {generating || applying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>{generating ? 'Designing Houses...' : 'Applying Theme...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  <span>Create with AI</span>
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              disabled={applying}
              onClick={() => void handleApplyPreset()}
              className="rounded-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg px-5"
            >
              {applying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Loading Pack...</span>
                </>
              ) : (
                <>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  <span>Apply Starter Pack</span>
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
