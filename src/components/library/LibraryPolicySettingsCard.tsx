'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  BookMarked,
  BookOpen,
  Camera,
  Check,
  CheckCircle2,
  Coins,
  Edit2,
  Layers,
  Library,
  MapPin,
  MessageSquare,
  Play,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  RotateCcw,
  ScanBarcode,
  Search,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DEFAULT_LIBRARY_GENRES,
  DEFAULT_LIBRARY_PLACEMENT_ZONES,
  furnitureNameForShelf,
  genresLookLegacy,
  getActiveLibraryGenres,
  generateGenreBarcode,
  migrateFurnitureOnlySetup,
  placementLooksLegacy,
  type LibraryGenreConfig,
  type BarcodeNumberScheme,
} from '@/lib/library/libraryClassification';
import {
  LIBRARY_ORGANIZATION_SCHEMES,
  resolveLibraryOrganizationScheme,
  type LibraryOrganizationScheme,
} from '@/lib/library/libraryOrganization';
import {
  StaffPortalTabInfoPopover,
  staffPortalTabInfoSection,
} from '@/components/staff/StaffPortalTabInfoPopover';
import { getLibraryLabelOption, LIBRARY_LABEL_OPTIONS, type LibraryLabelFormat } from '@/lib/library/libraryScanCode';
import {
  enabledLibraryLabelFormats,
  enabledLibraryLabelOptions,
  LIBRARY_LABEL_FIELD_COPY,
  LIBRARY_LABEL_FIELD_IDS,
  resolveDefaultLibraryLabelFormat,
  resolveLibraryLabelFields,
  type LibraryLabelFieldId,
} from '@/lib/library/libraryLabelSettings';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useToast } from '@/hooks/use-toast';
import {
  LIBRARY_REWARD_MODE_LABELS,
  resolveLibraryRewardMode,
  resolveLibraryCheckoutBarcodeMode,
  type LibraryRewardMode,
} from '@/lib/library/libraryPolicy';
import {
  LIBRARY_STUDENT_NAME_DISPLAY_LABELS,
  LIBRARY_STUDENT_THEME_DISPLAY_LABELS,
  type LibraryStudentNameDisplayMode,
  type LibraryStudentThemeDisplay,
} from '@/lib/library/libraryStudentDisplay';
import {
  LIBRARY_LATE_RESPONSES,
  LIBRARY_LATE_SOUNDS,
  LIBRARY_ON_TIME_RESPONSES,
  LIBRARY_ON_TIME_SOUNDS,
  playLibraryReturnAudio,
  resolveLibraryReturnFeedback,
  type LibraryReturnResponseLateMode,
  type LibraryReturnResponseOnTimeMode,
  type LibraryReturnSoundLateId,
  type LibraryReturnSoundOnTimeId,
} from '@/lib/library/libraryAudio';
import type { Category } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type SettingsSectionDef = {
  id: string;
  title: string;
  description: string;
  keywords: string[];
};

const LIBRARY_SETTINGS_SECTIONS: SettingsSectionDef[] = [
  {
    id: 'circulation',
    title: 'Circulation & Loan Policies',
    description: 'Configure borrowing limits, renewal rules, loan duration, and barcode requirements.',
    keywords: [
      'borrow', 'loan', 'loan period', 'days', 'due date', 'max books', 'quota', 'limit',
      'renewal', 'renew', 'grace period', 'overdue', 'multiple copies',
      'barcode', 'isbn', 'printed barcode', 'stickers', 'checkout', 'smart auto-detect',
      'checkout requirement', 'code requirement', 'book requirement',
    ],
  },
  {
    id: 'sync',
    title: 'Sync with LevelUp App',
    description: 'Connect library loans, points, and fines to the student rewards system.',
    keywords: [
      'sync', 'rewards', 'points', 'app', 'levelup', 'school points', 'balance', 'fines only',
      'category', 'connected', 'integrate',
    ],
  },
  {
    id: 'hardware',
    title: 'Hardware, Scanners & Kiosks',
    description: 'Setup barcode readers, camera scanners, student check-in desks, and self-checkout stations.',
    keywords: [
      'hardware', 'scanner', 'camera', 'webcam', 'kiosk', 'self checkout', 'self-checkout',
      'drop box', 'dropbox', 'drop-box', 'station', 'portal', 'scan speed', 'wedge', 'reader',
    ],
  },
  {
    id: 'audio',
    title: 'Audio & Return Responses',
    description: 'Configure chime sound effects and congratulatory messages displayed when books are returned.',
    keywords: [
      'audio', 'sound', 'sounds', 'sfx', 'chime', 'volume', 'voice', 'return message',
      'on-time return', 'congratulations', 'feedback', 'cheer', 'celebrate',
    ],
  },
  {
    id: 'fines',
    title: 'Late Fees & Rewards',
    description: 'Decide if late fees apply, how many points are charged, and reward points for on-time returns.',
    keywords: [
      'fine', 'fines', 'late fee', 'late fees', 'penalty', 'points per day', 'cap', 'max fine',
      'on-time points', 'bonus points', 'waiver', 'waive reason',
    ],
  },
  {
    id: 'cataloging',
    title: 'Labels & Spine Stickers',
    description: 'Choose label printing sizes and information printed on your book spine stickers.',
    keywords: [
      'label', 'labels', 'sticker', 'stickers', 'print', 'printer', 'spine', 'avery 5160',
      'avery 5167', 'avery 5163', 'thermal', 'pocket slip', 'bookplate', 'call number', 'dewey',
      'banner', 'color banner', 'barcode scheme',
    ],
  },
  {
    id: 'genre',
    title: 'Genres & Shelving Zones',
    description: 'Manage physical shelving places in your library and set color-coded book categories.',
    keywords: [
      'genre', 'genres', 'shelves', 'shelf', 'shelving', 'location', 'place', 'furniture',
      'stacks', 'color', 'prefix', 'call prefix', 'categories', 'zones',
    ],
  },
  {
    id: 'alerts',
    title: 'Overdue Alerts & Reminders',
    description: 'Configure automated reminder notices and milestone celebrations for student reading.',
    keywords: [
      'alert', 'alerts', 'reminder', 'reminders', 'notice', 'email', 'teacher', 'overdue notice',
      'milestones', 'reading goals', 'celebration',
    ],
  },
];

const QUICK_SEARCH_CHIPS = [
  { label: 'Barcodes & ISBN', query: 'barcode' },
  { label: 'Loan Period', query: 'loan' },
  { label: 'Late Fees & Fines', query: 'fine' },
  { label: 'Return Sounds', query: 'sound' },
  { label: 'Stickers & Labels', query: 'label' },
  { label: 'Kiosks & Scanners', query: 'scanner' },
  { label: 'Shelves & Places', query: 'shelf' },
];

