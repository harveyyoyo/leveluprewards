'use client';

import { useState } from 'react';
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
  Palette,
  Play,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  ScanBarcode,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
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
  getActiveLibraryGenres,
  generateGenreBarcode,
  type LibraryGenreConfig,
  type BarcodeNumberScheme,
} from '@/lib/library/libraryClassification';
import {
  LIBRARY_ORGANIZATION_SCHEMES,
  type LibraryOrganizationScheme,
} from '@/lib/library/libraryOrganization';
import {
  StaffPortalTabInfoPopover,
  staffPortalTabInfoSection,
} from '@/components/staff/StaffPortalTabInfoPopover';
import { LIBRARY_LABEL_OPTIONS, getLibraryLabelOption, type LibraryLabelFormat } from '@/lib/library/libraryScanCode';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useToast } from '@/hooks/use-toast';
import {
  LIBRARY_REWARD_MODE_LABELS,
  resolveLibraryRewardMode,
  type LibraryRewardMode,
} from '@/lib/library/libraryPolicy';
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

export function LibraryPolicySettingsCard({ categories }: { categories?: Category[] | null }) {
  const { settings, updateSettings } = useSettings();
  const { toast } = useToast();
  const [testingSound, setTestingSound] = useState<string | null>(null);
  const categoryList = categories ?? [];
  const rewardMode = resolveLibraryRewardMode(settings);

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
  const orgScheme: LibraryOrganizationScheme = settings.libraryOrganizationScheme ?? 'genre_then_author';
  const placementZones: string[] =
    settings.libraryPlacementZones && settings.libraryPlacementZones.length > 0
      ? settings.libraryPlacementZones
      : DEFAULT_LIBRARY_PLACEMENT_ZONES;

  const [newShelfName, setNewShelfName] = useState('');
  const [isAddingShelf, setIsAddingShelf] = useState(false);
  const [editingShelfIndex, setEditingShelfIndex] = useState<number | null>(null);
  const [editingShelfValue, setEditingShelfValue] = useState('');

  const handleAddShelf = () => {
    const trimmed = newShelfName.trim();
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
    const trimmed = editingShelfValue.trim();
    if (!trimmed) return;
    const next = [...placementZones];
    next[index] = trimmed;
    updateSettings({ libraryPlacementZones: next });
    setEditingShelfIndex(null);
    setEditingShelfValue('');
    toast({ title: 'Shelf location updated' });
  };

  const handleRemoveShelf = (index: number) => {
    const removed = placementZones[index];
    const next = placementZones.filter((_, i) => i !== index);
    updateSettings({
      libraryPlacementZones: next.length > 0 ? next : DEFAULT_LIBRARY_PLACEMENT_ZONES,
    });
    toast({ title: `Removed "${removed}" from shelves` });
  };

  const handleResetShelves = () => {
    updateSettings({ libraryPlacementZones: DEFAULT_LIBRARY_PLACEMENT_ZONES });
    toast({ title: 'Reset to standard library shelf locations' });
  };

  const genres = getActiveLibraryGenres(settings.libraryGenreDefinitions);
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

  const handleUpdateGenre = (id: string, patch: Partial<LibraryGenreConfig>) => {
    const next = genres.map((g) => (g.id === id ? { ...g, ...patch } : g));
    updateSettings({ libraryGenreDefinitions: next });
    toast({ title: 'Genre updated' });
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
      defaultShelf: newGenreShelf.trim() || 'Main Stacks',
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
      libraryGenreDefinitions: undefined,
      libraryBarcodeNumberScheme: 'genre_code',
    });
    toast({ title: 'Reset to standard library genres & colors' });
  };

  return (
    <Accordion type="multiple" defaultValue={['circulation']} className="space-y-3">
      {/* 1. Circulation & Loan Policies */}
      <AccordionItem value="circulation" className="rounded-xl border border-dashed bg-card shadow-sm overflow-hidden">
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

            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
              <div>
                <p className="text-xs font-bold">Allow checkout by ISBN number</p>
                <p className="text-[11px] text-muted-foreground">
                  Allow taking out books by scanning or typing the book's printed ISBN number, automatically assigning an available copy.
                </p>
              </div>
              <Switch
                checked={allowIsbnCheckoutOn}
                onCheckedChange={(v) => updateSettings({ libraryAllowIsbnCheckout: v })}
              />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Sync with LevelUp App — one place to decide what connects to the main app */}
      <AccordionItem value="sync" className="rounded-xl border border-dashed bg-card shadow-sm overflow-hidden">
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
                  Decide whether library points, overdue notices, and student checkout connect to the main LevelUp app.
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <StaffPortalTabInfoPopover
            sections={[
              staffPortalTabInfoSection(
                'One place to control whether the library integrates with LevelUp points, teacher notifications, and the student dashboard — or stays fully self-contained.',
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
        </AccordionContent>
      </AccordionItem>

      {/* 2. Self-Checkout Station & Hardware Scanning */}
      <AccordionItem value="hardware" className="rounded-xl border border-dashed bg-card shadow-sm overflow-hidden">
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
                <p className="text-xs font-bold">Show totals on Library Desk</p>
                <p className="text-[11px] text-muted-foreground">
                  On by default. Show the Total Catalog / On Shelf / Active Loans / Overdue stat cards at the top of the Library Desk.
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
                  On by default. Numbers count up when the Library Desk loads. Turn off for plain static numbers.
                </p>
              </div>
              <Switch
                checked={settings.libraryDeskTotalsAnimated ?? true}
                disabled={(settings.libraryDeskShowTotals ?? true) === false}
                onCheckedChange={(v) => updateSettings({ libraryDeskTotalsAnimated: v })}
              />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* 3. Return Audio Sounds & Student Responses */}
      <AccordionItem value="audio" className="rounded-xl border border-dashed bg-card shadow-sm overflow-hidden">
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

      {/* 4. Fines, Rewards & Point Balances */}
      <AccordionItem value="fines" className="rounded-xl border border-dashed bg-card shadow-sm overflow-hidden">
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

      {/* 4. Cataloging & Label Printing Defaults */}
      <AccordionItem value="cataloging" className="rounded-xl border border-dashed bg-card shadow-sm overflow-hidden">
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
                  Set default book shelves, genres, barcode formats, and automatic catalog lookup.
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <StaffPortalTabInfoPopover
            sections={[
              staffPortalTabInfoSection(
                'Streamline book intake by pre-populating shelf locations and choosing how stickers and spine labels are printed.',
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
              <Input
                id="lib-default-shelf"
                placeholder="e.g. Main Stacks, Fiction"
                value={settings.libraryDefaultShelf ?? ''}
                onChange={(e) => updateSettings({ libraryDefaultShelf: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lib-default-category" className="text-xs font-bold">
                Default genre / category
              </Label>
              <Input
                id="lib-default-category"
                placeholder="e.g. General, Graphic Novel"
                value={settings.libraryDefaultCategory ?? 'General'}
                onChange={(e) => updateSettings({ libraryDefaultCategory: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lib-label-format" className="text-xs font-bold">
                Default label format
              </Label>
              <Select
                value={settings.libraryLabelFormat ?? 'sticker'}
                onValueChange={(v) =>
                  updateSettings({ libraryLabelFormat: v as LibraryLabelFormat })
                }
              >
                <SelectTrigger id="lib-label-format" className="rounded-xl text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {LIBRARY_LABEL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id} className="text-xs">
                      {opt.shortName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10.5px] text-muted-foreground">
                {getLibraryLabelOption(settings.libraryLabelFormat ?? 'sticker').dimensions} · {getLibraryLabelOption(settings.libraryLabelFormat ?? 'sticker').badge}
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
        </AccordionContent>
      </AccordionItem>

      {/* 5. Book Shelving Hierarchy, Physical Locations & Genre Classification */}
      <AccordionItem value="genre" className="rounded-xl border border-dashed bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 pr-3">
          <AccordionTrigger className="flex-1 px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2 text-left">
              <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
                <Library className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base font-medium flex items-center gap-2">
                  <span>Book Organization Hierarchy &amp; Physical Shelves</span>
                  <Badge variant="outline" className="text-xs font-normal">
                    {LIBRARY_ORGANIZATION_SCHEMES[orgScheme]?.shortLabel ?? 'Genre → Author'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground font-normal">
                  Choose whether to organize by Genre then Author or Author then Genre, manage physical shelves (&quot;Where in the library books are&quot;), and color-code genres.
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
            Reset All Standards
          </Button>
        </div>

        <AccordionContent className="px-4 space-y-6 pt-1">
          {/* A. Book Shelving & Organization Hierarchy */}
          <div className="rounded-2xl border bg-muted/20 p-4 space-y-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  Book Organization &amp; Filing Hierarchy
                </Label>
                <Badge variant="secondary" className="text-[10px] font-semibold">
                  Active: {LIBRARY_ORGANIZATION_SCHEMES[orgScheme]?.shortLabel}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                How books are shelved physically in the library, browsed in the catalog, and guided on the self-checkout return screen.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {(Object.keys(LIBRARY_ORGANIZATION_SCHEMES) as LibraryOrganizationScheme[]).map((key) => {
                const s = LIBRARY_ORGANIZATION_SCHEMES[key];
                const isSelected = orgScheme === key;
                return (
                  <div
                    key={key}
                    role="button"
                    tabIndex={0}
                    onClick={() => updateSettings({ libraryOrganizationScheme: key })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        updateSettings({ libraryOrganizationScheme: key });
                      }
                    }}
                    className={cn(
                      'rounded-xl border-2 p-3.5 cursor-pointer transition-all text-left flex flex-col justify-between space-y-2 select-none',
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40'
                        : 'border-border/70 hover:border-primary/50 hover:bg-muted/30 bg-background',
                    )}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-bold text-xs sm:text-sm text-foreground">{s.label}</span>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">{s.description}</p>
                    </div>
                    <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-1 text-[10px] font-mono text-primary font-semibold">
                      <span>{s.example}</span>
                      {key === 'genre_then_author' && (
                        <span className="rounded bg-primary/15 px-1.5 py-0.2 text-[9px] uppercase font-bold text-primary">
                          Standard
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live Filing Guide Explainer Box */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
                <div>
                  <span className="font-bold text-foreground">Active Shelving Guide: </span>
                  <span className="text-muted-foreground">
                    {orgScheme === 'genre_then_author'
                      ? 'Books are housed in Genre bays (e.g. Fiction, Science), then filed A-Z by author surname.'
                      : orgScheme === 'author_then_genre'
                        ? 'Books are filed strictly by Author (A-Z), with sub-clustering by Genre within each author.'
                        : 'Books are organized by physical library shelf/room location, then by Author.'}
                  </span>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-[11px] shrink-0 self-start sm:self-auto bg-background">
                {orgScheme === 'genre_then_author'
                  ? 'Sign: [Fiction Bay] · Shelf: [C - Canin, Ethan]'
                  : orgScheme === 'author_then_genre'
                    ? 'Sign: [Canin, Ethan] · Shelf: [Fiction]'
                    : 'Sign: [Aisle 1 - Fiction Bays] · Shelf: [Canin, Ethan]'}
              </Badge>
            </div>
          </div>

          {/* B. Physical Shelves & Library Locations Manager ("Where in the library a book is") */}
          <div className="rounded-2xl border bg-muted/20 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Where Books Are in the Library (Physical Shelves &amp; Locations)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Customize physical bookcases, aisles, spinner racks, and quiet nooks. Available in copy dropdowns and return guidance.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl gap-1.5 text-xs"
                  onClick={() => setIsAddingShelf(!isAddingShelf)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Shelf / Location
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-xl text-xs text-muted-foreground"
                  onClick={handleResetShelves}
                  title="Reset to standard school library placement zones"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Reset
                </Button>
              </div>
            </div>

            {/* School Default Shelf Location */}
            <div className="rounded-xl border bg-background p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground">Default Library Shelf for New Books</span>
                <p className="text-[11px] text-muted-foreground">
                  Pre-populates new intake books when no specific shelf is entered.
                </p>
              </div>
              <Select
                value={settings.libraryDefaultShelf || 'Main Stacks'}
                onValueChange={(v) => updateSettings({ libraryDefaultShelf: v })}
              >
                <SelectTrigger className="w-[280px] rounded-xl text-xs font-medium">
                  <SelectValue placeholder="Select default shelf..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Main Stacks">Main Stacks (Default)</SelectItem>
                  {placementZones.map((zone) => (
                    <SelectItem key={zone} value={zone}>
                      {zone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Add Shelf Input */}
            {isAddingShelf && (
              <div className="rounded-xl border border-primary/40 bg-primary/5 p-3 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <Input
                  placeholder="e.g. Aisle 4 - Graphic Novels, Reading Nook Low Bin..."
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

          {/* Barcode Numbering Scheme */}
          <div className="rounded-2xl border bg-muted/20 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <Label htmlFor="lib-barcode-scheme" className="text-sm font-bold flex items-center gap-2">
                  <ScanBarcode className="h-4 w-4 text-primary" />
                  Barcode Numbering Scheme
                </Label>
                <p className="text-xs text-muted-foreground">
                  Format copy barcodes so numbers reflect the genre and Dewey category.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Select
                  value={barcodeScheme}
                  onValueChange={(v) =>
                    updateSettings({ libraryBarcodeNumberScheme: v as BarcodeNumberScheme })
                  }
                >
                  <SelectTrigger id="lib-barcode-scheme" className="w-[280px] rounded-xl font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="genre_code">
                      Genre Code (e.g. FIC-823-0001) · Recommended
                    </SelectItem>
                    <SelectItem value="dewey_numeric">
                      Dewey Decimal (e.g. 823-0001)
                    </SelectItem>
                    <SelectItem value="prefix_genre">
                      School Prefix (e.g. LIB-FIC-0001)
                    </SelectItem>
                    <SelectItem value="classic_random">
                      Classic Random (e.g. LIB8A3F9B2C)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Scheme Visual Sample */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50 text-xs">
              <span className="text-muted-foreground font-medium">Live format sample:</span>
              <Badge
                variant="outline"
                className="font-mono text-xs px-2 py-0.5"
                style={{
                  borderColor: '#2563EB',
                  backgroundColor: '#2563EB15',
                  color: '#2563EB',
                }}
              >
                {generateGenreBarcode({ category: 'Fiction', scheme: barcodeScheme, sequenceNumber: 142 })}
              </Badge>
              <span className="text-muted-foreground">· Fiction</span>

              <Badge
                variant="outline"
                className="font-mono text-xs px-2 py-0.5 ml-2"
                style={{
                  borderColor: '#059669',
                  backgroundColor: '#05966915',
                  color: '#059669',
                }}
              >
                {generateGenreBarcode({ category: 'Science', scheme: barcodeScheme, sequenceNumber: 88 })}
              </Badge>
              <span className="text-muted-foreground">· Science</span>

              <Badge
                variant="outline"
                className="font-mono text-xs px-2 py-0.5 ml-2"
                style={{
                  borderColor: '#EA580C',
                  backgroundColor: '#EA580C15',
                  color: '#EA580C',
                }}
              >
                {generateGenreBarcode({ category: 'Graphic Novel', scheme: barcodeScheme, sequenceNumber: 23 })}
              </Badge>
              <span className="text-muted-foreground">· Graphic Novels</span>
            </div>
          </div>

          {/* Genre & Shelving Placement Table */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Library Placement &amp; Genre Colors
                </Label>
                <p className="text-xs text-muted-foreground">
                  Assign each genre a distinct visual color and physical library location. When books are returned, the screen will route them to this shelf!
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl gap-1.5 text-xs"
                onClick={() => setIsAddingGenre(!isAddingGenre)}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Genre
              </Button>
            </div>

            {/* Add Genre Form */}
            {isAddingGenre && (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="font-semibold text-xs text-primary flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Create New Library Genre &amp; Shelf Location
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <Label className="text-xs">Genre Name</Label>
                    <Input
                      placeholder="e.g. Manga, Coding, Poetry"
                      value={newGenreName}
                      onChange={(e) => setNewGenreName(e.target.value)}
                      className="rounded-xl mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Call Prefix (2-4 letters)</Label>
                    <Input
                      placeholder="e.g. MAN, COD, POE"
                      value={newGenrePrefix}
                      onChange={(e) => setNewGenrePrefix(e.target.value.toUpperCase())}
                      className="rounded-xl mt-1 uppercase"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Shelf / Placement Location</Label>
                    <Input
                      placeholder="e.g. Room 204 - Shelf B"
                      value={newGenreShelf}
                      onChange={(e) => setNewGenreShelf(e.target.value)}
                      className="rounded-xl mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Accent Color</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <div
                        className="h-9 w-9 rounded-xl border shadow-inner shrink-0"
                        style={{ backgroundColor: newGenreColor }}
                      />
                      <div className="flex flex-wrap gap-1 flex-1">
                        {GENRE_COLOR_PALETTE.slice(0, 6).map((hex) => (
                          <button
                            key={hex}
                            type="button"
                            onClick={() => setNewGenreColor(hex)}
                            className="h-5 w-5 rounded-full border border-black/10 transition-transform hover:scale-125"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button size="sm" variant="ghost" onClick={() => setIsAddingGenre(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleAddGenre} disabled={!newGenreName.trim()}>
                    Save Genre
                  </Button>
                </div>
              </div>
            )}

            {/* Genres List */}
            <div className="rounded-2xl border divide-y overflow-hidden bg-card">
              {genres.map((g) => {
                const sampleBarcode = generateGenreBarcode({
                  category: g.label,
                  customGenres: genres,
                  scheme: barcodeScheme,
                  sequenceNumber: 1,
                });

                return (
                  <div
                    key={g.id}
                    className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-muted/15 transition-colors"
                  >
                    {/* Left: Color dot, Name, Prefix */}
                    <div className="flex items-center gap-3 min-w-[220px]">
                      {/* Color Picker Dropdown / Palette */}
                      <div className="relative group shrink-0">
                        <div
                          className="h-7 w-7 rounded-lg border shadow-sm flex items-center justify-center text-white text-[9px] font-black cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                          style={{ backgroundColor: g.color }}
                          title="Click to pick color"
                        >
                          {g.callPrefix.slice(0, 2)}
                        </div>
                        {/* Quick Color Swatch Hover Bar */}
                        <div className="absolute left-0 top-9 hidden group-hover:flex z-50 p-1.5 bg-popover border rounded-xl shadow-xl gap-1">
                          {GENRE_COLOR_PALETTE.map((hex) => (
                            <button
                              key={hex}
                              type="button"
                              onClick={() => handleUpdateGenre(g.id, { color: hex })}
                              className="h-5 w-5 rounded-full border border-black/10 transition-transform hover:scale-125"
                              style={{ backgroundColor: hex }}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 font-bold text-sm">
                          <span>{g.label}</span>
                          <Badge
                            variant="outline"
                            className="font-mono text-[10px] px-1.5 py-0"
                            style={{
                              borderColor: `${g.color}60`,
                              backgroundColor: `${g.color}15`,
                              color: g.color,
                            }}
                          >
                            {g.callPrefix}
                          </Badge>
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                          <span>Barcode: {sampleBarcode}</span>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Physical Shelf Placement */}
                    <div className="flex-1 max-w-md">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <Input
                          value={g.defaultShelf}
                          placeholder="Placement location in library..."
                          onChange={(e) => handleUpdateGenre(g.id, { defaultShelf: e.target.value })}
                          className="h-8 text-xs rounded-xl bg-background"
                        />
                      </div>
                    </div>

                    {/* Right: Preview badge & Delete */}
                    <div className="flex items-center justify-between md:justify-end gap-2 shrink-0">
                      <div
                        className="px-2 py-1 rounded-md text-[11px] font-bold border shrink-0 flex items-center gap-1"
                        style={{
                          backgroundColor: `${g.color}15`,
                          borderColor: `${g.color}40`,
                          color: g.color,
                        }}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: g.color }} />
                        <span>{g.defaultShelf.split('-')[0]?.trim() || 'Shelf'}</span>
                      </div>

                      {genres.length > 3 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveGenre(g.id)}
                          title="Remove genre"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* 6. Alerts & Behavior Feedback */}
      <AccordionItem value="alerts" className="rounded-xl border border-dashed bg-card shadow-sm overflow-hidden">
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
    </Accordion>
  );
}

