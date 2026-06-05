'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Book,
  Edit,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Trash2,
  SlidersHorizontal,
  Settings,
  BookOpen,
  User,
  Calendar,
  Layers,
  Check,
} from 'lucide-react';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { computeDaysOverdue, formatDueDate } from '@/lib/library/libraryPolicy';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Helper } from '@/components/ui/helper';
import { EmptyState } from '@/components/ui/empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePrint } from '@/components/providers/PrintProvider';
import { useToast } from '@/hooks/use-toast';
import type { LibraryItem, LibraryItemInput } from '@/lib/types';
import type { LibraryLabelFormat } from '@/lib/library/libraryScanCode';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LibraryBookBulkIntakeScanner } from './LibraryBookBulkIntakeScanner';
import { LibraryBookIntakeScanner } from './LibraryBookIntakeScanner';
import { useAppContext } from '@/components/AppProvider';
import { LibraryCheckoutDesk } from './LibraryCheckoutDesk';
import { LibraryPolicySettingsCard } from './LibraryPolicySettingsCard';
import { LibrarySelfCheckoutLaunchButton } from './LibrarySelfCheckoutOverlay';
import type { Category, Student } from '@/lib/types';

export type LibrarySortKey = 'title' | 'author' | 'shelf' | 'status' | 'barcode' | 'checkedOut';
export type LibraryStatusFilter = 'all' | 'available' | 'checked_out' | 'overdue';

