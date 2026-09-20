'use client';

import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import {
  AlertCircle,
  BookOpen,
  BookOpenCheck,
  Camera,
  CameraOff,
  Check,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  ClipboardCheck,
  Clock,
  Download,
  FileSpreadsheet,
  BarChart3,
  FolderTree,
  Grid,
  Info,
  Layers,
  LayoutGrid,
  List,
  Loader2,
  MapPin,
  Monitor,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Star,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useDoc, useFirestore, useFunctions, useCollection, useMemoFirebase } from '@/firebase';
import { useSchoolMetadataDocRef } from '@/hooks/useSchoolMetadataDocRef';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { usePrint } from '@/components/providers/PrintProvider';
import { useBarcodeReaderWedge } from '@/hooks/useBarcodeReaderWedge';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { BarcodeScannerCameraView } from '@/components/barcode/BarcodeScannerCameraView';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { resolveBookClassification } from '@/lib/library/libraryClassification';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { LibraryItem, LibraryItemInput, Student, Class, Category, LibraryBookReview } from '@/lib/types';
import { callLibrary, forceReturnLibraryItem, findLibraryItemByUpc } from '@/lib/library/libraryOperations';
import { allocateNextGenreBarcode, duplicateCheckoutItemIds, isCatalogCheckoutCodeTaken } from '@/lib/library/libraryIntakeHelpers';
import { normalizeLibraryUpc } from '@/lib/library/libraryScanCode';
import { isRetailIsbnBarcode } from '@/lib/library/libraryCatalogLookup';
import { formatDueDate, computeDaysOverdue } from '@/lib/library/libraryPolicy';
import { filterLibraryCatalog, downloadLibraryCsv, libraryCopyNeedsProcessing, type LibraryLoan } from '@/lib/library/libraryWorkspace';
import {
  groupBooksByOrganizationScheme,
  LIBRARY_ORGANIZATION_SCHEMES,
  resolveLibraryOrganizationScheme,
  type LibraryOrganizationScheme,
  type BookPrimaryGroup,
} from '@/lib/library/libraryOrganization';
import { compareReadingLevel } from '@/lib/library/libraryReadingLevel';
import { useActiveLibraryLocation, useLibraryLocations } from '@/hooks/useLibraryLocations';
import {
  filterItemsForLibrary,
  itemLibraryLocationId,
  libraryPath,
} from '@/lib/library/libraryLocations';
import { LibraryBackdrop } from './LibraryBackdrop';
import { LibraryInfoDesk } from './LibraryInfoDesk';
import { LibraryTotalsStatCards } from './LibraryTotalsStatCards';
import { LibraryStudentSelfCheckoutPortal } from './LibraryStudentSelfCheckoutPortal';
import { LibraryBookCover } from './LibraryBookCover';
import { LibraryBookIntakeScanner } from './LibraryBookIntakeScanner';
import { LibraryCatalogingStepsNote } from './LibraryCatalogingStepsNote';
import { LIBRARY_CATALOGING_SHORT } from '@/lib/library/libraryCatalogingCopy';
import { LibraryItemModal } from './LibraryItemModal';
import { LibraryCsvImportDialog } from './LibraryCsvImportDialog';
import { LibraryShelfAuditDialog } from './LibraryShelfAuditDialog';
import { LibraryPrintSlipsDialog } from './LibraryPrintSlipsDialog';
import { LibraryPrintLabelsModal } from './LibraryPrintLabelsModal';
import { LibraryPolicySettingsCard } from './LibraryPolicySettingsCard';
import { LibraryThemeSettingsCard } from './LibraryThemeSettingsCard';
import { LibraryPortalHub } from './LibraryPortalHub';
import { LibraryStationPicker } from './LibraryStationPicker';
import { LibraryReportsCard } from './LibraryReportsCard';
import { LibraryHeaderBar } from './LibraryHeaderBar';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { resolveLibraryTheme, type LibraryThemeId } from '@/lib/library/libraryThemes';
import type { LibraryLabelFormat } from '@/lib/library/libraryScanCode';
import { groupBooksIntoPiles, getBookPileKey, type BookPile } from '@/lib/library/bookPiles';
import { LibraryBookPileGrid } from './LibraryBookPileGrid';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatLibraryStudentName, resolveLibraryStudentNameMode } from '@/lib/library/libraryStudentDisplay';
import {
  LIBRARY_COVER_SIZE_LABELS,
  LIBRARY_COVER_SIZE_STORAGE_KEY,
  LIBRARY_COVER_SIZES,
  libraryCatalogPageSize,
  libraryTitleGridClass,
  parseLibraryCoverSize,
  type LibraryCoverSize,
} from '@/lib/library/libraryCatalogView';
const nativeSelect = 'h-10 rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-primary';

type MasterTitleGroup = {
  key: string;
  name: string;
  author: string;
  isbn: string;
  category: string;
  shelfLocation: string;
  coverUrl?: string;
  readingLevel?: string;
  pageCount?: number;
  publishedYear?: string;
  ratingAvg?: number;
  copies: LibraryItem[];
  availableCount: number;
  loanCount: number;
  lostDamagedCount: number;
};

export interface LibraryWorkspaceProps {
  embedded?: boolean;
  schoolId?: string | null;
  categories?: Category[] | null;
  className?: string;
}

