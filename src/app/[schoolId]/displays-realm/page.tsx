'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Copy,
  Crown,
  Heart,
  Layers,
  LayoutGrid,
  Megaphone,
  Monitor,
  MonitorPlay,
  Palette,
  Plus,
  RotateCcw,
  Smartphone,
  Sliders,
  Sparkles,
  Trash2,
  Trophy,
  Tv,
  Wand2,
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
import { useSettings } from '@/components/providers/SettingsProvider';
import { displaysFeatureEnabled } from '@/lib/displays/displayRoutes';
import { schoolPortalHref } from '@/lib/officePublicUrl';
import { useToast } from '@/hooks/use-toast';
import {
  CURATED_MIX_RECIPES,
  DARK_THEMES,
  DISPLAY_MODULE_CATALOG,
  DISPLAY_PRESET_CATALOG,
  LIGHT_THEMES,
  READY_MADE_PRESET_SCREENS,
  buildDefaultScreenConfig,
  type CuratedMixRecipe,
  type DisplayModuleKey,
  type ModularScreenConfig,
  type ModularThemeId,
  type PresetKey,
  type ScreenOrientation,
} from '@/lib/displays/modularDisplaySchema';
import { useDisplaysLiveFeed } from '@/hooks/useDisplaysLiveFeed';
import { ModularDisplayView } from '@/components/displays/modular/ModularDisplayView';

type WorkbenchTab = 'presets' | 'modules' | 'themes' | 'layout';