export function LibraryManagementPanel({
  libraryItems,
  getStudentName,
  schoolId,
  showIntakeScanner = false,
  onAddLibraryItem,
  onEditLibraryItem,
  onDeleteLibraryItem,
  onReturnLibraryItem,
  onRegisterFromScan,
  upcTaken,
  categories,
  students,
}: {
  libraryItems: LibraryItem[] | null | undefined;
  getStudentName: (id?: string) => string;
  schoolId?: string | null;
  students?: Student[] | null;
  categories?: Category[] | null;
  showIntakeScanner?: boolean;
  onAddLibraryItem: () => void;
  onEditLibraryItem: (i: LibraryItem) => void;
  onDeleteLibraryItem: (id: string) => void;
  onReturnLibraryItem: (id: string) => void;
  onRegisterFromScan?: (data: LibraryItemInput) => Promise<void>;
  upcTaken?: (upc: string) => Promise<boolean>;
}) {
  const { setLibraryStickersToPrint } = usePrint();
  const { toast } = useToast();
  const confirm = useConfirm();
  const { schoolId: ctxSchoolId } = useAppContext();
  const resolvedSchoolId = (schoolId ?? ctxSchoolId ?? '').trim() || null;
  const [sortKey, setSortKey] = useState<LibrarySortKey>('title');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [labelFormat, setLabelFormat] = useState<LibraryLabelFormat>('sticker');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<LibraryStatusFilter>('all');

  const sortedItems = useMemo(() => {
    const now = Date.now();
    const normalizedSearch = searchQuery.trim().toLowerCase();
    let list = [...(libraryItems ?? [])];

    // Status filter
    if (statusFilter === 'available') {
      list = list.filter((i) => i.status !== 'checked_out');
    } else if (statusFilter === 'checked_out') {
      list = list.filter((i) => i.status === 'checked_out');
    } else if (statusFilter === 'overdue') {
      list = list.filter((i) => i.status === 'checked_out' && i.dueAt && i.dueAt < now);
    }

    // Search filter
    if (normalizedSearch) {
      list = list.filter((i) => {
        const haystack = `${i.name} ${i.author ?? ''} ${i.isbn ?? ''} ${i.upc} ${i.category ?? ''} ${i.shelfLocation ?? ''}`.toLowerCase();
        return haystack.includes(normalizedSearch);
      });
    }

    list.sort((a, b) => {
      switch (sortKey) {
        case 'author':
          return (a.author ?? '').localeCompare(b.author ?? '');
        case 'shelf':
          return (a.shelfLocation ?? '').localeCompare(b.shelfLocation ?? '');
        case 'status':
          return a.status.localeCompare(b.status);
        case 'barcode':
          return a.upc.localeCompare(b.upc);
        case 'checkedOut':
          return (a.checkedOutAt ?? 0) - (b.checkedOutAt ?? 0);
        default:
          return a.name.localeCompare(b.name);
      }
    });
    return list;
  }, [libraryItems, sortKey, searchQuery, statusFilter]);

  const selectedItems = useMemo(
    () => sortedItems.filter((i) => selectedIds.has(i.id)),
    [sortedItems, selectedIds],
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedItems.map((i) => i.id)));
    }
  };

  const printItems = useCallback(
    (items: LibraryItem[], format: LibraryLabelFormat) => {
      if (!items.length) {
        toast({ variant: 'destructive', title: 'No items', description: 'Select items to print labels.' });
        return;
      }
      if (!resolvedSchoolId) {
        toast({ variant: 'destructive', title: 'Cannot print labels', description: 'Missing schoolId.' });
        return;
      }
      setLibraryStickersToPrint(items, { format, schoolId: resolvedSchoolId });
      toast({
        title: 'Printing labels',
        description: `${items.length} label(s) — ${format === 'sticker' ? 'standard sticker' : format === 'spine' ? 'spine label' : 'pocket label'}.`,
      });
    },
    [setLibraryStickersToPrint, toast, resolvedSchoolId],
  );

  const handlePrintAll = () => printItems(sortedItems, labelFormat);
  const handlePrintSelected = () => printItems(selectedItems, labelFormat);
  const handlePrintOne = (item: LibraryItem) => printItems([item], labelFormat);

  const handleConfirmedDelete = async (item: LibraryItem) => {
    const ok = await confirm({
      title: `Delete "${item.name}"?`,
      description: 'This will permanently remove the item from the catalog. This action cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) onDeleteLibraryItem(item.id);
  };

  const overdueCount = useMemo(
    () =>
      (libraryItems ?? []).filter(
        (i) => i.status === 'checked_out' && i.dueAt && i.dueAt < Date.now(),
      ).length,
    [libraryItems],
  );

  const checkedOutCount = useMemo(
    () => (libraryItems ?? []).filter((i) => i.status === 'checked_out').length,
    [libraryItems],
  );

  const hasIntakeTab = !!(showIntakeScanner && onRegisterFromScan && upcTaken);

  return (
    <Card className="w-full border-t-4 border-primary shadow-md overflow-hidden bg-background/95 backdrop-blur-md">
      <CardHeader className="py-6 bg-secondary/35 border-b border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Helper content="Catalog books with unique LIB barcodes. Manage cataloging, print sticker labels, and track loans. Students scan their card, then the book, to check out or return.">
              <CardTitle className="flex items-center gap-2 text-2xl font-black tracking-tight text-foreground">
                <Book className="w-6 h-6 text-primary" /> Library Center
              </CardTitle>
            </Helper>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        <Tabs defaultValue="catalog" className="w-full space-y-6">
          <TabsList className={`grid w-full max-w-2xl ${hasIntakeTab ? 'grid-cols-4' : 'grid-cols-3'} rounded-2xl bg-secondary/80 p-1 border border-border/40`}>
            <TabsTrigger
              value="catalog"
              className="rounded-xl py-2 font-bold flex items-center justify-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
            >
              <BookOpen className="h-4 w-4" />
              Book Catalog
            </TabsTrigger>
            <TabsTrigger
              value="desk"
              className="rounded-xl py-2 font-bold flex items-center justify-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
            >
              <RotateCcw className="h-4 w-4" />
              Student Checkout
            </TabsTrigger>
            {hasIntakeTab && (
              <TabsTrigger
                value="intake"
                className="rounded-xl py-2 font-bold flex items-center justify-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Book Intake
              </TabsTrigger>
            )}
            <TabsTrigger
              value="settings"
              className="rounded-xl py-2 font-bold flex items-center justify-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
            >
              <Settings className="h-4 w-4" />
              Policy &amp; Rules
            </TabsTrigger>
          </TabsList>

          {/* Catalog Tab */}
          <TabsContent value="catalog" className="space-y-6 outline-none mt-4">

            {/* Stats Dashboard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-background/40 hover:bg-background/60 transition-colors border border-primary/10 rounded-2xl">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="p-3 bg-primary/10 rounded-xl text-primary">
                    <Book className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Total Catalog
                    </p>
                    <h4 className="text-2xl font-black tracking-tight mt-0.5">
                      {(libraryItems ?? []).length} books
                    </h4>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-background/40 hover:bg-background/60 transition-colors border border-amber-500/10 rounded-2xl">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Checked Out
                    </p>
                    <h4 className="text-2xl font-black tracking-tight mt-0.5">
                      {checkedOutCount} books
                    </h4>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`transition-colors rounded-2xl border ${
                  overdueCount > 0
                    ? 'border-red-500/25 bg-red-50/20 dark:bg-red-950/10'
                    : 'border-emerald-500/10 bg-background/40 hover:bg-background/60'
                }`}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-3 rounded-xl ${
                        overdueCount > 0 ? 'bg-red-500/15 text-red-600' : 'bg-emerald-500/10 text-emerald-600'
                      }`}
                    >
                      <AlertTriangle className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Overdue Books
                      </p>
                      <h4 className="text-2xl font-black tracking-tight mt-0.5">
                        {overdueCount} books
                      </h4>
                    </div>
                  </div>
                  {overdueCount > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-xl font-bold bg-background hover:bg-red-50/50 border-red-500/30 text-red-600 text-xs"
                      onClick={() => setStatusFilter(statusFilter === 'overdue' ? 'all' : 'overdue')}
                    >
                      {statusFilter === 'overdue' ? 'Show all' : 'Filter overdue'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Overdue Dashboard Quick Summary Log */}
            {overdueCount > 0 && statusFilter !== 'overdue' && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> High Priority Overdues
                  </h5>
                  <Button
                    variant="link"
                    className="p-0 h-auto text-xs text-amber-700 dark:text-amber-300 font-bold hover:underline"
                    onClick={() => setStatusFilter('overdue')}
                  >
                    View all {overdueCount} overdues
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(libraryItems ?? [])
                    .filter((i) => i.status === 'checked_out' && i.dueAt && i.dueAt < Date.now())
                    .sort((a, b) => (a.dueAt ?? 0) - (b.dueAt ?? 0))
                    .slice(0, 4)
                    .map((item) => {
                      const days = computeDaysOverdue(item.dueAt);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 rounded-xl bg-background border border-amber-500/20 px-3 py-1.5 text-xs font-semibold shadow-sm"
                        >
                          <span className="truncate max-w-[150px]">{item.name}</span>
                          <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                            {days}d
                          </Badge>
                          <span className="text-[10px] text-muted-foreground truncate max-w-[120px] border-l pl-2 border-border">
                            {getStudentName(item.checkedOutTo ?? undefined)}
                          </span>
                        </div>
                      );
                    })}
                  {overdueCount > 4 && (
                    <div className="flex items-center text-xs text-amber-700 dark:text-amber-300 font-bold px-1.5">
                      +{overdueCount - 4} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Filter and Query Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-secondary/20 p-3 rounded-2xl border border-border/40">
              <div className="relative flex-1 group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Search catalog by title, author, shelf, barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-full rounded-xl pl-10 bg-background border-border/60 text-sm focus-visible:ring-1"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as LibraryStatusFilter)}>
                  <SelectTrigger className="w-[130px] rounded-xl h-10 bg-background text-xs font-bold border-border/60">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="checked_out">Checked out</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortKey} onValueChange={(v) => setSortKey(v as LibrarySortKey)}>
                  <SelectTrigger className="w-[140px] rounded-xl h-10 bg-background text-xs font-bold border-border/60">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="title">Title A-Z</SelectItem>
                    <SelectItem value="author">Author A-Z</SelectItem>
                    <SelectItem value="shelf">Shelf location</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="barcode">Barcode ID</SelectItem>
                    <SelectItem value="checkedOut">Checkout date</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  className="rounded-xl h-10 font-bold border-border/60 bg-background hover:bg-accent text-xs gap-1.5"
                  onClick={handlePrintAll}
                >
                  <Printer className="h-4 w-4" /> Print all
                </Button>

                <Button
                  onClick={onAddLibraryItem}
                  className="rounded-xl h-10 font-bold shadow-sm gap-1 bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
                >
                  <Plus className="h-4 w-4" /> Add manual book
                </Button>
              </div>
            </div>

            {/* Dynamic Bulk Selection Action Toolbar */}
            {selectedIds.size > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-primary/5 border border-primary/20 p-3 rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary hover:bg-primary rounded-lg font-bold">
                    {selectedIds.size} Selected
                  </Badge>
                  <span className="text-xs font-bold text-primary">Choose label format &amp; print:</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={labelFormat} onValueChange={(v) => setLabelFormat(v as LibraryLabelFormat)}>
                    <SelectTrigger className="w-[130px] rounded-xl h-9 bg-background text-xs font-bold border-primary/25">
                      <SelectValue placeholder="Label format" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="sticker">Sticker Label</SelectItem>
                      <SelectItem value="spine">Spine Label</SelectItem>
                      <SelectItem value="pocket">Pocket Label</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="default"
                    size="sm"
                    className="rounded-xl font-bold h-9 gap-1.5"
                    onClick={handlePrintSelected}
                  >
                    <Printer className="h-3.5 w-3.5" /> Print selection ({selectedIds.size})
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    Clear selection
                  </Button>
                </div>
              </div>
            )}

            {/* Main Catalog Book List */}
            <div>
              {sortedItems.length === 0 ? (
                <EmptyState
                  icon={Book}
                  title="No library items match filters"
                  description="Use the barcode reader scanner or click manually add to register new library copies."
                  action={{ label: 'Reset all filters', icon: RotateCcw, onClick: () => { setStatusFilter('all'); setSearchQuery(''); } }}
                />
              ) : (
                <div className="space-y-2">
                  {/* Select All Row Header */}
                  <div className="flex items-center justify-between px-4 py-2 bg-secondary/15 rounded-xl border border-border/20 text-xs font-bold text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedIds.size === sortedItems.length && sortedItems.length > 0}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all books"
                      />
                      <span>Select all books</span>
                    </div>
                    <span>{sortedItems.length} copies displayed</span>
                  </div>

                  <ul className="space-y-2">
                    {sortedItems.map((item) => {
                      const isOverdue = item.status === 'checked_out' && item.dueAt && item.dueAt < Date.now();
                      const daysOverdue = item.dueAt ? computeDaysOverdue(item.dueAt) : 0;
                      const isSelected = selectedIds.has(item.id);

                      // Determine Cover theme
                      let themeClass = 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600';
                      if (item.status === 'checked_out') {
                        themeClass = isOverdue
                          ? 'bg-red-500/10 border-red-500/25 text-red-600'
                          : 'bg-amber-500/10 border-amber-500/25 text-amber-600';
                      }

                      return (
                        <li
                          key={item.id}
                          className={`flex items-center gap-4 rounded-2xl border p-3 bg-background transition-all hover:border-primary/25 hover:shadow-sm ${
                            isSelected ? 'border-primary/30 bg-primary/[0.01]' : 'border-border/60'
                          }`}
                        >
                          <div className="flex items-center shrink-0">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelect(item.id)}
                              aria-label={`Select ${item.name}`}
                            />
                          </div>

                          {/* Cover Placeholder tag */}
                          <div className={`hidden sm:flex shrink-0 w-11 h-14 items-center justify-center rounded-xl border font-bold ${themeClass}`}>
                            <Book className="h-5 w-5" />
                          </div>

                          {/* Middle Info Pane */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2">
                              <h5 className="font-bold text-sm text-foreground truncate">{item.name}</h5>
                              {item.shelfLocation && (
                                <Badge variant="outline" className="text-[9px] font-black uppercase rounded-md tracking-wider border-border shrink-0 py-0 px-1 bg-muted/20">
                                  Shelf: {item.shelfLocation}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {item.author ? `by ${item.author}` : 'Author unknown'}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] font-semibold text-muted-foreground">
                              <span className="font-mono bg-muted/40 rounded px-1 text-[9px] text-muted-foreground shrink-0">{item.upc}</span>
                              {item.category && (
                                <span className="flex items-center gap-1 shrink-0">
                                  <Layers className="h-3 w-3" /> {item.category}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Status Badge & details */}
                          <div className="text-right shrink-0">
                            {item.status === 'checked_out' ? (
                              <div className="space-y-0.5">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] font-bold rounded-lg ${
                                    isOverdue
                                      ? 'border-red-500/30 text-red-600 bg-red-50/50 dark:bg-red-950/10'
                                      : 'border-amber-500/30 text-amber-600 bg-amber-50/50 dark:bg-amber-950/10'
                                  }`}
                                >
                                  {isOverdue ? `${daysOverdue}d overdue` : 'On loan'}
                                </Badge>
                                <p className="text-[10px] text-foreground font-black truncate max-w-[130px] flex items-center justify-end gap-1">
                                  <User className="h-3 w-3 inline text-muted-foreground" />
                                  {getStudentName(item.checkedOutTo ?? undefined)}
                                </p>
                                {item.dueAt && (
                                  <p className="text-[9px] text-muted-foreground flex items-center justify-end gap-1">
                                    <Calendar className="h-2.5 w-2.5 inline" />
                                    Due {formatDueDate(item.dueAt)}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-bold rounded-lg border-emerald-500/30 text-emerald-600 bg-emerald-50/50"
                              >
                                <Check className="h-3 w-3 mr-0.5" /> Available
                              </Badge>
                            )}
                          </div>

                          {/* Direct Quick Action Buttons (No Dropdown Menu) */}
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-xl text-primary hover:bg-primary/10 hover:text-primary shrink-0"
                              onClick={() => onEditLibraryItem(item)}
                              title="Edit copy details"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-xl text-primary hover:bg-primary/10 hover:text-primary shrink-0"
                              onClick={() => handlePrintOne(item)}
                              title="Print label"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            {item.status === 'checked_out' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-xl text-amber-600 hover:bg-amber-50 hover:text-amber-700 shrink-0"
                                onClick={() => onReturnLibraryItem(item.id)}
                                title="Force check-in"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                              onClick={() => void handleConfirmedDelete(item)}
                              title="Remove from catalog"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Student Checkout Tab */}
          <TabsContent value="desk" className="space-y-6 outline-none mt-4">
            {schoolId ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed bg-muted/20 p-4">
                <div>
                  <p className="text-sm font-bold">Student self-checkout</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Shared-device flow (enable under Library → Settings). Students scan their ID, then each book.
                    Requires a librarian passcode to close.
                  </p>
                </div>
                <LibrarySelfCheckoutLaunchButton
                  schoolId={schoolId}
                  categories={categories}
                  getStudentName={getStudentName}
                />
              </div>
            ) : null}
            <div className="grid grid-cols-1 gap-6">
              <LibraryCheckoutDesk
                getStudentName={getStudentName}
                categories={categories}
                students={students}
              />
            </div>
          </TabsContent>

          {/* Book Intake Tab */}
          {hasIntakeTab && (
            <TabsContent value="intake" className="space-y-6 outline-none mt-4">
              <Card className="rounded-2xl border border-primary/20 overflow-hidden shadow-md bg-background/50">
                <CardHeader className="py-4 bg-secondary/25 border-b border-border/20">
                  <Helper content="Fast cataloging using external hardware scanner or barcode camera.">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4 text-primary" /> Book Scanner Registration
                    </CardTitle>
                  </Helper>
                </CardHeader>
                <CardContent className="p-4">
                  <Tabs defaultValue="bulk" className="w-full">
                    <TabsList className="grid w-full max-w-sm grid-cols-2 rounded-xl bg-muted/60 p-1 border border-border/20">
                      <TabsTrigger value="bulk" className="rounded-lg text-xs font-bold py-1.5">
                        Bulk register
                      </TabsTrigger>
                      <TabsTrigger value="single" className="rounded-lg text-xs font-bold py-1.5">
                        Single register
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="bulk" className="mt-4 outline-none">
                      <LibraryBookBulkIntakeScanner
                        onRegister={onRegisterFromScan}
                        upcTaken={upcTaken}
                        libraryItems={libraryItems}
                      />
                    </TabsContent>
                    <TabsContent value="single" className="mt-4 outline-none">
                      <LibraryBookIntakeScanner
                        onRegister={onRegisterFromScan}
                        upcTaken={upcTaken}
                        libraryItems={libraryItems}
                      />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Settings Tab */}
          <TabsContent value="settings" className="outline-none mt-4">
            <LibraryPolicySettingsCard categories={categories} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

