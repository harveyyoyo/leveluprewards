'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Copy,
  Crown,
  LayoutGrid,
  Monitor,
  MonitorPlay,
  Palette,
  Plus,
  RotateCcw,
  Smartphone,
  Sliders,
  Trash2,
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
import { useSettings } from '@/components/providers/SettingsProvider';
import { displaysFeatureEnabled } from '@/lib/displays/displayRoutes';
import { schoolPortalHref } from '@/lib/officePublicUrl';
import { useToast } from '@/hooks/use-toast';
import {
  DARK_THEMES,
  DISPLAY_MODULE_CATALOG,
  LIGHT_THEMES,
  READY_MADE_PRESET_SCREENS,
  buildDefaultScreenConfig,
  type DisplayModuleKey,
  type ModularScreenConfig,
  type ModularThemeId,
  type ScreenOrientation,
} from '@/lib/displays/modularDisplaySchema';
import { useDisplaysLiveFeed } from '@/hooks/useDisplaysLiveFeed';
import { ModularDisplayView } from '@/components/displays/modular/ModularDisplayView';

type WorkbenchTab = 'modules' | 'themes' | 'layout';

export default function DisplaysRealmPage() {
  const params = useParams();
  const schoolId = String(params.schoolId || '');
  const { settings, updateSettings } = useSettings();
  const { toast } = useToast();

  // Consolidated live feed data for preview & screens
  const liveFeed = useDisplaysLiveFeed(schoolId);

  // Active screen state
  const [activeScreenId, setActiveScreenId] = useState<string>('hall-of-fame');
  const [workbenchTab, setWorkbenchTab] = useState<WorkbenchTab>('modules');
  const [themeToneTab, setThemeToneTab] = useState<'dark' | 'light'>('dark');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newScreenName, setNewScreenName] = useState('');
  const [newScreenPreset, setNewScreenPreset] = useState<'hall-of-fame' | 'smart-screen' | 'bulletin-board'>(
    'hall-of-fame',
  );
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
    toast({
      title: 'Preset Reset',
      description: `Restored default configuration for "${activeScreen.name}".`,
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
        <div className="flex items-center gap-2 overflow-x-auto py-1 px-2 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {allScreens.map((screen) => {
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
                {screen.isReadyMade && (
                  <span
                    className={cn(
                      'rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider',
                      isActive ? 'bg-black/30 text-white' : 'bg-background text-muted-foreground border border-border/60',
                    )}
                  >
                    Preset
                  </span>
                )}
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
          {/* Drawer Navigation Tabs */}
          <div className="flex border-b border-border/80 bg-muted/30 p-2.5 gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setWorkbenchTab('modules')}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs sm:text-sm font-black transition-all',
                workbenchTab === 'modules'
                  ? 'bg-background text-foreground shadow-md ring-1 ring-border'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <LayoutGrid className="h-4 w-4" />
              Modules ({activeScreen.enabledModules?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setWorkbenchTab('themes')}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs sm:text-sm font-black transition-all',
                workbenchTab === 'themes'
                  ? 'bg-background text-foreground shadow-md ring-1 ring-border'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Palette className="h-4 w-4" />
              Themes
            </button>
            <button
              type="button"
              onClick={() => setWorkbenchTab('layout')}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs sm:text-sm font-black transition-all',
                workbenchTab === 'layout'
                  ? 'bg-background text-foreground shadow-md ring-1 ring-border'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Sliders className="h-4 w-4" />
              Settings
            </button>
          </div>

          {/* Drawer Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
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

                {/* Screen Management Actions */}
                <div className="pt-4 border-t border-border/80 space-y-2">
                  {activeScreen.isReadyMade ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleResetPreset(activeScreen.id)}
                      className="w-full gap-2 rounded-xl text-xs font-semibold text-muted-foreground"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset to Default Preset
                    </Button>
                  ) : (
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

            <div className="space-y-1.5">
              <label className="text-xs font-bold">Starter Preset</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'hall-of-fame' as const, name: 'Hall of Fame', icon: Crown },
                  { id: 'smart-screen' as const, name: 'Smart Screen', icon: Monitor },
                  { id: 'bulletin-board' as const, name: 'Bulletin Board', icon: Tv },
                ].map((preset) => {
                  const isSelected = newScreenPreset === preset.id;
                  const Icon = preset.icon;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setNewScreenPreset(preset.id)}
                      className={cn(
                        'flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-center transition-all',
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/40'
                          : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs font-bold leading-tight">{preset.name}</span>
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
