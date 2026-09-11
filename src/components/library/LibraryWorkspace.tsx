'use client';

import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import {
  AlertCircle,
  BookOpen,
  BookOpenCheck,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Download,
  FileSpreadsheet,
  BarChart3,
  FolderTree,
  Grid,
  Home,
  Info,
  Layers,
  LayoutGrid,
  Library,
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
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { resolveBookClassification } from '@/lib/library/libraryClassification';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { LibraryItem, LibraryItemInput, Student, Class, Category } from '@/lib/types';
import { callLibrary, forceReturnLibraryItem, findLibraryItemByUpc } from '@/lib/library/libraryOperations';
import { formatDueDate, computeDaysOverdue } from '@/lib/library/libraryPolicy';
import { filterLibraryCatalog, downloadLibraryCsv, type LibraryLoan } from '@/lib/library/libraryWorkspace';
import {
  groupBooksByOrganizationScheme,
  LIBRARY_ORGANIZATION_SCHEMES,
  type LibraryOrganizationScheme,
  type BookPrimaryGroup,
} from '@/lib/library/libraryOrganization';
import { LibraryInfoDesk } from './LibraryInfoDesk';
import { LibraryTotalsStatCards } from './LibraryTotalsStatCards';
import { LibraryStudentSelfCheckoutPortal } from './LibraryStudentSelfCheckoutPortal';
import { LibraryBookCover } from './LibraryBookCover';
import { LibraryBookIntakeScanner } from './LibraryBookIntakeScanner';
import { LibraryItemModal } from './LibraryItemModal';
import { LibraryCsvImportDialog } from './LibraryCsvImportDialog';
import { LibraryShelfAuditDialog } from './LibraryShelfAuditDialog';
import { LibraryPrintSlipsDialog } from './LibraryPrintSlipsDialog';
import { LibraryPrintLabelsModal } from './LibraryPrintLabelsModal';
import { LibraryPolicySettingsCard } from './LibraryPolicySettingsCard';
import { LibraryThemeSettingsCard } from './LibraryThemeSettingsCard';
import { LibraryPortalHub } from './LibraryPortalHub';
import { LibraryReportsCard } from './LibraryReportsCard';
import LevelUpLogoMark from '@/components/logos/Logo';
import { resolveLibraryTheme, type LibraryThemeId } from '@/lib/library/libraryThemes';
import type { LibraryLabelFormat } from '@/lib/library/libraryScanCode';
import { groupBooksIntoPiles, getBookPileKey, type BookPile } from '@/lib/library/bookPiles';
import { LibraryBookPileGrid } from './LibraryBookPileGrid';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatLibraryStudentName, resolveLibraryStudentNameMode } from '@/lib/library/libraryStudentDisplay';