export function LibraryWorkspace({
  embedded = false,
  schoolId: propSchoolId,
  categories: propCategories,
  className,
}: LibraryWorkspaceProps = {}) {
  const { schoolId: contextSchoolId, isInitialized, loginState, login, categories: contextCategories } = useAppContext();
  const schoolId = propSchoolId || contextSchoolId;
  const categories = propCategories ?? contextCategories;
  const schoolDocRef = useSchoolMetadataDocRef();
  const { data: schoolData } = useDoc<{ name?: string }>(schoolDocRef);
  const schoolName = schoolData?.name?.trim();
  const { settings, updateSettings } = useSettings();
  const currentThemeId = (settings.libraryTheme as LibraryThemeId) || 'classic_oak';
  const currentTheme = resolveLibraryTheme(currentThemeId, settings.libraryBoxOpacity);
  const firestore = useFirestore();
  const functions = useFunctions();
  const { toast } = useToast();
  const confirm = useConfirm();
  const { setLibraryStickersToPrint } = usePrint();
  const allowed = true;

  // Navigation & View State
  const [tab, setTab] = useState('desk');
  const playSound = useArcadeSound();
  const navSoundEnabled = settings.libraryNavSoundEffects !== false;
  const switchTab = useCallback(
    (next: string) => {
      if (navSoundEnabled) playSound('click');
      setTab(next);
    },
    [navSoundEnabled, playSound],
  );
  const [hubHome, setHubHome] = useState(true);

  // Support deep-linking to a specific station via ?tab=, the same convention the admin
  // dashboard uses — e.g. /schoolabc/library?tab=catalog opens straight to the Catalog.
  // Note: useSearchParams() returns a new object identity on every render (not just when the
  // query string actually changes), so both effects below compare real values rather than
  // relying on a "did I just apply this" ref flag — that pattern silently self-defeats here.
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rawTabParam = searchParams.get('tab')?.trim().toLowerCase() || '';
  const rawModeParam = searchParams.get('mode')?.trim().toLowerCase() || '';
  useEffect(() => {
    if (rawModeParam === 'dropbox' || rawModeParam === 'return') {
      setKioskInitialMode('return');
      setTab('kiosk');
      setHubHome(false);
      return;
    }
    if (['desk', 'catalog', 'loans', 'reports', 'settings', 'kiosk'].includes(rawTabParam)) {
      setTab((current) => (current === rawTabParam ? current : rawTabParam));
      setHubHome(false);
    }
  }, [rawTabParam, rawModeParam]);

  // Keep the address bar in sync as staff switch stations — mirrors the rest of the site
  // (e.g. the admin dashboard's ?tab=) so each section is a real, shareable, reloadable URL.
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const nextTab = hubHome ? null : tab;
    if (nextTab) {
      if (params.get('tab') === nextTab) return;
      params.set('tab', nextTab);
    } else {
      if (!params.has('tab')) return;
      params.delete('tab');
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, hubHome]);
  const [search, setSearch] = useState('');
  // The book a scan/search found, kept on screen after the search box auto-clears.
  const [pinnedItemId, setPinnedItemId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchAutoClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const focusSearchField = useCallback(() => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }, []);

  // Keep the search box focused (and its old text selected) while on Catalog, so a barcode
  // scan — which is really just fast typing — always lands here instead of being picked up by
  // the global scan listener below, which would otherwise jump away to the Librarian desk.
  useEffect(() => {
    if (tab !== 'catalog') return;
    const t = setTimeout(() => focusSearchField(), 80);
    return () => clearTimeout(t);
  }, [tab, focusSearchField]);

  // After a scan resolves, clear the search a moment later so the next book can be scanned
  // straight into an empty box instead of getting appended after the last code. The book that
  // was found stays pinned on screen — only the typed text goes away.
  const scheduleSearchClear = useCallback(() => {
    if (searchAutoClearRef.current) clearTimeout(searchAutoClearRef.current);
    searchAutoClearRef.current = setTimeout(() => {
      setSearch('');
      focusSearchField();
    }, 1500);
  }, [focusSearchField]);

  useEffect(() => {
    return () => {
      if (searchAutoClearRef.current) clearTimeout(searchAutoClearRef.current);
    };
  }, []);

  // Camera lookup for the Catalog search box — same "Enable camera scanning" school setting the
  // kiosk and librarian desk use. A decoded barcode just becomes the search term (it already
  // matches on UPC/ISBN, not just title) so the existing filter does the rest.
  const catalogCameraSettingEnabled = Boolean(settings.libraryCameraScanEnabled);
  const [catalogCameraActive, setCatalogCameraActive] = useState(false);
  const {
    videoRef: catalogVideoRef,
    hasCameraPermission: catalogHasCameraPermission,
    zoom: catalogCameraZoom,
    setZoom: setCatalogCameraZoom,
  } = useBarcodeScanner(
    catalogCameraSettingEnabled && catalogCameraActive,
    (code) => {
      setSearch(code);
      setPage(1);
      pinMatchAndScheduleClear(code);
    },
    undefined,
    { cameraEnabled: catalogCameraSettingEnabled && catalogCameraActive },
  );
  const [status, setStatus] = useState('all');
  const [shelfFilter, setShelfFilter] = useState('all');
  const [labelFilter, setLabelFilter] = useState<'all' | 'labeled' | 'unlabeled' | 'shared_number'>('all');
  // Changing a filter (e.g. Reports' "View overdue" jumping here with status=overdue) means the
  // user wants to browse that list, not keep looking at whatever book was previously pinned.
  useEffect(() => {
    setPinnedItemId(null);
  }, [status, shelfFilter, labelFilter]);
  const [catalogSort, setCatalogSort] = useState<'newest' | 'title_asc' | 'title_desc' | 'author_asc' | 'author_desc' | 'genre_asc' | 'genre_desc' | 'shelf' | 'reading_level'>('title_asc');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [coverSize, setCoverSize] = useState<LibraryCoverSize>('small');
  const [coverSizeReady, setCoverSizeReady] = useState(false);
  const [catalogView, setCatalogView] = useState<'scheme' | 'grouped'>('grouped');
  const pageSize = libraryCatalogPageSize(viewMode, coverSize);
  const [activeScheme, setActiveScheme] = useState<LibraryOrganizationScheme>(
    resolveLibraryOrganizationScheme(settings.libraryOrganizationScheme),
  );
  const [collapsedGroupKeys, setCollapsedGroupKeys] = useState<Set<string>>(new Set());
  const [unstackedPileKeys, setUnstackedPileKeys] = useState<Set<string>>(new Set());

  const togglePile = useCallback((pileKey: string) => {
    setUnstackedPileKeys((prev) => {
      const next = new Set(prev);
      if (next.has(pileKey)) next.delete(pileKey);
      else next.add(pileKey);
      return next;
    });
  }, []);

  const stackAllPiles = useCallback(() => {
    setUnstackedPileKeys(new Set());
  }, []);

  // Sync activeScheme when settings change
  useEffect(() => {
    setActiveScheme(resolveLibraryOrganizationScheme(settings.libraryOrganizationScheme));
  }, [settings.libraryOrganizationScheme]);

  useEffect(() => {
    try {
      setCoverSize(parseLibraryCoverSize(window.localStorage.getItem(LIBRARY_COVER_SIZE_STORAGE_KEY)));
    } catch {
      /* keep medium */
    }
    setCoverSizeReady(true);
  }, []);

  useEffect(() => {
    if (!coverSizeReady) return;
    try {
      window.localStorage.setItem(LIBRARY_COVER_SIZE_STORAGE_KEY, coverSize);
    } catch {
      /* ignore */
    }
  }, [coverSize, coverSizeReady]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Turning this on reveals a checkbox on every book so specific copies can be picked —
  // it no longer selects everything the moment it's checked.
  const [selectionMode, setSelectionMode] = useState(false);
  const [editing, setEditing] = useState<LibraryItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [kioskHandoffStudentId, setKioskHandoffStudentId] = useState<string | null>(null);
  const [kioskInitialMode, setKioskInitialMode] = useState<'auto' | 'checkout' | 'return' | null>(null);
  const [intakePrefillCode, setIntakePrefillCode] = useState<string | null>(null);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [shelfAuditOpen, setShelfAuditOpen] = useState(false);
  const [printSlipsOpen, setPrintSlipsOpen] = useState(false);
  const [printLabelsModalOpen, setPrintLabelsModalOpen] = useState(false);
  const [itemsForPrintModal, setItemsForPrintModal] = useState<LibraryItem[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [shelf, setShelf] = useState('');
  const [category, setCategory] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [readingLevelJob, setReadingLevelJob] = useState<{ total: number; done: number; matched: number } | null>(null);
  const readingLevelCancelRef = useRef(false);
  const reservedGenreCodesRef = useRef(new Set<string>());
  const [loanSearch, setLoanSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [loanSubTab, setLoanSubTab] = useState<'active' | 'overdue' | 'history'>('active');
  const [loanPage, setLoanPage] = useState(1);
  const [now, setNow] = useState(Date.now());
  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [waiverStudent, setWaiverStudent] = useState<Student | null>(null);
  const [waiverReason, setWaiverReason] = useState('');
  const [waiverAmount, setWaiverAmount] = useState('');
  const [addedCopies, setAddedCopies] = useState<LibraryItem[]>([]);
  const [pendingScanCode, setPendingScanCode] = useState<string | null>(null);

  // Global barcode listener: if scanning occurs on settings or other non-catalog tabs,
  // switch to Library Info desk to view details. Catalog and Kiosk handle their own scans
  // natively — Catalog keeps its own search box focused (see above) so scans land there.
  useBarcodeReaderWedge({
    active:
      tab !== 'desk' &&
      tab !== 'kiosk' &&
      tab !== 'catalog' &&
      !editOpen &&
      !intakeOpen &&
      !csvImportOpen &&
      !shelfAuditOpen &&
      !printSlipsOpen,
    onScan: (code) => {
      setPendingScanCode(code);
      setTab('desk');
    },
  });

  // Firestore Data Subscriptions
  const catalogQuery = useMemoFirebase(
    () => (firestore && schoolId && allowed ? collection(firestore, 'schools', schoolId, 'library') : null),
    [firestore, schoolId, allowed],
  );
  const studentsQuery = useMemoFirebase(
    () => (firestore && schoolId && allowed ? collection(firestore, 'schools', schoolId, 'students') : null),
    [firestore, schoolId, allowed],
  );
  const classesQuery = useMemoFirebase(
    () => (firestore && schoolId && allowed ? collection(firestore, 'schools', schoolId, 'classes') : null),
    [firestore, schoolId, allowed],
  );
  const historyQuery = useMemoFirebase(
    () =>
      firestore && schoolId && allowed && ((tab === 'loans' && loanSubTab === 'history') || tab === 'reports')
        ? query(collection(firestore, 'schools', schoolId, 'libraryLoans'), orderBy('checkedOutAt', 'desc'), limit(500))
        : null,
    [firestore, schoolId, allowed, tab, loanSubTab],
  );
  const reviewsQuery = useMemoFirebase(
    () =>
      firestore && schoolId && allowed && tab === 'reports'
        ? query(collection(firestore, 'schools', schoolId, 'libraryReviews'), limit(200))
        : null,
    [firestore, schoolId, allowed, tab],
  );

  const { data: items, isLoading: catalogLoading, error: catalogError } = useCollection<LibraryItem>(catalogQuery);
  const { data: students, isLoading: studentsLoading, error: studentsError } = useCollection<Student>(studentsQuery);
  const { data: classes } = useCollection<Class>(classesQuery);
  // Don't let a permission error here crash the whole page — Loans History and Reports both
  // degrade gracefully (see their render branches below) instead of tripping the app error boundary.
  const { data: loans, isLoading: historyLoading, error: historyError } = useCollection<LibraryLoan>(
    historyQuery,
    { reportPermissionErrors: false },
  );
  const { data: libraryReviews, error: reviewsError } = useCollection<LibraryBookReview>(reviewsQuery, {
    reportPermissionErrors: false,
  });

  const { locations } = useLibraryLocations(schoolId);
  const { active: activeLibrary, setActive: setActiveLibrary, needsChoice: needsLibraryChoice } = useActiveLibraryLocation(
    schoolId,
    locations,
    { requireExplicitChoice: true, ignoreStoredChoice: true },
  );
  const scopedItems = useMemo(
    () => filterItemsForLibrary(items, activeLibrary.id),
    [activeLibrary.id, items],
  );
  const sharedNumberIds = useMemo(() => duplicateCheckoutItemIds(scopedItems), [scopedItems]);
  const isLibraryUpcTaken = useCallback(async (code: string, excludeId?: string) => {
    const normalized = normalizeLibraryUpc(code);
    if (!normalized) return false;
    if (isCatalogCheckoutCodeTaken(scopedItems, normalized, excludeId)) return true;
    if (!firestore || !schoolId) return false;
    try {
      const found = await findLibraryItemByUpc(firestore, schoolId, normalized, { allowIsbn: false });
      return !!(found && found.item.id !== excludeId);
    } catch {
      return true;
    }
  }, [firestore, schoolId, scopedItems]);

  const studentsById = useMemo(() => new Map((students ?? []).map((s) => [s.id, s])), [students]);
  const studentNameMode = resolveLibraryStudentNameMode(
    settings.libraryStudentNameDisplayMode,
    settings.privacyStudentNameDisplayMode,
  );
  const getName = useCallback(
    (id?: string) => formatLibraryStudentName(studentsById.get(id ?? ''), studentNameMode),
    [studentsById, studentNameMode],
  );
  // Reports always show just the student's first name, regardless of the desk/kiosk name setting.
  const getReportName = useCallback(
    (id?: string) => formatLibraryStudentName(studentsById.get(id ?? ''), 'preferred_only'),
    [studentsById],
  );
  const getClass = useCallback(
    (id?: string) => {
      const s = studentsById.get(id ?? '');
      return classes?.find((c) => c.id === s?.classId)?.name ?? '';
    },
    [studentsById, classes],
  );

  // Look up what the just-typed/scanned term matches. Only when it lands on exactly one book —
  // the normal case for a barcode/ISBN scan — do we pin that book and clear the box a moment
  // later; a term that matches several books (or none) just stays in the box so the user can
  // see the narrowed list. The lookup ignores the current status/shelf/label filters on purpose:
  // if you scan a specific book, you want to see that book, not have it hidden by an unrelated
  // filter like "Available Now".
  const pinMatchAndScheduleClear = useCallback(
    (term: string) => {
      const matches = filterLibraryCatalog(scopedItems, term, 'all', getName, settings.libraryGenreDefinitions);
      if (matches.length === 1) {
        setPinnedItemId(matches[0].id);
        setPage(1);
        scheduleSearchClear();
      }
    },
    [scopedItems, getName, settings.libraryGenreDefinitions, scheduleSearchClear],
  );

  // Shelf locations list for filtering
  const availableShelves = useMemo(() => {
    const set = new Set<string>();
    for (const item of scopedItems) {
      if (item.shelfLocation?.trim()) set.add(item.shelfLocation.trim());
    }
    return Array.from(set).sort();
  }, [scopedItems]);

  // Filter catalog
  const filteredCatalog = useMemo(() => {
    // Once the search box auto-clears, keep showing the book it just found instead of
    // snapping back to the whole catalog.
    if (!search.trim() && pinnedItemId) {
      const pinned = scopedItems.find((i) => i.id === pinnedItemId);
      if (pinned) return [pinned];
    }
    let list = filterLibraryCatalog(scopedItems, search, status, getName, settings.libraryGenreDefinitions);
    if (shelfFilter !== 'all') {
      list = list.filter((i) => (i.shelfLocation || 'Unassigned') === shelfFilter);
    }
    if (labelFilter === 'labeled') {
      list = list.filter((i) => !libraryCopyNeedsProcessing(i));
    } else if (labelFilter === 'unlabeled') {
      list = list.filter((i) => libraryCopyNeedsProcessing(i));
    } else if (labelFilter === 'shared_number') {
      list = list.filter((i) => sharedNumberIds.has(i.id));
    }

    // Sort catalog
    list = [...list].sort((a, b) => {
      if (catalogSort === 'newest') {
        const timeA = a.createdAt ?? 0;
        const timeB = b.createdAt ?? 0;
        if (timeB !== timeA) return timeB - timeA;
        return (b.id || '').localeCompare(a.id || '');
      }
      if (catalogSort === 'title_asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (catalogSort === 'title_desc') {
        return (b.name || '').localeCompare(a.name || '');
      }
      if (catalogSort === 'author_asc') {
        return (a.author || '').localeCompare(b.author || '');
      }
      if (catalogSort === 'author_desc') {
        return (b.author || '').localeCompare(a.author || '');
      }
      if (catalogSort === 'genre_asc' || catalogSort === 'genre_desc') {
        const genreA = resolveBookClassification(a.category, settings.libraryGenreDefinitions, a.shelfLocation).genre.label;
        const genreB = resolveBookClassification(b.category, settings.libraryGenreDefinitions, b.shelfLocation).genre.label;
        return catalogSort === 'genre_asc' ? genreA.localeCompare(genreB) : genreB.localeCompare(genreA);
      }
      if (catalogSort === 'shelf') {
        return (a.shelfLocation || 'ZZZ').localeCompare(b.shelfLocation || 'ZZZ');
      }
      if (catalogSort === 'reading_level') {
        return compareReadingLevel(a.readingLevel, b.readingLevel);
      }
      return 0;
    });

    return list;
  }, [scopedItems, search, status, shelfFilter, labelFilter, catalogSort, getName, sharedNumberIds, settings.libraryGenreDefinitions, pinnedItemId]);

  // Organized scheme grouping (Genre → Author, or Author → Title)
  const organizedGroups = useMemo<BookPrimaryGroup[]>(() => {
    if (catalogView !== 'scheme') return [];
    return groupBooksByOrganizationScheme(
      filteredCatalog,
      activeScheme,
      settings.libraryGenreDefinitions,
    );
  }, [catalogView, filteredCatalog, activeScheme, settings.libraryGenreDefinitions]);

  // Master Title Grouping
  const catalogGroups = useMemo<MasterTitleGroup[]>(() => {
    if (catalogView !== 'grouped') return [];
    const map = new Map<string, MasterTitleGroup>();
    for (const item of filteredCatalog) {
      const normTitle = (item.name || '').trim().toLowerCase();
      const normAuthor = (item.author || '').trim().toLowerCase();
      const key = item.isbn?.trim() || `${normTitle}:::${normAuthor}`;
      let group = map.get(key);
      if (!group) {
        group = {
          key,
          name: item.name,
          author: item.author || '',
          isbn: item.isbn || '',
          category: item.category || '',
          shelfLocation: item.shelfLocation || '',
          coverUrl: item.coverUrl,
          readingLevel: item.readingLevel,
          pageCount: item.pageCount,
          publishedYear: item.publishedYear,
          ratingAvg: item.ratingAvg,
          copies: [],
          availableCount: 0,
          loanCount: 0,
          lostDamagedCount: 0,
        };
        map.set(key, group);
      }
      if (!group.coverUrl && item.coverUrl) group.coverUrl = item.coverUrl;
      if (!group.isbn && item.isbn) group.isbn = item.isbn;
      group.copies.push(item);
      if (item.condition === 'lost' || item.condition === 'damaged') group.lostDamagedCount++;
      else if (item.status === 'checked_out') group.loanCount++;
      else group.availableCount++;
    }
    return Array.from(map.values());
  }, [catalogView, filteredCatalog]);

  const togglePrimaryCollapse = (key: string) => {
    setCollapsedGroupKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAllPrimaryGroups = () => setCollapsedGroupKeys(new Set());
  const collapseAllPrimaryGroups = () => {
    const allKeys = new Set(organizedGroups.map((g) => g.key));
    setCollapsedGroupKeys(allKeys);
  };

  // Metrics
  const activeCopies = useMemo(() => scopedItems.filter((i) => !i.archived), [scopedItems]);
  const availableCopies = useMemo(
    () => activeCopies.filter((i) => i.status === 'available' && (!i.condition || i.condition === 'good')),
    [activeCopies],
  );
  const activeLoans = useMemo(() => activeCopies.filter((i) => i.status === 'checked_out'), [activeCopies]);
  const overdueLoans = useMemo(
    () => activeLoans.filter((i) => i.dueAt && computeDaysOverdue(i.dueAt) > 0),
    [activeLoans],
  );

  // Filtered loans list for Loans tab
  const filteredLoans = useMemo(() => {
    const list = loanSubTab === 'overdue' ? overdueLoans : activeLoans;
    return list.filter((i) => {
      if (classFilter !== 'all') {
        const s = studentsById.get(i.checkedOutTo ?? '');
        if (s?.classId !== classFilter) return false;
      }
      if (loanSearch.trim()) {
        const q = loanSearch.toLowerCase();
        const sName = getName(i.checkedOutTo || undefined).toLowerCase();
        const cName = getClass(i.checkedOutTo || undefined).toLowerCase();
        const bName = (i.name || '').toLowerCase();
        if (!sName.includes(q) && !cName.includes(q) && !bName.includes(q)) return false;
      }
      return true;
    });
  }, [loanSubTab, overdueLoans, activeLoans, classFilter, loanSearch, studentsById, getName, getClass]);

  const scopedLoans = useMemo(
    () => (loans ?? []).filter((l) => itemLibraryLocationId(l) === activeLibrary.id),
    [activeLibrary.id, loans],
  );

  const filteredHistory = useMemo(() => {
    return scopedLoans.filter((l) => {
      if (classFilter !== 'all') {
        const s = studentsById.get(l.studentId);
        if (s?.classId !== classFilter) return false;
      }
      if (loanSearch.trim()) {
        const q = loanSearch.toLowerCase();
        const sName = getName(l.studentId || undefined).toLowerCase();
        const cName = getClass(l.studentId || undefined).toLowerCase();
        const bName = (l.title || '').toLowerCase();
        if (!sName.includes(q) && !cName.includes(q) && !bName.includes(q)) return false;
      }
      return true;
    });
  }, [scopedLoans, classFilter, loanSearch, studentsById, getName, getClass]);

  // Selected copies for batch actions
  const selectedItems = useMemo(() => {
    const map = new Map(scopedItems.map((i) => [i.id, i]));
    return Array.from(selected).map((id) => map.get(id)).filter(Boolean) as LibraryItem[];
  }, [scopedItems, selected]);

  // What the toolbar's "Print Labels" button will actually print: the current selection if
  // there is one, otherwise every copy still needing a sticker in the current filtered view.
  const printQueueCount =
    selected.size > 0
      ? selected.size
      : filteredCatalog.filter((item) => libraryCopyNeedsProcessing(item)).length;

  const selectAllCurrentPage = () => {
    const currentSlice = filteredCatalog.slice((page - 1) * pageSize, page * pageSize);
    setSelected((prev) => {
      const allSelected = currentSlice.every((i) => prev.has(i.id));
      const next = new Set(prev);
      if (allSelected) {
        currentSlice.forEach((i) => next.delete(i.id));
      } else {
        currentSlice.forEach((i) => next.add(i.id));
      }
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Titles view groups copies under one title card — selecting the card selects every
  // copy of that title at once (there's no single "book" to select otherwise).
  const toggleGroupSelect = (copies: LibraryItem[]) => {
    setSelected((prev) => {
      const allSelected = copies.every((c) => prev.has(c.id));
      const next = new Set(prev);
      copies.forEach((c) => (allSelected ? next.delete(c.id) : next.add(c.id)));
      return next;
    });
  };

  const run = async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      return await fn();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Action failed', description: (e as Error).message });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  // Looks up a reading level (Lexile/AR/grade) for each book title (not each copy — copies of the
  // same title share one lookup and one save) and writes the results back. Runs a few books at a
  // time so the progress bar and Stop button stay responsive on a big catalog. Runs automatically
  // in the background (see the effect below) — there's no button to start it.
  const fetchReadingLevelsForPiles = async (piles: BookPile[], opts?: { silent?: boolean }) => {
    if (!piles.length) {
      if (!opts?.silent) toast({ title: 'Nothing to look up', description: 'Every book here already has a reading level.' });
      return;
    }
    readingLevelCancelRef.current = false;
    setReadingLevelJob({ total: piles.length, done: 0, matched: 0 });
    const CHUNK_SIZE = 6;
    let matched = 0;
    let stoppedEarly = false;
    try {
      for (let i = 0; i < piles.length; i += CHUNK_SIZE) {
        if (readingLevelCancelRef.current) break;
        const chunk = piles.slice(i, i + CHUNK_SIZE);
        const res = await fetch('/api/library/reading-levels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: chunk.map((pile) => ({ id: pile.pileKey, isbn: pile.isbn, title: pile.title, author: pile.author })),
            readingLevelSystem: settings.libraryReadingLevelSystem,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (data?.aiConfigured === false) {
          stoppedEarly = true;
          if (!opts?.silent) {
            toast({
              variant: 'destructive',
              title: 'AI lookup is not turned on',
              description: 'Ask your tech admin to turn on AI book lookup for this school before using this tool.',
            });
          }
          break;
        }
        const results: { id: string; readingLevel: string | null }[] = Array.isArray(data?.results) ? data.results : [];
        const levels = results
          .filter((r) => r.readingLevel)
          .flatMap((r) => {
            const pile = chunk.find((p) => p.pileKey === r.id);
            return pile ? pile.copies.map((copy) => ({ itemId: copy.id, readingLevel: r.readingLevel as string })) : [];
          });
        if (levels.length) {
          await callLibrary(functions, 'libraryReadingLevelsSave', { schoolId, levels });
          matched += results.filter((r) => r.readingLevel).length;
        }
        setReadingLevelJob({ total: piles.length, done: Math.min(i + chunk.length, piles.length), matched });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Reading level lookup failed', description: (e as Error).message });
    } finally {
      const cancelled = readingLevelCancelRef.current;
      setReadingLevelJob(null);
      if (!stoppedEarly && matched > 0) {
        toast({
          title: cancelled ? 'Stopped' : 'Reading levels updated',
          description: `Found a reading level for ${matched} of ${piles.length} book${piles.length === 1 ? '' : 's'} checked.`,
        });
      }
    }
  };

  // Automatically fills in missing reading levels in the background — no button needed. Runs once
  // per school per day (tracked in sessionStorage) so it doesn't re-spend AI lookups every time the
  // catalog page opens, and only while the Catalog tab is actually open.
  const autoReadingLevelStartedRef = useRef(false);
  useEffect(() => {
    if (tab !== 'catalog') return;
    if (readingLevelJob) return;
    if (autoReadingLevelStartedRef.current) return;
    if (!schoolId) return;
    const todayKey = `libraryReadingLevelAutoRun:${schoolId}:${new Date().toISOString().slice(0, 10)}`;
    try {
      if (window.sessionStorage.getItem(todayKey)) return;
    } catch {
      /* ignore */
    }
    const missing = groupBooksIntoPiles(scopedItems).filter((pile) => !pile.readingLevel);
    if (!missing.length) return;
    autoReadingLevelStartedRef.current = true;
    try {
      window.sessionStorage.setItem(todayKey, '1');
    } catch {
      /* ignore */
    }
    void fetchReadingLevelsForPiles(missing, { silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, scopedItems, schoolId, readingLevelJob]);

  const itemAction = (item: LibraryItem, action: string, extra: Record<string, unknown> = {}) =>
    run(async () => {
      if (action === 'archive' && !(await confirm({ title: `Archive ${item.name}?`, description: 'This copy will leave the active catalog. Its loan history will be preserved.', confirmLabel: 'Archive' }))) return;
      if (action === 'delete' && !(await confirm({ title: `Permanently delete "${item.name}"?`, description: 'This cannot be undone. Use Archive instead if you want to keep loan history.', confirmLabel: 'Delete permanently', destructive: true }))) return;
      const result =
        action === 'return'
          ? await forceReturnLibraryItem(firestore!, schoolId!, item, { functions })
          : await callLibrary<{ message: string }>(functions, 'libraryCirculation', {
              schoolId,
              action,
              itemId: item.id,
              studentId: item.checkedOutTo ?? null,
              expectedLoanId: item.activeLoanId ?? null,
              expectedCheckedOutAt: item.checkedOutAt ?? null,
              ...extra,
            });
      toast({ title: result.message ?? 'Updated' });
    });

  const print = (copies: LibraryItem[], format?: LibraryLabelFormat) => {
    if (!copies.length) return;
    if (format) {
      if (schoolId) setLibraryStickersToPrint(copies, { schoolId, format });
    } else {
      setItemsForPrintModal(copies);
      setPrintLabelsModalOpen(true);
    }
  };

  const save = async (input: LibraryItemInput, itemId?: string, options?: { stayInIntake?: boolean }) => {
    const result = await callLibrary<{ count: number; items: LibraryItem[] }>(functions, 'libraryCatalogSave', {
      schoolId,
      itemId,
      item: input,
      input,
      libraryLocationId: activeLibrary.id,
    });
    if (!itemId && result.items?.length) setAddedCopies(result.items);
    setEditOpen(false);
    setEditing(null);
    if (!itemId && !options?.stayInIntake) {
      setIntakeOpen(false);
      setTab('catalog');
    }
    toast({
      title: itemId ? 'Copy updated' : `${result.count} copies added`,
      description: itemId ? undefined : LIBRARY_CATALOGING_SHORT,
    });
  };

  const handleAddAnotherCopy = async (item: LibraryItem) => {
    await run(async () => {
      const upc = await allocateNextGenreBarcode({
        category: item.category,
        scheme: settings.libraryBarcodeNumberScheme ?? 'genre_code',
        customGenres: settings.libraryGenreDefinitions,
        existingUpcs: scopedItems.map((copy) => copy.upc),
        reserved: reservedGenreCodesRef.current,
        upcTaken: (code) => isLibraryUpcTaken(code),
      });
      const input: LibraryItemInput = {
        name: item.name,
        upc: upc ?? '',
        author: item.author,
        isbn: item.isbn,
        category: item.category,
        shelfLocation: item.shelfLocation,
        coverUrl: item.coverUrl,
        description: item.description,
        pageCount: item.pageCount,
        readingLevel: item.readingLevel,
        publishedYear: item.publishedYear,
        copies: 1,
      };
      const result = await callLibrary<{ count: number; items: LibraryItem[] }>(functions, 'libraryCatalogSave', {
        schoolId,
        item: input,
        input,
        libraryLocationId: activeLibrary.id,
      });
      if (result.items?.length) setAddedCopies(result.items);
      toast({
        title: 'Additional copy created',
        description: LIBRARY_CATALOGING_SHORT,
      });
    });
  };

  if (!isInitialized || !schoolId) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading library" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <main className="mx-auto max-w-md p-6 pt-24 space-y-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <BookOpen className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-foreground">Library Workspace</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in with a librarian or admin account to manage books and loans.</p>
        </div>
        <form
          className="space-y-4 rounded-3xl border border-border/80 bg-card p-6 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const result = await login('librarian', { schoolId, username, passcode });
              if (!result.ok) throw new Error(result.message);
              setPasscode('');
            });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="library-user" className="text-xs font-bold">Username</Label>
            <Input id="library-user" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="library-pass" className="text-xs font-bold">Passcode</Label>
            <Input id="library-pass" type="password" autoComplete="current-password" value={passcode} onChange={(e) => setPasscode(e.target.value)} />
          </div>
          <Button disabled={busy} className="w-full font-bold rounded-xl h-11">
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <Link className="block text-center text-sm font-semibold text-primary underline" href={`/${schoolId}/portal`}>
          Back to school portal
        </Link>
      </main>
    );
  }

  if (settings.payLibrary === false) {
    return (
      <main className="mx-auto max-w-md p-8 pt-24 text-center space-y-4">
        <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="text-2xl font-black">Library Not Enabled</h1>
        <p className="text-sm text-muted-foreground">The library module is currently turned off for this school.</p>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href={`/${schoolId}/portal`}>Back to portal</Link>
        </Button>
      </main>
    );
  }

  const backToPortalHref = `/${schoolId}/${loginState === 'admin' || loginState === 'developer' ? 'admin' : loginState === 'teacher' ? 'teacher' : 'portal'}`;
  // More than one library at this school — let the header's logo/name link (and the picker's
  // own back link) reopen the "which library" picker instead of leaving the library section.
  const chooseLibraryHref = locations.length > 1 ? `/${schoolId}/library` : undefined;

  // More than one library at this school and nothing picked yet (no ?library= link, and this
  // device hasn't chosen before) — ask instead of silently opening the school's main library.
  if (needsLibraryChoice) {
    return (
      <LibraryStationPicker
        locations={locations}
        onPick={setActiveLibrary}
        title="Which library do you want to open?"
        subtitle="Choose one to continue — you can switch later from Library settings."
        backHref={backToPortalHref}
        backLabel="Back to portal"
      />
    );
  }

  const pageCount = Math.max(
    1,
    Math.ceil(
      (catalogView === 'grouped' ? catalogGroups.length : filteredCatalog.length) / pageSize
    ),
  );
  const currentCatalogSlice = filteredCatalog.slice((page - 1) * pageSize, page * pageSize);
  const currentGroupSlice = catalogGroups.slice((page - 1) * pageSize, page * pageSize);
  // A search that looks like a scanned barcode (not a typed title/author) — used to offer
  // "add this book" when nothing matches, instead of just saying no results were found.
  const searchLooksScanned = /^\d{6,}$/.test(search.trim()) || isRetailIsbnBarcode(search.trim());

  const isNightDesk = currentTheme.id === 'night_desk';
  const isReadingRoom = currentTheme.id === 'reading_room';

  if (hubHome) {
    return (
      <LibraryPortalHub
        schoolName={schoolName}
        libraryName={locations.length > 1 ? activeLibrary.name : undefined}
        overdueCount={overdueLoans.length}
        catalogCount={activeCopies.length}
        backToPortalHref={backToPortalHref}
        chooseLibraryHref={chooseLibraryHref}
        onSelect={(nextTab) => {
          if (navSoundEnabled) playSound('click');
          setTab(nextTab);
          setHubHome(false);
        }}
        onOpenSettings={() => {
          if (navSoundEnabled) playSound('click');
          setTab('settings');
          setHubHome(false);
        }}
      />
    );
  }

  return (
    <div
      className={cn(
        'library-readable relative min-h-dvh flex flex-col transition-colors duration-300 pb-[max(1rem,env(safe-area-inset-bottom))] animate-in fade-in duration-300',
        isNightDesk
          ? 'bg-[#0b1324] text-[#f8fafc] dark'
          : isReadingRoom
            ? 'bg-[#fafaf9] text-[#0f172a]'
            : '',
        currentTheme.classes.wrapper
      )}
    >
      <LibraryBackdrop theme={currentTheme} />
      <LibraryHeaderBar
        theme={currentTheme}
        schoolName={schoolName || 'School Library'}
        backToPortalHref={backToPortalHref}
        chooseLibraryHref={chooseLibraryHref}
        activeTab={
          tab === 'settings'
            ? 'settings'
            : tab === 'loans'
              ? 'catalog'
              : tab === 'reports'
                ? 'reports'
                : (tab as 'desk' | 'catalog' | 'kiosk')
        }
        onNavigate={switchTab}
        onHome={() => {
          if (navSoundEnabled) playSound('click');
          setHubHome(true);
        }}
        onOpenSettings={() => switchTab('settings')}
      />

      {/* Main Column: Top Bar + Content */}
      <div className={cn('relative z-10 flex-1 flex flex-col min-w-0', (isNightDesk || isReadingRoom) && 'w-full')}>


        {/* Main Workstation View Area */}
        <main className={cn('flex-1 min-w-0 p-3 sm:p-6 lg:p-8 pb-[max(1rem,env(safe-area-inset-bottom))] overflow-x-hidden w-full mx-auto', (isNightDesk || isReadingRoom) ? 'max-w-6xl' : 'max-w-7xl')}>
        <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ type: 'spring', stiffness: 280, damping: 26 }}
          className="space-y-5 sm:space-y-6"
        >
        {/* 1. LIBRARY DESK — lookup only; borrow/return happens on the Kiosk */}
        {tab === 'desk' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <LibraryInfoDesk
              catalogItems={activeCopies}
              allCatalogItems={items}
              students={students}
              categories={categories}
              getStudentName={getName}
              initialScanCode={pendingScanCode}
              onClearInitialScan={() => setPendingScanCode(null)}
              onSwitchToKiosk={(studentId) => {
                setKioskHandoffStudentId(studentId ?? null);
                setKioskInitialMode(null);
                setTab('kiosk');
              }}
              onViewCatalog={(statusFilter) => {
                if (statusFilter) setStatus(statusFilter);
                setTab('catalog');
              }}
              onOpenIntake={(code) => {
                setIntakePrefillCode(code ?? null);
                setIntakeOpen(true);
              }}
              onOpenBookDetails={(book) => {
                setEditing(book);
                setEditOpen(true);
              }}
              onOpenReports={() => switchTab('reports')}
              schoolId={schoolId}
              schoolName={schoolName}
              libraryLocationId={activeLibrary.id}
              libraryLocations={locations}
            />
          </div>
        )}

        {/* 2. KIOSK MODE TAB (Check-in & Check-out Station) */}
        {tab === 'kiosk' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {schoolId ? (
              <LibraryStudentSelfCheckoutPortal
                schoolId={schoolId}
                categories={categories}
                getStudentName={getName}
                students={students}
                embedded
                initialStudentId={kioskHandoffStudentId}
                onInitialStudentConsumed={() => setKioskHandoffStudentId(null)}
                initialMode={kioskInitialMode ?? undefined}
                onExit={() => setHubHome(true)}
                libraryLocationId={activeLibrary.id}
                libraryLocations={locations}
              />
            ) : (
              <div className="rounded-3xl border bg-card/60 flex items-center justify-center py-20 text-muted-foreground min-h-[min(460px,calc(100dvh-7rem))] md:min-h-[460px]">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading kiosk...</span>
              </div>
            )}
          </div>
        )}

        {/* 2. CATALOG & INVENTORY TAB */}
        {tab === 'catalog' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {(settings.libraryDeskShowTotals ?? true) && (
              <LibraryTotalsStatCards
                copiesCount={activeCopies.length}
                availableCopiesCount={availableCopies.length}
                activeLoansCount={activeLoans.length}
                overdueLoansCount={overdueLoans.length}
                animated={settings.libraryDeskTotalsAnimated ?? true}
                isNightDesk={isNightDesk}
                isReadingRoom={isReadingRoom}
                currentTheme={currentTheme}
                activeFilter={
                  status === 'available' || status === 'checked_out' || status === 'overdue' || status === 'all'
                    ? status
                    : undefined
                }
                onViewCatalog={(statusFilter) => {
                  setStatus(statusFilter ?? 'all');
                  setPage(1);
                }}
              />
            )}
            {/* Catalog Top Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-foreground">Book Catalog</h2>
                <Badge variant="secondary" className="font-bold text-xs">
                  {filteredCatalog.length}{' '}
                  {status === 'checked_out'
                    ? 'on loan'
                    : status === 'overdue'
                      ? 'overdue'
                      : status === 'available'
                        ? 'on shelf'
                        : filteredCatalog.length === 1
                          ? 'copy'
                          : 'copies'}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShelfAuditOpen(true)}
                  className="h-9 gap-1.5 rounded-xl text-xs font-semibold shadow-xs"
                  title="Open the shelf audit tool to scan books and check physical inventory"
                >
                  <ClipboardCheck className="h-3.5 w-3.5 text-primary" />
                  <span>Shelf Audit</span>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl text-xs font-semibold shadow-xs">
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      <span>Tools</span>
                      <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    {(
                      <>
                        <DropdownMenuItem onClick={() => switchTab('loans')} className="gap-2 text-xs">
                          <Clock className="h-4 w-4 text-primary" />
                          <span>Loans &amp; Notices</span>
                          {overdueLoans.length > 0 ? (
                            <Badge variant="destructive" className="ml-auto h-4 min-w-4 px-1 rounded-full text-[10px] font-black">
                              {overdueLoans.length}
                            </Badge>
                          ) : null}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => switchTab('reports')} className="gap-2 text-xs">
                          <BarChart3 className="h-4 w-4 text-primary" />
                          <span>Reports &amp; Analytics</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem onClick={() => setShelfAuditOpen(true)} className="gap-2 text-xs">
                      <ClipboardCheck className="h-4 w-4 text-primary" />
                      <span>Shelf Audit Station</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setCsvImportOpen(true)} className="gap-2 text-xs">
                      <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                      <span>Import CSV Spreadsheet</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() =>
                        downloadLibraryCsv('library-catalog.csv', [
                          ['Title', 'Author', 'ISBN', 'Copy barcode', 'Shelf', 'Category', 'Status', 'Condition'],
                          ...filteredCatalog.map((i) => [
                            i.name,
                            i.author,
                            i.isbn,
                            i.upc,
                            i.shelfLocation,
                            i.category,
                            i.status,
                            i.condition ?? 'good',
                          ]),
                        ])
                      }
                      className="gap-2 text-xs"
                    >
                      <Download className="h-4 w-4 text-muted-foreground" />
                      <span>Export Catalog CSV</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const queue =
                      selected.size > 0
                        ? selectedItems
                        : filteredCatalog.filter((item) => libraryCopyNeedsProcessing(item));
                    if (queue.length) print(queue);
                  }}
                  disabled={printQueueCount === 0}
                  className="h-9 gap-1.5 rounded-xl text-xs font-semibold shadow-xs"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Labels ({printQueueCount})</span>
                </Button>

                <Button
                  size="sm"
                  onClick={() => setIntakeOpen(true)}
                  className="h-9 gap-1.5 rounded-xl text-xs font-bold shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Books</span>
                </Button>
              </div>
            </div>

            {/* Added Copies Notification */}
            {addedCopies.length > 0 && (
              <motion.div
                role="status"
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                className="library-notice-banner relative z-20 flex flex-col gap-3 rounded-2xl border-2 border-amber-500 bg-amber-50 p-4 text-stone-900 shadow-lg sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-700 text-white shadow-sm">
                    <Check className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-base font-semibold leading-snug text-stone-900">
                      {addedCopies.length} new {addedCopies.length === 1 ? 'copy' : 'copies'} added
                    </p>
                    <p className="text-sm leading-relaxed text-stone-700">
                      Next: {LIBRARY_CATALOGING_SHORT}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => print(addedCopies)}
                    className="h-10 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800"
                  >
                    <Printer className="h-4 w-4" />
                    Print Labels
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAddedCopies([])}
                    className="h-10 rounded-xl border-stone-400 bg-white px-4 text-sm font-semibold text-stone-800 hover:bg-stone-100"
                  >
                    Dismiss
                  </Button>
                </div>
              </motion.div>
            )}

            {readingLevelJob && (
              <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-3.5 py-2.5">
                <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-foreground">
                    Automatically filling in reading levels{'…'} {readingLevelJob.done} of {readingLevelJob.total} checked, {readingLevelJob.matched} found
                  </p>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${readingLevelJob.total ? Math.round((readingLevelJob.done / readingLevelJob.total) * 100) : 0}%` }}
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    readingLevelCancelRef.current = true;
                  }}
                  className="h-8 shrink-0 rounded-lg text-xs font-semibold"
                >
                  Stop
                </Button>
              </div>
            )}

            {/* Consolidated Filter & View Toolbar */}
            <div className={cn('rounded-2xl p-3.5 shadow-xs space-y-3 border', currentTheme.classes.card)}>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-52 flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    className="pl-9 h-9 rounded-xl border-border/70 text-xs shadow-none"
                    aria-label="Search catalog"
                    placeholder="Search by title, author, or genre…"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPinnedItemId(null);
                      setPage(1);
                    }}
                    onKeyDown={(e) => {
                      // A barcode scanner types like a fast keyboard and ends with Enter —
                      // clear the box shortly after so the next book can be scanned fresh.
                      // The book that was found stays on screen even after the box clears.
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        pinMatchAndScheduleClear(search);
                      }
                    }}
                  />
                  {search && (
                    <button
                      onClick={() => {
                        setSearch('');
                        setPinnedItemId(null);
                      }}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <select
                  aria-label="Sort catalog"
                  className="h-9 rounded-xl border border-border/70 bg-background px-3 text-xs font-semibold text-foreground shadow-xs"
                  value={catalogSort}
                  onChange={(e) => {
                    setCatalogSort(e.target.value as any);
                    setPage(1);
                  }}
                >
                  <option value="title_asc">Title (A–Z)</option>
                  <option value="newest">✨ Sort: Newest Added</option>
                  <option value="title_desc">Title (Z–A)</option>
                  <option value="author_asc">Author (A–Z)</option>
                  <option value="author_desc">Author (Z–A)</option>
                  <option value="genre_asc">Genre (A–Z)</option>
                  <option value="genre_desc">Genre (Z–A)</option>
                  <option value="shelf">Shelf Location</option>
                  <option value="reading_level">Reading Level (Easiest First)</option>
                </select>

                <select
                  aria-label="Filter status"
                  className="h-9 rounded-xl border border-border/70 bg-background px-3 text-xs font-medium"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">All Statuses</option>
                  <option value="available">Available Now</option>
                  <option value="checked_out">On Loan</option>
                  <option value="overdue">Overdue</option>
                  <option value="lost">Lost</option>
                  <option value="damaged">Damaged</option>
                </select>

                <select
                  aria-label="Filter shelf"
                  className="h-9 rounded-xl border border-border/70 bg-background px-3 text-xs font-medium"
                  value={shelfFilter}
                  onChange={(e) => {
                    setShelfFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">All Shelves / Locations</option>
                  {availableShelves.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Filter by label status"
                  className="h-9 rounded-xl border border-border/70 bg-background px-3 text-xs font-medium"
                  value={labelFilter}
                  onChange={(e) => {
                    setLabelFilter(e.target.value as any);
                    setPage(1);
                  }}
                >
                  <option value="all">All Labels</option>
                  <option value="labeled">🏷️ Fully Cataloged</option>
                  <option value="unlabeled">⚠️ Needs Processing</option>
                  <option value="shared_number">Same number as another book</option>
                </select>

                {catalogCameraSettingEnabled && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 rounded-xl text-xs font-semibold"
                    onClick={() => setCatalogCameraActive((v) => !v)}
                  >
                    {catalogCameraActive ? <CameraOff className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
                    {catalogCameraActive ? 'Hide camera' : 'Show camera'}
                  </Button>
                )}
              </div>

              {catalogCameraActive && (
                <div className="overflow-hidden rounded-2xl border-2 border-primary/20 bg-muted/30 p-2 shadow-inner">
                  <BarcodeScannerCameraView
                    videoRef={catalogVideoRef}
                    hasCameraPermission={catalogHasCameraPermission}
                    zoom={catalogCameraZoom}
                    onZoomChange={setCatalogCameraZoom}
                    viewportClassName="aspect-video max-h-48 sm:max-h-56 rounded-xl overflow-hidden shadow-inner"
                    hintText="Align a book barcode in frame to search for it"
                  />
                </div>
              )}

              {pinnedItemId && !search && (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-sm"
                >
                  <p className="font-semibold">Showing the book you just found.</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-xl text-xs font-bold"
                    onClick={() => setPinnedItemId(null)}
                  >
                    Show all books
                  </Button>
                </motion.div>
              )}

              {sharedNumberIds.size > 0 && (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-400/60 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100"
                >
                  <p className="font-semibold">
                    {sharedNumberIds.size} {sharedNumberIds.size === 1 ? 'book' : 'books'} share a number with another book.
                  </p>
                  {labelFilter === 'shared_number' ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-xl text-xs font-bold"
                      onClick={() => {
                        setLabelFilter('all');
                        setPage(1);
                      }}
                    >
                      Show all books
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 rounded-xl text-xs font-bold"
                      onClick={() => {
                        setLabelFilter('shared_number');
                        setPage(1);
                      }}
                    >
                      Show them
                    </Button>
                  )}
                </motion.div>
              )}

              {/* Dedicated Hierarchy Bar when in Scheme Presentation Mode */}
              {catalogView === 'scheme' && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-border/60 bg-muted/20 -mx-3.5 -mb-3.5 p-3 rounded-b-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-primary" />
                      <span>Shelving Hierarchy:</span>
                      <span className="font-semibold text-foreground normal-case tracking-normal">
                        {LIBRARY_ORGANIZATION_SCHEMES[activeScheme].shortLabel}
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={expandAllPrimaryGroups}
                      className="text-[11px] font-semibold text-muted-foreground hover:text-foreground underline"
                    >
                      Expand all
                    </button>
                    <span className="text-muted-foreground/40">·</span>
                    <button
                      type="button"
                      onClick={collapseAllPrimaryGroups}
                      className="text-[11px] font-semibold text-muted-foreground hover:text-foreground underline"
                    >
                      Collapse all
                    </button>
                    <span className="text-muted-foreground/40">·</span>
                    {unstackedPileKeys.size > 0 ? (
                      <button
                        type="button"
                        onClick={stackAllPiles}
                        className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
                      >
                        <Layers className="h-3 w-3" />
                        <span>Stack all piles</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const allPileKeys = new Set(filteredCatalog.map(getBookPileKey));
                          setUnstackedPileKeys(allPileKeys);
                        }}
                        className="text-[11px] font-semibold text-muted-foreground hover:text-foreground underline flex items-center gap-1"
                      >
                        <Layers className="h-3 w-3" />
                        <span>Break up all piles</span>
                      </button>
                    )}
                    <span className="text-muted-foreground/40">·</span>
                    <button
                      type="button"
                      onClick={() => switchTab('settings')}
                      className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <Settings className="h-3 w-3" />
                      <span>Manage Shelves</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border/50">
                <span className="text-[11px] text-muted-foreground">
                  {filteredCatalog.length} {filteredCatalog.length === 1 ? 'copy' : 'copies'}
                </span>
              </div>
            </div>

            {/* Selection actions only appear after a book is checked */}
            {selected.size > 0 && (
              <div className="sticky top-0 z-20 -mx-1 my-2">
                <div
                  className={cn(
                    'flex flex-wrap items-center justify-between gap-3 p-3.5 sm:px-5 border bg-background/95 backdrop-blur-md shadow-xl animate-in slide-in-from-top-4 duration-200 ring-2 ring-primary/20',
                    currentTheme.uiClasses.cardRadius
                  )}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge
                      className={cn(
                        'bg-primary text-primary-foreground font-black text-xs sm:text-sm py-1 px-3 shadow-xs',
                        currentTheme.uiClasses.badgeRadius
                      )}
                    >
                      {selected.size} {selected.size === 1 ? 'book' : 'books'} selected
                    </Badge>
                    <button
                      type="button"
                      onClick={() => setSelected(new Set())}
                      disabled={selected.size === 0}
                      className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors underline disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Clear selection</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Print Labels Option */}
                    <Button
                      size="sm"
                      onClick={() => print(selectedItems)}
                      disabled={selected.size === 0}
                      className={cn(
                        'h-9 gap-1.5 font-black text-xs shadow-md',
                        currentTheme.classes.button,
                        currentTheme.uiClasses.buttonRadius
                      )}
                    >
                      <Printer className="h-4 w-4" />
                      <span>Print Labels ({selected.size})</span>
                    </Button>

                    {/* Assign Shelf Option */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setBulkOpen(true)}
                      disabled={selected.size === 0}
                      className={cn(
                        'h-9 gap-1.5 font-bold text-xs shadow-xs hover:border-primary',
                        currentTheme.uiClasses.buttonRadius
                      )}
                    >
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>Assign Shelf</span>
                    </Button>

                    {/* Lend to Patron (Staged at Circulation Desk) */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (selectedItems.length > 0) {
                          setPendingScanCode(selectedItems[0].upc);
                          setTab('desk');
                          toast({
                            title: 'Staged for Checkout',
                            description: `"${selectedItems[0].name}" is staged at the library desk. Scan student ID or name to complete loan.`,
                          });
                        }
                      }}
                      disabled={selected.size === 0}
                      className={cn(
                        'h-9 gap-1.5 font-bold text-xs shadow-xs text-primary hover:border-primary',
                        currentTheme.uiClasses.buttonRadius
                      )}
                    >
                      <BookOpenCheck className="h-4 w-4" />
                      <span>Borrow this Book</span>
                    </Button>

                    {/* Edit Details (enabled only when exactly 1 book is selected) */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (selectedItems[0]) {
                          setEditing(selectedItems[0]);
                          setEditOpen(true);
                        }
                      }}
                      disabled={selected.size !== 1}
                      className={cn(
                        'h-9 gap-1.5 font-bold text-xs shadow-xs',
                        currentTheme.uiClasses.buttonRadius
                      )}
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Edit Copy</span>
                    </Button>

                    {/* Status Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={selected.size === 0}
                          className={cn(
                            'h-9 gap-1.5 font-bold text-xs shadow-xs',
                            currentTheme.uiClasses.buttonRadius
                          )}
                        >
                          <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                          <span>Status</span>
                          <ChevronDown className="h-3 w-3 opacity-60" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() =>
                            void run(async () => {
                              const ids = selectedItems.map((i) => i.id);
                              await callLibrary(functions, 'libraryCatalogSave', {
                                schoolId,
                                itemIds: ids,
                                patch: { condition: 'lost' },
                              });
                              setSelected(new Set());
                              toast({ title: `Marked ${ids.length} copies as lost` });
                            })
                          }
                          className="gap-2 text-xs font-semibold text-destructive cursor-pointer"
                        >
                          <AlertCircle className="h-4 w-4" />
                          <span>Mark as Lost</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            void run(async () => {
                              const ids = selectedItems.map((i) => i.id);
                              await callLibrary(functions, 'libraryCatalogSave', {
                                schoolId,
                                itemIds: ids,
                                patch: { condition: 'damaged' },
                              });
                              setSelected(new Set());
                              toast({ title: `Marked ${ids.length} copies as damaged` });
                            })
                          }
                          className="gap-2 text-xs font-semibold text-amber-700 cursor-pointer"
                        >
                          <AlertCircle className="h-4 w-4" />
                          <span>Mark as Damaged</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            void run(async () => {
                              const ids = selectedItems.map((i) => i.id);
                              await callLibrary(functions, 'libraryCatalogSave', {
                                schoolId,
                                itemIds: ids,
                                patch: { condition: 'good' },
                              });
                              setSelected(new Set());
                              toast({ title: `Marked ${ids.length} copies as available / good` });
                            })
                          }
                          className="gap-2 text-xs font-semibold text-emerald-700 cursor-pointer"
                        >
                          <Check className="h-4 w-4" />
                          <span>Mark as Good / Available</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            )}

            {/* Book view switcher — placed just above the grid, per feedback that it was too high up */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
              <div className="inline-flex rounded-xl border border-border/80 bg-muted/40 p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setCatalogView('grouped');
                    setPage(1);
                  }}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all',
                    catalogView === 'grouped'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <BookOpen className="h-3.5 w-3.5 text-blue-600" />
                  <span>Titles</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCatalogView('scheme');
                    setPage(1);
                  }}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all',
                    catalogView === 'scheme'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <FolderTree className="h-3.5 w-3.5 text-primary" />
                  <span>Shelves</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant={selectionMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    const on = !selectionMode;
                    setSelectionMode(on);
                    if (!on) setSelected(new Set());
                  }}
                  className={cn(
                    'h-9 gap-1.5 rounded-xl text-xs font-semibold shadow-xs',
                    selectionMode && currentTheme.classes.button,
                  )}
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  <span>Select books</span>
                </Button>
                {selectionMode && (
                  <button
                    type="button"
                    onClick={selectAllCurrentPage}
                    className="text-[11px] font-semibold text-primary hover:underline"
                  >
                    {currentCatalogSlice.length > 0 && currentCatalogSlice.every((i) => selected.has(i.id))
                      ? 'Deselect all'
                      : 'Select all on this page'}
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {viewMode === 'grid' ? (
                  <motion.div
                    className="inline-flex items-center rounded-xl border border-border/70 bg-muted/40 p-0.5"
                    initial="hidden"
                    animate="show"
                    variants={{
                      hidden: { opacity: 0 },
                      show: { opacity: 1, transition: { staggerChildren: 0.05 } },
                    }}
                  >
                    {LIBRARY_COVER_SIZES.map((size) => (
                      <motion.button
                        key={size}
                        type="button"
                        title={LIBRARY_COVER_SIZE_LABELS[size].title}
                        onClick={() => {
                          setCoverSize(size);
                          setPage(1);
                        }}
                        variants={{
                          hidden: { opacity: 0, y: 4 },
                          show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 380, damping: 28 } },
                        }}
                        className={cn(
                          'px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all',
                          coverSize === size
                            ? 'bg-background shadow-xs text-foreground'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {LIBRARY_COVER_SIZE_LABELS[size].label}
                      </motion.button>
                    ))}
                  </motion.div>
                ) : null}
                <div className="flex items-center rounded-xl border border-border/70 p-0.5 bg-muted/40">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    title="Cover Showcase Grid"
                    className={cn(
                      'p-1.5 rounded-lg transition-all',
                      viewMode === 'grid' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Grid className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    title="Detailed Data Table"
                    className={cn(
                      'p-1.5 rounded-lg transition-all',
                      viewMode === 'list' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">
            <motion.div
              key={`${catalogView}-${status}-${viewMode}-${coverSize}`}
              layoutId="library-catalog-results"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            >
            {/* PRESENTATION MODE 1: ORGANIZED HIERARCHY SCHEME VIEW */}
            {catalogView === 'scheme' && (
              <div className="space-y-6">
                {organizedGroups.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center space-y-3 bg-muted/10">
                    <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/50" />
                    <h3 className="font-bold text-sm text-foreground">No books found</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      {searchLooksScanned
                        ? `"${search.trim()}" isn't in the catalog yet.`
                        : 'No books match the current filters. Adjust your search or add books to your catalog.'}
                    </p>
                    {searchLooksScanned && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setIntakePrefillCode(search.trim());
                          setIntakeOpen(true);
                        }}
                        className="rounded-xl text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-500 text-white shadow-xs"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Register &amp; Add Book</span>
                      </Button>
                    )}
                  </div>
                ) : (
                  organizedGroups.map((primaryGroup) => {
                    const isCollapsed = collapsedGroupKeys.has(primaryGroup.key);
                    return (
                      <div
                        key={primaryGroup.key}
                        className={cn(
                          'overflow-hidden shadow-xs space-y-0 transition-all border',
                          currentTheme.classes.card,
                          currentTheme.uiClasses.cardRadius
                        )}
                      >
                        {/* Primary Group Header Banner */}
                        <div
                          onClick={() => togglePrimaryCollapse(primaryGroup.key)}
                          className="flex items-center justify-between gap-4 p-4 bg-muted/20 hover:bg-muted/30 cursor-pointer select-none border-b border-border/60 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="h-9 w-9 rounded-xl flex items-center justify-center font-black text-xs text-white shrink-0 shadow-xs"
                              style={{ backgroundColor: primaryGroup.color || 'var(--primary)' }}
                            >
                              {activeScheme === 'genre_then_author' ? (
                                <Tag className="h-4 w-4" />
                              ) : (
                                primaryGroup.label.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-black text-sm text-foreground truncate">
                                  {primaryGroup.label}
                                </h3>
                                {primaryGroup.badgeText && (
                                  <Badge variant="outline" className="font-mono text-[10px] font-bold">
                                    {primaryGroup.badgeText}
                                  </Badge>
                                )}
                                <Badge variant="secondary" className="font-bold text-[11px]">
                                  {primaryGroup.totalCopies} {primaryGroup.totalCopies === 1 ? 'copy' : 'copies'}
                                </Badge>
                              </div>
                              {primaryGroup.secondaryLabel && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {primaryGroup.secondaryLabel}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] font-semibold text-muted-foreground hidden sm:inline">
                              {isCollapsed ? 'Show section' : 'Hide section'}
                            </span>
                            <div className="h-7 w-7 rounded-lg bg-background border flex items-center justify-center text-muted-foreground">
                              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </div>
                          </div>
                        </div>

                        {/* Collapsible Subgroups Body */}
                        {!isCollapsed && (
                          <div className="p-4 space-y-6 divide-y divide-border/40">
                            {primaryGroup.subGroups.map((subGroup, sIdx) => (
                              <div key={subGroup.subKey} className={cn('space-y-3', sIdx > 0 && 'pt-5')}>
                                {/* SubGroup Header */}
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-xs text-foreground tracking-tight flex items-center gap-1.5">
                                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                      {subGroup.subLabel}
                                    </h4>
                                    <span className="text-[10px] text-muted-foreground font-semibold">
                                      ({subGroup.books.length} {subGroup.books.length === 1 ? 'book' : 'books'})
                                    </span>
                                  </div>
                                </div>

                                {/* Books within Subgroup rendered as piles or individual books */}
                                <LibraryBookPileGrid
                                  showCoverImages={settings.libraryCatalogShowCoverImages ?? true}
                                  piles={groupBooksIntoPiles(subGroup.books)}
                                  unstackedPileKeys={unstackedPileKeys}
                                  onTogglePile={togglePile}
                                  selected={selected}
                                  onToggleSelect={toggleSelect}
                                  onOpenDetails={(item) => {
                                    setEditing(item);
                                    setEditOpen(true);
                                  }}
                                  onAddCopy={handleAddAnotherCopy}
                                  getName={getName}
                                  currentTheme={currentTheme}
                                  viewMode={viewMode}
                                  coverSize={coverSize}
                                  defaultShelf={primaryGroup.shelfLocation}
                                  getGenreColor={(item) =>
                                    resolveBookClassification(item.category, settings.libraryGenreDefinitions, item.shelfLocation).color
                                  }
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* PRESENTATION MODE 3: GROUPED TITLES VIEW (Master Title Cards) */}
            {catalogView === 'grouped' && currentGroupSlice.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center space-y-3 bg-muted/10">
                <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <h3 className="font-bold text-sm text-foreground">No books found</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {searchLooksScanned
                    ? `"${search.trim()}" isn't in the catalog yet.`
                    : 'No books match the current filters. Adjust your search or add books to your catalog.'}
                </p>
                {searchLooksScanned && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setIntakePrefillCode(search.trim());
                      setIntakeOpen(true);
                    }}
                    className="rounded-xl text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-500 text-white shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Register &amp; Add Book</span>
                  </Button>
                )}
              </div>
            ) : catalogView === 'grouped' && (
              <motion.div
                className={cn(
                  viewMode === 'grid' ? libraryTitleGridClass(coverSize) : 'space-y-3',
                )}
                initial="hidden"
                animate="show"
                variants={{
                  hidden: { opacity: 0 },
                  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
                }}
              >
                {currentGroupSlice.map((group) => {
                  const totalCopies = group.copies.length;
                  const primaryCopy = group.copies[0];
                  const isGrid = viewMode === 'grid';
                  const groupChecked = group.copies.length > 0 && group.copies.every((c) => selected.has(c.id));
                  return (
                    <motion.button
                      type="button"
                      key={group.key}
                      variants={{
                        hidden: { opacity: 0, y: 8 },
                        show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 380, damping: 28 } },
                      }}
                      onClick={() => {
                        if (selectionMode) {
                          toggleGroupSelect(group.copies);
                          return;
                        }
                        if (!primaryCopy) return;
                        setEditing(primaryCopy);
                        setEditOpen(true);
                      }}
                      className={cn(
                        'text-left shadow-sm transition-all border',
                        currentTheme.classes.card,
                        groupChecked && 'ring-3 ring-primary border-primary bg-primary/5',
                        isGrid ? 'flex flex-col gap-2.5 rounded-2xl p-2.5' : 'w-full rounded-2xl p-4',
                      )}
                    >
                      <div className={cn(isGrid ? 'flex flex-col gap-2.5' : 'flex items-start gap-4')}>
                        <div
                          className={cn(
                            'relative rounded-xl border bg-muted/20 shadow-xs',
                            isGrid ? 'aspect-[2/3] w-full' : 'h-20 w-14 shrink-0',
                          )}
                        >
                          <LibraryBookCover
                            coverUrl={group.coverUrl}
                            isbn={group.isbn}
                            title={group.name}
                            author={group.author}
                            aspect="portrait"
                            fit="contain"
                            className="h-full w-full rounded-xl"
                          />
                          {selectionMode && (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleGroupSelect(group.copies);
                              }}
                              aria-label={groupChecked ? 'Deselect title' : 'Select title'}
                              className="absolute top-1.5 left-1.5 z-10"
                            >
                              <span
                                className={cn(
                                  'flex h-6 w-6 items-center justify-center rounded-full shadow-md transition-all',
                                  groupChecked
                                    ? 'bg-primary text-primary-foreground ring-2 ring-white scale-110'
                                    : 'bg-background/80 text-transparent hover:text-foreground hover:bg-background',
                                )}
                              >
                                <Check className={cn('h-3.5 w-3.5', groupChecked ? 'opacity-100' : 'opacity-0')} />
                              </span>
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className={cn('font-black text-foreground', isGrid ? 'text-sm line-clamp-2' : 'text-base truncate')}>
                              {group.name}
                            </h3>
                            <Badge variant="secondary" className="font-bold text-xs">
                              {totalCopies} {totalCopies === 1 ? 'copy' : 'copies'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{group.author || 'Author not recorded'}</p>
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {!isGrid && (
                              <Badge variant="outline" className="text-xs font-semibold">
                                {group.shelfLocation || 'General Stacks'}
                              </Badge>
                            )}
                            {group.availableCount > 0 && (
                              <Badge className="bg-emerald-600 text-white font-bold text-xs">
                                {group.availableCount === 1 ? 'Available' : `${group.availableCount} Available`}
                              </Badge>
                            )}
                            {group.loanCount > 0 && (
                              <Badge variant="outline" className="border-blue-500/40 text-blue-600 font-bold text-xs">
                                {group.loanCount} on loan
                              </Badge>
                            )}
                            {group.lostDamagedCount > 0 && (
                              <Badge variant="destructive" className="font-bold text-xs">
                                {group.lostDamagedCount} lost/damaged
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
            </motion.div>
            </AnimatePresence>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between py-4 border-t">
              <span className="text-xs text-muted-foreground font-semibold">
                Page {page} of {pageCount}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1));
                    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="rounded-xl text-xs font-bold"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pageCount}
                  onClick={() => {
                    setPage((p) => Math.min(pageCount, p + 1));
                    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="rounded-xl text-xs font-bold"
                >
                  Next
                </Button>
              </div>
            </div>

          </div>
        )}

        {/* 3. LOANS & NOTICES TAB */}
        {tab === 'loans' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black tracking-tight text-foreground">Loans &amp; Notices</h2>
                  <Badge variant="secondary" className="font-bold text-xs">
                    {activeLoans.length} active
                  </Badge>
                  {overdueLoans.length > 0 && (
                    <Badge variant="destructive" className="font-bold text-xs">
                      {overdueLoans.length} overdue
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Monitor active checkouts, overdue notices, and circulation history.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPrintSlipsOpen(true)}
                  className="h-9 gap-1.5 rounded-xl text-xs font-semibold shadow-xs"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Slips &amp; Roster</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    downloadLibraryCsv('library-loans.csv', [
                      ['Student', 'Class', 'Book', 'Due date', 'Status'],
                      ...filteredLoans.map((i) => [
                        getName(i.checkedOutTo || undefined),
                        getClass(i.checkedOutTo || undefined),
                        i.name,
                        formatDueDate(i.dueAt),
                        'On loan',
                      ]),
                    ])
                  }
                  className="h-9 gap-1.5 rounded-xl text-xs font-semibold shadow-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export</span>
                </Button>
              </div>
            </div>

            {/* Sub-Tabs & Filters Toolbar */}
            <div className={cn('rounded-2xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3 border', currentTheme.classes.card)}>
              <div className="inline-flex rounded-xl border border-border/70 bg-muted/30 p-0.5">
                <button
                  type="button"
                  onClick={() => setLoanSubTab('active')}
                  className={cn(
                    'rounded-lg px-3 py-1 text-xs font-semibold transition-all',
                    loanSubTab === 'active'
                      ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  Active ({activeLoans.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLoanSubTab('overdue')}
                  className={cn(
                    'rounded-lg px-3 py-1 text-xs font-semibold transition-all',
                    loanSubTab === 'overdue'
                      ? 'bg-destructive text-destructive-foreground shadow-xs font-bold'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  Overdue ({overdueLoans.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLoanSubTab('history')}
                  className={cn(
                    'rounded-lg px-3 py-1 text-xs font-semibold transition-all',
                    loanSubTab === 'history'
                      ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  History
                </button>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-44">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search student or title..."
                    value={loanSearch}
                    onChange={(e) => setLoanSearch(e.target.value)}
                    className="pl-8 h-8 text-xs rounded-xl border-border/70 shadow-none"
                  />
                </div>
                <select
                  className="h-8 rounded-xl border border-border/70 bg-background px-2.5 text-xs font-medium"
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                >
                  <option value="all">All Classes</option>
                  {classes?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Loans Table / Cards */}
            {loanSubTab !== 'history' ? (
              <div className={cn('rounded-3xl overflow-hidden shadow-sm divide-y border', currentTheme.classes.card)}>
                {filteredLoans.length === 0 ? (
                  <div className="p-12 text-center text-sm text-muted-foreground space-y-2">
                    <Clock className="mx-auto h-8 w-8 opacity-40" />
                    <p className="font-semibold text-foreground">No active loans found matching current filters.</p>
                  </div>
                ) : (
                  filteredLoans.map((item) => {
                    const daysLate = computeDaysOverdue(item.dueAt);
                    const isLate = daysLate > 0;
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'flex items-center justify-between gap-4 p-4 hover:bg-muted/30 transition-colors',
                          isLate && 'bg-destructive/5',
                        )}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="h-14 w-10 shrink-0 overflow-hidden rounded-xl border shadow-xs">
                            <LibraryBookCover
                              coverUrl={item.coverUrl}
                              isbn={item.isbn}
                              title={item.name}
                              author={item.author}
                              aspect="portrait"
                              className="h-full w-full"
                            />
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <h4 className="font-bold text-sm text-foreground truncate">{item.name}</h4>
                            <p className="text-xs text-muted-foreground">
                              Borrowed by <span className="font-bold text-foreground">{getName(item.checkedOutTo || undefined)}</span>
                              {getClass(item.checkedOutTo || undefined) && ` (${getClass(item.checkedOutTo || undefined)})`}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                              <span>Barcode: {item.upc}</span>
                              <span>·</span>
                              <span className={cn(isLate && 'text-destructive font-bold')}>
                                {isLate ? `${daysLate} days overdue` : `Due ${formatDueDate(item.dueAt)}`}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void itemAction(item, 'renew')}
                            className="h-8 rounded-xl text-xs font-bold"
                          >
                            Renew
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void itemAction(item, 'return')}
                            className="h-8 rounded-xl text-xs font-bold text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                          >
                            Return
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className={cn('rounded-3xl overflow-hidden shadow-sm divide-y border', currentTheme.classes.card)}>
                {historyError ? (
                  <div className="p-12 text-center text-sm text-muted-foreground space-y-1">
                    <AlertCircle className="mx-auto h-8 w-8 opacity-40 text-amber-600" />
                    <p className="font-semibold text-foreground">Couldn&rsquo;t load loan history.</p>
                    <p>Your session may not currently have staff access — try signing in again.</p>
                  </div>
                ) : filteredHistory.length === 0 ? (
                  <div className="p-12 text-center text-sm text-muted-foreground">
                    No past loan history recorded yet.
                  </div>
                ) : (
                  filteredHistory.map((l) => (
                    <div key={l.id} className="flex items-center justify-between gap-4 p-4 text-xs">
                      <div>
                        <p className="font-bold text-sm text-foreground">{l.title}</p>
                        <p className="text-muted-foreground">
                          {getName(l.studentId || undefined)} ({getClass(l.studentId || undefined)})
                        </p>
                      </div>
                      <div className="text-right text-muted-foreground space-y-0.5 font-mono">
                        <p>Checked out: {formatDueDate(l.checkedOutAt)}</p>
                        <p>{l.returnedAt ? `Returned: ${formatDueDate(l.returnedAt)}` : 'Active loan'}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Circulation Reports — stats + charts, read-only overview for the librarian */}
        {tab === 'reports' && (
          <div className="space-y-4">
            <div>
              <motion.h2 layoutId="library-hub-reports" className="text-lg sm:text-xl font-black tracking-tight text-foreground">
                Reports &amp; Analytics
              </motion.h2>
              <p className="text-xs text-muted-foreground">
                Overdue books, popular titles, top readers, and lists you can print or download.
              </p>
            </div>
            <LibraryReportsCard
              items={scopedItems}
              loans={scopedLoans}
              loansUnavailable={Boolean(historyError)}
              loansLoading={historyLoading}
              reviews={libraryReviews}
              reviewsUnavailable={Boolean(reviewsError)}
              genreDefinitions={settings.libraryGenreDefinitions}
              getStudentName={getReportName}
              getClassName={getClass}
              onViewOverdue={() => {
                setStatus('overdue');
                setPage(1);
                switchTab('catalog');
              }}
            />
          </div>
        )}

        {/* 4. POLICIES & SETTINGS TAB (Single Unified Layout, No 2-row clutter) */}
        {tab === 'settings' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
            <Tabs defaultValue="policies" className="w-full space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border bg-background p-4 sm:p-5">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-foreground">Library Settings &amp; Configuration</h2>
                  <p className="text-xs text-muted-foreground">Manage circulation limits, shelving zones, fines, and visual themes.</p>
                </div>
                <TabsList className="bg-muted/70 p-1 rounded-xl self-start sm:self-auto w-full sm:w-auto">
                  <TabsTrigger value="policies" className="rounded-lg text-xs font-bold px-3 sm:px-4 flex-1 sm:flex-none">Circulation &amp; Shelves</TabsTrigger>
                  <TabsTrigger value="theme" className="rounded-lg text-xs font-bold px-3 sm:px-4 flex-1 sm:flex-none">Theme &amp; Atmosphere</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="policies" className="mt-0 space-y-6">
                <LibraryPolicySettingsCard categories={categories} />
              </TabsContent>
              <TabsContent value="theme" className="mt-0 space-y-6">
                <LibraryThemeSettingsCard />
              </TabsContent>
            </Tabs>
          </div>
        )}
        </motion.div>
        </AnimatePresence>
      </main>

      {isNightDesk && (
        <footer className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-8 pb-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 border-t border-slate-800/80 mt-12">
          <div>
            Sunset Terrace · Story nook open till 4:30
          </div>
          <Link
            href={libraryPath(schoolId, '/kiosk', activeLibrary.id)}
            className="hover:text-slate-300 flex items-center gap-1.5 font-medium transition-colors"
          >
            <span>Open student kiosk</span>
            <Monitor className="h-3.5 w-3.5" />
          </Link>
        </footer>
      )}
    </div>

      <SiteFooter />

      {/* Edit Copy Modal */}
      {editOpen && (
        <LibraryItemModal
          isOpen={editOpen}
          setIsOpen={setEditOpen}
          item={editing}
          onSave={save}
          onAddCopy={handleAddAnotherCopy}
          getStudentName={getName}
          onDelete={async (itemToDelete) => {
            await itemAction(itemToDelete, 'delete');
          }}
          schoolId={schoolId}
          existingUpcs={scopedItems.filter((copy) => copy.id !== editing?.id).map((copy) => copy.upc)}
          reservedCodes={reservedGenreCodesRef.current}
          upcTaken={isLibraryUpcTaken}
        />
      )}

      {/* Intake Scanner Modal */}
      <Dialog
        open={intakeOpen}
        onOpenChange={(open) => {
          setIntakeOpen(open);
          if (!open) setIntakePrefillCode(null);
        }}
      >
        <DialogContent
          onPointerDownOutside={(e) => {
            const el = e.target as HTMLElement | null;
            if (el?.closest('[data-radix-select-content], [data-radix-popper-content-wrapper]')) return;
            e.preventDefault();
          }}
          onInteractOutside={(e) => {
            const el = e.target as HTMLElement | null;
            if (el?.closest('[data-radix-select-content], [data-radix-popper-content-wrapper]')) return;
            e.preventDefault();
          }}
          className="max-w-4xl w-[95vw] p-4 sm:p-4 flex flex-col max-h-[92vh] overflow-hidden"
        >
          <DialogHeader className="flex flex-row items-center justify-between gap-4 pb-2 border-b border-border/60 shrink-0">
            <div className="min-w-0 space-y-2">
              <DialogTitle className="text-base sm:text-lg font-black">Add Books to Catalog</DialogTitle>
              <DialogDescription className="text-xs">
                Scan book ISBN barcodes or paste an ISBN list. Online catalog details and covers are fetched automatically.
              </DialogDescription>
              <LibraryCatalogingStepsNote
                onPrint={() => {
                  if (addedCopies.length) print(addedCopies);
                }}
                printDisabled={!addedCopies.length}
                printHint={
                  addedCopies.length
                    ? undefined
                    : 'Add the book first, then print its barcode sticker.'
                }
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 rounded-xl text-xs font-semibold"
              onClick={() => {
                setEditing(null);
                setEditOpen(true);
                setIntakeOpen(false);
              }}
            >
              Enter Manually
            </Button>
          </DialogHeader>
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden pt-1">
            <LibraryBookIntakeScanner
              className="flex-1 min-h-0"
              onRegister={(input) => save(input, undefined, { stayInIntake: true })}
              onComplete={() => {
                setIntakeOpen(false);
                setTab('catalog');
              }}
              libraryItems={scopedItems}
              reservedCodes={reservedGenreCodesRef.current}
              upcTaken={isLibraryUpcTaken}
              initialScanCode={intakePrefillCode}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* CSV Import Modal */}
      <LibraryCsvImportDialog
        isOpen={csvImportOpen}
        setIsOpen={setCsvImportOpen}
        schoolId={schoolId}
        onImportComplete={() => setTab('catalog')}
      />

      {/* Shelf Audit Physical Inventory Station */}
      <LibraryShelfAuditDialog
        isOpen={shelfAuditOpen}
        setIsOpen={setShelfAuditOpen}
        schoolId={schoolId}
        items={scopedItems}
      />

      {/* Safe Print Notice Dialog */}
      <LibraryPrintSlipsDialog
        isOpen={printSlipsOpen}
        setIsOpen={setPrintSlipsOpen}
        loans={filteredLoans}
        schoolName={schoolName}
        getStudentName={getName}
        getClassName={getClass}
      />

      {/* Library Barcode & Label Print Modal with All Format Sizes */}
      <LibraryPrintLabelsModal
        isOpen={printLabelsModalOpen}
        setIsOpen={setPrintLabelsModalOpen}
        items={itemsForPrintModal}
        schoolId={schoolId}
        schoolName={schoolName}
      />

      {/* Bulk Edit Shelf Dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Shelf Location for {selectedItems.length} Copies</DialogTitle>
            <DialogDescription>
              Assign the selected books to a specific physical shelf or aisle in the library.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="bulk-shelf">Shelf Location</Label>
              <Input
                id="bulk-shelf"
                list="bulk-shelf-options"
                placeholder="e.g. Aisle 2 - Graphic Novels"
                value={shelf}
                onChange={(e) => setShelf(e.target.value)}
              />
              <datalist id="bulk-shelf-options">
                {(settings.libraryPlacementZones ?? []).map((zone) => (
                  <option key={zone} value={zone} />
                ))}
              </datalist>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button>
              <Button
                onClick={() =>
                  void run(async () => {
                    const ids = selectedItems.map((i) => i.id);
                    await callLibrary(functions, 'libraryCatalogSave', {
                      schoolId,
                      itemIds: ids,
                      patch: { shelfLocation: shelf.trim() },
                    });
                    setSelected(new Set());
                    setBulkOpen(false);
                    toast({ title: `Updated shelf location for ${ids.length} copies` });
                  })
                }
              >
                Apply to Selected
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
