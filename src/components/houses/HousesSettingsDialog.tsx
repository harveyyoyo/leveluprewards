'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette,
  Sliders,
  AlertTriangle,
  Layout,
  Sparkles,
  Trophy,
  Volume2,
  Shield,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HousesRealmThemePicker } from './HousesRealmThemePicker';
import {
  resolveHousesRealmTheme,
  type HousesRealmThemeId,
} from '@/lib/houses/housesRealmThemes';
import type { ClassroomCelebrationEffect } from '@/lib/classroomSeatingChart';
import {
  HOUSE_SORTING_CELEBRATION_OPTIONS,
  HOUSE_SORTING_CELEBRATION_LABELS,
  resolveHouseSortingCelebrationEffect,
} from '@/lib/houses/houseSortingCelebration';
import {
  HOUSE_STANDINGS_FORMAT_OPTIONS,
  normalizeHouseStandingsChartFormat,
  type HouseStandingsChartFormat,
} from '@/components/houses/HouseStandingsChartBlock';
import { useSettings } from '@/components/providers/SettingsProvider';
import {
  housePointsSourceSettingsPatch,
  isHouseStudentPointsRollupEnabled,
  resolveHousePointsSource,
} from '@/lib/houses/housePointsSettings';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import {
  clampHallOfFameGridColumns,
  clampHallOfFamePodiumSize,
} from '@/lib/hallOfFameUrlConfig';
import { cn } from '@/lib/utils';

type SettingsTab = 'theme' | 'rules' | 'display' | 'ceremony' | 'fame' | 'advanced';

const TABS: { id: SettingsTab; label: string; short: string; icon: typeof Palette }[] = [
  { id: 'theme', label: 'Theme', short: 'Theme', icon: Palette },
  { id: 'rules', label: 'Rules', short: 'Rules', icon: Sliders },
  { id: 'display', label: 'Display', short: 'Display', icon: Layout },
  { id: 'ceremony', label: 'Ceremony', short: 'Ceremony', icon: Sparkles },
  { id: 'fame', label: 'Hall of Fame', short: 'Fame', icon: Trophy },
  { id: 'advanced', label: 'Advanced', short: 'More', icon: Shield },
];

const sectionMotion = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 320, damping: 28, staggerChildren: 0.06 },
  },
};

const itemMotion = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 340, damping: 30 } },
};

function SettingCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={itemMotion}
      className={cn('rounded-2xl border hr-border hr-soft p-4 space-y-3', className)}
    >
      {children}
    </motion.div>
  );
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4', disabled && 'opacity-60')}>
      <div className="space-y-1 min-w-0">
        <Label
          htmlFor={id}
          className={cn('text-sm font-bold hr-fg', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}
        >
          {label}
        </Label>
        <p className="text-xs hr-muted leading-relaxed">{description}</p>
      </div>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export interface HousesSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResetHouses?: () => Promise<void>;
  hasHouses?: boolean;
}

