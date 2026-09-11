'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, query, orderBy, limit, updateDoc } from 'firebase/firestore';
import { ArrowLeft, BookOpen, Check, Clock, Download, ExternalLink, LayoutGrid, Loader2, MapPin, Monitor, MoreHorizontal, Plus, Printer, Search, Settings, Sparkles } from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useDoc, useFirestore, useFunctions, useCollection, useMemoFirebase } from '@/firebase';
import { useSchoolMetadataDocRef } from '@/hooks/useSchoolMetadataDocRef';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { usePrint } from '@/components/providers/PrintProvider';
import { resolveBookClassification } from '@/lib/library/libraryClassification';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { LibraryItem, LibraryItemInput, Student, Class, Category } from '@/lib/types';
import { useActiveLibraryLocation, useLibraryLocations } from '@/hooks/useLibraryLocations';
import { callLibrary, forceReturnLibraryItem, findLibraryItemByUpc } from '@/lib/library/libraryOperations';
import {
  DEFAULT_LIBRARY_LOCATION_ID,
  filterItemsForLibrary,
  itemLibraryLocationId,
  libraryPath,
} from '@/lib/library/libraryLocations';
import { formatDueDate, computeDaysOverdue } from '@/lib/library/libraryPolicy';
import { filterLibraryCatalog, downloadLibraryCsv, printLibraryLoans, type LibraryLoan } from '@/lib/library/libraryWorkspace';
import { LibraryLocationSwitcher } from './LibraryLocationSwitcher';
import { LibraryLocationsCard } from './LibraryLocationsCard';
import { LibraryCheckoutDesk } from './LibraryCheckoutDesk';
import { LibraryBookIntakeScanner } from './LibraryBookIntakeScanner';
import { LibraryItemModal } from './LibraryItemModal';
import { LibraryPolicySettingsCard } from './LibraryPolicySettingsCard';
import { LibraryThemeSettingsCard } from './LibraryThemeSettingsCard';
import { resolveLibraryTheme, type LibraryThemeId } from '@/lib/library/libraryThemes';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 30;
const nativeSelect = 'h-10 rounded-lg border bg-background px-3 text-sm';

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
  const { schoolId: contextSchoolId, isInitialized, loginState, login, categories: contextCategories, userName } = useAppContext();
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
  const allowed = ['admin', 'teacher', 'librarian', 'developer'].includes(loginState);
  const [tab, setTab] = useState('desk');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<LibraryItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [shelf, setShelf] = useState('');
  const [category, setCategory] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [loanSearch, setLoanSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [history, setHistory] = useState(false);
  const [loanPage, setLoanPage] = useState(1);
  const [now, setNow] = useState(Date.now());
  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [waiverStudent, setWaiverStudent] = useState<Student | null>(null);
  const [waiverReason, setWaiverReason] = useState('');
  const [waiverAmount, setWaiverAmount] = useState('');
  const [addedCopies, setAddedCopies] = useState<LibraryItem[]>([]);
  const catalogQuery = useMemoFirebase(() => firestore && schoolId && allowed ? collection(firestore, 'schools', schoolId, 'library') : null, [firestore, schoolId, allowed]);
  const studentsQuery = useMemoFirebase(() => firestore && schoolId && allowed ? collection(firestore, 'schools', schoolId, 'students') : null, [firestore, schoolId, allowed]);
  const classesQuery = useMemoFirebase(() => firestore && schoolId && allowed ? collection(firestore, 'schools', schoolId, 'classes') : null, [firestore, schoolId, allowed]);
  const historyQuery = useMemoFirebase(() => firestore && schoolId && allowed && tab === 'loans' && history ? query(collection(firestore, 'schools', schoolId, 'libraryLoans'), orderBy('checkedOutAt', 'desc'), limit(200)) : null, [firestore, schoolId, allowed, tab, history]);
  const { data: items, isLoading: catalogLoading, error: catalogError } = useCollection<LibraryItem>(catalogQuery);
  const { data: students, isLoading: studentsLoading, error: studentsError } = useCollection<Student>(studentsQuery);
  const { data: classes } = useCollection<Class>(classesQuery);
  const { data: loans, isLoading: historyLoading, error: historyError } = useCollection<LibraryLoan>(historyQuery);
  const { locations, storedLocations, createLocation, renameLocation, archiveLocation, restoreLocation } = useLibraryLocations(schoolId);
  const archivedLocations = useMemo(
    () => storedLocations.filter((location) => location.archived && location.id !== DEFAULT_LIBRARY_LOCATION_ID),
    [storedLocations],
  );
  const { active: activeLibrary, setActive: setActiveLibrary } = useActiveLibraryLocation(schoolId, locations);
  const locationClassNames = useMemo(() => {
    const names: Record<string, string> = {};
    for (const location of locations) {
      const className = classes?.find((item) => item.id === location.classId)?.name;
      if (className) names[location.id] = className;
    }
    return names;
  }, [classes, locations]);
  const scopedItems = useMemo(() => filterItemsForLibrary(items, activeLibrary.id), [activeLibrary.id, items]);
  const studentsById = useMemo(() => new Map((students ?? []).map(s => [s.id, s])), [students]);
  const getName = useCallback((id?: string) => { const s = studentsById.get(id ?? ''); return s ? `${s.firstName} ${s.lastName}`.trim() : 'Unknown student'; }, [studentsById]);
  const getClass = useCallback((id?: string) => { const s = studentsById.get(id ?? ''); return classes?.find(c => c.id === s?.classId)?.name ?? ''; }, [studentsById, classes]);
  const catalog = useMemo(() => filterLibraryCatalog(scopedItems, search, status, getName), [scopedItems, search, status, getName]);
  const pageCount = Math.max(1, Math.ceil(catalog.length / PAGE_SIZE));
  const visible = catalog.slice((Math.min(page, pageCount) - 1) * PAGE_SIZE, Math.min(page, pageCount) * PAGE_SIZE);
  const selectedItems = scopedItems.filter(i => !i.archived && selected.has(i.id));
  const activeLoans = useMemo(() => scopedItems.filter(i => i.status === 'checked_out' && !i.archived), [scopedItems]);
  const overdue = activeLoans.filter(i => i.dueAt && i.dueAt < now);
  const filteredLoans = activeLoans.filter(i => (!overdueOnly || (i.dueAt && i.dueAt < now)) &&
    (classFilter === 'all' || studentsById.get(i.checkedOutTo ?? '')?.classId === classFilter) &&
    [i.name, i.upc, getName(i.checkedOutTo ?? undefined), getClass(i.checkedOutTo ?? undefined)].join(' ').toLowerCase().includes(loanSearch.toLowerCase()))
    .sort((a, b) => (a.dueAt ?? Number.MAX_SAFE_INTEGER) - (b.dueAt ?? Number.MAX_SAFE_INTEGER));
  const filteredHistory = (loans ?? []).filter(l => itemLibraryLocationId(l) === activeLibrary.id && (classFilter === 'all' || studentsById.get(l.studentId)?.classId === classFilter) &&
    [l.title, l.upc, getName(l.studentId)].join(' ').toLowerCase().includes(loanSearch.toLowerCase()));
  const loanRows = history ? filteredHistory : filteredLoans;
  const loanPages = Math.max(1, Math.ceil(loanRows.length / PAGE_SIZE));
  const loanStart = (Math.min(loanPage, loanPages) - 1) * PAGE_SIZE;
  useEffect(() => { setPage(1); }, [search, status]);
  useEffect(() => { setLoanPage(1); }, [loanSearch, classFilter, overdueOnly, history]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(timer); }, []);

  const run = async (fn: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try { await fn(); } catch (e) { toast({ variant: 'destructive', title: 'Could not complete action', description: e instanceof Error ? e.message : 'Please try again.' }); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const save = async (data: LibraryItemInput, itemId?: string) => {
    const result = await callLibrary<{ items: LibraryItem[]; count: number }>(functions, 'libraryCatalogSave', {
      schoolId,
      item: data,
      libraryLocationId: activeLibrary.id,
      ...(itemId ? { itemId } : {}),
    });
    if (!itemId) {
      const copies = result.items ?? [];
      if (firestore) {
        await Promise.all(
          copies
            .filter((copy) => itemLibraryLocationId(copy) !== activeLibrary.id)
            .map((copy) =>
              updateDoc(doc(firestore, 'schools', schoolId!, 'library', copy.id), {
                libraryLocationId: activeLibrary.id,
              }),
            ),
        );
      }
      setAddedCopies((prev) => [...prev, ...copies.map((copy) => ({ ...copy, libraryLocationId: activeLibrary.id }))]);
    }
    toast({ title: itemId ? 'Copy updated' : `${result.count} copies added`, description: itemId ? undefined : 'Print labels for the new copies before lending.' });
  };
  const itemAction = (item: LibraryItem, action: string, extra: Record<string, unknown> = {}) => run(async () => {
    if (action === 'archive' && !await confirm({ title: `Archive ${item.name}?`, description: 'This copy will leave the active catalog. Its loan history will be kept.', confirmLabel: 'Archive' })) return;
    if (action === 'delete' && !await confirm({ title: `Permanently delete "${item.name}"?`, description: 'This cannot be undone — the copy and its barcode are removed completely. Use Archive instead if you want to keep it out of the catalog but preserve loan history.', confirmLabel: 'Delete permanently', destructive: true })) return;
    const result = action === 'return' ? await forceReturnLibraryItem(firestore!, schoolId!, item, { functions }) :
      await callLibrary<{ message: string }>(functions, 'libraryCirculation', { schoolId, action, itemId: item.id,
        studentId: item.checkedOutTo ?? null, expectedLoanId: item.activeLoanId ?? null, expectedCheckedOutAt: item.checkedOutAt ?? null, ...extra });
    toast({ title: result.message ?? 'Updated' });
  });
  const print = (copies: LibraryItem[], format: 'sticker' | 'spine' | 'pocket' = 'sticker') => {
    if (copies.length && schoolId) setLibraryStickersToPrint(copies, { schoolId, format });
  };
  const error = catalogError || studentsError;
  const pagination = (current: number, total: number, change: (n: number) => void) => <div className="flex items-center justify-end gap-3 py-4">
    <Button variant="outline" size="sm" disabled={current <= 1} onClick={() => change(current - 1)}>Previous</Button>
    <span className="text-sm">Page {current} of {total}</span>
    <Button variant="outline" size="sm" disabled={current >= total} onClick={() => change(current + 1)}>Next</Button>
  </div>;

  if (!isInitialized || !schoolId) return <div className="grid min-h-screen place-items-center"><Loader2 className="animate-spin" aria-label="Loading library" /></div>;
  if (!allowed) return <main className="mx-auto max-w-md p-6 pt-20 space-y-5"><BookOpen className="h-10 w-10 text-primary" /><h1 className="text-3xl font-bold">Library</h1><p>Sign in with a librarian account to manage books and loans.</p>
    <form className="space-y-4" onSubmit={e => { e.preventDefault(); void run(async () => { const result = await login('librarian', { schoolId, username, passcode }); if (!result.ok) throw new Error(result.message); setPasscode(''); }); }}>
      <div><Label htmlFor="library-user">Username</Label><Input id="library-user" autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} /></div>
      <div><Label htmlFor="library-pass">Passcode</Label><Input id="library-pass" type="password" autoComplete="current-password" value={passcode} onChange={e => setPasscode(e.target.value)} /></div>
      <Button disabled={busy} className="w-full">{busy ? 'Signing in…' : 'Sign in'}</Button>
    </form><Link className="text-sm underline" href={`/${schoolId}/portal`}>Back to school</Link></main>;
  if (settings.payLibrary === false) {
    if (embedded) {
      return (
        <div className={cn('rounded-3xl border border-border/80 bg-card p-8 sm:p-12 text-center space-y-5 shadow-sm', className)}>
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-primary">
            <BookOpen className="h-10 w-10" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Library Management</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Catalog books, manage lending and returns, and provide self-checkout kiosk stations for students.
            </p>
          </div>
          <div className="pt-2">
            {loginState === 'admin' || loginState === 'developer' ? (
              <Button
                onClick={() => {
                  updateSettings({ payLibrary: true });
                  toast({ title: 'Library enabled' });
                }}
                className="rounded-xl font-bold"
              >
                Turn on Library
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Ask a school administrator to enable the Library in Settings.</p>
            )}
          </div>
        </div>
      );
    }
    return <main className="p-10 space-y-4"><h1 className="text-2xl font-bold">Library is not enabled</h1><Link href={`/${schoolId}/portal`}>Back to school</Link></main>;
  }

  const content = (
    <div className={cn('space-y-6', embedded ? '' : 'mx-auto max-w-7xl p-4 sm:p-8')}>
      {error ? <p role="alert" className="rounded-xl border border-destructive p-4">The library could not load: {error.message}</p> : null}
      {catalogLoading || studentsLoading ? <p role="status" className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading books and students…</p> : null}
      <Tabs value={tab} onValueChange={setTab} className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
        <TabsList
          aria-label="Library sections"
          className="grid h-auto w-full grid-cols-4 gap-1 sm:flex sm:w-56 sm:shrink-0 sm:flex-col sm:grid-cols-1"
        >
          {[
            { id: 'desk', label: 'Desk', icon: LayoutGrid },
            { id: 'catalog', label: 'Catalog', icon: BookOpen },
            { id: 'loans', label: 'Loans', icon: Clock, badge: overdue.length > 0 ? overdue.length : undefined },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map(({ id, label, icon: Icon, badge }) => (
            <TabsTrigger
              key={id}
              value={id}
              className="relative flex min-h-11 w-full min-w-0 items-center justify-start gap-3 whitespace-normal rounded-xl px-3 py-2.5 text-left text-xs font-semibold leading-tight text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-inner sm:text-sm"
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="min-w-0">{label}</span>
              {badge !== undefined ? (
                <span className="ml-auto shrink-0 rounded-lg bg-background px-1.5 py-0.5 text-[9px] font-black text-muted-foreground">
                  {badge}
                </span>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="min-w-0 flex-1">
        <TabsContent value="desk" className="mt-0 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-primary/5 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Monitor className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Student Self-Checkout &amp; Return Kiosk</p>
                <p className="text-xs text-muted-foreground">
                  Open this on a shared device for students to independently borrow and return books.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="rounded-xl font-bold text-xs gap-1 shadow-sm"
              asChild
            >
              <Link href={libraryPath(schoolId, '/kiosk', activeLibrary.id)} target="_blank" rel="noopener noreferrer">
                Open Kiosk
                <ExternalLink className="h-3 w-3" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-3">{[['catalog', 'Copies', scopedItems.filter(i => !i.archived).length], ['loans', 'On loan', activeLoans.length], ['overdue', 'Overdue', overdue.length]].map(([key, label, count]) =>
            <button key={key} className="rounded-xl border bg-background p-4 text-left hover:border-primary focus-visible:ring-2 focus-visible:ring-ring" onClick={() => { setTab(key === 'catalog' ? 'catalog' : 'loans'); setHistory(false); setOverdueOnly(key === 'overdue'); }}><span className="block text-sm text-muted-foreground">{label}</span><span className="text-2xl font-bold">{count}</span></button>)}</div>
          <LibraryCheckoutDesk getStudentName={getName} categories={categories} students={students} libraryLocationId={activeLibrary.id} libraryLocations={locations} />
        </TabsContent>
        <TabsContent value="catalog" className="mt-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Book catalog</h2><p className="text-sm text-muted-foreground">Books in {activeLibrary.name}. Find a copy, print labels, or add books.</p></div><Button onClick={() => setIntakeOpen(true)}><Plus className="mr-2 h-4 w-4" />Add books</Button></div>
          {addedCopies.length > 0 && <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4"><Check className="h-5 w-5" /><span>{addedCopies.length} new copies ready for labels.</span><Button size="sm" onClick={() => print(addedCopies)}>Print new labels</Button><Button size="sm" variant="ghost" onClick={() => setAddedCopies([])}>Dismiss</Button></div>}
          <div className="flex flex-wrap gap-3"><div className="relative min-w-48 flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" aria-label="Search catalog" placeholder="Title, author, barcode, shelf, or borrower" value={search} onChange={e => setSearch(e.target.value)} /></div>
            <select aria-label="Filter catalog status" className={nativeSelect} value={status} onChange={e => setStatus(e.target.value)}><option value="all">All copies</option><option value="available">Available</option><option value="checked_out">On loan</option><option value="lost">Lost</option><option value="damaged">Damaged</option></select>
            <Button variant="outline" onClick={() => downloadLibraryCsv('library-catalog.csv', [['Library', 'Title', 'Author', 'ISBN', 'Copy barcode', 'Shelf', 'Category', 'Status', 'Condition'], ...catalog.map(i => [activeLibrary.name, i.name, i.author, i.isbn, i.upc, i.shelfLocation, i.category, i.status, i.condition ?? 'good'])])}><Download className="mr-2 h-4 w-4" />Export</Button>
          </div>
          {selectedItems.length > 0 && <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-primary/5 p-3"><span className="mr-2 text-sm font-semibold">{selectedItems.length} selected across pages</span><Button size="sm" variant="outline" onClick={() => print(selectedItems)}>Print labels</Button><Button size="sm" variant="outline" onClick={() => print(selectedItems, 'spine')}>Spine labels</Button><Button size="sm" variant="outline" onClick={() => print(selectedItems, 'pocket')}>Pocket labels</Button><Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}>Edit shelf / category</Button>{locations.length > 1 ? <select aria-label="Move selected copies to another library" className={nativeSelect} defaultValue="" onChange={e => { const nextLibrary = e.target.value; e.currentTarget.value = ''; if (!nextLibrary || !firestore || !schoolId) return; void run(async () => { await Promise.all(selectedItems.map(i => updateDoc(doc(firestore, 'schools', schoolId, 'library', i.id), { libraryLocationId: nextLibrary }))); setSelected(new Set()); toast({ title: 'Copies moved' }); }); }}><option value="">Move to…</option>{locations.filter(l => l.id !== activeLibrary.id).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select> : null}<Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button></div>}
          <div className="flex items-center gap-3 px-3 text-sm"><Checkbox aria-label="Select this page" checked={visible.length > 0 && visible.every(i => selected.has(i.id))} onCheckedChange={checked => setSelected(prev => { const next = new Set(prev); visible.forEach(i => checked ? next.add(i.id) : next.delete(i.id)); return next; })} />Select this page<span className="ml-auto text-muted-foreground">{catalog.length} copies</span></div>
          {!catalogLoading && !catalog.length ? <div className="rounded-xl border border-dashed p-10 text-center"><BookOpen className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><h3 className="font-semibold">{search || status !== 'all' ? 'No matching copies' : `Add books to ${activeLibrary.name}`}</h3><p className="mt-2 text-sm text-muted-foreground">{search || status !== 'all' ? 'Try another search or show all copies.' : 'Scan an ISBN or enter a title to start this library catalog.'}</p></div> : null}
          <ul className="space-y-2">{visible.map(item => {
            const classification = resolveBookClassification(item.category, settings.libraryGenreDefinitions, item.shelfLocation);
            return (
              <li
                key={item.id}
                className="flex items-start gap-3 rounded-xl border bg-background p-4 transition-all"
                style={{
                  borderLeftColor: classification.color,
                  borderLeftWidth: '3.5px',
                }}
              >
                <Checkbox className="mt-1" aria-label={`Select ${item.name} ${item.upc}`} checked={selected.has(item.id)} onCheckedChange={checked => setSelected(prev => { const next = new Set(prev); checked ? next.add(item.id) : next.delete(item.id); return next; })} />
                <div className="min-w-0 flex-1">
                  <button className="text-left font-semibold hover:underline" onClick={() => { setEditing(item); setEditOpen(true); }}>{item.name}</button>
                  <p className="text-sm text-muted-foreground">{item.author || 'Author not recorded'}</p>
                  <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{item.upc}{item.copyNumber ? ` · Copy ${item.copyNumber}` : ''}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className="font-bold text-xs px-2 py-0.5"
                      style={{
                        backgroundColor: `${classification.color}15`,
                        borderColor: `${classification.color}50`,
                        color: classification.color,
                      }}
                    >
                      {classification.genre.callPrefix} · {classification.genre.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                      <MapPin className="h-3 w-3 inline text-primary/70" />
                      {classification.shelfLocation}
                    </span>
                    <Badge variant={item.condition === 'lost' || item.condition === 'damaged' ? 'destructive' : 'secondary'}>{item.condition && item.condition !== 'good' ? item.condition : item.status === 'checked_out' ? 'On loan' : 'Available'}</Badge>
                    {item.checkedOutTo && <span className="text-sm">{getName(item.checkedOutTo)} · Due {formatDueDate(item.dueAt)}</span>}
                  </div>
                </div>
                <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={busy} aria-label={`Actions for ${item.name}`}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => { setEditing(item); setEditOpen(true); }}>Edit copy</DropdownMenuItem><DropdownMenuItem onSelect={() => void run(async () => { await save({ name: item.name, upc: '', author: item.author, isbn: item.isbn, category: item.category, shelfLocation: item.shelfLocation }); })}>Add another copy</DropdownMenuItem><DropdownMenuItem onSelect={() => print([item])}>Print label</DropdownMenuItem>
                  {item.status === 'checked_out' ? <><DropdownMenuItem onSelect={() => void itemAction(item, 'return')}>Return book</DropdownMenuItem><DropdownMenuItem onSelect={() => void itemAction(item, 'renew')}>Renew loan</DropdownMenuItem></> : <><DropdownMenuItem onSelect={() => void itemAction(item, 'condition', { condition: 'lost' })}>Mark lost</DropdownMenuItem><DropdownMenuItem onSelect={() => void itemAction(item, 'condition', { condition: 'damaged' })}>Mark damaged</DropdownMenuItem>{item.condition && item.condition !== 'good' && <DropdownMenuItem onSelect={() => void itemAction(item, 'condition', { condition: 'good' })}>Mark available</DropdownMenuItem>}<DropdownMenuItem onSelect={() => void itemAction(item, 'archive')}>Archive copy</DropdownMenuItem><DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => void itemAction(item, 'delete')}>Delete permanently</DropdownMenuItem></>}
                </DropdownMenuContent></DropdownMenu>
              </li>
            );
          })}</ul>
          {pagination(Math.min(page, pageCount), pageCount, setPage)}
        </TabsContent>
        <TabsContent value="loans" className="mt-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Loans &amp; returns</h2><p className="text-sm text-muted-foreground">Renew books and follow up with students.</p></div><div className="flex gap-2"><Button variant={!history ? 'default' : 'outline'} onClick={() => setHistory(false)}>Current loans</Button><Button variant={history ? 'default' : 'outline'} onClick={() => setHistory(true)}>History</Button></div></div>
          <div className="flex flex-wrap gap-3"><Input className="min-w-48 flex-1" aria-label="Search loans" placeholder="Student, book, or class" value={loanSearch} onChange={e => setLoanSearch(e.target.value)} /><select aria-label="Filter loans by class" className={nativeSelect} value={classFilter} onChange={e => setClassFilter(e.target.value)}><option value="all">All classes</option>{classes?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            {!history && <><Button variant={overdueOnly ? 'default' : 'outline'} aria-pressed={overdueOnly} onClick={() => setOverdueOnly(v => !v)}>Overdue only</Button><Button variant="outline" onClick={() => { try { printLibraryLoans(filteredLoans, getName, getClass); } catch (e) { toast({ variant: 'destructive', title: (e as Error).message }); } }}><Printer className="mr-2 h-4 w-4" />Print list</Button></>}
            <Button variant="outline" onClick={() => downloadLibraryCsv('library-loans.csv', [['Library', 'Student', 'Class', 'Book', 'Due date', 'Returned'], ...(history ? filteredHistory.map(l => [activeLibrary.name, getName(l.studentId), getClass(l.studentId), l.title, formatDueDate(l.dueAt), l.returnedAt ? new Date(l.returnedAt).toLocaleDateString() : 'On loan']) : filteredLoans.map(i => [activeLibrary.name, getName(i.checkedOutTo ?? undefined), getClass(i.checkedOutTo ?? undefined), i.name, formatDueDate(i.dueAt), 'On loan']))])}>Export</Button>
          </div>
          {history && <p className="text-sm text-muted-foreground">Latest 200 loans. Older loans appear here as they are returned or renewed after this update.</p>}
          {historyError && <p role="alert" className="text-destructive">Could not load history: {historyError.message}</p>}
          {historyLoading ? <p role="status">Loading history…</p> : !loanRows.length && <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">{history ? 'No matching loan history yet.' : 'No loans match these filters.'}</p>}
          <ul className="space-y-2">{history ? filteredHistory.slice(loanStart, loanStart + PAGE_SIZE).map(loan => <li key={loan.id} className="rounded-xl border bg-background p-4"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{loan.title}</h3><Badge variant="secondary">{loan.returnedAt ? 'Returned' : 'On loan'}</Badge></div><p className="text-sm">{getName(loan.studentId)} · {getClass(loan.studentId)}</p><p className="mt-1 text-sm text-muted-foreground">Borrowed {loan.checkedOutAt ? new Date(loan.checkedOutAt).toLocaleDateString() : 'before records began'} · Due {formatDueDate(loan.dueAt)}{loan.returnedAt ? ` · Returned ${new Date(loan.returnedAt).toLocaleDateString()}` : ''}{loan.renewalCount ? ` · ${loan.renewalCount} renewals` : ''}</p></li>) : filteredLoans.slice(loanStart, loanStart + PAGE_SIZE).map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background p-4"><div><h3 className="font-semibold">{item.name}</h3><p className="text-sm">{getName(item.checkedOutTo ?? undefined)} · {getClass(item.checkedOutTo ?? undefined)}</p><p className={`text-sm ${item.dueAt && item.dueAt < now ? 'font-semibold text-destructive' : 'text-muted-foreground'}`}>Due {formatDueDate(item.dueAt)}{item.dueAt && item.dueAt < now ? ` · ${computeDaysOverdue(item.dueAt, now)} days overdue` : ''}</p></div><div className="flex gap-2"><Button variant="outline" disabled={busy} onClick={() => void itemAction(item, 'renew')}>Renew</Button><Button disabled={busy} onClick={() => void itemAction(item, 'return')}>Return</Button></div></li>)}</ul>
          {pagination(Math.min(loanPage, loanPages), loanPages, setLoanPage)}
          {!history && (students ?? []).some(s => (s.libraryFineBalance ?? 0) > 0) && <details className="rounded-xl border bg-background p-4"><summary className="cursor-pointer font-semibold">Library fine balances</summary><p className="my-3 text-sm text-muted-foreground">Record a reason when waiving a fine.</p>{(students ?? []).filter(s => (s.libraryFineBalance ?? 0) > 0 && (classFilter === 'all' || s.classId === classFilter) && getName(s.id).toLowerCase().includes(loanSearch.toLowerCase())).map(s => <div key={s.id} className="flex items-center justify-between border-t py-3"><span>{getName(s.id)} · {s.libraryFineBalance} fine units</span><Button variant="outline" size="sm" onClick={() => { setWaiverStudent(s); setWaiverAmount(String(s.libraryFineBalance)); setWaiverReason(''); }}>Waive fine</Button></div>)}</details>}
        </TabsContent>
        <TabsContent value="settings" className="mt-0 space-y-6">
          <LibraryLocationsCard
            locations={locations}
            classes={classes}
            activeId={activeLibrary.id}
            onSelect={setActiveLibrary}
            onCreate={createLocation}
            onRename={renameLocation}
            onArchive={archiveLocation}
            archivedLocations={archivedLocations}
            onRestore={restoreLocation}
          />
          <LibraryPolicySettingsCard categories={categories} />
          <LibraryThemeSettingsCard />
        </TabsContent>
        </div>
      </Tabs>
    </div>
  );

  const modals = (
    <>
      <Dialog open={intakeOpen} onOpenChange={setIntakeOpen}>
        <DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add books</DialogTitle>
            <DialogDescription>
              Scan the book ISBN and choose how many copies to add. Extra copies get unique school labels.
            </DialogDescription>
          </DialogHeader>
          <Button variant="outline" className="w-fit" onClick={() => { setEditing(null); setEditOpen(true); }}>
            Enter a book manually
          </Button>
          <LibraryBookIntakeScanner
            onRegister={save}
            libraryItems={scopedItems}
            upcTaken={async code => !!(firestore && await findLibraryItemByUpc(firestore, schoolId, code))}
          />
        </DialogContent>
      </Dialog>
      <LibraryItemModal
        isOpen={editOpen}
        setIsOpen={setEditOpen}
        item={editing}
        onSave={save}
        schoolId={schoolId}
        upcTaken={async (code, excludeId) => {
          if (!firestore) return false;
          const found = await findLibraryItemByUpc(firestore, schoolId, code);
          return !!found && found.itemId !== excludeId;
        }}
      />
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {selectedItems.length} copies</DialogTitle>
            <DialogDescription>
              Fill the fields you want to change. Blank fields keep their current values. Up to 100 copies per update.
            </DialogDescription>
          </DialogHeader>
          <Label htmlFor="library-bulk-shelf">Shelf</Label>
          <Input id="library-bulk-shelf" value={shelf} onChange={e => setShelf(e.target.value)} />
          <Label htmlFor="library-bulk-category">Category</Label>
          <Input id="library-bulk-category" value={category} onChange={e => setCategory(e.target.value)} />
          <Button
            disabled={busy || (!shelf.trim() && !category.trim()) || selectedItems.length > 100}
            onClick={() => void run(async () => {
              await callLibrary(functions, 'libraryCatalogSave', {
                schoolId,
                itemIds: selectedItems.map(i => i.id),
                patch: { ...(shelf.trim() ? { shelfLocation: shelf } : {}), ...(category.trim() ? { category } : {}) },
              });
              setBulkOpen(false);
              setShelf('');
              setCategory('');
              toast({ title: 'Copies updated' });
            })}
          >
            Save changes
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={!!waiverStudent} onOpenChange={open => { if (!open) setWaiverStudent(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Waive fine for {waiverStudent ? getName(waiverStudent.id) : ''}</DialogTitle>
            <DialogDescription>The amount and your reason will be recorded in the library audit log.</DialogDescription>
          </DialogHeader>
          <Label htmlFor="waiver-amount">Amount</Label>
          <Input
            id="waiver-amount"
            type="number"
            min={1}
            max={waiverStudent?.libraryFineBalance ?? 0}
            value={waiverAmount}
            onChange={e => setWaiverAmount(e.target.value)}
          />
          <Label htmlFor="waiver-reason">Reason</Label>
          <Input id="waiver-reason" value={waiverReason} onChange={e => setWaiverReason(e.target.value)} />
          <Button
            disabled={busy || !waiverReason.trim() || Number(waiverAmount) <= 0}
            onClick={() => void run(async () => {
              await callLibrary(functions, 'libraryCirculation', {
                schoolId,
                action: 'waive',
                studentId: waiverStudent!.id,
                amount: Number(waiverAmount),
                reason: waiverReason,
              });
              setWaiverStudent(null);
              toast({ title: 'Fine waived' });
            })}
          >
            Record waiver
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );

  if (embedded) {
    return (
      <div className={cn('space-y-5 text-foreground transition-colors duration-300', className)}>
        {/* Embedded Top Control Bar - matches ClassroomCommandCenter styling */}
        <div className="rounded-3xl border border-border/80 bg-card p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={cn('rounded-2xl p-2.5 sm:p-3 border shadow-sm transition-colors', currentTheme.classes.card)}>
                <BookOpen className={cn('h-6 w-6 transition-colors', currentTheme.classes.accent)} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">Library Management</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {activeLibrary.name} · Circulation desk, catalog, loans, and student self-checkout
                </p>
                <div className="pt-2">
                  <LibraryLocationSwitcher
                    locations={locations}
                    activeId={activeLibrary.id}
                    onChange={setActiveLibrary}
                    classNames={locationClassNames}
                    compact
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" size="sm" className="rounded-xl font-bold gap-1.5 shadow-sm">
                <Link href={libraryPath(schoolId, '', activeLibrary.id)} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  <span>Fullscreen</span>
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="rounded-xl font-bold gap-1.5 shadow-sm">
                <Link href={libraryPath(schoolId, '/kiosk', activeLibrary.id)} target="_blank" rel="noopener noreferrer">
                  <Monitor className="h-4 w-4 text-primary" />
                  <span className="hidden sm:inline">Kiosk Station</span>
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
        {content}
        {modals}
      </div>
    );
  }

  return (
    <div className={cn('min-h-dvh transition-colors duration-300', currentTheme.classes.wrapper)}>
      <header className={cn('border-b transition-colors duration-300', currentTheme.classes.header)}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-8">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon">
              <Link
                href={`/${schoolId}/${loginState === 'admin' || loginState === 'developer' ? 'admin' : loginState === 'teacher' ? 'teacher' : 'portal'}`}
                aria-label="Back to school"
              >
                <ArrowLeft />
              </Link>
            </Button>
            <div className={cn('rounded-xl p-3 border shadow-sm transition-colors', currentTheme.classes.card)}>
              <BookOpen className={cn('h-7 w-7 transition-colors', currentTheme.classes.accent)} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{activeLibrary.name}</h1>
              </div>
              <p className="text-sm opacity-80">
                {schoolName ? `${schoolName} · ` : ''}Books, borrowing, and returns{userName ? ` · ${userName}` : ''}
              </p>
              <div className="pt-2">
                <LibraryLocationSwitcher
                  locations={locations}
                  activeId={activeLibrary.id}
                  onChange={setActiveLibrary}
                  classNames={locationClassNames}
                  compact
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Button asChild variant="outline" size="sm" className="rounded-xl font-bold gap-1.5 shadow-sm">
              <Link href={libraryPath(schoolId, '/kiosk', activeLibrary.id)} target="_blank" rel="noopener noreferrer">
                <Monitor className="h-4 w-4 text-primary" />
                <span className="hidden sm:inline">Kiosk Station</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
        {content}
      </main>
      {modals}
    </div>
  );
}