export default function DisplaysRealmPage() {
  const params = useParams();
  const schoolId = String(params.schoolId || '');
  const { settings, updateSettings } = useSettings();
  const { toast } = useToast();

  // Consolidated live feed data for preview & screens
  const liveFeed = useDisplaysLiveFeed(schoolId);

  // Active screen state
  const [activeScreenId, setActiveScreenId] = useState<string>('hall-of-fame');
  const [workbenchTab, setWorkbenchTab] = useState<WorkbenchTab>('presets');
  const [themeToneTab, setThemeToneTab] = useState<'dark' | 'light'>('dark');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
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

  // Separate ready-made presets from custom user screens for the top navigation bar
  const readyMadeScreens = useMemo(() => {
    return allScreens.filter(
      (s) => s.isReadyMade || ['hall-of-fame', 'smart-screen', 'bulletin-board'].includes(s.id),
    );
  }, [allScreens]);

  const customScreens = useMemo(() => {
    return allScreens.filter(
      (s) => !s.isReadyMade && !['hall-of-fame', 'smart-screen', 'bulletin-board'].includes(s.id),
    );
  }, [allScreens]);

  // Check whether the active screen is a preset that has custom modifications
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

  // Apply an entire preset layout, modules, and theme to the active screen
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
      description: `Loaded "${preset.name}" modules & styling into "${activeScreen.name}".`,
    });
  };

  // Apply a curated recipe mix to the active screen
  const handleApplyRecipe = (recipe: CuratedMixRecipe) => {
    handleUpdateActiveScreen({
      theme: recipe.theme,
      enabledModules: [...recipe.modules],
      heroModule: recipe.modules[0],
    });

    toast({
      title: 'Mix Applied!',
      description: `Loaded "${recipe.name}" with ${recipe.modules.length} modules into "${activeScreen.name}".`,
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
        description: 'Please give this display screen a name (e.g. "Main Entrance TV").',
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

  // Reset a ready-made preset back to default
  const handleResetPreset = (presetKey: string) => {
    const nextSaved = { ...(settings.modularDisplayScreens || {}) };
    delete nextSaved[presetKey];
    updateSettings({ modularDisplayScreens: nextSaved });
    const targetName = READY_MADE_PRESET_SCREENS[presetKey]?.name || presetKey;
    toast({
      title: 'Preset Reset',
      description: `Restored default factory configuration for "${targetName}".`,
    });
  };

  // Fullscreen URL for live TV
  const fullScreenHref = useMemo(() => {
    return `/${schoolId}/displays?screen=${activeScreen.id}&fullscreen=1`;
  }, [activeScreen.id, schoolId]);

  const handleCopyLink = () => {
    const fullUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}${fullScreenHref}`
        : fullScreenHref;

    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
      toast({
        title: 'TV Link Copied',
        description: 'Paste this link into your hallway TV browser or digital signage app.',
      });
    });
  };

  if (!displaysFeatureEnabled(settings)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-8">
        <div className="max-w-md space-y-4 text-center">
          <MonitorPlay className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden />
          <h2 className="text-xl font-black tracking-tight">Displays is off for this school</h2>
          <p className="text-sm text-muted-foreground">
            Turn on Displays in Settings to build and manage your hallway displays.
          </p>
          <Link
            href={schoolPortalHref(schoolId)}
            className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to LevelUp
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-screen flex-col overflow-hidden bg-background text-foreground select-none">
      {/* TOP STUDIO APP BAR */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/80 px-4 bg-card/70 backdrop-blur-md z-20">
        {/* Left: LevelUp back link & Studio Branding */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={schoolPortalHref(schoolId)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/80 px-3 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            LevelUp
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <MonitorPlay className="h-5 w-5 shrink-0 text-primary" />
            <span className="truncate text-sm font-black tracking-tight sm:text-base">Displays Studio</span>
          </div>
        </div>

        {/* Center: Screen Selector Tabs */}
        {/* Center: Screen Selector Tabs (Presets Segment + Custom Screens) */}
        <div className="flex items-center gap-2.5 overflow-x-auto py-1 px-2 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {/* Segment 1: Ready-Made Presets */}
          <div className="flex items-center gap-1.5 rounded-2xl bg-muted/60 p-1 border border-border/80 shadow-inner">
            <span className="hidden xl:flex items-center gap-1 px-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              <Layers className="h-3 w-3" />
              Presets
            </span>
            {DISPLAY_PRESET_CATALOG.map((preset) => {
              const isActive = activeScreenId === preset.key;
              const Icon = preset.icon;
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => setActiveScreenId(preset.key)}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-black transition-all',
                    isActive
                      ? preset.accentColor === 'amber'
                        ? 'bg-amber-500 text-amber-950 shadow-md ring-2 ring-amber-400/50'
                        : preset.accentColor === 'sky'
                        ? 'bg-sky-500 text-sky-950 shadow-md ring-2 ring-sky-400/50'
                        : 'bg-purple-600 text-white shadow-md ring-2 ring-purple-400/50'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/80',
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="whitespace-nowrap">{preset.name}</span>
                </button>
              );
            })}
          </div>

          {/* Subtle separator */}
          <div className="h-6 w-px bg-border/80 shrink-0" />

          {/* Segment 2: Custom Screens & New Screen Button */}
          <div className="flex items-center gap-2">
            {customScreens.map((screen) => {
              const isActive = screen.id === activeScreenId;
              return (
                <button
                  key={screen.id}
                  type="button"
                  onClick={() => setActiveScreenId(screen.id)}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition-all shadow-sm',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md ring-2 ring-primary/40'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50',
                  )}
                >
                  <Tv className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap">{screen.name}</span>
                </button>
              );
            })}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="h-9 shrink-0 gap-1.5 rounded-xl border-dashed border-primary/50 bg-primary/5 px-3 text-xs sm:text-sm font-bold text-primary hover:bg-primary/10 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>New Screen</span>
            </Button>
          </div>
        </div>

        {/* Right: Quick Actions */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="h-9 gap-2 rounded-xl text-xs sm:text-sm font-bold shadow-sm"
          >
            {copiedLink ? (
              <>
                <Check className="h-4 w-4 text-emerald-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy TV Link
              </>
            )}
          </Button>

          <Button asChild size="sm" className="h-9 gap-2 rounded-xl text-xs sm:text-sm font-black shadow-md">
            <Link href={fullScreenHref} target="_blank" rel="noopener noreferrer">
              Launch Fullscreen
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      {/* MAIN WORKBENCH: LEFT CONTROLS + RIGHT TV CANVAS */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* LEFT STUDIO DRAWER */}
        <aside className="flex w-[380px] sm:w-[440px] shrink-0 flex-col border-r border-border/80 bg-card/50 backdrop-blur-sm overflow-hidden">
          {/* Drawer Navigation Tabs: Presets, Modules, Themes, Settings */}
          <div className="grid grid-cols-4 border-b border-border/80 bg-muted/30 p-2 gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setWorkbenchTab('presets')}
              className={cn(
                'flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-xl py-2 px-1 text-[11px] sm:text-xs font-black transition-all',
                workbenchTab === 'presets'
                  ? 'bg-background text-foreground shadow-md ring-1 ring-border'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Layers className="h-3.5 w-3.5 shrink-0" />
              <span>Presets</span>
            </button>
            <button
              type="button"
              onClick={() => setWorkbenchTab('modules')}
              className={cn(
                'flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-xl py-2 px-1 text-[11px] sm:text-xs font-black transition-all',
                workbenchTab === 'modules'
                  ? 'bg-background text-foreground shadow-md ring-1 ring-border'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
              <span>Modules</span>
              <span className="rounded-full bg-primary/15 px-1 py-0.2 text-[9px] font-black text-primary">
                {activeScreen.enabledModules?.length || 0}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setWorkbenchTab('themes')}
              className={cn(
                'flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-xl py-2 px-1 text-[11px] sm:text-xs font-black transition-all',
                workbenchTab === 'themes'
                  ? 'bg-background text-foreground shadow-md ring-1 ring-border'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Palette className="h-3.5 w-3.5 shrink-0" />
              <span>Themes</span>
            </button>
            <button
              type="button"
              onClick={() => setWorkbenchTab('layout')}
              className={cn(
                'flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-xl py-2 px-1 text-[11px] sm:text-xs font-black transition-all',
                workbenchTab === 'layout'
                  ? 'bg-background text-foreground shadow-md ring-1 ring-border'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Sliders className="h-3.5 w-3.5 shrink-0" />
              <span>Settings</span>
            </button>
          </div>

          {/* Drawer Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* TAB 0: PRESETS SHOWCASE & MIXER */}
            {workbenchTab === 'presets' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Ready-Made Screen Presets
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
                    3 engineered display layouts. Open a preset directly, or apply its layout and modules to your active screen.
                  </p>
                </div>

                {/* Active Screen Banner / Identity */}
                <div className="rounded-2xl border-2 border-border/80 bg-muted/40 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                      Active Screen
                    </span>
                    {activeScreen.isReadyMade ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase">
                        ✓ Preset Screen
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/30 px-2 py-0.5 text-[10px] font-black text-primary uppercase">
                        Custom Screen
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-black text-foreground truncate">{activeScreen.name}</p>
                    <span className="text-xs font-semibold text-muted-foreground shrink-0">
                      {activeScreen.enabledModules?.length || 0} modules active
                    </span>
                  </div>
                  {isPresetModified && (
                    <div className="flex items-center justify-between pt-2 border-t border-border/60">
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-bold">
                        Modified from default
                      </span>
                      <button
                        type="button"
                        onClick={() => handleResetPreset(activeScreen.id)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground underline underline-offset-2"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reset to default
                      </button>
                    </div>
                  )}
                </div>

                {/* The 3 Ready-Made Preset Cards */}
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                      Available Presets (3)
                    </h4>
                  </div>

                  {DISPLAY_PRESET_CATALOG.map((preset) => {
                    const Icon = preset.icon;
                    const isViewing = activeScreen.id === preset.key;
                    const isModified = Boolean(settings.modularDisplayScreens?.[preset.key]);

                    return (
                      <div
                        key={preset.key}
                        className={cn(
                          'rounded-2xl border-2 p-4 transition-all shadow-sm space-y-3',
                          preset.accentColor === 'amber'
                            ? 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/60'
                            : preset.accentColor === 'sky'
                            ? 'border-sky-500/30 bg-sky-500/5 hover:border-sky-500/60'
                            : 'border-purple-500/30 bg-purple-500/5 hover:border-purple-500/60',
                          isViewing && 'ring-2 ring-primary/40 shadow-md',
                        )}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={cn(
                                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-md',
                                preset.accentColor === 'amber'
                                  ? 'bg-amber-500 text-amber-950 shadow-amber-500/20'
                                  : preset.accentColor === 'sky'
                                  ? 'bg-sky-500 text-sky-950 shadow-sky-500/20'
                                  : 'bg-purple-600 text-white shadow-purple-600/20',
                              )}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-black leading-tight text-foreground truncate">
                                  {preset.name}
                                </h4>
                                {isViewing && (
                                  <span className="rounded-md bg-primary px-1.5 py-0.2 text-[10px] font-black text-primary-foreground uppercase">
                                    Current
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-bold text-muted-foreground truncate">
                                {preset.tagline}
                              </p>
                            </div>
                          </div>

                          <span className="shrink-0 rounded-full border border-border/80 bg-background/80 px-2 py-0.5 text-[10px] font-black text-foreground">
                            {preset.defaultModulesCount} Modules
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {preset.description}
                        </p>

                        {/* Module chips preview */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {preset.highlightModules.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-lg border border-border/70 bg-background/80 px-2 py-0.5 text-[10px] font-bold text-foreground/90 shadow-2xs"
                            >
                              {tag}
                            </span>
                          ))}
                          <span className="rounded-lg bg-muted/60 px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                            +{preset.defaultModulesCount - preset.highlightModules.length} more
                          </span>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                          {isViewing ? (
                            <div className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-black text-primary">
                              <CheckCircle2 className="h-4 w-4" />
                              Currently Active
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="default"
                              size="sm"
                              onClick={() => setActiveScreenId(preset.key)}
                              className="flex-1 h-8 rounded-xl text-xs font-black"
                            >
                              Open Screen
                            </Button>
                          )}

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleApplyPresetToActive(preset.key)}
                            className="flex-1 h-8 rounded-xl text-xs font-bold shadow-2xs"
                            title={`Copy ${preset.name} modules & layout into ${activeScreen.name}`}
                          >
                            <Wand2 className="h-3.5 w-3.5 mr-1 text-primary" />
                            Apply Layout
                          </Button>

                          {isModified && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResetPreset(preset.key)}
                              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                              title="Reset to factory original"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Instant Curated Remix Recipes */}
                <div className="space-y-3.5 pt-2">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      Instant Preset Mixes
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      Need parts from multiple templates? 1-click recipes that combine them for "{activeScreen.name}".
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {CURATED_MIX_RECIPES.map((recipe) => {
                      const Icon = recipe.icon;
                      return (
                        <div
                          key={recipe.id}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card p-3 shadow-2xs hover:border-primary/40 transition-all"
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary mt-0.5">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-black text-foreground truncate">{recipe.name}</p>
                                <span className="rounded-md bg-muted px-1.5 py-0.2 text-[9px] font-black uppercase text-muted-foreground">
                                  {recipe.badge}
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground leading-tight line-clamp-1 mt-0.5">
                                {recipe.description}
                              </p>
                            </div>
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => handleApplyRecipe(recipe)}
                            className="h-7 shrink-0 rounded-lg px-2.5 text-xs font-bold"
                          >
                            Apply
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 1: MODULES MIXER */}
            {workbenchTab === 'modules' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-black tracking-tight">Mix & Match Modules</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
                    Toggle any components across Hall of Fame, Smart Screen, and Bulletin for this screen.
                  </p>
                </div>

                {/* Group 1: Hall of Fame */}
                <div className="space-y-2.5">
                  <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-black uppercase tracking-wider flex items-center gap-2">
                    <Crown className="h-4 w-4 shrink-0 text-amber-500" />
                    <span>Hall of Fame Leaderboards</span>
                  </div>
                  <div className="space-y-2">
                    {DISPLAY_MODULE_CATALOG.filter((m) => m.category === 'hall-of-fame').map((mod) => {
                      const Icon = mod.icon;
                      const isEnabled = (activeScreen.enabledModules || []).includes(mod.key);
                      return (
                        <div
                          key={mod.key}
                          className={cn(
                            'flex items-center justify-between gap-3.5 rounded-2xl border-2 p-3.5 transition-all shadow-sm',
                            isEnabled
                              ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                              : 'border-border/70 bg-background/60 opacity-80 hover:opacity-100',
                          )}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', isEnabled ? 'text-primary' : 'text-muted-foreground')} />
                            <div className="min-w-0">
                              <p className="text-sm font-black leading-snug text-foreground">{mod.label}</p>
                              <p className="text-xs text-muted-foreground leading-normal mt-0.5 line-clamp-2">{mod.description}</p>
                            </div>
                          </div>
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={(checked) => handleToggleModule(mod.key, checked)}
                            aria-label={mod.label}
                            className="shrink-0"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Group 2: Clock & Daily Info */}
                <div className="space-y-2.5">
                  <div className="px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-700 dark:text-sky-400 text-xs font-black uppercase tracking-wider flex items-center gap-2">
                    <Monitor className="h-4 w-4 shrink-0 text-sky-500" />
                    <span>Smart Screen & Daily Info</span>
                  </div>
                  <div className="space-y-2">
                    {DISPLAY_MODULE_CATALOG.filter((m) => m.category === 'smart-screen').map((mod) => {
                      const Icon = mod.icon;
                      const isEnabled = (activeScreen.enabledModules || []).includes(mod.key);
                      return (
                        <div
                          key={mod.key}
                          className={cn(
                            'flex items-center justify-between gap-3.5 rounded-2xl border-2 p-3.5 transition-all shadow-sm',
                            isEnabled
                              ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                              : 'border-border/70 bg-background/60 opacity-80 hover:opacity-100',
                          )}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', isEnabled ? 'text-primary' : 'text-muted-foreground')} />
                            <div className="min-w-0">
                              <p className="text-sm font-black leading-snug text-foreground">{mod.label}</p>
                              <p className="text-xs text-muted-foreground leading-normal mt-0.5 line-clamp-2">{mod.description}</p>
                            </div>
                          </div>
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={(checked) => handleToggleModule(mod.key, checked)}
                            aria-label={mod.label}
                            className="shrink-0"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Group 3: Bulletin & Rewards */}
                <div className="space-y-2.5">
                  <div className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-400 text-xs font-black uppercase tracking-wider flex items-center gap-2">
                    <Tv className="h-4 w-4 shrink-0 text-purple-500" />
                    <span>Bulletin Board & Rewards</span>
                  </div>
                  <div className="space-y-2">
                    {DISPLAY_MODULE_CATALOG.filter((m) => m.category === 'bulletin').map((mod) => {
                      const Icon = mod.icon;
                      const isEnabled = (activeScreen.enabledModules || []).includes(mod.key);
                      return (
                        <div
                          key={mod.key}
                          className={cn(
                            'flex items-center justify-between gap-3.5 rounded-2xl border-2 p-3.5 transition-all shadow-sm',
                            isEnabled
                              ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                              : 'border-border/70 bg-background/60 opacity-80 hover:opacity-100',
                          )}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', isEnabled ? 'text-primary' : 'text-muted-foreground')} />
                            <div className="min-w-0">
                              <p className="text-sm font-black leading-snug text-foreground">{mod.label}</p>
                              <p className="text-xs text-muted-foreground leading-normal mt-0.5 line-clamp-2">{mod.description}</p>
                            </div>
                          </div>
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={(checked) => handleToggleModule(mod.key, checked)}
                            aria-label={mod.label}
                            className="shrink-0"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: THEMES (DIVIDED BY DARK & LIGHT) */}
            {workbenchTab === 'themes' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-base font-black tracking-tight">Select Theme</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
                    Themes are engineered for high contrast and readability on hallway TV monitors.
                  </p>
                </div>

                {/* Dark vs Light Tone Selector */}
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted/60 p-1.5 border border-border/80">
                  <button
                    type="button"
                    onClick={() => setThemeToneTab('dark')}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-black transition-all',
                      themeToneTab === 'dark'
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    🌙 Dark Themes ({DARK_THEMES.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setThemeToneTab('light')}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-black transition-all',
                      themeToneTab === 'light'
                        ? 'bg-white text-slate-950 shadow-md ring-1 ring-slate-300'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    ☀️ Light Themes ({LIGHT_THEMES.length})
                  </button>
                </div>

                {/* Theme Cards Grid */}
                <div className="grid grid-cols-1 gap-3">
                  {(themeToneTab === 'dark' ? DARK_THEMES : LIGHT_THEMES).map((theme) => {
                    const isSelected = activeScreen.theme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => handleUpdateActiveScreen({ theme: theme.id as ModularThemeId })}
                        className={cn(
                          'flex items-center justify-between gap-3.5 rounded-2xl border-2 p-4 text-left transition-all',
                          isSelected
                            ? 'border-primary ring-2 ring-primary/50 shadow-lg'
                            : 'border-border/80 hover:border-primary/50 hover:shadow-md',
                        )}
                        style={{ backgroundColor: theme.previewBg }}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-sm font-black leading-tight"
                              style={{ color: theme.tone === 'dark' ? '#ffffff' : '#0f172a' }}
                            >
                              {theme.name}
                            </span>
                            {isSelected && (
                              <span className="rounded-md bg-primary px-2 py-0.5 text-[10px] font-black text-primary-foreground uppercase shadow-sm">
                                Active
                              </span>
                            )}
                          </div>
                          <p
                            className="text-xs mt-1 leading-relaxed line-clamp-2"
                            style={{ color: theme.tone === 'dark' ? '#cbd5e1' : '#334155' }}
                          >
                            {theme.description}
                          </p>
                        </div>

                        {/* Swatch dots */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className="h-5 w-5 rounded-full border-2 border-white/30 shadow-md"
                            style={{ backgroundColor: theme.previewCard }}
                          />
                          <span
                            className="h-5 w-5 rounded-full border-2 border-white/30 shadow-md"
                            style={{ backgroundColor: theme.previewAccent }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: LAYOUT & SCREEN SETTINGS */}
            {workbenchTab === 'layout' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-black tracking-tight">Screen Settings</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Adjust screen orientation, titles, and layout options.
                  </p>
                </div>

                {/* Screen Orientation */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Monitor Orientation
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateActiveScreen({ orientation: 'landscape' })}
                      className={cn(
                        'flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition-all',
                        activeScreen.orientation === 'landscape'
                          ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/40'
                          : 'border-border hover:border-primary/40 text-muted-foreground',
                      )}
                    >
                      <Monitor className="h-4 w-4" />
                      Wide (16:9 Landscape)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateActiveScreen({ orientation: 'portrait' })}
                      className={cn(
                        'flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition-all',
                        activeScreen.orientation === 'portrait'
                          ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/40'
                          : 'border-border hover:border-primary/40 text-muted-foreground',
                      )}
                    >
                      <Smartphone className="h-4 w-4" />
                      Tall (9:16 Portrait)
                    </button>
                  </div>
                </div>

                {/* Custom Screen Title & Message */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold">Screen Title</label>
                    <Input
                      value={activeScreen.customTitle || ''}
                      onChange={(e) => handleUpdateActiveScreen({ customTitle: e.target.value })}
                      placeholder="e.g. Hall of Fame, Main Lobby Screen"
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold">Subtitle / Banner Message</label>
                    <Input
                      value={activeScreen.customMessage || ''}
                      onChange={(e) => handleUpdateActiveScreen({ customMessage: e.target.value })}
                      placeholder="e.g. Learn, level up, and lead today!"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                {/* Preset & Template Connection Card */}
                <div className="rounded-2xl border-2 border-border/80 bg-muted/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                      Preset Template
                    </span>
                    {activeScreen.isReadyMade ? (
                      <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase">
                        Official Preset
                      </span>
                    ) : (
                      <span className="rounded-full bg-primary/15 border border-primary/30 px-2.5 py-0.5 text-[10px] font-black text-primary uppercase">
                        Custom Screen
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {activeScreen.isReadyMade
                      ? isPresetModified
                        ? `This preset has custom overrides saved. You can revert it to the original defaults at any time.`
                        : `This preset is running on standard factory defaults.`
                      : `Created from "${activeScreen.presetKey || 'hall-of-fame'}" starter template.`}
                  </p>

                  {activeScreen.isReadyMade ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleResetPreset(activeScreen.id)}
                      disabled={!isPresetModified}
                      className="w-full gap-2 rounded-xl text-xs font-bold shadow-2xs"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                      {isPresetModified ? 'Reset to Default Preset' : 'Already at Factory Default'}
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleApplyPresetToActive(activeScreen.presetKey || 'hall-of-fame')}
                        className="w-full gap-2 rounded-xl text-xs font-bold shadow-2xs"
                      >
                        <Wand2 className="h-3.5 w-3.5 text-primary" />
                        Re-apply Starter Layout
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteScreen(activeScreen.id, activeScreen.name)}
                        className="w-full gap-2 rounded-xl text-xs font-bold"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete This Screen
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT CANVAS: RESPONSIVE SCALED TV PREVIEW */}
        <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-950/25 overflow-hidden relative">
          {/* Canvas Floating Top Bar */}
          <div className="absolute top-4 right-6 flex items-center gap-2 z-10 bg-background/80 backdrop-blur-md rounded-2xl border p-1.5 shadow-md">
            <button
              type="button"
              onClick={() => handleUpdateActiveScreen({ orientation: 'landscape' })}
              className={cn(
                'flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold transition-all',
                activeScreen.orientation === 'landscape'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Monitor className="h-3.5 w-3.5" />
              Wide TV
            </button>
            <button
              type="button"
              onClick={() => handleUpdateActiveScreen({ orientation: 'portrait' })}
              className={cn(
                'flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold transition-all',
                activeScreen.orientation === 'portrait'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Smartphone className="h-3.5 w-3.5" />
              Tall Kiosk
            </button>
          </div>

          {/* Scaled TV Monitor Bezel */}
          <div
            className={cn(
              'relative flex flex-col overflow-hidden rounded-[2.5rem] border-[12px] border-slate-900 bg-slate-950 shadow-2xl ring-1 ring-white/10 transition-all duration-300',
              activeScreen.orientation === 'landscape'
                ? 'w-full max-w-[1140px] aspect-[16/9]'
                : 'h-full max-h-[760px] aspect-[9/16]',
            )}
          >
            <ModularDisplayView
              config={activeScreen}
              feed={liveFeed}
              variant="preview"
              className="h-full w-full overflow-y-auto"
            />
          </div>
        </main>
      </div>

      {/* CREATE NEW SCREEN MODAL */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black tracking-tight">Create New Screen</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add a custom hallway TV display. Choose a starter layout or start fresh.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <label htmlFor="screen-name" className="text-xs font-bold">
                Screen Name
              </label>
              <Input
                id="screen-name"
                value={newScreenName}
                onChange={(e) => setNewScreenName(e.target.value)}
                placeholder="e.g. Front Entrance TV, Cafeteria Monitor, Gym Leaderboard"
                className="h-10 text-sm"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold">Starter Preset Template</label>
              <div className="grid grid-cols-1 gap-2.5">
                {DISPLAY_PRESET_CATALOG.map((preset) => {
                  const isSelected = newScreenPreset === preset.key;
                  const Icon = preset.icon;
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => setNewScreenPreset(preset.key)}
                      className={cn(
                        'flex items-center justify-between gap-3 rounded-2xl border-2 p-3 text-left transition-all',
                        isSelected
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/30 shadow-md'
                          : 'border-border/80 bg-background/60 hover:border-primary/40 hover:bg-muted/30',
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                            preset.accentColor === 'amber'
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                              : preset.accentColor === 'sky'
                              ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                              : 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-foreground">{preset.name}</span>
                            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground">
                              {preset.defaultModulesCount} modules
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-tight line-clamp-1 mt-0.5">
                            {preset.description}
                          </p>
                        </div>
                      </div>

                      <div
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                          isSelected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-muted-foreground/30',
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCreateScreen}>
              Create Screen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
