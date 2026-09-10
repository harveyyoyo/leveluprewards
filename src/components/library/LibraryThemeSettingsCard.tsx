'use client';

import { useState } from 'react';
import { Check, Palette, Sparkles, Monitor, Smile, Briefcase, BookOpen, Moon, LayoutGrid, PanelLeft } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  StaffPortalTabInfoPopover,
  staffPortalTabInfoSection,
} from '@/components/staff/StaffPortalTabInfoPopover';
import { useSettings } from '@/components/providers/SettingsProvider';
import {
  LIBRARY_THEME_IDS,
  LIBRARY_THEMES,
  resolveLibraryTheme,
  type LibraryThemeId,
  type LibraryStyleCategory,
} from '@/lib/library/libraryThemes';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const STYLE_FILTERS: { id: 'all' | LibraryStyleCategory; label: string; icon: string }[] = [
  { id: 'all', label: 'All Themes', icon: '🎨' },
  { id: 'fun', label: 'Fun & Playful', icon: '🎈' },
  { id: 'pro', label: 'Pro & Modern', icon: '💼' },
  { id: 'classic', label: 'Classic & Cozy', icon: '☕' },
  { id: 'cyber', label: 'Dark & Cyber', icon: '🌙' },
];

export function LibraryThemeSettingsCard() {
  const { settings, updateSettings } = useSettings();
  const { toast } = useToast();
  const [activeFilter, setActiveFilter] = useState<'all' | LibraryStyleCategory>('all');
  const currentThemeId = (settings.libraryTheme as LibraryThemeId) || 'classic_oak';
  const currentTheme = resolveLibraryTheme(currentThemeId);
  const matchKiosk = settings.libraryThemeMatchKiosk !== false;
  const layoutStyle = (settings.libraryLayoutStyle as 'sidebar' | 'hub') || 'sidebar';

  const handleSelectTheme = (themeId: LibraryThemeId) => {
    updateSettings({ libraryTheme: themeId });
    const selected = resolveLibraryTheme(themeId);
    toast({
      title: `${selected.label} theme applied`,
      description: `${selected.styleName} look-and-feel activated: ${selected.tagline}`,
    });
  };

  const handleToggleKioskMatch = (enabled: boolean) => {
    updateSettings({ libraryThemeMatchKiosk: enabled });
    toast({
      title: enabled ? 'Kiosk theme sync enabled' : 'Kiosk theme sync disabled',
      description: enabled
        ? 'Student self-checkout stations will use the library theme and style.'
        : 'Student self-checkout will use default system colors.',
    });
  };

  const filteredThemeIds = LIBRARY_THEME_IDS.filter((id) => {
    if (activeFilter === 'all') return true;
    return LIBRARY_THEMES[id].styleCategory === activeFilter;
  });

  return (
    <Accordion type="single" collapsible className="space-y-3">
      <AccordionItem value="layout" className="rounded-2xl border border-dashed bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 pr-3">
          <AccordionTrigger className="flex-1 px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2.5 text-left">
              <div className="rounded-xl bg-primary/10 p-2 text-primary shrink-0">
                <LayoutGrid className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base font-bold flex flex-wrap items-center gap-2">
                  <span>Navigation Layout</span>
                  <Badge variant="outline" className="font-bold text-xs bg-primary/5 text-primary border-primary/20">
                    {layoutStyle === 'hub' ? 'Portal Hub' : 'Sidebar'}
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground font-normal mt-0.5">
                  Choose how staff navigate the library: a classic sidebar with tabs, or a Portal Hub landing screen with big Librarian, Catalog, and Student Kiosk cards.
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <StaffPortalTabInfoPopover
            sections={[
              staffPortalTabInfoSection(
                'Sidebar keeps every station one click away in a persistent left nav. Portal Hub matches the main LevelUp portal style — pick a big card, then use the back button to return home.',
              ),
            ]}
            ariaLabel="About navigation layout"
          />
        </div>
        <AccordionContent className="px-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => updateSettings({ libraryLayoutStyle: 'sidebar' })}
              className={cn(
                'group relative flex items-center gap-3 rounded-2xl border p-4 text-left transition-all hover:shadow-md',
                layoutStyle === 'sidebar'
                  ? 'border-primary ring-2 ring-primary/30 bg-primary/5 shadow-sm'
                  : 'border-border bg-card hover:border-primary/50',
              )}
              aria-pressed={layoutStyle === 'sidebar'}
            >
              <div className="h-11 w-11 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <PanelLeft className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-black text-sm tracking-tight text-foreground">Sidebar</h4>
                  {layoutStyle === 'sidebar' && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs shrink-0">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Classic left-nav with every station always visible.</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => updateSettings({ libraryLayoutStyle: 'hub' })}
              className={cn(
                'group relative flex items-center gap-3 rounded-2xl border p-4 text-left transition-all hover:shadow-md',
                layoutStyle === 'hub'
                  ? 'border-primary ring-2 ring-primary/30 bg-primary/5 shadow-sm'
                  : 'border-border bg-card hover:border-primary/50',
              )}
              aria-pressed={layoutStyle === 'hub'}
            >
              <div className="h-11 w-11 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <LayoutGrid className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-black text-sm tracking-tight text-foreground">Portal Hub</h4>
                  {layoutStyle === 'hub' && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs shrink-0">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Big Librarian / Catalog / Student Kiosk cards, like the main LevelUp portal.</p>
              </div>
            </button>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="theme" className="rounded-2xl border border-dashed bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 pr-3">
          <AccordionTrigger className="flex-1 px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2.5 text-left">
              <div className="rounded-xl bg-primary/10 p-2 text-primary shrink-0">
                <Palette className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base font-bold flex flex-wrap items-center gap-2">
                  <span>Ambiance &amp; Reading Themes</span>
                  <Badge variant="outline" className="font-bold text-xs bg-primary/5 text-primary border-primary/20">
                    {currentTheme.label} · {currentTheme.styleName}
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground font-normal mt-0.5">
                  Customize the look, feel, and personality of the library. Themes alter shapes, corner curves, badges, and colors for fun playful elementary spaces or sleek academic media centers.
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <StaffPortalTabInfoPopover
            sections={[
              staffPortalTabInfoSection(
                'Themes define the entire aesthetic of the workspace—including corner roundness, button styles, badges, and color palettes.',
              ),
              staffPortalTabInfoSection(
                'All themes strictly satisfy WCAG AA contrast standards (>= 4.5:1 ratio) for clear text readability.',
              ),
            ]}
            ariaLabel="About library themes"
          />
        </div>
        <AccordionContent className="px-4 space-y-6">
          {/* Look-and-Feel Style Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-muted/40 border">
            {STYLE_FILTERS.map((filter) => {
              const isActive = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveFilter(filter.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all',
                    isActive
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  )}
                >
                  <span>{filter.icon}</span>
                  <span>{filter.label}</span>
                </button>
              );
            })}
          </div>

          {/* Theme Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredThemeIds.map((id) => {
              const theme = LIBRARY_THEMES[id];
              const isSelected = id === currentThemeId;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleSelectTheme(id)}
                  className={cn(
                    'group relative flex flex-col justify-between border p-4 text-left transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    theme.uiClasses.cardRadius,
                    isSelected
                      ? 'border-primary ring-2 ring-primary/30 bg-primary/5 shadow-sm'
                      : 'border-border bg-card hover:border-primary/50'
                  )}
                  aria-pressed={isSelected}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-2xl" role="img" aria-label={theme.label}>
                        {theme.icon}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="secondary"
                          className={cn('text-[10px] font-bold border', theme.uiClasses.badgeRadius)}
                        >
                          {theme.styleName}
                        </Badge>
                        {isSelected && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                    </div>
                    <h4 className="font-black text-sm tracking-tight text-foreground">{theme.label}</h4>
                    <p className="text-xs font-semibold text-muted-foreground mt-0.5">{theme.tagline}</p>
                    <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-2">{theme.description}</p>
                  </div>

                  {/* Look & Feel preview */}
                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="h-4 w-4 rounded-full border border-black/10 shadow-inner shrink-0"
                        style={{ backgroundColor: theme.swatches.bg }}
                        title="Background"
                      />
                      <div
                        className="h-4 w-4 rounded-full border border-black/10 shadow-inner shrink-0"
                        style={{ backgroundColor: theme.swatches.primary }}
                        title="Primary Accent"
                      />
                      <div
                        className="h-4 w-4 rounded-full border border-black/10 shadow-inner shrink-0"
                        style={{ backgroundColor: theme.swatches.secondary }}
                        title="Secondary Tone"
                      />
                      <div
                        className="h-4 w-4 rounded-full border border-black/10 shadow-inner shrink-0"
                        style={{ backgroundColor: theme.swatches.text }}
                        title="Text Contrast"
                      />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground font-semibold">
                      {theme.uiClasses.cardRadius}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Live Theme Look-and-Feel Preview Banner */}
          <div
            className={cn('border p-4 sm:p-5 transition-all shadow-sm', currentTheme.uiClasses.cardRadius)}
            style={{ backgroundColor: currentTheme.swatches.bg, color: currentTheme.swatches.text }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 shrink-0" style={{ color: currentTheme.swatches.primary }} />
                <span className="text-xs font-black uppercase tracking-wider" style={{ color: currentTheme.swatches.primary }}>
                  Active Style: {currentTheme.styleName} ({currentTheme.label})
                </span>
              </div>
              <span className="text-xs font-semibold opacity-80">{currentTheme.uiClasses.greeting}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className={cn('border p-3.5 shadow-sm', currentTheme.classes.card, currentTheme.uiClasses.cardRadius)}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold">Library Desk</span>
                  <span className={cn('text-[10px] font-bold border', currentTheme.classes.badge, currentTheme.uiClasses.badgeRadius)}>
                    Ready
                  </span>
                </div>
                <p className="text-xs opacity-75">Scans student IDs and barcodes in {currentTheme.styleName.toLowerCase()} mode</p>
              </div>

              <div className={cn('border p-3.5 shadow-sm', currentTheme.classes.card, currentTheme.uiClasses.cardRadius)}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold">Catalog Books</span>
                  <span className="text-xs font-mono font-bold" style={{ color: currentTheme.swatches.primary }}>
                    Active
                  </span>
                </div>
                <p className="text-xs opacity-75">Selection-driven action dock &amp; cover showcase</p>
              </div>

              <div className={cn('border p-3.5 shadow-sm flex flex-col justify-between', currentTheme.classes.card, currentTheme.uiClasses.cardRadius)}>
                <div className="text-xs font-bold mb-2">Style Test Button</div>
                <button
                  type="button"
                  className={cn('w-full py-1.5 px-3 text-xs font-bold transition-all shadow-sm', currentTheme.classes.button, currentTheme.uiClasses.buttonRadius)}
                  onClick={() => handleSelectTheme(currentTheme.id)}
                >
                  {currentTheme.styleName} Style
                </button>
              </div>
            </div>
          </div>

          {/* Kiosk Integration Toggle */}
          <div className="flex items-center justify-between gap-4 rounded-2xl border bg-muted/30 p-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-primary" />
                <p className="text-sm font-bold">Match Self-Checkout Kiosk</p>
              </div>
              <p className="text-xs text-muted-foreground">
                When enabled, student stations at <code className="font-mono text-[11px] bg-muted px-1 py-0.5 rounded">/[school]/library</code> also reflect the {currentTheme.label} ({currentTheme.styleName}) look and feel.
              </p>
            </div>
            <Switch checked={matchKiosk} onCheckedChange={handleToggleKioskMatch} />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
