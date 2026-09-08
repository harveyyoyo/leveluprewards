'use client';

import { Check, Palette, Sparkles, Monitor } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
} from '@/lib/library/libraryThemes';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export function LibraryThemeSettingsCard() {
  const { settings, updateSettings } = useSettings();
  const { toast } = useToast();
  const currentThemeId = (settings.libraryTheme as LibraryThemeId) || 'classic_oak';
  const currentTheme = resolveLibraryTheme(currentThemeId);
  const matchKiosk = settings.libraryThemeMatchKiosk !== false;

  const handleSelectTheme = (themeId: LibraryThemeId) => {
    updateSettings({ libraryTheme: themeId });
    const selected = resolveLibraryTheme(themeId);
    toast({
      title: `${selected.label} theme applied`,
      description: selected.description,
    });
  };

  const handleToggleKioskMatch = (enabled: boolean) => {
    updateSettings({ libraryThemeMatchKiosk: enabled });
    toast({
      title: enabled ? 'Kiosk theme sync enabled' : 'Kiosk theme sync disabled',
      description: enabled
        ? 'Student self-checkout stations will use the library theme.'
        : 'Student self-checkout will use default system colors.',
    });
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Library Theme &amp; Atmosphere
                <Badge variant="outline" className="font-normal text-xs">
                  {currentTheme.label}
                </Badge>
              </CardTitle>
              <CardDescription>
                Customize colors and reading ambiance across the library workspace and self-checkout kiosks.
              </CardDescription>
            </div>
          </div>
          <StaffPortalTabInfoPopover
            sections={[
              staffPortalTabInfoSection(
                'Choose a curated theme designed for high text legibility and comfortable reading in scholastic spaces.',
              ),
              staffPortalTabInfoSection(
                'All themes strictly satisfy WCAG AA contrast standards (>= 4.5:1 ratio) for accessibility.',
              ),
            ]}
            ariaLabel="About library themes"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {LIBRARY_THEME_IDS.map((id) => {
            const theme = LIBRARY_THEMES[id];
            const isSelected = id === currentThemeId;

            return (
              <button
                key={id}
                type="button"
                onClick={() => handleSelectTheme(id)}
                className={cn(
                  'group relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isSelected
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-sm'
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
                      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        {theme.tone}
                      </span>
                      {isSelected && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </div>
                  <h4 className="font-bold text-sm tracking-tight text-foreground">{theme.label}</h4>
                  <p className="text-xs font-medium text-muted-foreground mt-0.5">{theme.tagline}</p>
                  <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-2">{theme.description}</p>
                </div>

                {/* Swatches preview bar */}
                <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-1.5">
                  <div
                    className="h-4 w-4 rounded-full border border-black/10 shadow-inner"
                    style={{ backgroundColor: theme.swatches.bg }}
                    title="Background"
                  />
                  <div
                    className="h-4 w-4 rounded-full border border-black/10 shadow-inner"
                    style={{ backgroundColor: theme.swatches.primary }}
                    title="Primary Accent"
                  />
                  <div
                    className="h-4 w-4 rounded-full border border-black/10 shadow-inner"
                    style={{ backgroundColor: theme.swatches.secondary }}
                    title="Secondary Tone"
                  />
                  <div
                    className="h-4 w-4 rounded-full border border-black/10 shadow-inner"
                    style={{ backgroundColor: theme.swatches.text }}
                    title="Text Contrast"
                  />
                  <span className="ml-auto text-[10px] text-muted-foreground/60 font-mono">4.5+ : 1</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Live Theme Preview Banner */}
        <div className="rounded-2xl border p-4 sm:p-5 transition-colors" style={{ backgroundColor: currentTheme.swatches.bg, color: currentTheme.swatches.text }}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color: currentTheme.swatches.primary }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: currentTheme.swatches.primary }}>
                Live Ambiance Preview — {currentTheme.label}
              </span>
            </div>
            <span className="text-xs opacity-75">{currentTheme.tagline}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={cn('rounded-xl border p-3.5 shadow-sm', currentTheme.classes.card)}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold">Circulation Desk</span>
                <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold border', currentTheme.classes.badge)}>
                  Ready
                </span>
              </div>
              <p className="text-xs opacity-70">Ready to scan student IDs and book barcodes</p>
            </div>

            <div className={cn('rounded-xl border p-3.5 shadow-sm', currentTheme.classes.card)}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold">Catalog Books</span>
                <span className="text-xs font-mono font-bold" style={{ color: currentTheme.swatches.primary }}>
                  350 Copies
                </span>
              </div>
              <p className="text-xs opacity-70">Overdue alerts and loan tracking active</p>
            </div>

            <div className={cn('rounded-xl border p-3.5 shadow-sm flex flex-col justify-between', currentTheme.classes.card)}>
              <div className="text-xs font-semibold mb-2">Self-Checkout Kiosk</div>
              <button
                type="button"
                className={cn('w-full py-1.5 px-3 rounded-lg text-xs font-semibold transition-all shadow-sm', currentTheme.classes.button)}
                onClick={() => handleSelectTheme(currentTheme.id)}
              >
                Scan Book
              </button>
            </div>
          </div>
        </div>

        {/* Kiosk Integration Toggle */}
        <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/30 p-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Match Self-Checkout Kiosk</p>
            </div>
            <p className="text-xs text-muted-foreground">
              When enabled, student stations at <code className="font-mono text-[11px] bg-muted px-1 py-0.5 rounded">/[school]/library</code> also reflect the {currentTheme.label} atmosphere.
            </p>
          </div>
          <Switch checked={matchKiosk} onCheckedChange={handleToggleKioskMatch} />
        </div>
      </CardContent>
    </Card>
  );
}
