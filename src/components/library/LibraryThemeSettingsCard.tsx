'use client';

import { useRef, useState, type ReactNode } from 'react';
import { Check, ImageIcon, Loader2, Palette, Sparkles, Monitor, Type, RotateCcw, Trash2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  StaffPortalTabInfoPopover,
  staffPortalTabInfoSection,
} from '@/components/staff/StaffPortalTabInfoPopover';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useAppContext } from '@/components/AppProvider';
import { useFunctions } from '@/firebase';
import {
  LIBRARY_THEME_IDS,
  LIBRARY_THEMES,
  resolveLibraryTheme,
  type LibraryThemeId,
  type LibraryStyleCategory,
} from '@/lib/library/libraryThemes';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  DEFAULT_LIBRARY_HUB_COPY,
  patchLibraryHubCopy,
  resolveLibraryHubCopy,
  type LibraryHubCopyField,
} from '@/lib/library/libraryHubCopy';
import {
  LIBRARY_BACKGROUND_DIM_DEFAULT,
  clampLibraryBackgroundDim,
  sanitizeLibraryBackgroundImageUrl,
} from '@/lib/library/libraryBackground';
import {
  clearLibraryBackgroundImage,
  uploadLibraryBackgroundImage,
} from '@/lib/library/libraryBackgroundUpload';

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
  const { schoolId } = useAppContext();
  const functions = useFunctions();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | LibraryStyleCategory>('all');
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);
  const [backgroundUrlDraft, setBackgroundUrlDraft] = useState('');
  const currentThemeId = (settings.libraryTheme as LibraryThemeId) || 'classic_oak';
  const currentTheme = resolveLibraryTheme(currentThemeId);
  const matchKiosk = settings.libraryThemeMatchKiosk !== false;
  const backgroundUrl = sanitizeLibraryBackgroundImageUrl(settings.libraryBackgroundImageUrl);
  const backgroundDim = clampLibraryBackgroundDim(settings.libraryBackgroundDim);

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

      <AccordionItem value="background-photo" className="rounded-2xl border border-dashed bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 pr-3">
          <AccordionTrigger className="flex-1 px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2.5 text-left">
              <div className="rounded-xl bg-primary/10 p-2 text-primary shrink-0">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base font-bold">Background picture</div>
                <p className="text-xs sm:text-sm text-muted-foreground font-normal mt-0.5">
                  Put a photo behind the library pages — like wallpaper on a wall. Words stay on top so they stay easy to read.
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <StaffPortalTabInfoPopover
            sections={[
              staffPortalTabInfoSection(
                'Pick a photo of your library, a mural, or any calm picture. We fade your theme color over it so names and buttons stay clear.',
              ),
              staffPortalTabInfoSection(
                'The same picture shows on the library home, the desk, the catalog, and the student station when kiosk matching is on.',
              ),
            ]}
            ariaLabel="About the library background picture"
          />
        </div>
        <AccordionContent className="px-4 space-y-4">
          <div
            className={cn(
              'relative overflow-hidden border shadow-sm',
              currentTheme.uiClasses.cardRadius,
            )}
            style={{ backgroundColor: currentTheme.swatches.bg, color: currentTheme.swatches.text }}
          >
            <div className="relative aspect-[16/7] w-full">
              {backgroundUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={backgroundUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-xs font-semibold opacity-60">
                  No picture yet
                </div>
              )}
              <div
                className="absolute inset-0"
                style={{ backgroundColor: currentTheme.swatches.bg, opacity: backgroundDim / 100 }}
              />
              <div className="absolute inset-x-0 bottom-0 p-3">
                <p className="text-sm font-black drop-shadow-sm">Library preview</p>
                <p className="text-[11px] font-semibold opacity-80">This is how the picture sits behind the page.</p>
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/jpg"
            className="sr-only"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              if (!schoolId || !functions) {
                toast({
                  variant: 'destructive',
                  title: 'Could not add the picture',
                  description: 'Please refresh the page and try again.',
                });
                return;
              }
              try {
                setIsUploadingBackground(true);
                const imageUrl = await uploadLibraryBackgroundImage(functions, schoolId, file);
                updateSettings({ libraryBackgroundImageUrl: imageUrl });
                toast({
                  title: 'Background picture saved',
                  description: 'You will see it on the library pages.',
                });
              } catch (error) {
                toast({
                  variant: 'destructive',
                  title: 'Could not add the picture',
                  description: error instanceof Error ? error.message : 'Please try a smaller photo.',
                });
              } finally {
                setIsUploadingBackground(false);
              }
            }}
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="rounded-xl font-bold"
              disabled={isUploadingBackground || !schoolId}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploadingBackground ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
              {backgroundUrl ? 'Choose a new picture' : 'Choose a picture'}
            </Button>
            {backgroundUrl ? (
              <Button
                type="button"
                variant="outline"
                className="rounded-xl font-bold"
                disabled={isUploadingBackground}
                onClick={async () => {
                  try {
                    setIsUploadingBackground(true);
                    if (schoolId && functions) {
                      try {
                        await clearLibraryBackgroundImage(functions, schoolId);
                      } catch {
                        // Local clear still works if the live saver is not ready.
                      }
                    }
                    updateSettings({ libraryBackgroundImageUrl: '' });
                    toast({
                      title: 'Background picture removed',
                      description: 'The library pages use the plain theme color again.',
                    });
                  } finally {
                    setIsUploadingBackground(false);
                  }
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove picture
              </Button>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="library-background-url" className="text-xs font-bold">
              Or paste a picture link
            </Label>
            <Input
              id="library-background-url"
              value={backgroundUrlDraft || backgroundUrl || ''}
              onChange={(event) => setBackgroundUrlDraft(event.target.value)}
              onBlur={() => {
                const typed = backgroundUrlDraft.trim();
                if (!typed) {
                  if (backgroundUrl) updateSettings({ libraryBackgroundImageUrl: '' });
                  setBackgroundUrlDraft('');
                  return;
                }
                const next = sanitizeLibraryBackgroundImageUrl(typed);
                if (!next) {
                  toast({
                    variant: 'destructive',
                    title: 'That link will not work',
                    description: 'Please use a regular web picture link that starts with https.',
                  });
                  return;
                }
                updateSettings({ libraryBackgroundImageUrl: next });
                setBackgroundUrlDraft('');
                toast({
                  title: 'Background picture saved',
                  description: 'You will see it on the library pages.',
                });
              }}
              placeholder="https://..."
              className="rounded-xl font-mono text-xs"
            />
          </div>

          <div className="space-y-2 rounded-2xl border bg-muted/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="library-background-dim" className="text-sm font-bold">
                Keep words easy to read
              </Label>
              <span className="text-xs font-semibold text-muted-foreground">
                {backgroundDim >= 60 ? 'Strong fade' : backgroundDim >= 45 ? 'Balanced' : 'More picture'}
              </span>
            </div>
            <Slider
              id="library-background-dim"
              min={30}
              max={80}
              step={1}
              value={[backgroundDim]}
              onValueChange={([value]) => {
                updateSettings({
                  libraryBackgroundDim: clampLibraryBackgroundDim(value ?? LIBRARY_BACKGROUND_DIM_DEFAULT),
                });
              }}
              aria-label="How strongly to fade the background picture"
            />
            <p className="text-[11px] text-muted-foreground">
              Slide right if names look hard to read. Slide left to show more of the photo.
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="hub-copy" className="rounded-2xl border border-dashed bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 pr-3">
          <AccordionTrigger className="flex-1 px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2.5 text-left">
              <div className="rounded-xl bg-primary/10 p-2 text-primary shrink-0">
                <Type className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base font-bold">Front page wording</div>
                <p className="text-xs sm:text-sm text-muted-foreground font-normal mt-0.5">
                  Change the welcome line, the three door cards, and the buttons on the library home screen.
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <StaffPortalTabInfoPopover
            sections={[
              staffPortalTabInfoSection(
                'Leave a box blank to keep the built-in text. The little pill above the welcome line uses the school name unless you type something else.',
              ),
            ]}
            ariaLabel="About front page wording"
          />
        </div>
        <AccordionContent className="px-4 space-y-5">
          <LibraryHubCopyFields />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function LibraryHubCopyFields() {
  const { settings, updateSettings } = useSettings();
  const { toast } = useToast();
  const resolved = resolveLibraryHubCopy(settings.libraryHubCopy);

  const setField = (field: LibraryHubCopyField, value: string) => {
    updateSettings({
      libraryHubCopy: patchLibraryHubCopy(settings.libraryHubCopy, field, value),
    });
  };

  const resetAll = () => {
    updateSettings({ libraryHubCopy: {} });
    toast({
      title: 'Front page wording reset',
      description: 'The library home screen is using the built-in text again.',
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs font-bold" onClick={resetAll}>
          <RotateCcw className="h-3.5 w-3.5" />
          Reset all wording
        </Button>
      </div>

      <HubCopyGroup title="Welcome banner">
        <HubCopyInput
          id="hub-header-product"
          label="Word under the school name (top left)"
          value={settings.libraryHubCopy?.headerProduct ?? ''}
          placeholder={DEFAULT_LIBRARY_HUB_COPY.headerProduct}
          onChange={(v) => setField('headerProduct', v)}
        />
        <HubCopyInput
          id="hub-eyebrow"
          label="Small pill above the welcome title"
          hint="Leave blank to show the school name."
          value={settings.libraryHubCopy?.eyebrow ?? ''}
          placeholder={resolved.eyebrow || 'School name'}
          onChange={(v) => setField('eyebrow', v)}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <HubCopyInput
            id="hub-welcome-lead"
            label="Welcome title (first words)"
            value={settings.libraryHubCopy?.welcomeLead ?? ''}
            placeholder={DEFAULT_LIBRARY_HUB_COPY.welcomeLead}
            onChange={(v) => setField('welcomeLead', v)}
          />
          <HubCopyInput
            id="hub-welcome-highlight"
            label="Underlined title words"
            value={settings.libraryHubCopy?.welcomeHighlight ?? ''}
            placeholder={DEFAULT_LIBRARY_HUB_COPY.welcomeHighlight}
            onChange={(v) => setField('welcomeHighlight', v)}
          />
        </div>
        <HubCopyInput
          id="hub-intro"
          label="Sentence under the title"
          multiline
          value={settings.libraryHubCopy?.intro ?? ''}
          placeholder={DEFAULT_LIBRARY_HUB_COPY.intro}
          onChange={(v) => setField('intro', v)}
        />
        <HubCopyInput
          id="hub-enter"
          label="Button on each card"
          value={settings.libraryHubCopy?.enterLabel ?? ''}
          placeholder={DEFAULT_LIBRARY_HUB_COPY.enterLabel}
          onChange={(v) => setField('enterLabel', v)}
        />
        <HubCopyInput
          id="hub-footer"
          label="Small line at the bottom"
          value={settings.libraryHubCopy?.footer ?? ''}
          placeholder={DEFAULT_LIBRARY_HUB_COPY.footer}
          onChange={(v) => setField('footer', v)}
        />
      </HubCopyGroup>

      <HubCopyGroup title="Librarian card">
        <div className="grid gap-3 sm:grid-cols-2">
          <HubCopyInput
            id="hub-desk-title"
            label="Title"
            value={settings.libraryHubCopy?.deskTitle ?? ''}
            placeholder={DEFAULT_LIBRARY_HUB_COPY.deskTitle}
            onChange={(v) => setField('deskTitle', v)}
          />
          <HubCopyInput
            id="hub-desk-tagline"
            label="Small line under the title"
            value={settings.libraryHubCopy?.deskTagline ?? ''}
            placeholder={DEFAULT_LIBRARY_HUB_COPY.deskTagline}
            onChange={(v) => setField('deskTagline', v)}
          />
        </div>
        <HubCopyInput
          id="hub-desk-badge"
          label="Corner badge"
          value={settings.libraryHubCopy?.deskBadge ?? ''}
          placeholder={DEFAULT_LIBRARY_HUB_COPY.deskBadge}
          onChange={(v) => setField('deskBadge', v)}
        />
        <HubCopyInput
          id="hub-desk-desc"
          label="Description"
          multiline
          value={settings.libraryHubCopy?.deskDescription ?? ''}
          placeholder={DEFAULT_LIBRARY_HUB_COPY.deskDescription}
          onChange={(v) => setField('deskDescription', v)}
        />
      </HubCopyGroup>

      <HubCopyGroup title="Catalog card">
        <div className="grid gap-3 sm:grid-cols-2">
          <HubCopyInput
            id="hub-catalog-title"
            label="Title"
            value={settings.libraryHubCopy?.catalogTitle ?? ''}
            placeholder={DEFAULT_LIBRARY_HUB_COPY.catalogTitle}
            onChange={(v) => setField('catalogTitle', v)}
          />
          <HubCopyInput
            id="hub-catalog-tagline"
            label="Small line under the title"
            value={settings.libraryHubCopy?.catalogTagline ?? ''}
            placeholder={DEFAULT_LIBRARY_HUB_COPY.catalogTagline}
            onChange={(v) => setField('catalogTagline', v)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <HubCopyInput
            id="hub-catalog-badge"
            label="Badge when there is no count"
            value={settings.libraryHubCopy?.catalogBadge ?? ''}
            placeholder={DEFAULT_LIBRARY_HUB_COPY.catalogBadge}
            onChange={(v) => setField('catalogBadge', v)}
          />
          <HubCopyInput
            id="hub-catalog-copies"
            label="Word after the copy count"
            hint="Shown as “19 copies” on the badge."
            value={settings.libraryHubCopy?.catalogCopiesLabel ?? ''}
            placeholder={DEFAULT_LIBRARY_HUB_COPY.catalogCopiesLabel}
            onChange={(v) => setField('catalogCopiesLabel', v)}
          />
        </div>
        <HubCopyInput
          id="hub-catalog-desc"
          label="Description"
          multiline
          value={settings.libraryHubCopy?.catalogDescription ?? ''}
          placeholder={DEFAULT_LIBRARY_HUB_COPY.catalogDescription}
          onChange={(v) => setField('catalogDescription', v)}
        />
      </HubCopyGroup>

      <HubCopyGroup title="Student Station card">
        <div className="grid gap-3 sm:grid-cols-2">
          <HubCopyInput
            id="hub-kiosk-title"
            label="Title"
            value={settings.libraryHubCopy?.kioskTitle ?? ''}
            placeholder={DEFAULT_LIBRARY_HUB_COPY.kioskTitle}
            onChange={(v) => setField('kioskTitle', v)}
          />
          <HubCopyInput
            id="hub-kiosk-tagline"
            label="Small line under the title"
            value={settings.libraryHubCopy?.kioskTagline ?? ''}
            placeholder={DEFAULT_LIBRARY_HUB_COPY.kioskTagline}
            onChange={(v) => setField('kioskTagline', v)}
          />
        </div>
        <HubCopyInput
          id="hub-kiosk-badge"
          label="Corner badge"
          value={settings.libraryHubCopy?.kioskBadge ?? ''}
          placeholder={DEFAULT_LIBRARY_HUB_COPY.kioskBadge}
          onChange={(v) => setField('kioskBadge', v)}
        />
        <HubCopyInput
          id="hub-kiosk-desc"
          label="Description"
          multiline
          value={settings.libraryHubCopy?.kioskDescription ?? ''}
          placeholder={DEFAULT_LIBRARY_HUB_COPY.kioskDescription}
          onChange={(v) => setField('kioskDescription', v)}
        />
      </HubCopyGroup>
    </div>
  );
}

function HubCopyGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3 rounded-2xl border bg-muted/20 p-3.5">
      <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function HubCopyInput({
  id,
  label,
  hint,
  value,
  placeholder,
  onChange,
  multiline,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-bold">
        {label}
      </Label>
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
      {multiline ? (
        <Textarea
          id={id}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[72px] rounded-xl text-sm"
        />
      ) : (
        <Input
          id={id}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-xl"
        />
      )}
    </div>
  );
}
