'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { ArrowRight, Loader2, RefreshCw, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HousesRealmShell } from '@/components/houses/HousesRealmShell';
import { swatchBackground } from '@/components/houses/HousesRealmThemePicker';
import { housesRealmHref } from '@/lib/housesRealmUrl';
import { useSettings, type Settings } from '@/components/providers/SettingsProvider';
import { useAppContext } from '@/components/AppProvider';
import { useSchoolProfile } from '@/hooks/useSchoolProfile';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { useToast } from '@/hooks/use-toast';
import { useAuthFetch } from '@/lib/authFetch';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import {
  assignStudentsToHousesBalanced,
  deleteHouse,
  listHouses,
  seedHousePresets,
  syncHousePointsFromStudents,
} from '@/lib/db';
import { housePointsSourceSettingsPatch } from '@/lib/houses/housePointsSettings';
import {
  housesRealmThemeVars,
  resolveHousesRealmTheme,
  type HousesRealmThemeId,
} from '@/lib/houses/housesRealmThemes';
import type { House, Student } from '@/lib/types';

type AiHouse = { name: string; value: string; color: string; emoji: string; motto: string };
type AiResult = {
  realmTheme: HousesRealmThemeId;
  themeReason: string;
  houseCount: number;
  houses: AiHouse[];
};

const MIN_HOUSES = 3;
const MAX_HOUSES = 8;

const PRESET_PROMPTS = [
  { label: 'Outer space', value: 'Outer space — planets, stars, and galaxies' },
  { label: 'Ocean & sea', value: 'The ocean and sea creatures' },
  { label: 'Sports teams', value: 'Sports teams and game-day rivalry' },
  { label: 'Four elements', value: 'The four elements: fire, water, earth, and air' },
  { label: 'Classic virtues', value: 'Classic character virtues like courage and kindness' },
  { label: 'Fantasy kingdom', value: 'A fantasy kingdom with dragons and castles' },
  { label: 'Nature & forest', value: 'Nature, forests, and woodland animals' },
  { label: 'Science & STEM', value: 'Science, discovery, and STEM' },
  { label: 'Mythical creatures', value: 'Mythical creatures and legends' },
];
const YESHIVA_PROMPT = { label: 'Torah values (middot)', value: 'Torah values and Jewish middot' };

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'house';
}

