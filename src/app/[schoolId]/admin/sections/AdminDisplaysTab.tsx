'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  Copy,
  Crown,
  ExternalLink,
  Eye,
  Layers,
  LayoutGrid,
  Megaphone,
  Monitor,
  MonitorPlay,
  Palette,
  Play,
  Plus,
  QrCode,
  RotateCcw,
  Sliders,
  Smartphone,
  Sparkles,
  Trash2,
  Trophy,
  Tv,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  StaffPortalSectionCard,
  StaffPortalSectionCardContent,
} from '@/components/staff/StaffPortalSection';
import { StaffPortalTabPanel } from '@/components/staff/StaffPortalTabHeader';
import { TabWalkthroughHeaderAction } from '@/components/tabWalkthrough/TabWalkthroughContext';
import { useSettings, type Settings } from '@/components/providers/SettingsProvider';
import { displaysFeatureEnabled, displaysRealmOpenHref } from '@/lib/displays/displayRoutes';
import { useToast } from '@/hooks/use-toast';
import { useDisplaysLiveFeed } from '@/hooks/useDisplaysLiveFeed';
import { ModularDisplayView } from '@/components/displays/modular/ModularDisplayView';
import { DisplayTvPairModal } from '@/components/displays/DisplayTvPairModal';
import {
  CURATED_MIX_RECIPES,
  DARK_THEMES,
  DISPLAY_MODULE_CATALOG,
  DISPLAY_PRESET_CATALOG,
  LIGHT_THEMES,
  MODULAR_THEMES,
  READY_MADE_PRESET_SCREENS,
  buildDefaultScreenConfig,
  type CuratedMixRecipe,
  type DisplayModuleKey,
  type ModularScreenConfig,
  type ModularThemeId,
  type PresetKey,
  type ScreenLayoutMode,
  type ScreenOrientation,
} from '@/lib/displays/modularDisplaySchema';

type WorkbenchTab = 'modules' | 'themes' | 'content' | 'hardware';

type AdminDisplaysTabProps = {
  schoolId: string;
  schoolLogoUrl?: string | null;
  settings?: Settings;
  updateSettings?: (updates: Partial<Settings>) => void;
};

