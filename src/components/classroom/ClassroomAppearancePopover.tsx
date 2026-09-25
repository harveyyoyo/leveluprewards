'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ExternalLink, Palette, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  CLASSROOM_APPEARANCE_THEMES,
  classroomAppearanceThemeById,
} from '@/lib/classroom/classroomAppearanceThemes';
import type { ClassroomDesign, ClassroomSeatingPrefs } from '@/lib/classroomSeatingChart';
import { ClassroomThemeChooserModal } from './ClassroomThemeChooserModal';
import { cn } from '@/lib/utils';

const spring = { type: 'spring' as const, stiffness: 280, damping: 26 };

const THEME_SLUG_TO_DESIGN: Record<string, ClassroomDesign> = {
  'gamify': 'playful',
  'comic-pop': 'playful',
  'clay-3d': 'playful',
  'candy-clay': 'playful',
  'retro-arcade': 'playful',
  'board-game': 'playful',
  'candy-shop': 'playful',
  'carnival-ticket': 'playful',
  'neon-arcade': 'midnight',
  'cyber-grid': 'midnight',
  'aurora-glow': 'aurora',
  'gradient-wave': 'aurora',
  'synthwave': 'midnight',
  'corporate-clean': 'minimal',
  'neo-grotesque': 'minimal',
  'bold-editorial': 'brutalist',
  'notebook': 'minimal',
  'neo-brutalism': 'brutalist',
  'tactile-stationery': 'minimal',
  'scholastic-gallery': 'minimal',
  'warm-academic-serif': 'minimal',
  'precision-blueprint': 'midnight',
  'riso-print-room': 'playful',
  'paper-craft-bulletin': 'playful',
  'retro-chunky-extruded': 'playful',
  'tactile-offset-grid': 'playful',
  'tactile-offset-variant': 'playful',
  'isometric-block-system': 'playful',
};

function ThemeSwatch({
  selected,
  swatches,
  title,
  hint,
  tokenPreview,
  onSelect,
}: {
  selected: boolean;
  swatches: [string, string, string, string];
  title: string;
  hint: string;
  tokenPreview?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex flex-col items-start gap-1.5 rounded-xl border p-2 text-left transition-colors hover:bg-muted/60',
        selected ? 'border-primary bg-primary/10 ring-1 ring-primary/35' : 'border-border/60',
      )}
      aria-pressed={selected}
      aria-label={`${title}. ${hint}`}
    >
      {tokenPreview ? (
        <span
          className="relative grid h-10 w-full grid-cols-4 items-end gap-0.5 overflow-hidden rounded-lg border border-[#d6d0c6] px-1 pb-1"
          style={{
            backgroundColor: '#f4f0e8',
            backgroundImage: 'radial-gradient(circle, #c8c2b6 1px, transparent 1.1px)',
            backgroundSize: '7px 7px',
          }}
        >
          {swatches.slice(0, 3).map((color) => (
            <span
              key={color}
              className="h-6 rounded-[4px] border-2 bg-white"
              style={{ borderColor: color, boxShadow: `2px 2px 0 0 ${color}` }}
            />
          ))}
          <span className="h-4 rounded-sm" style={{ backgroundColor: swatches[3] }} />
        </span>
      ) : (
        <span className="grid h-10 w-full grid-cols-2 grid-rows-2 overflow-hidden rounded-lg border border-black/10 shadow-sm">
          {swatches.map((color) => (
            <span key={color} style={{ backgroundColor: color }} />
          ))}
        </span>
      )}
      <span className="text-[11px] font-bold leading-tight text-foreground">{title}</span>
      <span className="text-[10px] leading-tight text-muted-foreground">{hint}</span>
    </button>
  );
}