export function LibraryPolicySettingsCard({ categories }: { categories?: Category[] | null }) {
  const { settings, updateSettings } = useSettings();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [openSections, setOpenSections] = useState<string[]>([]);
  const checkoutBarcodeMode = resolveLibraryCheckoutBarcodeMode(settings);

  const trimmedSearch = searchQuery.trim().toLowerCase();
  const matchingSections = useMemo(() => {
    if (!trimmedSearch) return null;
    const words = trimmedSearch.split(/\s+/).filter(Boolean);
    return LIBRARY_SETTINGS_SECTIONS.filter((sec) => {
      const hay = `${sec.title} ${sec.description} ${sec.keywords.join(' ')}`.toLowerCase();
      return words.every((word) => hay.includes(word));
    });
  }, [trimmedSearch]);

  const matchingSectionIds = useMemo(() => {
    if (!matchingSections) return null;
    return new Set(matchingSections.map((s) => s.id));
  }, [matchingSections]);

  const effectiveOpenSections = useMemo(() => {
    if (matchingSections !== null) {
      return matchingSections.map((s) => s.id);
    }
    return openSections;
  }, [matchingSections, openSections]);

  const [testingSound, setTestingSound] = useState<string | null>(null);
  const enabledLabelOptions = enabledLibraryLabelOptions(settings.libraryLabelFormatsEnabled);
  const enabledLabelFormats = enabledLibraryLabelFormats(settings.libraryLabelFormatsEnabled);
  const defaultLabelFormat = resolveDefaultLibraryLabelFormat(
    settings.libraryLabelFormat,
    settings.libraryLabelFormatsEnabled,
  );
  const labelFields = resolveLibraryLabelFields(settings.libraryLabelFields);

  const toggleLabelFormat = (id: LibraryLabelFormat, on: boolean) => {
    const current = enabledLibraryLabelFormats(settings.libraryLabelFormatsEnabled);
    const nextIds = on
      ? LIBRARY_LABEL_OPTIONS.map((option) => option.id).filter((format) => current.includes(format) || format === id)
      : current.filter((format) => format !== id);
    if (!nextIds.length) {
      toast({ title: 'Keep at least one sticker type' });
      return;
    }
    updateSettings({
      libraryLabelFormatsEnabled: nextIds,
      libraryLabelFormat: resolveDefaultLibraryLabelFormat(settings.libraryLabelFormat, nextIds),
    });
  };

  const toggleLabelField = (id: LibraryLabelFieldId, on: boolean) => {
    updateSettings({
      libraryLabelFields: {
        ...labelFields,
        [id]: on,
      },
    });
  };
  const categoryList = categories ?? [];
  const rewardMode = resolveLibraryRewardMode(settings);
  const boxStyle = { backgroundColor: `hsl(var(--card) / ${settings.libraryBoxOpacity ?? 80}%)` };

  const handleTestSound = (soundId: LibraryReturnSoundOnTimeId | LibraryReturnSoundLateId) => {
    setTestingSound(soundId);
    playLibraryReturnAudio(soundId, { volume: 0.18 });
    setTimeout(() => {
      setTestingSound((curr) => (curr === soundId ? null : curr));
    }, 900);
  };

  const onTimeSound: LibraryReturnSoundOnTimeId =
    settings.libraryReturnSoundOnTime || 'chime_bright';
  const lateSound: LibraryReturnSoundLateId =
    settings.libraryReturnSoundLate || 'gentle_warning';
  const onTimeMode: LibraryReturnResponseOnTimeMode =
    settings.libraryReturnResponseOnTimeMode || 'cheerful';
  const lateMode: LibraryReturnResponseLateMode =
    settings.libraryReturnResponseLateMode || 'gentle';

  const onTimeFeedback = resolveLibraryReturnFeedback(
    { isOverdue: false, daysOverdue: 0, bookTitle: 'The Phantom Tollbooth' },
    settings,
  );

  const lateFeedback = resolveLibraryReturnFeedback(
    { isOverdue: true, daysOverdue: 3, bookTitle: "Charlotte's Web" },
    settings,
  );

  const setRewardMode = (mode: LibraryRewardMode) => {
    const updates: Parameters<typeof updateSettings>[0] = { libraryRewardMode: mode };
    if (mode === 'none') {
      updates.libraryLateFeesEnabled = false;
      updates.libraryOnTimeReturnPoints = 0;
    }
    updateSettings(updates);
  };

  const kioskCheckoutOn = settings.libraryStudentKioskCheckoutEnabled !== false;
  const standalonePortalOn = settings.libraryAutoStudentPortalEnabled !== false;
  const autoDetectOn = settings.libraryAutoDetectCirculation !== false;
  const cameraScanOn = settings.libraryCameraScanEnabled === true;
  const allowSelfReturnOn = settings.libraryKioskAllowSelfReturn !== false;
  const dropBoxOn = settings.libraryKioskAllowDropBoxReturn !== false;
  const soundEffectsOn = settings.libraryKioskSoundEffects !== false;
  const recommendationsOn = settings.libraryKioskShowRecommendations !== false;
  const activeLoansOn = settings.libraryKioskShowActiveLoans !== false;
  const allowOverdueRenewals = settings.libraryAllowRenewIfOverdue === true;
  const allowMultiCopies = settings.libraryAllowMultipleCopiesOfSameTitle === true;
  const allowIsbnCheckoutOn = settings.libraryAllowIsbnCheckout !== false;
  const autoLookupGoogleBooks = settings.libraryAutoLookupGoogleBooks !== false;
  const showCoverImages = settings.libraryCatalogShowCoverImages !== false;
  const notifyTeacherOnOverdue = settings.libraryNotifyTeacherOnOverdue !== false;
  const milestonesOn = settings.libraryReadingMilestonesEnabled !== false;

  const barcodeScheme: BarcodeNumberScheme = settings.libraryBarcodeNumberScheme ?? 'genre_code';
  const orgScheme: LibraryOrganizationScheme = resolveLibraryOrganizationScheme(settings.libraryOrganizationScheme);
  const placementZones: string[] =
    settings.libraryPlacementZones && settings.libraryPlacementZones.length > 0
      ? settings.libraryPlacementZones
      : DEFAULT_LIBRARY_PLACEMENT_ZONES;

  const [newShelfName, setNewShelfName] = useState('');
  const [isAddingShelf, setIsAddingShelf] = useState(false);
  const [showShelfExtras, setShowShelfExtras] = useState(false);
  const [editingShelfIndex, setEditingShelfIndex] = useState<number | null>(null);
  const [editingShelfValue, setEditingShelfValue] = useState('');
  const genres = getActiveLibraryGenres(settings.libraryGenreDefinitions);
  const furnitureMigratedRef = useRef(false);

  useEffect(() => {
    if (furnitureMigratedRef.current) return;
    const zonesNeedFix = placementLooksLegacy(settings.libraryPlacementZones);
    const genresNeedFix = genresLookLegacy(settings.libraryGenreDefinitions ?? genres);
    if (!zonesNeedFix && !genresNeedFix) return;
    furnitureMigratedRef.current = true;
    const next = migrateFurnitureOnlySetup(placementZones, genres);
    updateSettings({
      libraryPlacementZones: next.zones,
      libraryGenreDefinitions: next.genres,
      libraryDefaultShelf: furnitureNameForShelf(settings.libraryDefaultShelf || next.zones[0] || 'Main Stacks'),
    });
  }, [genres, placementZones, settings.libraryDefaultShelf, settings.libraryGenreDefinitions, settings.libraryPlacementZones, updateSettings]);

  const handleAddShelf = () => {
    const trimmed = furnitureNameForShelf(newShelfName);
    if (!trimmed) return;
    if (placementZones.some((z) => z.toLowerCase() === trimmed.toLowerCase())) {
      toast({
        variant: 'destructive',
        title: 'Location already exists',
        description: `"${trimmed}" is already in your physical library locations.`,
      });
      return;
    }
    const next = [...placementZones, trimmed];
    updateSettings({ libraryPlacementZones: next });
    setNewShelfName('');
    setIsAddingShelf(false);
    toast({ title: `Added "${trimmed}" to shelf locations` });
  };

  const handleSaveShelfEdit = (index: number) => {
    const trimmed = furnitureNameForShelf(editingShelfValue);
    if (!trimmed) return;
    const oldName = placementZones[index];
    const next = [...placementZones];
    next[index] = trimmed;
    const nextGenres = genres.map((genre) =>
      genre.defaultShelf === oldName ? { ...genre, defaultShelf: trimmed } : genre,
    );
    updateSettings({
      libraryPlacementZones: next,
      libraryGenreDefinitions: nextGenres,
      ...(settings.libraryDefaultShelf === oldName ? { libraryDefaultShelf: trimmed } : {}),
    });
    setEditingShelfIndex(null);
    setEditingShelfValue('');
    toast({ title: 'Place name updated' });
  };

  const handleRemoveShelf = (index: number) => {
    const removed = placementZones[index];
    const next = placementZones.filter((_, i) => i !== index);
    const fallback = next[0] || DEFAULT_LIBRARY_PLACEMENT_ZONES[0];
    const nextGenres = genres.map((genre) =>
      genre.defaultShelf === removed ? { ...genre, defaultShelf: fallback } : genre,
    );
    updateSettings({
      libraryPlacementZones: next.length > 0 ? next : DEFAULT_LIBRARY_PLACEMENT_ZONES,
      libraryGenreDefinitions: nextGenres,
      ...(settings.libraryDefaultShelf === removed ? { libraryDefaultShelf: fallback } : {}),
    });
    toast({ title: `Removed "${removed}"` });
  };

  const handleResetShelves = () => {
    const remapped = genres.map((genre) => ({
      ...genre,
      defaultShelf: furnitureNameForShelf(genre.defaultShelf),
    }));
    updateSettings({
      libraryPlacementZones: DEFAULT_LIBRARY_PLACEMENT_ZONES,
      libraryGenreDefinitions: remapped,
      libraryDefaultShelf: 'Main Stacks',
    });
    toast({ title: 'Places reset to simple furniture names' });
  };

  const [newGenreName, setNewGenreName] = useState('');
  const [newGenrePrefix, setNewGenrePrefix] = useState('');
  const [newGenreColor, setNewGenreColor] = useState('#2563EB');
  const [newGenreShelf, setNewGenreShelf] = useState('');
  const [isAddingGenre, setIsAddingGenre] = useState(false);

  const GENRE_COLOR_PALETTE = [
    '#2563EB', // Sapphire Blue
    '#059669', // Emerald Green
    '#D97706', // Amber Gold
    '#6366F1', // Indigo
    '#9333EA', // Purple
    '#0D9488', // Teal
    '#EA580C', // Orange
    '#E11D48', // Rose
    '#CA8A04', // Yellow
    '#0284C7', // Sky
    '#475569', // Slate
    '#EC4899', // Pink
    '#84CC16', // Lime
    '#64748B', // Neutral
  ];

  const handleUpdateGenre = (id: string, patch: Partial<LibraryGenreConfig>, options?: { silent?: boolean }) => {
    const next = genres.map((g) => (g.id === id ? { ...g, ...patch } : g));
    updateSettings({ libraryGenreDefinitions: next });
    if (!options?.silent) toast({ title: 'Genre updated' });
  };

  const handleAddGenre = () => {
    if (!newGenreName.trim()) return;
    const cleanPrefix = (newGenrePrefix.trim() || newGenreName.slice(0, 3)).toUpperCase();
    const newId = `custom_${Date.now()}`;
    const newGenre: LibraryGenreConfig = {
      id: newId,
      label: newGenreName.trim(),
      callPrefix: cleanPrefix,
      dewey: '100',
      color: newGenreColor || '#2563EB',
      defaultShelf: newGenreShelf.trim() || placementZones[0] || 'Main Stacks',
    };
    const next = [...genres, newGenre];
    updateSettings({ libraryGenreDefinitions: next });
    setNewGenreName('');
    setNewGenrePrefix('');
    setNewGenreShelf('');
    setIsAddingGenre(false);
    toast({ title: `Genre "${newGenre.label}" added` });
  };

  const handleRemoveGenre = (id: string) => {
    const next = genres.filter((g) => g.id !== id);
    updateSettings({ libraryGenreDefinitions: next });
    toast({ title: 'Genre removed' });
  };

  const handleResetGenres = () => {
    updateSettings({
      libraryGenreDefinitions: DEFAULT_LIBRARY_GENRES,
      libraryBarcodeNumberScheme: 'genre_code',
    });
    toast({ title: 'Kinds of books reset' });
  };

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className="rounded-2xl border bg-card/80 p-4 shadow-xs space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search library settings (e.g., barcode, isbn, loan period, fines, stickers)..."
            className="pl-9 pr-9 h-10 rounded-xl bg-background text-sm border-border/80 focus-visible:ring-primary/40"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Quick Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-muted-foreground font-medium mr-1">Quick find:</span>
          {QUICK_SEARCH_CHIPS.map((chip) => {
            const isActive = trimmedSearch === chip.query;
            return (
              <button
                key={chip.label}
                type="button"
                onClick={() => setSearchQuery(isActive ? '' : chip.query)}
                className={cn(
                  'text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all',
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-muted/50 text-muted-foreground border-border/60 hover:bg-muted hover:text-foreground',
                )}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {trimmedSearch && (
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
            <span>
              {matchingSections && matchingSections.length > 0 ? (
                <>
                  Found <strong className="text-foreground">{matchingSections.length}</strong> matching {matchingSections.length === 1 ? 'section' : 'sections'} for &ldquo;{searchQuery}&rdquo;
                </>
              ) : (
                <>No settings matching &ldquo;{searchQuery}&rdquo;</>
              )}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="h-6 px-2 text-xs font-bold text-primary hover:text-primary hover:bg-primary/10"
            >
              Clear search
            </Button>
          </div>
        )}
      </div>

      {matchingSections !== null && matchingSections.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center bg-card/40 space-y-2">
          <Search className="h-8 w-8 mx-auto text-muted-foreground/60 mb-2" />
          <p className="font-bold text-sm text-foreground">No settings match &ldquo;{searchQuery}&rdquo;</p>
          <p className="text-xs text-muted-foreground">
            Try searching for terms like barcode, isbn, loan period, fines, sounds, or stickers.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchQuery('')}
            className="mt-3 text-xs font-bold rounded-xl"
          >
            Clear search
          </Button>
        </div>
      ) : (
        <Accordion
          type="multiple"
          value={effectiveOpenSections}
          onValueChange={(val) => {
            if (!trimmedSearch) {
              setOpenSections(val);
            }
          }}
          className="space-y-3"
        >
          {/* 1. Circulation & Loan Policies */}
          {(!matchingSectionIds || matchingSectionIds.has('circulation')) && (
            <AccordionItem value="circulation" className="rounded-xl border border-dashed shadow-[0_18px_50px_-12px_rgba(15,23,42,0.28),0_6px_18px_-6px_rgba(15,23,42,0.14)] overflow-hidden" style={boxStyle}>
        <div className="flex items-center gap-2 pr-3">
          <AccordionTrigger className="flex-1 px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2 text-left">
              <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
                <BookMarked className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base font-medium flex items-center gap-2">
                  Circulation &amp; Loan Policies
                  <Badge variant="outline" className="font-normal text-xs">
                    {settings.libraryLoanPeriodDays ?? 14} days
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground font-normal">
                  Configure borrowing limits, renewal rules, and loan duration for students.
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <StaffPortalTabInfoPopover
            sections={[
              staffPortalTabInfoSection(
                'Set loan lengths, checkout quotas per student, and allow smart auto-detection of borrows and returns.',
              ),
            ]}
            ariaLabel="About circulation policies"
          />
        </div>
        <AccordionContent className="px-4 space-y-4">
          {/* Smart Auto-Detect Borrow/Return Toggle */}
          <div className="flex items-center justify-between gap-3 rounded-xl border bg-primary/5 p-3.5 border-primary/20">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 font-bold text-sm text-foreground">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>Smart Auto-Detect Borrow vs Return</span>
                <Badge variant="secondary" className="text-[10px] font-semibold bg-primary/10 text-primary">
                  Recommended
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Automatically determines whether to borrow or return when a book is scanned: available copies check out, while books currently borrowed by the student are returned without needing manual mode toggles.
              </p>
            </div>
            <Switch
              checked={autoDetectOn}
              onCheckedChange={(v) => updateSettings({ libraryAutoDetectCirculation: v })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="lib-loan-days" className="text-xs font-bold">
                Loan period (days)
              </Label>
              <Input
                id="lib-loan-days"
                type="number"
                min={1}
                max={365}
                value={settings.libraryLoanPeriodDays ?? 14}
                onChange={(e) =>
                  updateSettings({ libraryLoanPeriodDays: Math.max(1, parseInt(e.target.value, 10) || 14) })
                }
              />
              <p className="text-[11px] text-muted-foreground">Days before book is overdue</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lib-max-books" className="text-xs font-bold">
                Max books per student
              </Label>
              <Input
                id="lib-max-books"
                type="number"
                min={0}
                max={50}
                value={settings.libraryMaxCheckoutsPerStudent ?? 3}
                onChange={(e) =>
                  updateSettings({
                    libraryMaxCheckoutsPerStudent: Math.max(0, parseInt(e.target.value, 10) || 0),
                  })
                }
              />
              <p className="text-[11px] text-muted-foreground">0 = no borrowing limit</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lib-max-renewals" className="text-xs font-bold">
                Max renewals per loan
              </Label>
              <Input
                id="lib-max-renewals"
                type="number"
                min={0}
                max={10}
                value={settings.libraryMaxRenewals ?? 2}
                onChange={(e) =>
                  updateSettings({
                    libraryMaxRenewals: Math.max(0, parseInt(e.target.value, 10) || 0),
                  })
                }
              />
              <p className="text-[11px] text-muted-foreground">0 = renewals disabled</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lib-grace-days" className="text-xs font-bold">
                Grace period (days)
              </Label>
              <Input
                id="lib-grace-days"
                type="number"
                min={0}
                max={30}
                value={settings.libraryGracePeriodDays ?? 0}
                onChange={(e) =>
                  updateSettings({
                    libraryGracePeriodDays: Math.max(0, parseInt(e.target.value, 10) || 0),
                  })
                }
              />
              <p className="text-[11px] text-muted-foreground">Extra days before late fees apply</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 pt-1">
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
              <div>
                <p className="text-xs font-bold">Allow renewals for overdue books</p>
                <p className="text-[11px] text-muted-foreground">
                  Permit extending due dates even after a book has passed its due date.
                </p>
              </div>
              <Switch
                checked={allowOverdueRenewals}
                onCheckedChange={(v) => updateSettings({ libraryAllowRenewIfOverdue: v })}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
              <div>
                <p className="text-xs font-bold">Allow multiple copies of same title</p>
                <p className="text-[11px] text-muted-foreground">
                  Permit students to borrow more than one copy of the same book at once.
                </p>
              </div>
              <Switch
                checked={allowMultiCopies}
                onCheckedChange={(v) => updateSettings({ libraryAllowMultipleCopiesOfSameTitle: v })}
              />
            </div>

            {/* Checkout Barcode Option (Both vs Printed Barcodes vs ISBN) */}
            <div className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <ScanBarcode className="h-4 w-4 text-primary" />
                  <Label className="text-xs font-bold text-foreground">
                    Book Checkout Barcode Requirement
                  </Label>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Choose what codes students and staff can scan to check out books.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {/* Option 1: Both */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    updateSettings({
                      libraryCheckoutBarcodeMode: 'both',
                      libraryAllowIsbnCheckout: true,
                    });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      updateSettings({
                        libraryCheckoutBarcodeMode: 'both',
                        libraryAllowIsbnCheckout: true,
                      });
                    }
                  }}
                  className={cn(
                    'cursor-pointer rounded-xl border p-3.5 text-left transition-all relative flex flex-col justify-between',
                    checkoutBarcodeMode === 'both'
                      ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40'
                      : 'border-border/60 bg-background/50 hover:bg-background/80 hover:border-border',
                  )}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                        <Layers className="h-3.5 w-3.5 text-primary" />
                        <span>Both (Stickers or ISBN)</span>
                      </div>
                      {checkoutBarcodeMode === 'both' && (
                        <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Either printed library barcode stickers or the book&apos;s ISBN barcode work for checking out.
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[9px] font-semibold mt-2.5 w-fit bg-primary/15 text-primary">
                    Recommended
                  </Badge>
                </div>

                {/* Option 2: Printed barcodes only */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    updateSettings({
                      libraryCheckoutBarcodeMode: 'barcode_only',
                      libraryAllowIsbnCheckout: false,
                    });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      updateSettings({
                        libraryCheckoutBarcodeMode: 'barcode_only',
                        libraryAllowIsbnCheckout: false,
                      });
                    }
                  }}
                  className={cn(
                    'cursor-pointer rounded-xl border p-3.5 text-left transition-all relative flex flex-col justify-between',
                    checkoutBarcodeMode === 'barcode_only'
                      ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40'
                      : 'border-border/60 bg-background/50 hover:bg-background/80 hover:border-border',
                  )}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                        <QrCode className="h-3.5 w-3.5 text-primary" />
                        <span>Printed Barcodes Only</span>
                      </div>
                      {checkoutBarcodeMode === 'barcode_only' && (
                        <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Must scan the printed library barcode sticker on the book. Scanning publisher ISBN barcodes will not check out books.
                    </p>
                  </div>
                </div>

                {/* Option 3: ISBN only */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    updateSettings({
                      libraryCheckoutBarcodeMode: 'isbn_only',
                      libraryAllowIsbnCheckout: true,
                    });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      updateSettings({
                        libraryCheckoutBarcodeMode: 'isbn_only',
                        libraryAllowIsbnCheckout: true,
                      });
                    }
                  }}
                  className={cn(
                    'cursor-pointer rounded-xl border p-3.5 text-left transition-all relative flex flex-col justify-between',
                    checkoutBarcodeMode === 'isbn_only'
                      ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40'
                      : 'border-border/60 bg-background/50 hover:bg-background/80 hover:border-border',
                  )}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                        <BookOpen className="h-3.5 w-3.5 text-primary" />
                        <span>ISBN Only</span>
                      </div>
                      {checkoutBarcodeMode === 'isbn_only' && (
                        <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Must scan the printed ISBN barcode on the book cover. Printed barcode stickers cannot be used for checkout.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
      )}

      {/* Sync with LevelUp App — one place to decide what connects to the main app */}
      {(!matchingSectionIds || matchingSectionIds.has('sync')) && (
      <AccordionItem value="sync" className="rounded-xl border border-dashed shadow-[0_18px_50px_-12px_rgba(15,23,42,0.28),0_6px_18px_-6px_rgba(15,23,42,0.14)] overflow-hidden" style={boxStyle}>
        <div className="flex items-center gap-2 pr-3">
          <AccordionTrigger className="flex-1 px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2 text-left">
              <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
                <RefreshCw className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base font-medium">
                  Sync with LevelUp App
                </div>
                <p className="text-sm text-muted-foreground font-normal">
                  Decide whether library points, student names, student themes, overdue notices, and student checkout connect to the main LevelUp app.
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <StaffPortalTabInfoPopover
            sections={[
              staffPortalTabInfoSection(
                'One place to control whether the library integrates with LevelUp points, student names and themes, teacher notifications, and the student dashboard — or stays fully self-contained.',
              ),
            ]}
            ariaLabel="About syncing with LevelUp"
          />
        </div>
        <AccordionContent className="px-4 space-y-3">
          <div className="space-y-2 rounded-lg border bg-muted/30 px-3 py-2.5">
            <Label className="text-xs font-bold">Points &amp; rewards</Label>
            <p className="text-[11px] text-muted-foreground">
              Choose whether returns affect school points, a library-only balance, fines, or nothing.
            </p>
            <Select value={rewardMode} onValueChange={(v) => setRewardMode(v as LibraryRewardMode)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(LIBRARY_REWARD_MODE_LABELS) as LibraryRewardMode[]).map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {LIBRARY_REWARD_MODE_LABELS[mode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
            <div>
              <p className="text-xs font-bold">Student Dashboard checkout</p>
              <p className="text-[11px] text-muted-foreground">
                Let students borrow &amp; return books by scanning barcodes on their own LevelUp Student Dashboard kiosk.
              </p>
            </div>
            <Switch
              checked={kioskCheckoutOn}
              onCheckedChange={(v) => updateSettings({ libraryStudentKioskCheckoutEnabled: v })}
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
            <div>
              <p className="text-xs font-bold">Overdue notifications</p>
              <p className="text-[11px] text-muted-foreground">
                Flag overdue books on teacher classroom seating charts and attendance rosters in LevelUp.
              </p>
            </div>
            <Switch
              checked={notifyTeacherOnOverdue}
              onCheckedChange={(v) => updateSettings({ libraryNotifyTeacherOnOverdue: v })}
            />
          </div>

          <div className="space-y-2 rounded-lg border bg-muted/30 px-3 py-2.5">
            <Label className="text-xs font-bold">Student display names</Label>
            <p className="text-[11px] text-muted-foreground">
              Choose how names appear at the desk, catalog, loans list, and student station. Default uses each student&apos;s nickname (or first name) plus last name.
            </p>
            <Select
              value={settings.libraryStudentNameDisplayMode ?? 'preferred_full'}
              onValueChange={(v) =>
                updateSettings({ libraryStudentNameDisplayMode: v as LibraryStudentNameDisplayMode })
              }
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(LIBRARY_STUDENT_NAME_DISPLAY_LABELS) as LibraryStudentNameDisplayMode[]).map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {LIBRARY_STUDENT_NAME_DISPLAY_LABELS[mode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 rounded-lg border bg-muted/30 px-3 py-2.5">
            <Label className="text-xs font-bold">Student themes on names</Label>
            <p className="text-[11px] text-muted-foreground">
              Use the same sticker / theme emoji (and optional color) that students have in LevelUp. Turned off automatically if Student Themes are disabled for the whole school.
            </p>
            <Select
              value={settings.libraryStudentThemeDisplay ?? 'emoji_and_color'}
              onValueChange={(v) =>
                updateSettings({ libraryStudentThemeDisplay: v as LibraryStudentThemeDisplay })
              }
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(LIBRARY_STUDENT_THEME_DISPLAY_LABELS) as LibraryStudentThemeDisplay[]).map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {LIBRARY_STUDENT_THEME_DISPLAY_LABELS[mode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </AccordionContent>
      </AccordionItem>
      )}

      {/* 2. Self-Checkout Station & Hardware Scanning */}
      {(!matchingSectionIds || matchingSectionIds.has('hardware')) && (
      <AccordionItem value="hardware" className="rounded-xl border border-dashed shadow-[0_18px_50px_-12px_rgba(15,23,42,0.28),0_6px_18px_-6px_rgba(15,23,42,0.14)] overflow-hidden" style={boxStyle}>
        <div className="flex items-center gap-2 pr-3">
          <AccordionTrigger className="flex-1 px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2 text-left">
              <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
                <ScanBarcode className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base font-medium">
                  Station &amp; Hardware Scanning
                </div>
                <p className="text-sm text-muted-foreground font-normal">
                  Configure camera scanning, station modes, sound effects, and kiosk screen behaviors.
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <StaffPortalTabInfoPopover
            sections={[
              staffPortalTabInfoSection(
                'Control camera barcode scanning and manage how student kiosks and dedicated library stations behave.',
              ),
            ]}
            ariaLabel="About station and scanning settings"
          />
        </div>
        <AccordionContent className="px-4 space-y-3">
          {/* Camera Scanning Switch */}
          <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-primary/30 bg-primary/5 p-3.5">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                <Camera className="h-4 w-4 text-primary" />
                <span>Camera Barcode Scanning</span>
                {cameraScanOn && (
                  <Badge variant="default" className="text-[10px] font-semibold bg-emerald-600">
                    Live
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Enable built-in device webcam/camera to scan student ID cards and book barcodes directly on library stations, library desk, and catalog intake without an external handheld scanner.
              </p>
            </div>
            <Switch
              checked={cameraScanOn}
              onCheckedChange={(v) => updateSettings({ libraryCameraScanEnabled: v })}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
              <div>
                <p className="text-xs font-bold">Library station (shared device)</p>
                <p className="text-[11px] text-muted-foreground">
                  Dedicated self-checkout flow at /library/self-checkout &amp; /library/kiosk.
                </p>
              </div>
              <Switch
                checked={standalonePortalOn}
                onCheckedChange={(v) => updateSettings({ libraryAutoStudentPortalEnabled: v })}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
              <div>
                <p className="text-xs font-bold">Default Kiosk Scan Mode</p>
                <p className="text-[11px] text-muted-foreground">
                  Choose default behavior when students scan at the kiosk. Auto mode instantly returns borrowed books without tapping Drop Box.
                </p>
              </div>
              <Select
                value={settings.libraryKioskDefaultMode ?? 'auto'}
                onValueChange={(v: 'auto' | 'checkout' | 'return') => updateSettings({ libraryKioskDefaultMode: v })}
              >
                <SelectTrigger className="h-8 w-44 text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">⚡ Auto (Smart Return)</SelectItem>
                  <SelectItem value="checkout">📖 Borrow (Sign in first)</SelectItem>
                  <SelectItem value="return">📥 Drop Box (Return only)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
              <div>
                <p className="text-xs font-bold">Allow student self-returns</p>
                <p className="text-[11px] text-muted-foreground">
                  Allow students to return borrowed books themselves at the kiosk station.
                </p>
              </div>
              <Switch
                checked={allowSelfReturnOn}
                onCheckedChange={(v) => updateSettings({ libraryKioskAllowSelfReturn: v })}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
              <div>
                <p className="text-xs font-bold">Ask students to rate books they return</p>
                <p className="text-[11px] text-muted-foreground">
                  After a student returns a book, they can tap stars (or say they did not get a chance to read it). Helps pick books for them later.
                </p>
              </div>
              <Switch
                checked={settings.libraryStudentRatingsEnabled !== false}
                onCheckedChange={(v) => updateSettings({ libraryStudentRatingsEnabled: v })}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
              <div>
                <p className="text-xs font-bold">Quick Drop Box mode</p>
                <p className="text-[11px] text-muted-foreground">
                  Allow returning books without requiring a student ID card swipe.
                </p>
              </div>
              <Switch
                checked={dropBoxOn}
                onCheckedChange={(v) => updateSettings({ libraryKioskAllowDropBoxReturn: v })}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs font-bold">Sound effects &amp; audio chimes</p>
                  <p className="text-[11px] text-muted-foreground">
                    Play celebratory sounds on successful checkouts, returns, and bonus points.
                  </p>
                </div>
              </div>
              <Switch
                checked={soundEffectsOn}
                onCheckedChange={(v) => updateSettings({ libraryKioskSoundEffects: v })}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
              <div>
                <p className="text-xs font-bold">Show book recommendations</p>
                <p className="text-[11px] text-muted-foreground">
                  Suggest related books from the catalog on screen after borrowing or returning.
                </p>
              </div>
              <Switch
                checked={recommendationsOn}
                onCheckedChange={(v) => updateSettings({ libraryKioskShowRecommendations: v })}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
              <div>
                <p className="text-xs font-bold">Show active loans on screen</p>
                <p className="text-[11px] text-muted-foreground">
                  Display the student&apos;s current loans and due dates on their kiosk session.
                </p>
              </div>
              <Switch
                checked={activeLoansOn}
                onCheckedChange={(v) => updateSettings({ libraryKioskShowActiveLoans: v })}
              />
            </div>

            <div className="space-y-1.5 rounded-lg border bg-muted/30 px-3 py-2">
              <Label htmlFor="lib-reset-sec" className="text-xs font-bold">
                Station auto-reset countdown (seconds)
              </Label>
              <Select
                value={String(settings.libraryKioskAutoResetSeconds ?? 8)}
                onValueChange={(v) => updateSettings({ libraryKioskAutoResetSeconds: parseInt(v, 10) || 8 })}
              >
                <SelectTrigger id="lib-reset-sec" className="h-8 rounded-lg text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 seconds (high traffic)</SelectItem>
                  <SelectItem value="8">8 seconds (recommended)</SelectItem>
                  <SelectItem value="12">12 seconds (relaxed)</SelectItem>
                  <SelectItem value="20">20 seconds (long preview)</SelectItem>
                  <SelectItem value="0">Disabled (manual tap only)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
              <div>
                <p className="text-xs font-bold">Require passcode to leave kiosk</p>
                <p className="text-[11px] text-muted-foreground">
                  Off by default — a plain tap exits the station. Turn on to require an admin or librarian passcode.
                </p>
              </div>
              <Switch
                checked={settings.libraryKioskExitRequiresPasscode ?? false}
                onCheckedChange={(v) => updateSettings({ libraryKioskExitRequiresPasscode: v })}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
              <div>
                <p className="text-xs font-bold">Quick-filter chips on Library Desk</p>
                <p className="text-[11px] text-muted-foreground">
                  Off by default. Show Available Books / Active Loans / Student Patrons shortcut chips above the Library Desk lookup search bar.
                </p>
              </div>
              <Switch
                checked={settings.libraryDeskShowQuickFilters ?? false}
                onCheckedChange={(v) => updateSettings({ libraryDeskShowQuickFilters: v })}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
              <div>
                <p className="text-xs font-bold">Show totals on Catalog tab</p>
                <p className="text-[11px] text-muted-foreground">
                  On by default. Show the Total Catalog / On Shelf / Active Loans / Overdue stat cards at the top of the Catalog tab.
                </p>
              </div>
              <Switch
                checked={settings.libraryDeskShowTotals ?? true}
                onCheckedChange={(v) => updateSettings({ libraryDeskShowTotals: v })}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
              <div>
                <p className="text-xs font-bold">Animate totals (count-up effect)</p>
                <p className="text-[11px] text-muted-foreground">
                  On by default. Numbers count up when the Catalog tab loads. Turn off for plain static numbers.
                </p>
              </div>
              <Switch
                checked={settings.libraryDeskTotalsAnimated ?? true}
                disabled={(settings.libraryDeskShowTotals ?? true) === false}
                onCheckedChange={(v) => updateSettings({ libraryDeskTotalsAnimated: v })}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
              <div>
                <p className="text-xs font-bold">Navigation sound effects</p>
                <p className="text-[11px] text-muted-foreground">
                  On by default. Play a short click sound when staff switch between Librarian, Catalog, Loans, Kiosk, and Settings.
                </p>
              </div>
              <Switch
                checked={settings.libraryNavSoundEffects ?? true}
                onCheckedChange={(v) => updateSettings({ libraryNavSoundEffects: v })}
              />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
      )}

      {/* 3. Return Audio Sounds & Student Responses */}
      {(!matchingSectionIds || matchingSectionIds.has('audio')) && (
      <AccordionItem value="audio" className="rounded-xl border border-dashed shadow-[0_18px_50px_-12px_rgba(15,23,42,0.28),0_6px_18px_-6px_rgba(15,23,42,0.14)] overflow-hidden" style={boxStyle}>
        <div className="flex items-center gap-2 pr-3">
          <AccordionTrigger className="flex-1 px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2 text-left">
              <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
                <Volume2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base font-medium flex items-center gap-2">
                  Return Audio Sounds &amp; Student Responses
                  <Badge variant="outline" className="font-normal text-xs bg-emerald-500/10 text-emerald-600 border-emerald-300 dark:border-emerald-800">
                    On-Time &amp; Overdue
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground font-normal">
                  Configure audio chimes and personalized on-screen messages for on-time and late/overdue returns.
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <StaffPortalTabInfoPopover
            sections={[
              staffPortalTabInfoSection(
                'Select sound effects and feedback text for when students return books. You can test each tone right from this screen or write custom feedback using {title} and {days}.',
              ),
            ]}
            ariaLabel="About return sounds and responses"
          />
        </div>
        <AccordionContent className="px-4 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* On-Time Returns Column */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.03] p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-md bg-emerald-500/15 p-1.5 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">On-Time Returns</h4>
                    <p className="text-[11px] text-muted-foreground">Played when books are returned by their due date</p>
                  </div>
                </div>
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-[10px]">
                  Positive Reinforcement
                </Badge>
              </div>

              {/* Sound Selector with Preview Button */}
              <div className="space-y-1.5">
                <Label htmlFor="ontime-sound-select" className="text-xs font-semibold flex items-center justify-between">
                  <span>Audio Chime</span>
                  <span className="text-[11px] font-normal text-muted-foreground">Web Audio synthesized</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Select
                    value={onTimeSound}
                    onValueChange={(val) =>
                      updateSettings({ libraryReturnSoundOnTime: val as LibraryReturnSoundOnTimeId })
                    }
                  >
                    <SelectTrigger id="ontime-sound-select" className="flex-1 h-9 text-xs rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LIBRARY_ON_TIME_SOUNDS.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">
                          <span className="mr-1.5">{s.icon}</span>
                          <span className="font-medium">{s.label}</span>
                          <span className="ml-2 text-muted-foreground text-[10px]">({s.tagline})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 text-xs gap-1.5 shrink-0 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                    onClick={() => handleTestSound(onTimeSound)}
                    disabled={onTimeSound === 'none'}
                    title="Play and test this chime"
                  >
                    <Play className={`h-3.5 w-3.5 ${testingSound === onTimeSound ? 'animate-spin' : ''}`} />
                    <span>Preview</span>
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {LIBRARY_ON_TIME_SOUNDS.find((s) => s.id === onTimeSound)?.description}
                </p>
              </div>

              {/* Response Message Mode */}
              <div className="space-y-1.5">
                <Label htmlFor="ontime-response-mode" className="text-xs font-semibold">
                  Student Feedback Message Preset
                </Label>
                <Select
                  value={onTimeMode}
                  onValueChange={(val) =>
                    updateSettings({ libraryReturnResponseOnTimeMode: val as LibraryReturnResponseOnTimeMode })
                  }
                >
                  <SelectTrigger id="ontime-response-mode" className="h-9 text-xs rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LIBRARY_ON_TIME_RESPONSES.map((r) => (
                      <SelectItem key={r.id} value={r.id} className="text-xs">
                        <span className="font-medium">{r.label}</span>
                        <span className="ml-2 text-muted-foreground text-[10px]">({r.tagline})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom message input if custom mode */}
              {onTimeMode === 'custom' && (
                <div className="space-y-1.5">
                  <Label htmlFor="ontime-custom-msg" className="text-xs font-semibold">
                    Custom On-Time Message Text
                  </Label>
                  <Input
                    id="ontime-custom-msg"
                    placeholder='Thank you for returning "{title}" on time!'
                    value={settings.libraryReturnResponseOnTimeCustom ?? ''}
                    onChange={(e) => updateSettings({ libraryReturnResponseOnTimeCustom: e.target.value })}
                    className="h-9 text-xs rounded-lg"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Supported tags: <code className="bg-muted px-1 rounded font-mono">{"{title}"}</code> for book title, <code className="bg-muted px-1 rounded font-mono">{"{days}"}</code> for days.
                  </p>
                </div>
              )}

              {/* Live Banner Preview */}
              <div className="space-y-1 pt-1">
                <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-emerald-500" />
                  <span>Station Screen Preview</span>
                </p>
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs space-y-1 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      {onTimeFeedback.title}
                    </span>
                    <Badge variant="outline" className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]">
                      {onTimeFeedback.badgeText}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    &ldquo;{onTimeFeedback.message}&rdquo;
                  </p>
                </div>
              </div>
            </div>

            {/* Late / Overdue Returns Column */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.03] p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-md bg-amber-500/15 p-1.5 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Late &amp; Overdue Returns</h4>
                    <p className="text-[11px] text-muted-foreground">Played when books are returned after their due date</p>
                  </div>
                </div>
                <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 hover:bg-amber-500/30 text-[10px] border border-amber-500/30">
                  Reminder &amp; Notice
                </Badge>
              </div>

              {/* Sound Selector with Preview Button */}
              <div className="space-y-1.5">
                <Label htmlFor="late-sound-select" className="text-xs font-semibold flex items-center justify-between">
                  <span>Audio Alert Tone</span>
                  <span className="text-[11px] font-normal text-muted-foreground">Web Audio synthesized</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Select
                    value={lateSound}
                    onValueChange={(val) =>
                      updateSettings({ libraryReturnSoundLate: val as LibraryReturnSoundLateId })
                    }
                  >
                    <SelectTrigger id="late-sound-select" className="flex-1 h-9 text-xs rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LIBRARY_LATE_SOUNDS.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">
                          <span className="mr-1.5">{s.icon}</span>
                          <span className="font-medium">{s.label}</span>
                          <span className="ml-2 text-muted-foreground text-[10px]">({s.tagline})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 text-xs gap-1.5 shrink-0 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                    onClick={() => handleTestSound(lateSound)}
                    disabled={lateSound === 'none'}
                    title="Play and test this tone"
                  >
                    <Play className={`h-3.5 w-3.5 ${testingSound === lateSound ? 'animate-spin' : ''}`} />
                    <span>Preview</span>
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {LIBRARY_LATE_SOUNDS.find((s) => s.id === lateSound)?.description}
                </p>
              </div>

              {/* Response Message Mode */}
              <div className="space-y-1.5">
                <Label htmlFor="late-response-mode" className="text-xs font-semibold">
                  Student Feedback Message Preset
                </Label>
                <Select
                  value={lateMode}
                  onValueChange={(val) =>
                    updateSettings({ libraryReturnResponseLateMode: val as LibraryReturnResponseLateMode })
                  }
                >
                  <SelectTrigger id="late-response-mode" className="h-9 text-xs rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LIBRARY_LATE_RESPONSES.map((r) => (
                      <SelectItem key={r.id} value={r.id} className="text-xs">
                        <span className="font-medium">{r.label}</span>
                        <span className="ml-2 text-muted-foreground text-[10px]">({r.tagline})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom message input if custom mode */}
              {lateMode === 'custom' && (
                <div className="space-y-1.5">
                  <Label htmlFor="late-custom-msg" className="text-xs font-semibold">
                    Custom Overdue Message Text
                  </Label>
                  <Input
                    id="late-custom-msg"
                    placeholder='"{title}" was returned {days} day(s) late. Please return books on time!'
                    value={settings.libraryReturnResponseLateCustom ?? ''}
                    onChange={(e) => updateSettings({ libraryReturnResponseLateCustom: e.target.value })}
                    className="h-9 text-xs rounded-lg"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Supported tags: <code className="bg-muted px-1 rounded font-mono">{"{title}"}</code> for book title, <code className="bg-muted px-1 rounded font-mono">{"{days}"}</code> for days late.
                  </p>
                </div>
              )}

              {/* Live Banner Preview */}
              <div className="space-y-1 pt-1">
                <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  <span>Station Screen Preview</span>
                </p>
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs space-y-1 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" />
                      {lateFeedback.title}
                    </span>
                    <Badge variant="outline" className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30 text-[10px]">
                      {lateFeedback.badgeText}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    &ldquo;{lateFeedback.message}&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
      )}

      {/* 4. Fines, Rewards & Point Balances */}
      {(!matchingSectionIds || matchingSectionIds.has('fines')) && (
      <AccordionItem value="fines" className="rounded-xl border border-dashed shadow-[0_18px_50px_-12px_rgba(15,23,42,0.28),0_6px_18px_-6px_rgba(15,23,42,0.14)] overflow-hidden" style={boxStyle}>
        <div className="flex items-center gap-2 pr-3">
          <AccordionTrigger className="flex-1 px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2 text-left">
              <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base font-medium">
                  Fines, Rewards &amp; Point Balances
                </div>
                <p className="text-sm text-muted-foreground font-normal">
                  Choose how returns affect student balances, reward on-time returns, and control fine caps.
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <StaffPortalTabInfoPopover
            sections={[
              staffPortalTabInfoSection(
                'Choose whether late or on-time returns affect fines, school reward points, a separate library balance, or nothing at all.',
              ),
            ]}
            ariaLabel="About loans and returns"
          />
        </div>
        <AccordionContent className="px-4 space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
            <div>
              <p className="text-xs font-bold">When books are returned</p>
              <p className="text-[11px] text-muted-foreground">
                Set in Policies &amp; Settings → Sync with LevelUp App.
              </p>
            </div>
            <Badge variant="secondary" className="text-xs font-bold shrink-0">
              {LIBRARY_REWARD_MODE_LABELS[rewardMode]}
            </Badge>
          </div>

          {rewardMode === 'app_points' ? (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs font-bold">Points category</Label>
                <StaffPortalTabInfoPopover
                  sections={[
                    staffPortalTabInfoSection(
                      'Points in this category go up or down when books are returned on time or late.',
                    ),
                  ]}
                  ariaLabel="About points category"
                />
              </div>
              <Select
                value={settings.libraryPointsCategoryId || '_none'}
                onValueChange={(v) => updateSettings({ libraryPointsCategoryId: v === '_none' ? undefined : v })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None (no point changes)</SelectItem>
                  {settings.libraryPointsCategoryId &&
                  categoryList.length > 0 &&
                  !categoryList.some((c) => c.id === settings.libraryPointsCategoryId) ? (
                    <SelectItem value={settings.libraryPointsCategoryId}>Unknown category (deleted)</SelectItem>
                  ) : null}
                  {categoryList.map((c) => {
                    const points = Number(c.points ?? 0);
                    return (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({points > 0 ? `+${points}` : points} default)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {rewardMode !== 'none' ? (
            <>
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
                <div>
                  <p className="text-xs font-bold">
                    {rewardMode === 'fines' ? 'Late fines enabled' : 'Late deductions enabled'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {rewardMode === 'fines'
                      ? 'Accumulate a student library fine balance per calendar day overdue'
                      : 'Deduct points per calendar day overdue upon book return'}
                  </p>
                </div>
                <Switch
                  checked={settings.libraryLateFeesEnabled !== false}
                  onCheckedChange={(v) => updateSettings({ libraryLateFeesEnabled: v })}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="lib-late-ppd" className="text-xs font-bold">
                    {rewardMode === 'fines' ? 'Fine per day overdue' : 'Late deduction per day'}
                  </Label>
                  <Input
                    id="lib-late-ppd"
                    type="number"
                    min={0}
                    max={100}
                    disabled={settings.libraryLateFeesEnabled === false}
                    value={settings.libraryLatePointsPerDay ?? 2}
                    onChange={(e) =>
                      updateSettings({ libraryLatePointsPerDay: Math.max(0, parseInt(e.target.value, 10) || 0) })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lib-max-fine" className="text-xs font-bold">
                    Maximum fine cap per book
                  </Label>
                  <Input
                    id="lib-max-fine"
                    type="number"
                    min={0}
                    max={500}
                    value={settings.libraryMaxFineCap ?? 20}
                    onChange={(e) =>
                      updateSettings({ libraryMaxFineCap: Math.max(0, parseInt(e.target.value, 10) || 0) })
                    }
                  />
                  <p className="text-[10px] text-muted-foreground">0 = no fine limit</p>
                </div>

                {rewardMode !== 'fines' ? (
                  <div className="space-y-2">
                    <Label htmlFor="lib-ontime" className="text-xs font-bold">
                      On-time return bonus points
                    </Label>
                    <Input
                      id="lib-ontime"
                      type="number"
                      min={0}
                      max={500}
                      value={settings.libraryOnTimeReturnPoints ?? 0}
                      onChange={(e) =>
                        updateSettings({
                          libraryOnTimeReturnPoints: Math.max(0, parseInt(e.target.value, 10) || 0),
                        })
                      }
                    />
                    <p className="text-[10px] text-muted-foreground">0 = disabled</p>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </AccordionContent>
      </AccordionItem>
      )}

      {/* 4. Cataloging & Label Printing Defaults */}
      {(!matchingSectionIds || matchingSectionIds.has('cataloging')) && (
      <AccordionItem value="cataloging" className="rounded-xl border border-dashed shadow-[0_18px_50px_-12px_rgba(15,23,42,0.28),0_6px_18px_-6px_rgba(15,23,42,0.14)] overflow-hidden" style={boxStyle}>
        <div className="flex items-center gap-2 pr-3">
          <AccordionTrigger className="flex-1 px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2 text-left">
              <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
                <Printer className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base font-medium">
                  Cataloging &amp; Spine Label Printing
                </div>
                <p className="text-sm text-muted-foreground font-normal">
                  Set default book shelves, which sticker types people can print, and what goes on each label.
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <StaffPortalTabInfoPopover
            sections={[
              staffPortalTabInfoSection(
                'Choose the sticker types offered when someone prints the catalog, and turn pieces on or off on each label.',
              ),
            ]}
            ariaLabel="About cataloging defaults"
          />
        </div>
        <AccordionContent className="px-4 space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
            <div>
              <p className="text-xs font-bold">Automatic book info lookup</p>
              <p className="text-[11px] text-muted-foreground">
                Automatically retrieve title, author, description, and cover artwork from Google Books upon scanning an ISBN.
              </p>
            </div>
            <Switch
              checked={autoLookupGoogleBooks}
              onCheckedChange={(v) => updateSettings({ libraryAutoLookupGoogleBooks: v })}
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
            <div>
              <p className="text-xs font-bold">Show book cover images</p>
              <p className="text-[11px] text-muted-foreground">
                On by default. Turn off to show simplified color placeholder covers instead of real book cover images in the catalog.
              </p>
            </div>
            <Switch
              checked={showCoverImages}
              onCheckedChange={(v) => updateSettings({ libraryCatalogShowCoverImages: v })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="lib-default-shelf" className="text-xs font-bold">
                Default shelf location
              </Label>
              <select
                id="lib-default-shelf"
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold"
                value={
                  settings.libraryDefaultShelf &&
                  (placementZones.includes(settings.libraryDefaultShelf) || Boolean(settings.libraryDefaultShelf))
                    ? settings.libraryDefaultShelf
                    : placementZones[0] ?? ''
                }
                onChange={(e) => updateSettings({ libraryDefaultShelf: e.target.value })}
              >
                {settings.libraryDefaultShelf && !placementZones.includes(settings.libraryDefaultShelf) ? (
                  <option value={settings.libraryDefaultShelf}>{settings.libraryDefaultShelf}</option>
                ) : null}
                {placementZones.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lib-default-category" className="text-xs font-bold">
                Default genre / category
              </Label>
              <select
                id="lib-default-category"
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold"
                value={
                  genres.some((genre) => genre.label === (settings.libraryDefaultCategory ?? 'General'))
                    ? settings.libraryDefaultCategory ?? 'General'
                    : genres[0]?.label ?? 'General'
                }
                onChange={(e) => updateSettings({ libraryDefaultCategory: e.target.value })}
              >
                {settings.libraryDefaultCategory &&
                !genres.some((genre) => genre.label === settings.libraryDefaultCategory) ? (
                  <option value={settings.libraryDefaultCategory}>{settings.libraryDefaultCategory}</option>
                ) : null}
                {genres.map((genre) => (
                  <option key={genre.id} value={genre.label}>
                    {genre.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lib-label-format" className="text-xs font-bold">
                Default label format
              </Label>
              <Select
                value={defaultLabelFormat}
                onValueChange={(v) =>
                  updateSettings({ libraryLabelFormat: v as LibraryLabelFormat })
                }
              >
                <SelectTrigger id="lib-label-format" className="rounded-xl text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {enabledLabelOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id} className="text-xs">
                      {opt.shortName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10.5px] text-muted-foreground">
                {getLibraryLabelOption(defaultLabelFormat).dimensions} · {getLibraryLabelOption(defaultLabelFormat).badge}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lib-barcode-format" className="text-xs font-bold">
                Barcode standard
              </Label>
              <Select
                value={settings.libraryBarcodeFormat ?? 'CODE128'}
                onValueChange={(v) =>
                  updateSettings({ libraryBarcodeFormat: v as 'CODE128' | 'QR' })
                }
              >
                <SelectTrigger id="lib-barcode-format" className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CODE128">Code 128 (Standard Barcode)</SelectItem>
                  <SelectItem value="QR">QR Code (High Density)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
            <div>
              <p className="text-xs font-bold">Sticker types people can print</p>
              <p className="text-[11px] text-muted-foreground">
                Turn on only the sticker sizes you want to see when printing.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {LIBRARY_LABEL_OPTIONS.map((option) => (
                <label
                  key={option.id}
                  className="flex items-start justify-between gap-3 rounded-lg border bg-background/80 px-3 py-2"
                >
                  <span>
                    <span className="block text-xs font-semibold">{option.shortName}</span>
                    <span className="block text-[11px] text-muted-foreground">{option.badge}</span>
                  </span>
                  <Switch
                    checked={enabledLabelFormats.includes(option.id)}
                    onCheckedChange={(on) => toggleLabelFormat(option.id, on)}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
            <div>
              <p className="text-xs font-bold">What goes on each sticker</p>
              <p className="text-[11px] text-muted-foreground">
                Choose the pieces that print on the sticker.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {LIBRARY_LABEL_FIELD_IDS.map((fieldId) => (
                <label
                  key={fieldId}
                  className="flex items-start justify-between gap-3 rounded-lg border bg-background/80 px-3 py-2"
                >
                  <span>
                    <span className="block text-xs font-semibold">{LIBRARY_LABEL_FIELD_COPY[fieldId].label}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {LIBRARY_LABEL_FIELD_COPY[fieldId].hint}
                    </span>
                  </span>
                  <Switch
                    checked={labelFields[fieldId]}
                    onCheckedChange={(on) => toggleLabelField(fieldId, on)}
                  />
                </label>
              ))}
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
      )}

      {/* 5. Book Shelving Hierarchy, Physical Locations & Genre Classification */}
      {(!matchingSectionIds || matchingSectionIds.has('genre')) && (
      <AccordionItem value="genre" className="rounded-xl border border-dashed shadow-[0_18px_50px_-12px_rgba(15,23,42,0.28),0_6px_18px_-6px_rgba(15,23,42,0.14)] overflow-hidden" style={boxStyle}>
        <div className="flex items-center gap-2 pr-3">
          <AccordionTrigger className="flex-1 px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2 text-left">
              <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
                <Library className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base font-medium">Genres &amp; shelves</div>
                <p className="text-sm text-muted-foreground font-normal">
                  Name the places in your room, then give each kind of book a color and a home shelf.
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs rounded-xl shrink-0"
            onClick={() => {
              handleResetGenres();
              handleResetShelves();
              updateSettings({ libraryOrganizationScheme: 'genre_then_author' });
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>

        <AccordionContent className="px-4 space-y-5 pt-1">
          <div className="space-y-2">
            <div>
              <p className="text-xs font-bold">Step 1 · Name the furniture</p>
              <p className="text-[11px] text-muted-foreground">
                Only the real spots in the room — not the kind of book. Example: Aisle 1, North Wall.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-xs font-bold">Places in the room</Label>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-lg gap-1 text-xs"
                  onClick={() => setIsAddingShelf(!isAddingShelf)}
                >
                  <Plus className="h-3 w-3" />
                  Add place
                </Button>
                <Button size="sm" variant="ghost" className="h-7 rounded-lg text-xs text-muted-foreground" onClick={handleResetShelves}>
                  Reset
                </Button>
              </div>
            </div>

            {/* Add Shelf Input */}
            {isAddingShelf && (
              <div className="rounded-xl border border-primary/40 bg-primary/5 p-3 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <Input
                  placeholder="e.g. Aisle 4, North Wall, Front Spinner"
                  value={newShelfName}
                  onChange={(e) => setNewShelfName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddShelf();
                    }
                  }}
                  className="rounded-xl text-xs bg-background"
                  autoFocus
                />
                <Button size="sm" onClick={handleAddShelf} disabled={!newShelfName.trim()} className="rounded-xl text-xs shrink-0">
                  Save Shelf
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsAddingShelf(false)} className="rounded-xl text-xs shrink-0">
                  Cancel
                </Button>
              </div>
            )}

            {/* Shelf Locations Grid */}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {placementZones.map((zone, idx) => {
                const isEditing = editingShelfIndex === idx;
                const isDefault = (settings.libraryDefaultShelf || 'Main Stacks') === zone;

                if (isEditing) {
                  return (
                    <div key={idx} className="flex items-center gap-1.5 p-2 rounded-xl border border-primary bg-background shadow-sm">
                      <Input
                        value={editingShelfValue}
                        onChange={(e) => setEditingShelfValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveShelfEdit(idx);
                          }
                        }}
                        className="h-7 text-xs rounded-lg flex-1"
                        autoFocus
                      />
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={() => handleSaveShelfEdit(idx)}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => setEditingShelfIndex(null)}>
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                }

                return (
                  <div
                    key={zone}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl border bg-card hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-xs font-medium text-foreground truncate">{zone}</span>
                      {isDefault && (
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 font-bold shrink-0">
                          Default
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        title="Edit shelf name"
                        onClick={() => {
                          setEditingShelfIndex(idx);
                          setEditingShelfValue(zone);
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      {placementZones.length > 1 && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          title="Delete shelf location"
                          onClick={() => handleRemoveShelf(idx)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <p className="text-xs font-bold">Step 2 · Send each kind of book to a place</p>
              <p className="text-[11px] text-muted-foreground">
                Pick a color, a short code, and which furniture it lives on. Move Fiction to Aisle 4 later without renaming the aisle.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-xs font-bold">Kinds of books</Label>
              <Button
                size="sm"
                variant="outline"
                className="h-7 rounded-lg gap-1 text-xs"
                onClick={() => setIsAddingGenre(!isAddingGenre)}
              >
                <Plus className="h-3 w-3" />
                Add kind
              </Button>
            </div>

            {isAddingGenre && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                className="rounded-xl border bg-muted/20 p-3 grid gap-2 sm:grid-cols-4"
              >
                <Input
                  placeholder="Name, like Manga"
                  value={newGenreName}
                  onChange={(e) => setNewGenreName(e.target.value)}
                  className="rounded-lg text-xs"
                />
                <Input
                  placeholder="Code, like MNG"
                  value={newGenrePrefix}
                  onChange={(e) => setNewGenrePrefix(e.target.value.toUpperCase())}
                  className="rounded-lg text-xs font-mono uppercase"
                  maxLength={5}
                />
                <Select
                  value={newGenreShelf || placementZones[0] || 'Main Stacks'}
                  onValueChange={setNewGenreShelf}
                >
                  <SelectTrigger className="rounded-lg text-xs">
                    <SelectValue placeholder="Home shelf" />
                  </SelectTrigger>
                  <SelectContent>
                    {placementZones.map((zone) => (
                      <SelectItem key={zone} value={zone} className="text-xs">
                        {zone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <div className="flex flex-wrap gap-1 flex-1">
                    {GENRE_COLOR_PALETTE.slice(0, 6).map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setNewGenreColor(hex)}
                        className={cn(
                          'h-5 w-5 rounded-full border',
                          newGenreColor === hex ? 'ring-2 ring-primary ring-offset-1' : 'border-black/10',
                        )}
                        style={{ backgroundColor: hex }}
                        aria-label={`Color ${hex}`}
                      />
                    ))}
                  </div>
                  <Button size="sm" className="h-8 rounded-lg text-xs" onClick={handleAddGenre} disabled={!newGenreName.trim()}>
                    Save
                  </Button>
                </div>
              </motion.div>
            )}

            <motion.div
              className="rounded-xl border divide-y overflow-hidden bg-card"
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.04 } },
              }}
            >
              {genres.map((g) => {
                const shelfValue = placementZones.includes(g.defaultShelf)
                  ? g.defaultShelf
                  : g.defaultShelf || placementZones[0] || 'Main Stacks';
                return (
                  <motion.div
                    key={g.id}
                    variants={{
                      hidden: { opacity: 0, y: 6 },
                      show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 380, damping: 28 } },
                    }}
                    className="flex flex-col gap-2 p-2.5 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <div className="relative group shrink-0">
                        <button
                          type="button"
                          className="h-7 w-7 rounded-full border shadow-sm"
                          style={{ backgroundColor: g.color }}
                          title="Pick a color"
                          aria-label={`Color for ${g.label}`}
                        />
                        <div className="absolute left-0 top-8 z-50 hidden group-hover:flex gap-1 rounded-xl border bg-popover p-1.5 shadow-xl">
                          {GENRE_COLOR_PALETTE.map((hex) => (
                            <button
                              key={hex}
                              type="button"
                              onClick={() => handleUpdateGenre(g.id, { color: hex })}
                              className="h-5 w-5 rounded-full border border-black/10"
                              style={{ backgroundColor: hex }}
                              aria-label={`Use color ${hex}`}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="truncate text-sm font-semibold">{g.label}</span>
                      <Input
                        value={g.callPrefix}
                        maxLength={5}
                        onChange={(e) =>
                          handleUpdateGenre(g.id, { callPrefix: e.target.value.toUpperCase() }, { silent: true })
                        }
                        className="h-7 w-16 shrink-0 rounded-md px-1.5 font-mono text-[10px] uppercase"
                        aria-label={`Short code for ${g.label}`}
                      />
                    </div>
                    <Select
                      value={shelfValue}
                      onValueChange={(v) => handleUpdateGenre(g.id, { defaultShelf: v })}
                    >
                      <SelectTrigger className="h-8 w-full rounded-lg text-xs sm:max-w-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {!placementZones.includes(g.defaultShelf) && g.defaultShelf ? (
                          <SelectItem value={g.defaultShelf} className="text-xs">
                            {g.defaultShelf}
                          </SelectItem>
                        ) : null}
                        {placementZones.map((zone) => (
                          <SelectItem key={zone} value={zone} className="text-xs">
                            {zone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {genres.length > 3 ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveGenre(g.id)}
                        title="Remove this kind"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </motion.div>
                );
              })}
            </motion.div>
          </div>

          <div className="space-y-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-0 text-xs text-muted-foreground"
              onClick={() => setShowShelfExtras((open) => !open)}
            >
              {showShelfExtras ? 'Hide extra lineup options' : 'More · lineup and number style'}
            </Button>
            {showShelfExtras ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="lib-org-scheme" className="text-xs font-bold">How books are lined up</Label>
                  <Select
                    value={orgScheme}
                    onValueChange={(v) => updateSettings({ libraryOrganizationScheme: v as LibraryOrganizationScheme })}
                  >
                    <SelectTrigger id="lib-org-scheme" className="rounded-xl text-xs font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {(Object.keys(LIBRARY_ORGANIZATION_SCHEMES) as LibraryOrganizationScheme[]).map((key) => (
                        <SelectItem key={key} value={key} className="text-xs">
                          {LIBRARY_ORGANIZATION_SCHEMES[key].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lib-barcode-scheme" className="text-xs font-bold">How new book numbers look</Label>
                  <Select
                    value={barcodeScheme}
                    onValueChange={(v) => updateSettings({ libraryBarcodeNumberScheme: v as BarcodeNumberScheme })}
                  >
                    <SelectTrigger id="lib-barcode-scheme" className="rounded-xl text-xs font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="genre_code" className="text-xs">Genre code (FIC-823-0001)</SelectItem>
                      <SelectItem value="dewey_numeric" className="text-xs">Dewey number (823-0001)</SelectItem>
                      <SelectItem value="prefix_genre" className="text-xs">School prefix (LIB-FIC-0001)</SelectItem>
                      <SelectItem value="classic_random" className="text-xs">Random school number</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Example:{' '}
                    <span className="font-mono font-semibold text-foreground">
                      {generateGenreBarcode({ category: 'Fiction', scheme: barcodeScheme, sequenceNumber: 1 })}
                    </span>
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </AccordionContent>
      </AccordionItem>
      )}

      {/* 6. Alerts & Behavior Feedback */}
      {(!matchingSectionIds || matchingSectionIds.has('alerts')) && (
      <AccordionItem value="alerts" className="rounded-xl border border-dashed shadow-[0_18px_50px_-12px_rgba(15,23,42,0.28),0_6px_18px_-6px_rgba(15,23,42,0.14)] overflow-hidden" style={boxStyle}>
        <div className="flex items-center gap-2 pr-3">
          <AccordionTrigger className="flex-1 px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2 text-left">
              <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base font-medium">
                  Alerts &amp; Reading Feedback
                </div>
                <p className="text-sm text-muted-foreground font-normal">
                  Send overdue warnings, sync with classroom rosters, and celebrate reading habits.
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <StaffPortalTabInfoPopover
            sections={[
              staffPortalTabInfoSection(
                'Keep students and homeroom teachers informed about overdue books and encourage positive reading habits.',
              ),
            ]}
            ariaLabel="About alerts and feedback"
          />
        </div>
        <AccordionContent className="px-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
              <div>
                <p className="text-xs font-bold">Reading milestone streaks</p>
                <p className="text-[11px] text-muted-foreground">
                  Track and award reading badges when students return books consistently on time.
                </p>
              </div>
              <Switch
                checked={milestonesOn}
                onCheckedChange={(v) => updateSettings({ libraryReadingMilestonesEnabled: v })}
              />
            </div>

            <div className="space-y-1.5 rounded-lg border bg-muted/30 px-3 py-2 sm:col-span-2">
              <Label htmlFor="lib-overdue-warn" className="text-xs font-bold">
                Due soon warning alert (days before due date)
              </Label>
              <Select
                value={String(settings.libraryOverdueWarningDays ?? 3)}
                onValueChange={(v) => updateSettings({ libraryOverdueWarningDays: parseInt(v, 10) || 3 })}
              >
                <SelectTrigger id="lib-overdue-warn" className="h-8 rounded-lg text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day before due</SelectItem>
                  <SelectItem value="2">2 days before due</SelectItem>
                  <SelectItem value="3">3 days before due (recommended)</SelectItem>
                  <SelectItem value="5">5 days before due</SelectItem>
                  <SelectItem value="0">Disabled (overdue notice only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
      )}
    </Accordion>
    )}
  </div>
  );
}