export function AdminDisplaysTab({
  schoolId,
  settings: propSettings,
  updateSettings: propUpdateSettings,
}: AdminDisplaysTabProps) {
  const contextSettings = useSettings();
  const settings = propSettings || contextSettings.settings;
  const updateSettings = propUpdateSettings || contextSettings.updateSettings;
  const { toast } = useToast();

  // Consolidated live feed data for preview & screens
  const liveFeed = useDisplaysLiveFeed(schoolId);

  // Active screen state
  const [activeScreenId, setActiveScreenId] = useState<string>('hall-of-fame');
  const [workbenchTab, setWorkbenchTab] = useState<WorkbenchTab>('modules');
  const [themeToneTab, setThemeToneTab] = useState<'dark' | 'light'>('dark');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [newScreenName, setNewScreenName] = useState('');
  const [newScreenPreset, setNewScreenPreset] = useState<PresetKey>('hall-of-fame');
  const [copiedLink, setCopiedLink] = useState(false);

  // Resolved list of all available screens (3 ready-made + custom screens stored in settings)
  const allScreens = useMemo(() => {
    const list: ModularScreenConfig[] = [];
    const savedScreens = settings.modularDisplayScreens || {};

    // 1. Ready-Made Presets (using custom overrides if saved, else default)
    for (const key of ['hall-of-fame', 'smart-screen', 'bulletin-board'] as const) {
      if (savedScreens[key]) {
        list.push(savedScreens[key]);
      } else {
        list.push(READY_MADE_PRESET_SCREENS[key]);
      }
    }

    // 2. Custom User-Created Screens
    for (const [id, screen] of Object.entries(savedScreens)) {
      if (!['hall-of-fame', 'smart-screen', 'bulletin-board'].includes(id) && screen) {
        list.push(screen);
      }
    }

    return list;
  }, [settings.modularDisplayScreens]);

  const activeScreen: ModularScreenConfig = useMemo(() => {
    return allScreens.find((s) => s.id === activeScreenId) || allScreens[0];
  }, [allScreens, activeScreenId]);

  // Separate ready-made presets from custom user screens
  const customScreens = useMemo(() => {
    return allScreens.filter(
      (s) => !s.isReadyMade && !['hall-of-fame', 'smart-screen', 'bulletin-board'].includes(s.id),
    );
  }, [allScreens]);

  // Check whether active screen is a modified preset
  const isPresetModified = useMemo(() => {
    const key = (activeScreen.presetKey || activeScreen.id) as PresetKey;
    if (!['hall-of-fame', 'smart-screen', 'bulletin-board'].includes(key)) return false;
    return Boolean(settings.modularDisplayScreens?.[key]);
  }, [activeScreen, settings.modularDisplayScreens]);

  // Update active screen configuration
  const handleUpdateActiveScreen = (updates: Partial<ModularScreenConfig>) => {
    const nextScreen: ModularScreenConfig = {
      ...activeScreen,
      ...updates,
      updatedAt: Date.now(),
    };

    const nextSaved = {
      ...(settings.modularDisplayScreens || {}),
      [nextScreen.id]: nextScreen,
    };

    updateSettings({ modularDisplayScreens: nextSaved });
  };

  // Apply an entire preset layout, modules, and theme to active screen
  const handleApplyPresetToActive = (presetKey: PresetKey) => {
    const preset = READY_MADE_PRESET_SCREENS[presetKey];
    if (!preset) return;

    handleUpdateActiveScreen({
      theme: preset.theme,
      layout: preset.layout,
      enabledModules: [...preset.enabledModules],
      heroModule: preset.heroModule,
      customTitle: preset.customTitle,
      customMessage: preset.customMessage,
    });

    toast({
      title: 'Preset Applied',
      description: `Loaded "${preset.name}" styling into "${activeScreen.name}".`,
    });
  };

  // Toggle a single module on or off
  const handleToggleModule = (key: DisplayModuleKey, checked: boolean) => {
    const current = new Set(activeScreen.enabledModules || []);
    if (checked) {
      current.add(key);
    } else {
      current.delete(key);
    }
    handleUpdateActiveScreen({ enabledModules: Array.from(current) });
  };

  // Create a new screen
  const handleCreateScreen = () => {
    const trimmed = newScreenName.trim();
    if (!trimmed) {
      toast({
        variant: 'destructive',
        title: 'Screen name required',
        description: 'Please give this display screen a name (e.g. "Front Entrance TV").',
      });
      return;
    }

    const slug = trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 36);
    const newId = `${slug || 'screen'}-${Date.now().toString(36)}`;

    const newScreen = buildDefaultScreenConfig(newId, trimmed, newScreenPreset);

    const nextSaved = {
      ...(settings.modularDisplayScreens || {}),
      [newId]: newScreen,
    };

    updateSettings({ modularDisplayScreens: nextSaved });
    setActiveScreenId(newId);
    setNewScreenName('');
    setIsCreateModalOpen(false);

    toast({
      title: 'Screen Created',
      description: `"${trimmed}" is ready. Customize its modules and layout below.`,
    });
  };

  // Delete a custom screen
  const handleDeleteScreen = (id: string, name: string) => {
    const nextSaved = { ...(settings.modularDisplayScreens || {}) };
    delete nextSaved[id];

    updateSettings({ modularDisplayScreens: nextSaved });
    if (activeScreenId === id) {
      setActiveScreenId('hall-of-fame');
    }

    toast({
      title: 'Screen Removed',
      description: `Deleted "${name}".`,
    });
  };

  // Reset a ready-made preset back to factory default
  const handleResetPreset = (presetKey: string) => {
    const nextSaved = { ...(settings.modularDisplayScreens || {}) };
    delete nextSaved[presetKey];
    updateSettings({ modularDisplayScreens: nextSaved });

    const targetName = READY_MADE_PRESET_SCREENS[presetKey]?.name || presetKey;
    toast({
      title: 'Preset Reset',
      description: `Restored default factory layout for "${targetName}".`,
    });
  };

  // Fullscreen TV URL
  const fullScreenHref = useMemo(() => {
    return `/${schoolId}/displays?screen=${encodeURIComponent(activeScreen.id)}&fullscreen=1`;
  }, [activeScreen.id, schoolId]);

  const handleCopyLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const fullUrl = `${origin}${fullScreenHref}`;

    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
      toast({
        title: 'TV Link Copied',
        description: 'Paste this link into your hallway TV browser or digital signage app.',
      });
    });
  };

  const displaysOn = displaysFeatureEnabled(settings);

  if (!displaysOn) {
    return (
      <StaffPortalTabPanel tabValue="displays" trailing={<TabWalkthroughHeaderAction />}>
        <StaffPortalSectionCard className="w-full overflow-hidden">
          <StaffPortalSectionCardContent className="flex min-h-[40vh] flex-col items-center justify-center p-8 text-center">
            <MonitorPlay className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-black">Displays is Turned Off</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md">
              Turn on Displays in School Settings to activate hallway Smart Screens, leaderboards, and bulletin boards.
            </p>
          </StaffPortalSectionCardContent>
        </StaffPortalSectionCard>
      </StaffPortalTabPanel>
    );
  }

  const activeTheme = MODULAR_THEMES[activeScreen.theme] || MODULAR_THEMES.midnight;

  return (
    <StaffPortalTabPanel
      tabValue="displays"
      trailing={
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <TabWalkthroughHeaderAction />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsPairModalOpen(true)}
            className="gap-1.5 rounded-xl text-xs font-bold shadow-sm"
          >
            <QrCode className="h-4 w-4 text-primary" />
            <span>Show on TV (QR)</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="gap-1.5 rounded-xl text-xs font-bold shadow-sm"
          >
            {copiedLink ? (
              <>
                <Check className="h-4 w-4 text-emerald-500" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copy TV Link</span>
              </>
            )}
          </Button>

          <Button
            asChild
            size="sm"
            className="gap-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-4 text-xs font-black shadow-md hover:from-sky-500 hover:to-indigo-500 text-white"
          >
            <Link href={fullScreenHref} target="_blank" rel="noopener noreferrer">
              <MonitorPlay className="h-4 w-4" />
              <span>Launch Fullscreen</span>
              <ArrowUpRight className="h-3.5 w-3.5 opacity-80" />
            </Link>
          </Button>

          <Button
            asChild
            variant="ghost"
            size="sm"
            className="gap-1 text-xs text-muted-foreground hover:text-foreground"
            title="Open dedicated full-window Displays Studio"
          >
            <a href={displaysRealmOpenHref(schoolId)} target="_blank" rel="noopener noreferrer">
              Studio Popout
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Top Hero Status & Screen Switcher Bar */}
        <div className="rounded-3xl border border-border/80 bg-card/60 p-4 sm:p-5 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-lg sm:text-xl font-black tracking-tight text-foreground">
                  {activeScreen.name}
                </h3>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary">
                  {activeScreen.isReadyMade ? 'Ready-Made Preset' : 'Custom Display'}
                </span>
                {isPresetModified && (
                  <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                    Customized
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {activeScreen.description || 'Hallway monitor display configured for your school.'}
              </p>
            </div>

            {/* Quick Screen Preset Selector Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {/* Presets cluster */}
              <div className="flex items-center gap-1 rounded-2xl bg-muted/70 p-1 border border-border/70 shadow-inner">
                {DISPLAY_PRESET_CATALOG.map((preset) => {
                  const isActive = activeScreenId === preset.key;
                  const Icon = preset.icon;
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => setActiveScreenId(preset.key)}
                      className={cn(
                        'flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition-all',
                        isActive
                          ? preset.accentColor === 'amber'
                            ? 'bg-amber-500 text-amber-950 shadow-md ring-2 ring-amber-400/50'
                            : preset.accentColor === 'sky'
                            ? 'bg-sky-500 text-sky-950 shadow-md ring-2 ring-sky-400/50'
                            : 'bg-purple-600 text-white shadow-md ring-2 ring-purple-400/50'
                          : 'text-muted-foreground hover:text-foreground hover:bg-background/60',
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="whitespace-nowrap">{preset.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom screens */}
              {customScreens.map((screen) => {
                const isActive = screen.id === activeScreenId;
                return (
                  <button
                    key={screen.id}
                    type="button"
                    onClick={() => setActiveScreenId(screen.id)}
                    className={cn(
                      'flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all border',
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary shadow-md'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border-border/60',
                    )}
                  >
                    <Tv className="h-3.5 w-3.5 shrink-0" />
                    <span className="whitespace-nowrap">{screen.name}</span>
                  </button>
                );
              })}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                className="h-8 shrink-0 gap-1 rounded-xl border-dashed border-primary/40 bg-primary/5 px-2.5 text-xs font-bold text-primary hover:bg-primary/10"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Screen</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Scaled Live TV Preview Area */}
        <div className="rounded-3xl border border-border/80 bg-card/40 p-4 sm:p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-foreground">
                Live TV Preview
              </span>
              <span className="hidden sm:inline text-xs text-muted-foreground">
                (Simulates actual hallway display screen with live school data)
              </span>
            </div>

            {/* Preview controls: Aspect ratio & Auto-scroll indicator */}
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-xl bg-muted/60 p-1 border border-border/60 text-xs">
                <button
                  type="button"
                  onClick={() => handleUpdateActiveScreen({ orientation: 'landscape' })}
                  className={cn(
                    'flex items-center gap-1 rounded-lg px-2.5 py-1 font-bold transition-all',
                    activeScreen.orientation === 'landscape'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Monitor className="h-3 w-3" />
                  <span>16:9 TV</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateActiveScreen({ orientation: 'portrait' })}
                  className={cn(
                    'flex items-center gap-1 rounded-lg px-2.5 py-1 font-bold transition-all',
                    activeScreen.orientation === 'portrait'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Smartphone className="h-3 w-3" />
                  <span>9:16 Kiosk</span>
                </button>
              </div>

              {isPresetModified && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleResetPreset(activeScreen.presetKey || activeScreen.id)}
                  className="h-7 gap-1 text-[11px] font-bold text-muted-foreground hover:text-amber-600"
                  title="Reset modules and theme back to factory default"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset preset
                </Button>
              )}
            </div>
          </div>

          {/* Scaled TV Bezel Container */}
          <div className="flex justify-center items-center py-2">
            <div
              className={cn(
                'relative flex flex-col overflow-hidden rounded-[2rem] border-[10px] border-slate-900 bg-slate-950 shadow-2xl ring-1 ring-white/10 transition-all duration-300 w-full',
                activeScreen.orientation === 'landscape'
                  ? 'max-w-[1080px] aspect-[16/9] max-h-[580px]'
                  : 'max-w-[420px] aspect-[9/16] max-h-[660px]',
              )}
            >
              <ModularDisplayView
                config={activeScreen}
                feed={liveFeed}
                variant="preview"
                className="h-full w-full overflow-y-auto"
              />
            </div>
          </div>
        </div>

        {/* Workbench Control Center: Tabs for Modules, Themes, Content, TV Setup */}
        <div className="rounded-3xl border border-border/80 bg-card/60 shadow-sm overflow-hidden">
          {/* Tabs Navigation Header */}
          <div className="grid grid-cols-4 border-b border-border/80 bg-muted/40 p-2 gap-1.5">
            <button
              type="button"
              onClick={() => setWorkbenchTab('modules')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-2xl py-2.5 px-3 text-xs sm:text-sm font-black transition-all',
                workbenchTab === 'modules'
                  ? 'bg-background text-foreground shadow-md ring-1 ring-border'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/40',
              )}
            >
              <LayoutGrid className="h-4 w-4 shrink-0 text-primary" />
              <span>Modules & Layout</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary hidden sm:inline">
                {activeScreen.enabledModules?.length || 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setWorkbenchTab('themes')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-2xl py-2.5 px-3 text-xs sm:text-sm font-black transition-all',
                workbenchTab === 'themes'
                  ? 'bg-background text-foreground shadow-md ring-1 ring-border'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/40',
              )}
            >
              <Palette className="h-4 w-4 shrink-0 text-indigo-500" />
              <span>Themes</span>
              <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hidden sm:inline">
                {activeTheme.name}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setWorkbenchTab('content')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-2xl py-2.5 px-3 text-xs sm:text-sm font-black transition-all',
                workbenchTab === 'content'
                  ? 'bg-background text-foreground shadow-md ring-1 ring-border'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/40',
              )}
            >
              <Sliders className="h-4 w-4 shrink-0 text-sky-500" />
              <span>Content & Marquee</span>
            </button>

            <button
              type="button"
              onClick={() => setWorkbenchTab('hardware')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-2xl py-2.5 px-3 text-xs sm:text-sm font-black transition-all',
                workbenchTab === 'hardware'
                  ? 'bg-background text-foreground shadow-md ring-1 ring-border'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/40',
              )}
            >
              <Tv className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>TV & Hardware</span>
            </button>
          </div>

          <div className="p-5 sm:p-6">
            {/* TAB 1: MODULES & LAYOUT */}
            {workbenchTab === 'modules' && (
              <div className="space-y-6">
                {/* Hero / Layout Style */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl bg-muted/30 p-4 border border-border/60">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-foreground">Screen Layout Mode</p>
                    <p className="text-xs text-muted-foreground">
                      Choose how cards and widget columns are arranged on widescreen monitors.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-xl bg-background p-1 border shadow-sm">
                    {(['dashboard', 'mirror', 'split', 'focus-hero'] as ScreenLayoutMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => handleUpdateActiveScreen({ layout: mode })}
                        className={cn(
                          'rounded-lg px-3 py-1 text-xs font-bold capitalize transition-all',
                          activeScreen.layout === mode
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {mode.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 16 Module Toggle Cards Grouped by Category */}
                <div className="space-y-6">
                  {(
                    [
                      {
                        cat: 'hall-of-fame',
                        title: 'Leaderboards & Competitions',
                        description: 'Podium, student points rankings, and house totals',
                      },
                      {
                        cat: 'smart-screen',
                        title: 'Daily Info & School Life',
                        description: 'Time, weather, birthdays, positive quotes, and school statistics',
                      },
                      {
                        cat: 'bulletin',
                        title: 'Announcements & Rewards',
                        description: 'Celebrations, point opportunities, and prize shop showcase',
                      },
                    ] as const
                  ).map((group) => {
                    const modules = DISPLAY_MODULE_CATALOG.filter((m) => m.category === group.cat);
                    return (
                      <div key={group.cat} className="space-y-3">
                        <div className="border-b border-border/60 pb-1.5">
                          <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                            {group.title}
                          </h4>
                          <p className="text-xs text-muted-foreground">{group.description}</p>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {modules.map((m) => {
                            const isEnabled = (activeScreen.enabledModules || []).includes(m.key);
                            const Icon = m.icon;
                            return (
                              <div
                                key={m.key}
                                onClick={() => handleToggleModule(m.key, !isEnabled)}
                                className={cn(
                                  'flex items-start gap-3 rounded-2xl border p-3.5 cursor-pointer transition-all',
                                  isEnabled
                                    ? 'border-primary/40 bg-primary/5 shadow-sm'
                                    : 'border-border/60 bg-muted/20 opacity-75 hover:opacity-100 hover:border-border',
                                )}
                              >
                                <div
                                  className={cn(
                                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors',
                                    isEnabled
                                      ? 'bg-primary text-primary-foreground shadow-sm'
                                      : 'bg-muted text-muted-foreground',
                                  )}
                                >
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1 mb-0.5">
                                    <span className="text-xs sm:text-sm font-bold truncate text-foreground">
                                      {m.label}
                                    </span>
                                    <Switch
                                      checked={isEnabled}
                                      onCheckedChange={(checked) => handleToggleModule(m.key, checked)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="scale-90"
                                    />
                                  </div>
                                  <p className="text-[11px] leading-snug text-muted-foreground line-clamp-2">
                                    {m.description}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: THEMES */}
            {workbenchTab === 'themes' && (
              <div className="space-y-6">
                {/* Dark vs Light Tone Selector */}
                <div className="flex items-center justify-between border-b border-border/80 pb-4">
                  <div>
                    <p className="text-sm font-bold text-foreground">Theme & Visual Palette</p>
                    <p className="text-xs text-muted-foreground">
                      All 12 themes feature certified WCAG AA high-contrast ratios for crystal-clear readability from across the room.
                    </p>
                  </div>

                  <div className="flex items-center rounded-2xl bg-muted/60 p-1 border text-xs">
                    <button
                      type="button"
                      onClick={() => setThemeToneTab('dark')}
                      className={cn(
                        'rounded-xl px-4 py-1.5 font-black transition-all',
                        themeToneTab === 'dark'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      Dark Themes (6)
                    </button>
                    <button
                      type="button"
                      onClick={() => setThemeToneTab('light')}
                      className={cn(
                        'rounded-xl px-4 py-1.5 font-black transition-all',
                        themeToneTab === 'light'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      Light Themes (6)
                    </button>
                  </div>
                </div>

                {/* Theme Cards Grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {(themeToneTab === 'dark' ? DARK_THEMES : LIGHT_THEMES).map((theme) => {
                    const isSelected = activeScreen.theme === theme.id;
                    return (
                      <div
                        key={theme.id}
                        onClick={() => handleUpdateActiveScreen({ theme: theme.id })}
                        className={cn(
                          'flex flex-col rounded-2xl border-2 p-4 cursor-pointer transition-all hover:shadow-lg',
                          isSelected
                            ? 'border-primary shadow-md ring-2 ring-primary/20 bg-primary/5'
                            : 'border-border/70 bg-card/60 hover:border-primary/40',
                        )}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {/* Color Swatch Dot */}
                            <div
                              className="h-5 w-5 rounded-full border-2 border-white/40 shadow-sm"
                              style={{ backgroundColor: theme.previewAccent }}
                            />
                            <span className="text-sm font-black text-foreground">{theme.name}</span>
                          </div>
                          {isSelected && (
                            <span className="flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-black">
                              <Check className="h-3 w-3" />
                              Active
                            </span>
                          )}
                        </div>

                        {/* Theme Preview Swatch Bar */}
                        <div
                          className="h-12 w-full rounded-xl border p-2 flex items-center justify-between mb-2 shadow-inner"
                          style={{ backgroundColor: theme.previewBg }}
                        >
                          <div
                            className="h-6 w-20 rounded-md border flex items-center justify-center text-[10px] font-bold"
                            style={{
                              backgroundColor: theme.previewCard,
                              borderColor: theme.previewAccent,
                              color: theme.tone === 'dark' ? '#ffffff' : '#0f172a',
                            }}
                          >
                            Card
                          </div>
                          <div
                            className="h-3 w-3 rounded-full shadow-sm"
                            style={{ backgroundColor: theme.previewAccent }}
                          />
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {theme.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: CONTENT & MARQUEE */}
            {workbenchTab === 'content' && (
              <div className="space-y-6 max-w-2xl">
                <div className="space-y-2">
                  <label htmlFor="screen-title" className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Custom Screen Title
                  </label>
                  <Input
                    id="screen-title"
                    value={activeScreen.customTitle || ''}
                    placeholder="e.g. Pine Crest Academy Hall of Fame"
                    onChange={(e) => handleUpdateActiveScreen({ customTitle: e.target.value })}
                    className="font-bold rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground">
                    Shown at the top of the TV display. Leave empty to use the school name.
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="screen-message" className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Daily Scrolling Marquee / Subtitle
                  </label>
                  <Input
                    id="screen-message"
                    value={activeScreen.customMessage || ''}
                    placeholder="e.g. Welcome Scholars! Strive for excellence in everything you do."
                    onChange={(e) => handleUpdateActiveScreen({ customMessage: e.target.value })}
                    className="rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground">
                    Featured prominently under the header as the daily motivational message.
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      'Learn, level up, and lead today!',
                      'Celebrating our top scholars and community achievers!',
                      'House spirit week is live — keep earning those points!',
                      'Character counts: Respect, responsibility, and excellence.',
                    ].map((msg) => (
                      <button
                        key={msg}
                        type="button"
                        onClick={() => handleUpdateActiveScreen({ customMessage: msg })}
                        className="rounded-lg bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        &quot;{msg}&quot;
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: TV & HARDWARE */}
            {workbenchTab === 'hardware' && (
              <div className="space-y-6 max-w-2xl">
                <div className="space-y-3 rounded-2xl bg-muted/30 p-4 border border-border/60">
                  <p className="text-sm font-bold text-foreground">Screen Orientation</p>
                  <p className="text-xs text-muted-foreground">
                    Matches your physical monitor orientation.
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => handleUpdateActiveScreen({ orientation: 'landscape' })}
                      className={cn(
                        'flex items-center gap-2 rounded-xl border p-3 text-xs font-bold transition-all',
                        activeScreen.orientation === 'landscape'
                          ? 'border-primary bg-primary/10 text-primary shadow-sm'
                          : 'bg-background text-muted-foreground',
                      )}
                    >
                      <Monitor className="h-4 w-4" />
                      Landscape (16:9 Standard TV)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateActiveScreen({ orientation: 'portrait' })}
                      className={cn(
                        'flex items-center gap-2 rounded-xl border p-3 text-xs font-bold transition-all',
                        activeScreen.orientation === 'portrait'
                          ? 'border-primary bg-primary/10 text-primary shadow-sm'
                          : 'bg-background text-muted-foreground',
                      )}
                    >
                      <Smartphone className="h-4 w-4" />
                      Portrait (9:16 Vertical Totem)
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-muted/30 p-4 border border-border/60">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-foreground">Smooth Auto-Scroll on TV</p>
                    <p className="text-xs text-muted-foreground">
                      Automatically scrolls through long lists of leaders and houses, pausing at the top and bottom.
                    </p>
                  </div>
                  <Switch
                    checked={activeScreen.autoScroll !== false}
                    onCheckedChange={(checked) => handleUpdateActiveScreen({ autoScroll: checked })}
                  />
                </div>

                {/* TV Setup Actions */}
                <div className="space-y-3 rounded-2xl bg-primary/5 p-4 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground">Ready to broadcast?</p>
                      <p className="text-xs text-muted-foreground">
                        Pair your display directly to any Fire TV, Apple TV, Google TV, or smart TV browser.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setIsPairModalOpen(true)}
                      className="gap-1.5 rounded-xl font-bold"
                    >
                      <QrCode className="h-4 w-4" />
                      Pair TV Now
                    </Button>
                  </div>
                </div>

                {/* Delete button if custom screen */}
                {!activeScreen.isReadyMade &&
                  !['hall-of-fame', 'smart-screen', 'bulletin-board'].includes(activeScreen.id) && (
                    <div className="pt-4 border-t border-border/60">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteScreen(activeScreen.id, activeScreen.name)}
                        className="gap-1.5 rounded-xl text-xs font-bold"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete This Display
                      </Button>
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CREATE NEW SCREEN MODAL */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black tracking-tight">Create New Display Screen</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add a custom hallway TV display. Choose a starter layout or start fresh.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <label htmlFor="new-screen-name" className="text-xs font-bold">
                Display Screen Name
              </label>
              <Input
                id="new-screen-name"
                value={newScreenName}
                placeholder="e.g. Front Lobby TV, Cafeteria Display"
                onChange={(e) => setNewScreenName(e.target.value)}
                className="rounded-xl font-bold"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold">Starter Preset</label>
              <div className="grid grid-cols-1 gap-2">
                {DISPLAY_PRESET_CATALOG.map((p) => {
                  const Icon = p.icon;
                  const isChosen = newScreenPreset === p.key;
                  return (
                    <div
                      key={p.key}
                      onClick={() => setNewScreenPreset(p.key)}
                      className={cn(
                        'flex items-center gap-3 rounded-2xl border p-3 cursor-pointer transition-all',
                        isChosen
                          ? 'border-primary bg-primary/10 shadow-sm'
                          : 'border-border/60 bg-muted/30 hover:bg-muted/60',
                      )}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-background border shadow-sm">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{p.description}</p>
                      </div>
                      {isChosen && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCreateScreen}
              className="rounded-xl font-bold"
            >
              Create Screen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TV PAIRING & QR CODE MODAL */}
      <DisplayTvPairModal
        isOpen={isPairModalOpen}
        onClose={() => setIsPairModalOpen(false)}
        schoolId={schoolId}
        screenId={activeScreen.id}
        screenName={activeScreen.name}
      />
    </StaffPortalTabPanel>
  );
}