export function HousesSettingsDialog({
  open,
  onOpenChange,
  onResetHouses,
  hasHouses = false,
}: HousesSettingsDialogProps) {
  const { settings, updateSettings } = useSettings();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<SettingsTab>('theme');

  const currentThemeId = resolveHousesRealmTheme(settings.housesRealmTheme).id;
  const rollupEnabled = resolveHousePointsSource(settings) === 'studentRollup';
  const rollupActive = isHouseStudentPointsRollupEnabled(settings);
  const celebrationEffect = resolveHouseSortingCelebrationEffect(
    settings.houseSortingCelebrationEffect,
  );
  const chartFormat = normalizeHouseStandingsChartFormat(settings.houseStandingsChartFormat);
  const teamsViewMode = settings.housesTeamsViewMode === 'cards' ? 'cards' : 'chart';
  const openingTab = settings.housesDefaultOpeningTab || 'teams';
  const hofSortByRaw =
    settings.houseHallOfFameSortBy ?? settings.hallOfFameSortBy ?? 'lifetimePoints';
  const hofSortBy =
    !rollupActive && String(hofSortByRaw).startsWith('period_')
      ? 'lifetimePoints'
      : hofSortByRaw;
  const hofLimit = settings.houseHallOfFameLimit ?? settings.hallOfFameLimit ?? 50;
  const hofPodium = clampHallOfFamePodiumSize(
    settings.houseHallOfFamePodiumSize ?? settings.hallOfFamePodiumSize,
  );
  const hofColumns = clampHallOfFameGridColumns(
    settings.houseHallOfFameGridColumns ?? settings.hallOfFameGridColumns,
  );
  const hofLayout =
    settings.houseHallOfFameLayout ?? settings.hallOfFameLayout ?? 'landscape';
  const hofAutoScroll =
    settings.houseHallOfFameAutoScroll ?? settings.hallOfFameAutoScroll ?? false;
  const hofGrid =
    settings.houseHallOfFameGridLayout ?? settings.hallOfFameGridLayout ?? true;
  const housesSoundsOn = settings.housesSoundsEnabled !== false;
  const housesUiSoundsOn = settings.housesUiSoundsEnabled !== false;
  const housesCeremonySoundsOn = settings.housesCeremonySoundsEnabled !== false;

  const handleThemeChange = (newThemeId: HousesRealmThemeId) => {
    updateSettings({ housesRealmTheme: newThemeId });
  };

  const handleRollupToggle = (checked: boolean) => {
    updateSettings(housePointsSourceSettingsPatch(checked ? 'studentRollup' : 'manual'));
  };

  const handleResetClick = async () => {
    if (!onResetHouses) return;
    const ok = await confirm({
      title: 'Reset All Houses?',
      description:
        'This will remove all house teams and unassign all students. House scores and standing history will be cleared. This cannot be undone.',
      confirmLabel: 'Yes, Reset Houses',
      destructive: true,
    });
    if (ok) {
      await onResetHouses();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl hr-border hr-panel shadow-2xl backdrop-blur-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-black hr-fg flex items-center gap-2">
            Houses Settings
          </DialogTitle>
          <DialogDescription className="text-xs hr-muted">
            Theme, scoring rules, display, sounds, ceremony effects, and Hall of Fame — saved for the whole school.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-1 rounded-xl hr-soft-strong p-1 mt-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex flex-1 min-w-[4.5rem] items-center justify-center gap-1.5 py-2 px-2 text-[11px] sm:text-xs font-bold rounded-lg transition-colors',
                  active ? 'hr-soft-strong hr-fg shadow-xs' : 'hr-muted hover:hr-fg',
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.short}</span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'theme' ? (
            <motion.div
              key="theme"
              variants={sectionMotion}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -6 }}
              className="py-2"
            >
              <SettingCard>
                <div className="space-y-1 mb-2">
                  <p className="text-sm font-bold hr-fg">Realm atmosphere</p>
                  <p className="text-xs hr-muted leading-relaxed">
                    Pick a backdrop for the Houses screen. Includes dark nights and bright day looks
                    (Daylight, Parchment, Lagoon, Blossom).
                  </p>
                </div>
                <HousesRealmThemePicker value={currentThemeId} onSelect={handleThemeChange} />
              </SettingCard>
            </motion.div>
          ) : null}

          {activeTab === 'rules' ? (
            <motion.div
              key="rules"
              variants={sectionMotion}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -6 }}
              className="space-y-4 py-2"
            >
              <SettingCard>
                <ToggleRow
                  id="houses-enable"
                  label="Enable Houses"
                  description="Turn the whole house system on or off for this school. When off, house tabs and kiosk house badges stay hidden."
                  checked={settings.enableHouses === true}
                  onCheckedChange={(v) => updateSettings({ enableHouses: v })}
                />
              </SettingCard>

              <SettingCard>
                <ToggleRow
                  id="house-rollup-toggle"
                  label="Link house points to student wallets"
                  description="When on, points students earn in class add to their house total. Turn off for independent spirit points (sports days, rallies, challenges)."
                  checked={rollupEnabled}
                  onCheckedChange={handleRollupToggle}
                />
              </SettingCard>

              <SettingCard>
                <ToggleRow
                  id="house-kiosk-badge"
                  label="Show house on student kiosk"
                  description="After sign-in, show the student’s house name and color next to their name on the kiosk."
                  checked={settings.showHouseOnStudentKiosk !== false}
                  onCheckedChange={(v) => updateSettings({ showHouseOnStudentKiosk: v })}
                />
              </SettingCard>
            </motion.div>
          ) : null}

          {activeTab === 'display' ? (
            <motion.div
              key="display"
              variants={sectionMotion}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -6 }}
              className="space-y-4 py-2"
            >
              <SettingCard>
                <div className="space-y-1">
                  <Label htmlFor="houses-opening-tab" className="text-sm font-bold hr-fg">
                    Default opening view
                  </Label>
                  <p className="text-xs hr-muted leading-relaxed">
                    Which Houses tool opens when you visit without a link that already picks a tab.
                  </p>
                </div>
                <Select
                  value={openingTab}
                  onValueChange={(v) =>
                    updateSettings({
                      housesDefaultOpeningTab: v as
                        | 'teams'
                        | 'rosters'
                        | 'ceremony'
                        | 'hall-of-fame',
                    })
                  }
                >
                  <SelectTrigger id="houses-opening-tab" className="hr-soft hr-border hr-fg h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="hr-panel hr-border hr-fg">
                    <SelectItem value="teams">Teams board</SelectItem>
                    <SelectItem value="rosters">Rosters &amp; manage</SelectItem>
                    <SelectItem value="ceremony">Sorting ceremony</SelectItem>
                    <SelectItem value="hall-of-fame">Hall of Fame setup</SelectItem>
                  </SelectContent>
                </Select>
              </SettingCard>

              <SettingCard>
                <div className="space-y-1">
                  <Label htmlFor="houses-teams-view" className="text-sm font-bold hr-fg">
                    Teams board default layout
                  </Label>
                  <p className="text-xs hr-muted leading-relaxed">
                    Start on house cards or the standings chart when you open the Teams board.
                  </p>
                </div>
                <Select
                  value={teamsViewMode}
                  onValueChange={(v) =>
                    updateSettings({ housesTeamsViewMode: v as 'cards' | 'chart' })
                  }
                >
                  <SelectTrigger id="houses-teams-view" className="hr-soft hr-border hr-fg h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="hr-panel hr-border hr-fg">
                    <SelectItem value="cards">House cards</SelectItem>
                    <SelectItem value="chart">Standings chart</SelectItem>
                  </SelectContent>
                </Select>
              </SettingCard>

              <SettingCard>
                <div className="space-y-1">
                  <Label htmlFor="house-chart-format" className="text-sm font-bold hr-fg">
                    Standings chart format
                  </Label>
                  <p className="text-xs hr-muted leading-relaxed">
                    Default chart style for the Teams standings view and admin preview.
                  </p>
                </div>
                <Select
                  value={chartFormat}
                  onValueChange={(v) =>
                    updateSettings({ houseStandingsChartFormat: v as HouseStandingsChartFormat })
                  }
                >
                  <SelectTrigger id="house-chart-format" className="hr-soft hr-border hr-fg h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="hr-panel hr-border hr-fg">
                    {HOUSE_STANDINGS_FORMAT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingCard>

              <SettingCard>
                <ToggleRow
                  id="houses-show-motto"
                  label="Show house mottos"
                  description="Display each house’s motto on team cards and during the sorting ceremony reveal."
                  checked={settings.housesShowMotto !== false}
                  onCheckedChange={(v) => updateSettings({ housesShowMotto: v })}
                />
              </SettingCard>

              <SettingCard>
                <ToggleRow
                  id="houses-show-value"
                  label="Show house values"
                  description="Show the trait or value chip (Courage, Wisdom, etc.) on each house card."
                  checked={settings.housesShowValue !== false}
                  onCheckedChange={(v) => updateSettings({ housesShowValue: v })}
                />
              </SettingCard>

              <SettingCard>
                <div className="flex items-center gap-2 mb-1">
                  <Volume2 className="h-4 w-4 hr-fg shrink-0" />
                  <p className="text-sm font-bold hr-fg">Houses sounds</p>
                </div>
                <p className="text-xs hr-muted leading-relaxed mb-3">
                  Separate from the school-wide sound switch. Ceremony fanfare can still play at
                  assemblies even when other app sounds are muted.
                </p>
                <div className="space-y-4">
                  <ToggleRow
                    id="houses-sounds-master"
                    label="All Houses sounds"
                    description="Master switch for Houses clicks, awards, and sorting ceremony audio."
                    checked={housesSoundsOn}
                    onCheckedChange={(v) => updateSettings({ housesSoundsEnabled: v })}
                  />
                  <ToggleRow
                    id="houses-ui-sounds"
                    label="Clicks & award chimes"
                    description="Tab switches, standings chart, quick awards, and setup wizard feedback."
                    checked={housesUiSoundsOn}
                    disabled={!housesSoundsOn}
                    onCheckedChange={(v) => updateSettings({ housesUiSoundsEnabled: v })}
                  />
                </div>
              </SettingCard>
            </motion.div>
          ) : null}

          {activeTab === 'ceremony' ? (
            <motion.div
              key="ceremony"
              variants={sectionMotion}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -6 }}
              className="space-y-4 py-2"
            >
              <SettingCard>
                <ToggleRow
                  id="ceremony-sounds"
                  label="Ceremony fanfare & reveals"
                  description="Play step chimes and house-reveal fanfare during the Sorting Ceremony. On by default."
                  checked={housesCeremonySoundsOn}
                  disabled={!housesSoundsOn}
                  onCheckedChange={(v) => updateSettings({ housesCeremonySoundsEnabled: v })}
                />
                {!housesSoundsOn ? (
                  <p className="text-[11px] hr-muted">
                    Turn on “All Houses sounds” under Display to enable ceremony audio.
                  </p>
                ) : null}
              </SettingCard>

              <SettingCard>
                <div className="space-y-1">
                  <Label htmlFor="ceremony-effect" className="text-sm font-bold hr-fg">
                    Reveal celebration effect
                  </Label>
                  <p className="text-xs hr-muted leading-relaxed">
                    Visual effect when a student is sorted into their house (same styles as classroom point celebrations).
                  </p>
                </div>
                <Select
                  value={celebrationEffect}
                  onValueChange={(effect) =>
                    updateSettings({
                      houseSortingCelebrationEffect: effect as ClassroomCelebrationEffect,
                    })
                  }
                >
                  <SelectTrigger id="ceremony-effect" className="hr-soft hr-border hr-fg h-10 rounded-xl">
                    <SelectValue placeholder="Select effect" />
                  </SelectTrigger>
                  <SelectContent className="hr-panel hr-border hr-fg">
                    {HOUSE_SORTING_CELEBRATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt} className="text-xs font-medium">
                        {HOUSE_SORTING_CELEBRATION_LABELS[opt]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingCard>

              <SettingCard>
                <ToggleRow
                  id="ceremony-fake-q"
                  label="Fun decoy questions"
                  description="Before each reveal, ask a playful question on the big screen. Assign houses on Rosters first."
                  checked={settings.houseSortingUseFakeQuestions === true}
                  onCheckedChange={(v) => updateSettings({ houseSortingUseFakeQuestions: v })}
                />
              </SettingCard>

              <SettingCard>
                <ToggleRow
                  id="ceremony-flyup"
                  label="House name fly-up"
                  description="Kiosk-style fly-up with the house name when a student is revealed (like classroom +PTS)."
                  checked={settings.houseSortingShowFlyUp !== false}
                  onCheckedChange={(v) => updateSettings({ houseSortingShowFlyUp: v })}
                />
              </SettingCard>
            </motion.div>
          ) : null}

          {activeTab === 'fame' ? (
            <motion.div
              key="fame"
              variants={sectionMotion}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -6 }}
              className="space-y-4 py-2"
            >
              <SettingCard>
                <div className="space-y-1">
                  <Label htmlFor="hof-sort" className="text-sm font-bold hr-fg">
                    Leaderboard sort
                  </Label>
                  <p className="text-xs hr-muted leading-relaxed">
                    How the house Hall of Fame monitor ranks teams.
                  </p>
                </div>
                <Select
                  value={hofSortBy}
                  onValueChange={(v) => updateSettings({ houseHallOfFameSortBy: v })}
                >
                  <SelectTrigger id="hof-sort" className="hr-soft hr-border hr-fg h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="hr-panel hr-border hr-fg">
                    <SelectItem value="lifetimePoints">Lifetime house points</SelectItem>
                    <SelectItem value="points">Current house points</SelectItem>
                    {rollupActive ? (
                      <>
                        <SelectItem value="period_day">Points earned today</SelectItem>
                        <SelectItem value="period_week">Points earned this week</SelectItem>
                        <SelectItem value="period_month">Points earned this month</SelectItem>
                      </>
                    ) : null}
                  </SelectContent>
                </Select>
              </SettingCard>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SettingCard>
                  <div className="space-y-1">
                    <Label htmlFor="hof-limit" className="text-sm font-bold hr-fg">
                      Show top
                    </Label>
                    <p className="text-xs hr-muted">How many houses appear on the list.</p>
                  </div>
                  <Input
                    id="hof-limit"
                    type="number"
                    min={1}
                    value={hofLimit}
                    onChange={(e) => {
                      const next = Math.max(1, parseInt(e.target.value, 10) || 1);
                      updateSettings({ houseHallOfFameLimit: next });
                    }}
                    className="hr-soft hr-border hr-fg h-10 rounded-xl text-center font-bold"
                  />
                </SettingCard>

                <SettingCard>
                  <div className="space-y-1">
                    <Label htmlFor="hof-podium" className="text-sm font-bold hr-fg">
                      Podium size
                    </Label>
                    <p className="text-xs hr-muted">Champions highlighted at the top.</p>
                  </div>
                  <Select
                    value={String(hofPodium)}
                    onValueChange={(v) =>
                      updateSettings({
                        houseHallOfFamePodiumSize: clampHallOfFamePodiumSize(parseInt(v, 10)),
                      })
                    }
                  >
                    <SelectTrigger id="hof-podium" className="hr-soft hr-border hr-fg h-10 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="hr-panel hr-border hr-fg">
                      <SelectItem value="1">Champion only (1)</SelectItem>
                      <SelectItem value="3">Top 3 on podium</SelectItem>
                      <SelectItem value="5">Top 5 on podium</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingCard>
              </div>

              <SettingCard>
                <div className="space-y-1">
                  <Label htmlFor="hof-layout" className="text-sm font-bold hr-fg">
                    Screen layout
                  </Label>
                  <p className="text-xs hr-muted leading-relaxed">
                    Landscape for TVs; portrait for tall hallway screens.
                  </p>
                </div>
                <Select
                  value={hofLayout}
                  onValueChange={(v: 'landscape' | 'portrait') =>
                    updateSettings({ houseHallOfFameLayout: v })
                  }
                >
                  <SelectTrigger id="hof-layout" className="hr-soft hr-border hr-fg h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="hr-panel hr-border hr-fg">
                    <SelectItem value="landscape">Landscape</SelectItem>
                    <SelectItem value="portrait">Portrait</SelectItem>
                  </SelectContent>
                </Select>
              </SettingCard>

              <SettingCard>
                <ToggleRow
                  id="hof-autoscroll"
                  label="Auto-scroll"
                  description="Holds at the top briefly, then scrolls the list. Press Esc on the display to stop."
                  checked={hofAutoScroll}
                  onCheckedChange={(v) => updateSettings({ houseHallOfFameAutoScroll: v })}
                />
              </SettingCard>

              <SettingCard>
                <ToggleRow
                  id="hof-grid"
                  label="Multi-column grid"
                  description="Arrange the leaderboard in columns instead of a single list."
                  checked={hofGrid}
                  onCheckedChange={(v) => updateSettings({ houseHallOfFameGridLayout: v })}
                />
                {hofGrid ? (
                  <div className="space-y-1 pt-1 border-t hr-border">
                    <Label htmlFor="hof-cols" className="text-xs font-bold hr-fg">
                      Grid columns
                    </Label>
                    <Select
                      value={String(hofColumns)}
                      onValueChange={(v) =>
                        updateSettings({
                          houseHallOfFameGridColumns: clampHallOfFameGridColumns(parseInt(v, 10)),
                        })
                      }
                    >
                      <SelectTrigger id="hof-cols" className="hr-soft hr-border hr-fg h-10 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="hr-panel hr-border hr-fg">
                        <SelectItem value="1">1 column</SelectItem>
                        <SelectItem value="2">2 columns</SelectItem>
                        <SelectItem value="3">3 columns</SelectItem>
                        <SelectItem value="4">4 columns</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </SettingCard>
            </motion.div>
          ) : null}

          {activeTab === 'advanced' ? (
            <motion.div
              key="advanced"
              variants={sectionMotion}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -6 }}
              className="space-y-4 py-2"
            >
              <SettingCard>
                <p className="text-sm font-bold hr-fg">About these settings</p>
                <p className="text-xs hr-muted leading-relaxed">
                  Changes save for the whole school right away. Theme and display options update the
                  Houses screen; Hall of Fame options apply the next time you open the monitor link.
                </p>
              </SettingCard>

              {hasHouses && onResetHouses ? (
                <motion.div
                  variants={itemMotion}
                  className="rounded-2xl border border-rose-500/40 bg-rose-500/15 p-4 space-y-2"
                >
                  <div className="flex items-center gap-2 text-rose-200 font-bold text-xs uppercase tracking-wider">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Danger zone</span>
                  </div>
                  <p className="text-xs hr-muted leading-relaxed">
                    Permanently delete all house teams and unassign students from their houses.
                  </p>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => void handleResetClick()}
                    className="rounded-xl font-bold mt-1 text-xs"
                  >
                    Reset all houses
                  </Button>
                </motion.div>
              ) : (
                <SettingCard>
                  <p className="text-sm font-bold hr-fg">No houses to reset</p>
                  <p className="text-xs hr-muted leading-relaxed">
                    Once you create house teams, a reset option will appear here.
                  </p>
                </SettingCard>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl font-bold hr-soft-strong hr-fg px-5"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