const PAGE_SIZE = 36;
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
  const currentTheme = resolveLibraryTheme(currentThemeId);
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
  useEffect(() => {
    const rawTab = searchParams.get('tab')?.trim().toLowerCase() || '';
    if (['desk', 'catalog', 'loans', 'reports', 'settings', 'kiosk'].includes(rawTab) && rawTab !== tab) {
      setTab(rawTab);
      setHubHome(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
  const [status, setStatus] = useState('all');
  const [shelfFilter, setShelfFilter] = useState('all');
  const [labelFilter, setLabelFilter] = useState<'all' | 'labeled' | 'unlabeled'>('all');
  const [catalogSort, setCatalogSort] = useState<'newest' | 'title_asc' | 'title_desc' | 'author_asc' | 'author_desc' | 'shelf'>('newest');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [catalogPresentation, setCatalogPresentation] = useState<'scheme' | 'grouped' | 'copies'>('copies');
  const [activeScheme, setActiveScheme] = useState<LibraryOrganizationScheme>(
    (settings.libraryOrganizationScheme as LibraryOrganizationScheme) || 'genre_then_author',
  );
  const [collapsedGroupKeys, setCollapsedGroupKeys] = useState<Set<string>>(new Set());
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Set<string>>(new Set());
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
    if (settings.libraryOrganizationScheme) {
      setActiveScheme(settings.libraryOrganizationScheme as LibraryOrganizationScheme);
    }
  }, [settings.libraryOrganizationScheme]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<LibraryItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [kioskHandoffStudentId, setKioskHandoffStudentId] = useState<string | null>(null);
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

  // Global barcode listener: if scanning occurs on catalog or settings tabs,
  // switch to Library Info desk to view details. Kiosk handles its own scans natively.
  useBarcodeReaderWedge({
    active: tab !== 'desk' && tab !== 'kiosk' && !editOpen && !intakeOpen && !csvImportOpen && !shelfAuditOpen && !printSlipsOpen,
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
        ? query(collection(firestore, 'schools', schoolId, 'libraryLoans'), orderBy('checkedOutAt', 'desc'), limit(200))
        : null,
    [firestore, schoolId, allowed, tab, loanSubTab],
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

  const studentsById = useMemo(() => new Map((students ?? []).map((s) => [s.id, s])), [students]);
  const studentNameMode = resolveLibraryStudentNameMode(
    settings.libraryStudentNameDisplayMode,
    settings.privacyStudentNameDisplayMode,
  );
  const getName = useCallback(
    (id?: string) => formatLibraryStudentName(studentsById.get(id ?? ''), studentNameMode),
    [studentsById, studentNameMode],
  );
  const getClass = useCallback(
    (id?: string) => {
      const s = studentsById.get(id ?? '');
      return classes?.find((c) => c.id === s?.classId)?.name ?? '';
    },
    [studentsById, classes],
  );

  // Shelf locations list for filtering
  const availableShelves = useMemo(() => {
    const set = new Set<string>();
    for (const item of items ?? []) {
      if (item.shelfLocation?.trim()) set.add(item.shelfLocation.trim());
    }
    return Array.from(set).sort();
  }, [items]);

  // Filter catalog
  const filteredCatalog = useMemo(() => {
    let list = filterLibraryCatalog(items ?? [], search, status, getName);
    if (shelfFilter !== 'all') {
      list = list.filter((i) => (i.shelfLocation || 'Unassigned') === shelfFilter);
    }
    if (labelFilter === 'labeled') {
      // "Fully cataloged" — matches the Catalog card's own "Needs Processing" badge definition.
      list = list.filter((i) => Boolean(i.labeled) && Boolean(i.shelfLocation));
    } else if (labelFilter === 'unlabeled') {
      list = list.filter((i) => !i.labeled || !i.shelfLocation);
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
      if (catalogSort === 'shelf') {
        return (a.shelfLocation || 'ZZZ').localeCompare(b.shelfLocation || 'ZZZ');
      }
      return 0;
    });

    return list;
  }, [items, search, status, shelfFilter, labelFilter, catalogSort, getName]);

  // Count of non-default 'More Filters' selections (search + sort excluded; those have their own visible controls)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (status !== 'all') count += 1;
    if (shelfFilter !== 'all') count += 1;
    if (labelFilter !== 'all') count += 1;
    return count;
  }, [status, shelfFilter, labelFilter]);

  // Organized Scheme Grouping (Genre -> Author, Author -> Genre, Shelf -> Author)
  const organizedGroups = useMemo<BookPrimaryGroup[]>(() => {
    if (catalogPresentation !== 'scheme') return [];
    return groupBooksByOrganizationScheme(
      filteredCatalog,
      activeScheme,
      settings.libraryGenreDefinitions,
    );
  }, [catalogPresentation, filteredCatalog, activeScheme, settings.libraryGenreDefinitions]);

  // Master Title Grouping
  const catalogGroups = useMemo<MasterTitleGroup[]>(() => {
    if (catalogPresentation !== 'grouped') return [];
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
  }, [catalogPresentation, filteredCatalog]);

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

  const toggleGroupExpand = (key: string) => {
    setExpandedGroupKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Metrics
  const activeCopies = useMemo(() => (items ?? []).filter((i) => !i.archived), [items]);
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

  const filteredHistory = useMemo(() => {
    return (loans ?? []).filter((l) => {
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
  }, [loans, classFilter, loanSearch, studentsById, getName, getClass]);

  // Selected copies for batch actions
  const selectedItems = useMemo(() => {
    const map = new Map((items ?? []).map((i) => [i.id, i]));
    return Array.from(selected).map((id) => map.get(id)).filter(Boolean) as LibraryItem[];
  }, [items, selected]);

  const selectAllCurrentPage = () => {
    const currentSlice = filteredCatalog.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
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
      description: itemId ? undefined : 'Print labels for the new copies before lending.',
    });
  };

  const handleAddAnotherCopy = async (item: LibraryItem) => {
    await run(async () => {
      const input: LibraryItemInput = {
        name: item.name,
        upc: '',
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
      });
      if (result.items?.length) setAddedCopies(result.items);
      toast({
        title: 'Additional copy created',
        description: `Added another copy of "${item.name}". Print a barcode label before shelving.`,
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

  const pageCount = Math.max(
    1,
    Math.ceil(
      (catalogPresentation === 'grouped' ? catalogGroups.length : filteredCatalog.length) / PAGE_SIZE
    ),
  );
  const currentCatalogSlice = filteredCatalog.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const currentGroupSlice = catalogGroups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const isNightDesk = currentTheme.id === 'night_desk';
  const isReadingRoom = currentTheme.id === 'reading_room';
  const backToPortalHref = `/${schoolId}/${loginState === 'admin' || loginState === 'developer' ? 'admin' : loginState === 'teacher' ? 'teacher' : 'portal'}`;

  if (hubHome) {
    return (
      <LibraryPortalHub
        schoolName={schoolName}
        overdueCount={overdueLoans.length}
        catalogCount={activeCopies.length}
        backToPortalHref={backToPortalHref}
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
        'min-h-dvh transition-colors duration-300 pb-[max(1rem,env(safe-area-inset-bottom))]',
        isNightDesk
          ? 'flex flex-col bg-[#0b1324] text-[#f8fafc] dark'
          : isReadingRoom
            ? 'flex flex-col bg-[#fafaf9] text-[#0f172a]'
            : 'flex flex-col',
        currentTheme.classes.wrapper
      )}
    >
      <div className={cn('w-full border-b backdrop-blur-md px-2 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3', currentTheme.classes.header)}>
          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              href={backToPortalHref}
              title="Back to LevelUp"
              className="h-9 w-9 rounded-xl border border-border/70 flex items-center justify-center overflow-hidden p-1.5 transition-all hover:border-primary/50 shrink-0"
            >
              <LevelUpLogoMark className="h-full w-full" />
            </Link>
            <button
              type="button"
              onClick={() => {
                if (navSoundEnabled) playSound('click');
                setHubHome(true);
              }}
              title="Library Home"
              aria-label="Library Home"
              className="h-9 w-9 rounded-xl border border-border/70 flex items-center justify-center text-muted-foreground transition-all hover:border-primary/50 hover:text-primary shrink-0"
            >
              <Home className="h-4 w-4" />
            </button>
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-center gap-1 sm:gap-4 md:gap-8">
            {(
              [
                { id: 'desk', label: 'Librarian', icon: Library, activeClass: 'text-blue-600 dark:text-blue-400' },
                { id: 'catalog', label: 'Catalog', icon: BookOpen, activeClass: 'text-emerald-600 dark:text-emerald-400' },
                { id: 'kiosk', label: 'Kiosk', icon: Monitor, activeClass: 'text-amber-600 dark:text-amber-400' },
              ] as const
            ).map(({ id, label, icon: SwitchIcon, activeClass }) => (
              <button
                key={id}
                type="button"
                onClick={() => switchTab(id)}
                aria-label={label}
                className={cn(
                  'flex items-center gap-1.5 sm:gap-2 py-1.5 px-2 sm:px-0 text-sm sm:text-base font-black tracking-tight transition-colors',
                  // Loans & Notices lives inside Catalog now, so keep Catalog lit up while viewing it.
                  (tab === id || (id === 'catalog' && tab === 'loans')) ? activeClass : 'text-muted-foreground/40 hover:text-muted-foreground',
                )}
              >
                <SwitchIcon className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => switchTab('settings')}
            title="Policies & Settings"
            aria-label="Policies & Settings"
            className={cn(
              'h-9 w-9 rounded-xl border flex items-center justify-center text-muted-foreground transition-all hover:border-primary/50 hover:text-primary shrink-0',
              tab === 'settings' && 'border-primary/50 text-primary bg-primary/5',
            )}
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>

      {/* Main Column: Top Bar + Content */}
      <div className={cn('flex-1 flex flex-col min-w-0 min-h-dvh', (isNightDesk || isReadingRoom) && 'w-full')}>


        {/* Main Workstation View Area */}
        <main className={cn('flex-1 min-w-0 p-3 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 overflow-x-hidden w-full mx-auto', (isNightDesk || isReadingRoom) ? 'max-w-6xl' : 'max-w-7xl')}>
        {/* 1. LIBRARY DESK — lookup only; borrow/return happens on the Kiosk */}
        {tab === 'desk' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <LibraryInfoDesk
              catalogItems={activeCopies}
              students={students}
              categories={categories}
              getStudentName={getName}
              initialScanCode={pendingScanCode}
              onClearInitialScan={() => setPendingScanCode(null)}
              onSwitchToKiosk={(studentId) => {
                setKioskHandoffStudentId(studentId ?? null);
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
              schoolId={schoolId}
              schoolName={schoolName}
            />
          </div>
        )}

        {/* 2. KIOSK MODE TAB (Check-in & Check-out Station) */}
        {tab === 'kiosk' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="rounded-2xl border border-border/70 bg-card/60 overflow-hidden shadow-xs min-h-[min(640px,calc(100dvh-7rem))] md:min-h-[640px]">
              {schoolId ? (
                <LibraryStudentSelfCheckoutPortal
                  schoolId={schoolId}
                  categories={categories}
                  getStudentName={getName}
                  students={students}
                  embedded
                  initialStudentId={kioskHandoffStudentId}
                  onInitialStudentConsumed={() => setKioskHandoffStudentId(null)}
                  onExit={() => setHubHome(true)}
                />
              ) : (
                <div className="flex items-center justify-center py-20 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading kiosk...</span>
                </div>
              )}
            </div>
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
                          <span>Reports</span>
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
              <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-3.5 animate-in fade-in">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-primary">
                  <Check className="h-4 w-4 shrink-0" />
                  <span>{addedCopies.length} new copies onboarded and ready for barcodes.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => print(addedCopies)} className="h-8 rounded-xl font-bold text-xs">
                    Print Labels
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setAddedCopies([])} className="h-8 rounded-xl text-xs">
                    Dismiss
                  </Button>
                </div>
              </div>
            )}

            {/* Consolidated Filter & View Toolbar */}
            <div className={cn('rounded-2xl p-3.5 shadow-xs space-y-3 border', currentTheme.classes.card)}>
              {/* Filter controls row: search always visible, extra filters collapse behind "More filters" */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-52 flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9 h-9 rounded-xl border-border/70 text-xs shadow-none"
                    aria-label="Search catalog"
                    placeholder="Search title, author, ISBN, barcode, shelf location..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setFiltersExpanded((v) => !v)}
                  className={cn(
                    'h-9 shrink-0 inline-flex items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-all',
                    filtersExpanded || activeFilterCount > 0
                      ? 'border-primary/50 bg-primary/10 text-primary'
                      : 'border-border/70 bg-background text-muted-foreground hover:text-foreground',
                  )}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span>More Filters</span>
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-black">
                      {activeFilterCount}
                    </Badge>
                  )}
                  <ChevronDown className={cn('h-3.5 w-3.5 opacity-60 transition-transform', filtersExpanded && 'rotate-180')} />
                </button>
              </div>

              {filtersExpanded && (
                <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
                  <select
                    aria-label="Sort catalog"
                    className="h-9 rounded-xl border border-border/70 bg-background px-3 text-xs font-semibold text-foreground shadow-xs"
                    value={catalogSort}
                    onChange={(e) => {
                      setCatalogSort(e.target.value as any);
                      setPage(1);
                    }}
                  >
                    <option value="newest">✨ Sort: Newest Added</option>
                    <option value="title_asc">Title (A–Z)</option>
                    <option value="title_desc">Title (Z–A)</option>
                    <option value="author_asc">Author (A–Z)</option>
                    <option value="author_desc">Author (Z–A)</option>
                    <option value="shelf">Shelf Location</option>
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
                  </select>
                </div>
              )}

              {/* Dedicated Hierarchy Bar when in Scheme Presentation Mode */}
              {catalogPresentation === 'scheme' && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-border/60 bg-muted/20 -mx-3.5 -mb-3.5 p-3 rounded-b-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-primary" />
                      <span>Shelving Hierarchy:</span>
                    </span>
                    <div className="inline-flex rounded-xl border border-border/70 bg-background p-0.5">
                      {(Object.keys(LIBRARY_ORGANIZATION_SCHEMES) as LibraryOrganizationScheme[]).map((schemeKey) => {
                        const isSelected = activeScheme === schemeKey;
                        const meta = LIBRARY_ORGANIZATION_SCHEMES[schemeKey];
                        return (
                          <button
                            key={schemeKey}
                            type="button"
                            onClick={() => setActiveScheme(schemeKey)}
                            className={cn(
                              'px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all',
                              isSelected
                                ? 'bg-primary text-primary-foreground shadow-xs'
                                : 'text-muted-foreground hover:text-foreground',
                            )}
                          >
                            {meta.shortLabel}
                          </button>
                        );
                      })}
                    </div>
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

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-muted-foreground hover:text-foreground">
                  <Checkbox
                    checked={
                      currentCatalogSlice.length > 0 &&
                      currentCatalogSlice.every((i) => selected.has(i.id))
                    }
                    onCheckedChange={selectAllCurrentPage}
                    className="h-3.5 w-3.5"
                  />
                  <span>Select page</span>
                </label>
                <span className="text-[11px] text-muted-foreground">
                  {filteredCatalog.length} {filteredCatalog.length === 1 ? 'copy' : 'copies'}
                </span>
              </div>
            </div>

            {/* Selection actions only appear after a book is checked */}
            {selected.size > 0 && (
              <div className="sticky top-16 z-20 -mx-1 my-2">
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
              {/* Catalog Presentation Mode Switcher */}
              <div className="inline-flex rounded-xl border border-border/80 bg-muted/40 p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setCatalogPresentation('scheme');
                    setPage(1);
                  }}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all',
                    catalogPresentation === 'scheme'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <FolderTree className="h-3.5 w-3.5 text-primary" />
                  <span>Shelves</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCatalogPresentation('grouped');
                    setPage(1);
                  }}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all',
                    catalogPresentation === 'grouped'
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
                    setCatalogPresentation('copies');
                    setPage(1);
                  }}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all',
                    catalogPresentation === 'copies'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Layers className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Copies</span>
                </button>
              </div>

              {/* Grid vs List toggle for copies/scheme views */}
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

            <AnimatePresence mode="wait">
            <motion.div
              key={`${catalogPresentation}-${status}`}
              layoutId="library-catalog-results"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            >
            {/* PRESENTATION MODE 1: ORGANIZED HIERARCHY SCHEME VIEW */}
            {catalogPresentation === 'scheme' && (
              <div className="space-y-6">
                {organizedGroups.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center space-y-3 bg-muted/10">
                    <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/50" />
                    <h3 className="font-bold text-sm text-foreground">No books found</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      No books match the current filters. Adjust your search or add books to your catalog.
                    </p>
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
                              ) : activeScheme === 'author_then_genre' ? (
                                primaryGroup.label.charAt(0).toUpperCase()
                              ) : (
                                <MapPin className="h-4 w-4" />
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

            {/* PRESENTATION MODE 2: COPIES VIEW (Clustered into piles for multiple copies) */}
            {catalogPresentation === 'copies' && (
              <LibraryBookPileGrid
                showCoverImages={settings.libraryCatalogShowCoverImages ?? true}
                piles={groupBooksIntoPiles(currentCatalogSlice)}
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
                getGenreColor={(item) =>
                  resolveBookClassification(item.category, settings.libraryGenreDefinitions, item.shelfLocation).color
                }
              />
            )}

            {/* PRESENTATION MODE 3: GROUPED TITLES VIEW (Master Title Cards) */}
            {catalogPresentation === 'grouped' && (
              <div className="space-y-3">
                {currentGroupSlice.map((group) => {
                  const isExpanded = expandedGroupKeys.has(group.key);
                  const totalCopies = group.copies.length;
                  return (
                    <div
                      key={group.key}
                      className={cn('rounded-2xl p-4 shadow-sm space-y-3 transition-all border', currentTheme.classes.card)}
                    >
                      <div className="flex items-start gap-4">
                        <div className="h-20 w-14 shrink-0 overflow-hidden rounded-xl border shadow-xs">
                          <LibraryBookCover
                            coverUrl={group.coverUrl}
                            isbn={group.isbn}
                            title={group.name}
                            author={group.author}
                            aspect="portrait"
                            className="h-full w-full"
                          />
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-black text-foreground truncate">{group.name}</h3>
                            <Badge variant="secondary" className="font-bold text-xs">
                              {totalCopies} {totalCopies === 1 ? 'copy' : 'copies'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{group.author || 'Author not recorded'}</p>
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <Badge variant="outline" className="text-xs font-semibold">
                              {group.shelfLocation || 'General Stacks'}
                            </Badge>
                            {group.availableCount > 0 && (
                              <Badge className="bg-emerald-600 text-white font-bold text-xs">
                                {group.availableCount} Available
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

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleGroupExpand(group.key)}
                          className="gap-1 rounded-xl text-xs font-bold shrink-0"
                        >
                          <span>{isExpanded ? 'Hide copies' : 'Show all copies'}</span>
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </div>

                      {/* Expanded Copies Sub-list */}
                      {isExpanded && (
                        <div className="border-t pt-3 space-y-2 pl-4 border-l-2 border-primary/20">
                          {group.copies.map((copy: LibraryItem) => (
                            <div
                              key={copy.id}
                              className="flex items-center justify-between gap-3 rounded-xl border bg-background p-2.5 text-xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <Checkbox
                                  checked={selected.has(copy.id)}
                                  onCheckedChange={() => toggleSelect(copy.id)}
                                />
                                <span className="font-mono font-bold">{copy.upc}</span>
                                {copy.copyNumber && (
                                  <Badge variant="outline" className="text-[10px]">
                                    Copy #{copy.copyNumber}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge
                                  variant={
                                    copy.condition === 'lost' || copy.condition === 'damaged'
                                      ? 'destructive'
                                      : copy.status === 'checked_out'
                                        ? 'default'
                                        : 'secondary'
                                  }
                                  className="text-[10px] capitalize font-bold"
                                >
                                  {copy.condition && copy.condition !== 'good'
                                    ? copy.condition
                                    : copy.status === 'checked_out'
                                      ? `On loan to ${getName(copy.checkedOutTo || undefined)}`
                                      : 'Available'}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditing(copy);
                                    setEditOpen(true);
                                  }}
                                  className="h-7 text-xs font-semibold"
                                >
                                  Edit
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-xl text-xs font-bold"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pageCount}
                  onClick={() => setPage((p) => p + 1)}
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
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-foreground">Reports &amp; Circulation</h2>
              <p className="text-xs text-muted-foreground">
                A visual overview of borrowing activity, cataloging progress, and what&rsquo;s popular right now.
              </p>
            </div>
            <LibraryReportsCard
              items={items ?? []}
              loans={loans ?? []}
              loansUnavailable={Boolean(historyError)}
              activeLoansCount={activeLoans.length}
              overdueLoansCount={overdueLoans.length}
              genreDefinitions={settings.libraryGenreDefinitions}
            />
          </div>
        )}

        {/* 4. POLICIES & SETTINGS TAB (Single Unified Layout, No 2-row clutter) */}
        {tab === 'settings' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
            <Tabs defaultValue="policies" className="w-full space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-3">
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
      </main>

      {isNightDesk && (
        <footer className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-8 pb-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 border-t border-slate-800/80 mt-12">
          <div>
            Sunset Terrace · Story nook open till 4:30
          </div>
          <button
            type="button"
            onClick={() => switchTab('kiosk')}
            className="hover:text-slate-300 flex items-center gap-1.5 font-medium transition-colors"
          >
            <span>Open student kiosk</span>
            <Monitor className="h-3.5 w-3.5" />
          </button>
        </footer>
      )}
    </div>

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
          upcTaken={async (code, excludeId) => {
            if (!firestore) return false;
            const found = await findLibraryItemByUpc(firestore, schoolId, code, { allowIsbn: false });
            return !!(found && found.item.id !== excludeId);
          }}
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
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className="max-w-4xl w-[95vw] p-4 sm:p-4 flex flex-col max-h-[92vh] overflow-hidden"
        >
          <DialogHeader className="flex flex-row items-center justify-between gap-4 pb-2 border-b border-border/60 shrink-0">
            <div>
              <DialogTitle className="text-base sm:text-lg font-black">Add Books to Catalog</DialogTitle>
              <DialogDescription className="text-xs">
                Scan book ISBN barcodes or paste an ISBN list. Online catalog details and covers are fetched automatically.
              </DialogDescription>
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
              libraryItems={items}
              upcTaken={async (code) => !!(firestore && (await findLibraryItemByUpc(firestore, schoolId, code, { allowIsbn: false })))}
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
        items={items ?? []}
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