export function ClassroomAppearancePopover({
  prefs,
  rewardsPillarOn = false,
  onChange,
  triggerClassName,
  iconOnly = false,
}: {
  prefs: ClassroomSeatingPrefs;
  rewardsPillarOn?: boolean;
  onChange: (patch: Partial<ClassroomSeatingPrefs>) => void;
  triggerClassName?: string;
  iconOnly?: boolean;
}) {
  const params = useParams();
  const schoolId = typeof params?.schoolId === 'string' ? params.schoolId : '';
  const [themeChooserOpen, setThemeChooserOpen] = useState(false);
  const active = classroomAppearanceThemeById(prefs.design);
  const themesHref = schoolId ? `/${encodeURIComponent(schoolId.toLowerCase())}/classroom/themes` : '#';

  return (
    <>
      <Popover modal>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={triggerClassName}
            aria-label="Appearance"
            title="How desks and the room look"
          >
            <Palette className="h-4 w-4 shrink-0" aria-hidden />
            {iconOnly ? null : <span className="hidden sm:inline">Appearance</span>}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          collisionPadding={12}
          className="z-[500] w-[22rem] rounded-2xl p-0"
        >
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={spring}
            className="max-h-[min(70vh,32rem)] space-y-4 overflow-y-auto p-3"
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Look</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Now: {active?.title ?? 'Vibrant / Playful'}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {CLASSROOM_APPEARANCE_THEMES.map((theme) => (
                  <ThemeSwatch
                    key={theme.id}
                    selected={prefs.design === theme.id}
                    swatches={theme.swatches}
                    title={theme.title}
                    hint={theme.hint}
                    tokenPreview={theme.id === 'aurora'}
                    onSelect={() => onChange({ design: theme.id })}
                  />
                ))}
              </div>

              {schoolId ? (
                <div className="mt-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-2.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      Classroom Theme Studio
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                      15 Looks
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
                    Preview 15 interactive seating chart styles with custom fonts, colors, and dark mode.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setThemeChooserOpen(true)}
                    className="mt-2.5 w-full h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-1.5 shadow-sm"
                  >
                    <Palette className="h-3.5 w-3.5" />
                    <span>Choose Theme (Live Preview)</span>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="mt-1.5 w-full h-7 rounded-lg border-emerald-500/30 bg-background text-[11px] font-semibold hover:bg-emerald-500/10 gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <Link href={themesHref} target="_blank" rel="noopener noreferrer">
                      <span>Open Full Studio in New Tab</span>
                      <ExternalLink className="h-3 w-3 opacity-70" />
                    </Link>
                  </Button>
                </div>
              ) : null}
            </div>

          <div className="space-y-2 border-t border-border/40 pt-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Desk cards</p>
            <label className="flex cursor-pointer items-start gap-2">
              <Checkbox
                className="mt-0.5"
                checked={prefs.showPointBalances}
                onCheckedChange={(v) => onChange({ showPointBalances: v === true })}
              />
              <span className="text-xs leading-snug">
                <span className="font-semibold">
                  {rewardsPillarOn ? 'Point balances' : 'Classroom balances'}
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2">
              <Checkbox
                className="mt-0.5"
                checked={prefs.showSessionTotals}
                onCheckedChange={(v) => onChange({ showSessionTotals: v === true })}
              />
              <span className="text-xs leading-snug">
                <span className="font-semibold">Session badges</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2">
              <Checkbox
                className="mt-0.5"
                checked={prefs.showSessionLastAward ?? true}
                disabled={!prefs.showSessionTotals}
                onCheckedChange={(v) => onChange({ showSessionLastAward: v === true })}
              />
              <span className="text-xs leading-snug">
                <span className="font-semibold">Last award label</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2">
              <Checkbox
                className="mt-0.5"
                checked={prefs.showStudentPhotos !== false}
                onCheckedChange={(v) => onChange({ showStudentPhotos: v === true })}
              />
              <span className="text-xs leading-snug">
                <span className="font-semibold">Student photos</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2">
              <Checkbox
                className="mt-0.5"
                checked={prefs.showLastName}
                onCheckedChange={(v) => onChange({ showLastName: v === true })}
              />
              <span className="text-xs leading-snug">
                <span className="font-semibold">Last names</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2">
              <Checkbox
                className="mt-0.5"
                checked={prefs.showStudentEmoji}
                onCheckedChange={(v) => onChange({ showStudentEmoji: v === true })}
              />
              <span className="text-xs leading-snug">
                <span className="font-semibold">Student emoji</span>
              </span>
            </label>
          </div>

          <div className="space-y-1.5 border-t border-border/40 pt-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Teacher desk</p>
            <div className="space-y-1">
              <label htmlFor="teacher-desk-label-input" className="text-[11px] font-medium text-muted-foreground">
                Custom desk title (leave blank for teacher name)
              </label>
              <input
                id="teacher-desk-label-input"
                type="text"
                value={prefs.teacherDeskLabel ?? ''}
                placeholder="Auto (teacher's name)"
                className="h-8 w-full rounded-xl border border-input bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                onChange={(e) => onChange({ teacherDeskLabel: e.target.value })}
              />
            </div>
          </div>
        </motion.div>
      </PopoverContent>
    </Popover>

      <ClassroomThemeChooserModal
        open={themeChooserOpen}
        onOpenChange={setThemeChooserOpen}
        currentThemeSlug={prefs.themeKitSlug}
        onApplyTheme={(slug, settings) => {
          const mappedDesign: ClassroomDesign = settings.darkMode
            ? 'midnight'
            : (THEME_SLUG_TO_DESIGN[slug] ?? 'playful');

          onChange({
            design: mappedDesign,
            themeKitSlug: slug,
            themeKitSettings: settings,
          });
        }}
      />
    </>
  );
}