export default function HousesRealmSetupPage() {
  const params = useParams();
  const schoolId = String(params.schoolId || '');
  const router = useRouter();
  const firestore = useFirestore();
  const { settings, updateSettings } = useSettings();
  const { loginState } = useAppContext();
  const { isJewishOrthodox } = useSchoolProfile();
  const confirm = useConfirm();
  const { toast } = useToast();
  const authFetch = useAuthFetch();

  const [prompt, setPrompt] = useState('');
  const [count, setCount] = useState<number>(4);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<AiResult | null>(null);

  const housesQuery = useMemoFirebase(
    () => (firestore && schoolId ? collection(firestore, 'schools', schoolId, 'houses') : null),
    [firestore, schoolId],
  );
  const studentsQuery = useMemoFirebase(
    () => (firestore && schoolId ? collection(firestore, 'schools', schoolId, 'students') : null),
    [firestore, schoolId],
  );
  const { data: houses } = useCollection<House>(housesQuery);
  const { data: students } = useCollection<Student>(studentsQuery);
  const existingHouses = houses ?? [];

  const promptOptions = useMemo(
    () => (isJewishOrthodox ? [...PRESET_PROMPTS, YESHIVA_PROMPT] : PRESET_PROMPTS),
    [isJewishOrthodox],
  );

  const previewTheme = result ? resolveHousesRealmTheme(result.realmTheme) : null;

  useEffect(() => {
    document.documentElement.setAttribute('data-houses-realm', '');
    return () => document.documentElement.removeAttribute('data-houses-realm');
  }, []);

  // Live-preview the AI-picked theme on the realm background before the user applies it.
  useEffect(() => {
    if (!previewTheme) return;
    const el = document.documentElement;
    const vars = housesRealmThemeVars(previewTheme);
    for (const [key, value] of Object.entries(vars)) el.style.setProperty(key, value);
  }, [previewTheme]);

  // Theme + AI house creation persist school-wide, which only these roles flush to Firestore.
  const staffOk =
    loginState === 'admin' || loginState === 'developer' || loginState === 'teacher';

  async function generate(targetCount: number) {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    try {
      const res = await authFetch('/api/houses/ai-setup', {
        method: 'POST',
        body: JSON.stringify({
          schoolId,
          prompt: prompt.trim(),
          count: targetCount,
          includeJewishOrthodox: isJewishOrthodox,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Generation failed');
      }
      setResult(data as AiResult);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not generate houses',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }

  async function applyResult() {
    if (!result || !firestore || applying) return;

    if (existingHouses.length > 0) {
      const ok = await confirm({
        title: `Replace your ${existingHouses.length} current house${existingHouses.length === 1 ? '' : 's'}?`,
        description:
          'Your current houses will be deleted and their students unassigned, then replaced with the new set. This cannot be undone.',
        confirmLabel: 'Replace houses',
        destructive: true,
      });
      if (!ok) return;
    }

    const wasFresh = existingHouses.length === 0;
    setApplying(true);
    try {
      for (const house of existingHouses) {
        await deleteHouse(firestore, schoolId, house.id, students ?? []);
      }
      const seeds = result.houses.map((h, index) => ({
        name: h.name,
        value: h.value || undefined,
        color: h.color,
        emoji: h.emoji || undefined,
        motto: h.motto || undefined,
        presetKey: `ai:${slugify(h.name)}`,
        sortOrder: index,
      }));
      await seedHousePresets(firestore, schoolId, [], seeds);

      // Make the realm self-sufficient: enable houses + the chosen theme. Only seed
      // points/kiosk/Hall-of-Fame defaults on a fresh start so we never clobber an
      // existing school's configuration on a replace.
      const patch: Partial<Settings> = {
        enableHouses: true,
        housesRealmTheme: result.realmTheme,
      };
      if (wasFresh) {
        Object.assign(patch, housePointsSourceSettingsPatch('studentRollup'));
        patch.showHouseOnStudentKiosk = true;
        patch.houseHallOfFameSortBy = 'lifetimePoints';
        patch.houseHallOfFamePodiumSize = 3;
        patch.houseHallOfFameLimit = 50;
        patch.houseHallOfFameGridLayout = true;
        patch.houseHallOfFameGridColumns = 3;
        patch.houseHallOfFameAutoScroll = false;
        patch.houseHallOfFameLayout = 'landscape';
      }
      updateSettings(patch);

      // Best-effort: sort unassigned students into the new houses and refresh standings.
      let assigned = 0;
      try {
        const created = await listHouses(firestore, schoolId);
        const toAssign = (students ?? []).filter((s) => !s.houseId).map((s) => s.id);
        if (created.length > 0 && toAssign.length > 0) {
          await assignStudentsToHousesBalanced(firestore, schoolId, toAssign, created, students ?? []);
          assigned = toAssign.length;
        }
        const snap = await getDocs(collection(firestore, 'schools', schoolId, 'students'));
        const freshStudents = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Student);
        await syncHousePointsFromStudents(firestore, schoolId, created, freshStudents, 'both');
      } catch (assignErr) {
        console.warn('houses setup: post-create assignment/sync failed', assignErr);
      }

      toast({
        title: 'Your houses are ready',
        description: assigned
          ? `${seeds.length} houses created and ${assigned} students sorted, with the ${resolveHousesRealmTheme(result.realmTheme).label} theme.`
          : `${seeds.length} houses created with the ${resolveHousesRealmTheme(result.realmTheme).label} theme.`,
      });
      router.push(housesRealmHref(schoolId, 'manage'));
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not apply',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setApplying(false);
    }
  }

  if (!settings.enableHouses) {
    return (
      <HousesRealmShell schoolId={schoolId}>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="max-w-md text-white/70">Houses aren’t turned on for this school yet.</p>
          {staffOk ? (
            <Button
              type="button"
              size="lg"
              onClick={() => updateSettings({ enableHouses: true })}
              className="rounded-full border-0 px-7 font-bold shadow-lg shadow-black/30"
              style={{
                backgroundImage:
                  'linear-gradient(135deg, var(--hr-accent-from), var(--hr-accent-to))',
                color: 'var(--hr-on-accent)',
              }}
            >
              <Sparkles className="mr-2 h-5 w-5" aria-hidden />
              Enable Houses
            </Button>
          ) : (
            <p className="text-sm text-white/50">Ask an admin to turn Houses on.</p>
          )}
        </div>
      </HousesRealmShell>
    );
  }

  if (!staffOk) {
    return (
      <HousesRealmShell schoolId={schoolId}>
        <p className="p-8 text-center text-white/70">Staff sign-in is required to set up houses.</p>
      </HousesRealmShell>
    );
  }

  return (
    <HousesRealmShell schoolId={schoolId}>
      <div className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
        <div className="mb-8 text-center">
          <p
            className="mb-3 text-[10px] font-black uppercase tracking-[0.5em]"
            style={{ color: 'var(--hr-accent-text)' }}
          >
            Set up
          </p>
          <h1 className="houses-realm-display mb-3 text-3xl font-bold text-white sm:text-5xl">
            Choose a theme
          </h1>
          <p className="mx-auto max-w-xl text-sm text-white/60 sm:text-base">
            Type a word or pick a starting point. AI designs a matching realm look and a full set of
            houses — colors, emojis, values, and mottos — in one step.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md sm:p-6">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-white/70">Describe your theme</Label>
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') generate(count);
                }}
                placeholder="e.g. outer space, ocean, knights, our school colors…"
                className="border-white/15 bg-white/10 text-white placeholder:text-white/40"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-white/70">Quick pick</Label>
                <Select onValueChange={(v) => setPrompt(v)}>
                  <SelectTrigger className="w-full border-white/15 bg-white/10 text-white">
                    <SelectValue placeholder="Starting points…" />
                  </SelectTrigger>
                  <SelectContent>
                    {promptOptions.map((opt) => (
                      <SelectItem key={opt.label} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-white/70">Number of houses</Label>
                <Select
                  value={String(count)}
                  onValueChange={(v) => setCount(Number(v))}
                >
                  <SelectTrigger className="w-full border-white/15 bg-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: MAX_HOUSES - MIN_HOUSES + 1 }, (_, i) => MIN_HOUSES + i).map(
                      (n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} houses
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              size="lg"
              disabled={!prompt.trim() || loading}
              onClick={() => generate(count)}
              className="rounded-full border-0 px-7 font-bold shadow-lg shadow-black/30"
              style={{
                backgroundImage:
                  'linear-gradient(135deg, var(--hr-accent-from), var(--hr-accent-to))',
                color: 'var(--hr-on-accent)',
              }}
            >
              {loading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
              ) : (
                <Wand2 className="mr-2 h-5 w-5" aria-hidden />
              )}
              {loading ? 'Designing…' : 'Generate with AI'}
            </Button>
          </div>
        </div>

        {result && previewTheme ? (
          <div className="mt-8 space-y-5">
            <div
              className="overflow-hidden rounded-3xl border border-white/15 p-5"
              style={{ background: swatchBackground(previewTheme) }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-2xl text-xl shadow-md shadow-black/30"
                    style={{
                      backgroundImage: `linear-gradient(135deg, ${previewTheme.tokens.accentFrom}, ${previewTheme.tokens.accentTo})`,
                    }}
                    aria-hidden
                  >
                    {previewTheme.icon}
                  </span>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70">
                      Realm theme
                    </p>
                    <p className="font-serif text-xl font-bold text-white">{previewTheme.label}</p>
                  </div>
                </div>
                {result.themeReason ? (
                  <p className="max-w-xs text-right text-xs text-white/70">{result.themeReason}</p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 px-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-white/80">
                  {result.houseCount} {result.houseCount === 1 ? 'house' : 'houses'}
                </span>
                <span className="text-xs text-white/45">· change the count above and regenerate</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => generate(count)}
                className="rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
                )}
                Regenerate
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {result.houses.map((house) => (
                <div
                  key={house.name}
                  className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md"
                >
                  <div className="mb-2 flex items-center gap-3">
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-lg shadow-md shadow-black/30"
                      style={{ backgroundColor: house.color }}
                      aria-hidden
                    >
                      {house.emoji}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-white">{house.name}</p>
                      {house.value ? (
                        <p className="truncate text-xs text-white/55">{house.value}</p>
                      ) : null}
                    </div>
                  </div>
                  {house.motto ? (
                    <p className="mt-auto text-xs italic leading-snug text-white/60">“{house.motto}”</p>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-center">
              <Button
                type="button"
                size="lg"
                disabled={applying || loading}
                onClick={applyResult}
                className="rounded-full border-0 px-8 font-bold shadow-xl shadow-black/30"
                style={{
                  backgroundImage:
                    'linear-gradient(135deg, var(--hr-accent-from), var(--hr-accent-to))',
                  color: 'var(--hr-on-accent)',
                }}
              >
                {applying ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
                ) : (
                  <Sparkles className="mr-2 h-5 w-5" aria-hidden />
                )}
                {existingHouses.length > 0 ? 'Replace & apply' : 'Apply to my school'}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Button>
              {existingHouses.length > 0 ? (
                <p className="text-xs text-white/45">
                  Replaces your {existingHouses.length} current house
                  {existingHouses.length === 1 ? '' : 's'}.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

      </div>
    </HousesRealmShell>
  );
}
