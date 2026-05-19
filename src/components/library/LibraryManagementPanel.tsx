'use client';

import { useCallback, useMemo, useState } from 'react';
import { Book, Edit, Plus, Printer, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Helper } from '@/components/ui/helper';
import { EmptyState } from '@/components/ui/empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminRecordListHeader } from '@/components/admin/AdminRecordListHeader';
import { usePrint } from '@/components/providers/PrintProvider';
import { useToast } from '@/hooks/use-toast';
import type { LibraryItem, LibraryItemInput } from '@/lib/types';
import type { LibraryLabelFormat } from '@/lib/libraryScanCode';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LibraryBookBulkIntakeScanner } from './LibraryBookBulkIntakeScanner';
import { LibraryBookIntakeScanner } from './LibraryBookIntakeScanner';
import { LibraryCheckoutDesk } from './LibraryCheckoutDesk';
import { LibraryPolicySettingsCard } from './LibraryPolicySettingsCard';
import type { Category } from '@/lib/types';

const LIST_GRID =
  'grid-cols-[36px_72px_minmax(140px,1fr)_minmax(90px,110px)_minmax(80px,100px)_minmax(100px,1fr)_88px_44px_44px]';

export type LibrarySortKey = 'title' | 'author' | 'shelf' | 'status' | 'barcode' | 'checkedOut';

export function LibraryManagementPanel({
  libraryItems,
  getStudentName,
  showIntakeScanner = false,
  onAddLibraryItem,
  onEditLibraryItem,
  onDeleteLibraryItem,
  onReturnLibraryItem,
  onRegisterFromScan,
  upcTaken,
  categories,
}: {
  libraryItems: LibraryItem[] | null | undefined;
  getStudentName: (id?: string) => string;
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
  const [sortKey, setSortKey] = useState<LibrarySortKey>('title');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [labelFormat, setLabelFormat] = useState<LibraryLabelFormat>('sticker');

  const sortedItems = useMemo(() => {
    const list = [...(libraryItems ?? [])];
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
  }, [libraryItems, sortKey]);

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

  const printItems = useCallback(
    (items: LibraryItem[], format: LibraryLabelFormat) => {
      if (!items.length) {
        toast({ variant: 'destructive', title: 'No items', description: 'Select items to print labels.' });
        return;
      }
      setLibraryStickersToPrint(items, { format });
      toast({
        title: 'Printing labels',
        description: `${items.length} label(s) — ${format === 'sticker' ? 'standard sticker' : format === 'spine' ? 'spine label' : 'pocket label'}.`,
      });
    },
    [setLibraryStickersToPrint, toast],
  );

  const handlePrintAll = () => printItems(sortedItems, labelFormat);
  const handlePrintSelected = () => printItems(selectedItems, labelFormat);
  const handlePrintOne = (item: LibraryItem) => printItems([item], labelFormat);

  const overdueCount = useMemo(
    () =>
      (libraryItems ?? []).filter(
        (i) => i.status === 'checked_out' && i.dueAt && i.dueAt < Date.now(),
      ).length,
    [libraryItems],
  );

  return (
    <Card className="w-full border-t-4 border-primary shadow-md overflow-hidden">
      <CardHeader className="flex flex-row flex-wrap justify-between items-center gap-4 py-6">
        <div>
          <Helper content="Catalog books with unique LIB barcodes. Students scan their card, then the book, to check out or return.">
            <CardTitle className="flex items-center gap-2">
              <Book className="w-5 h-5 text-destructive" /> Library
            </CardTitle>
          </Helper>
          <CardDescription>
            Scan ISBNs with a barcode reader to add books, print LIB labels, and manage checkouts.
            {overdueCount > 0 ? ` ${overdueCount} overdue.` : ''}
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as LibrarySortKey)}>
            <SelectTrigger className="w-[140px] rounded-xl h-9">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="author">Author</SelectItem>
              <SelectItem value="shelf">Shelf</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="barcode">Barcode</SelectItem>
              <SelectItem value="checkedOut">Checked out date</SelectItem>
            </SelectContent>
          </Select>
          <Select value={labelFormat} onValueChange={(v) => setLabelFormat(v as LibraryLabelFormat)}>
            <SelectTrigger className="w-[130px] rounded-xl h-9">
              <SelectValue placeholder="Label format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sticker">Sticker</SelectItem>
              <SelectItem value="spine">Spine</SelectItem>
              <SelectItem value="pocket">Pocket</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="rounded-xl" onClick={handlePrintAll}>
            <Printer className="mr-2 h-4 w-4" /> Print all
          </Button>
          {selectedIds.size > 0 ? (
            <Button variant="outline" className="rounded-xl" onClick={handlePrintSelected}>
              <Printer className="mr-2 h-4 w-4" /> Print selected ({selectedIds.size})
            </Button>
          ) : null}
          <Button onClick={onAddLibraryItem} className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" /> Add manually
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <LibraryCheckoutDesk getStudentName={getStudentName} categories={categories} />

        {showIntakeScanner && onRegisterFromScan && upcTaken ? (
          <Tabs defaultValue="bulk" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 rounded-xl">
              <TabsTrigger value="bulk" className="rounded-lg">
                Bulk register
              </TabsTrigger>
              <TabsTrigger value="single" className="rounded-lg">
                Single register
              </TabsTrigger>
            </TabsList>
            <TabsContent value="bulk" className="mt-4">
              <LibraryBookBulkIntakeScanner
                onRegister={onRegisterFromScan}
                upcTaken={upcTaken}
                libraryItems={libraryItems}
              />
            </TabsContent>
            <TabsContent value="single" className="mt-4">
              <LibraryBookIntakeScanner
                onRegister={onRegisterFromScan}
                upcTaken={upcTaken}
                libraryItems={libraryItems}
              />
            </TabsContent>
          </Tabs>
        ) : null}

        <div className="rounded-lg border bg-background/50 p-3">
          {sortedItems.length === 0 ? (
            <EmptyState
              icon={Book}
              title="No library items yet"
              description="Use a barcode reader to scan ISBNs (bulk or single), or add an item manually."
              action={{ label: 'Add your first item', icon: Plus, onClick: onAddLibraryItem }}
            />
          ) : (
            <ul className="space-y-1">
              <AdminRecordListHeader
                gridClassName={LIST_GRID}
                columns={[
                  { label: 'Sel', id: 'sel' },
                  { label: 'Edit' },
                  { label: 'Title' },
                  { label: 'Author' },
                  { label: 'Shelf' },
                  { label: 'Barcode / status' },
                  { label: 'Print', className: 'text-center' },
                  { label: 'Return', className: 'text-center' },
                  { label: 'Delete', className: 'text-right' },
                ]}
              />
              {sortedItems.map((item) => (
                <li
                  key={item.id}
                  className={`grid ${LIST_GRID} items-center gap-2 rounded-xl border bg-secondary/20 px-3 py-2 transition-colors hover:border-primary/20 hover:bg-background`}
                >
                  <div className="flex items-center">
                    <Checkbox
                      checked={selectedIds.has(item.id)}
                      onCheckedChange={() => toggleSelect(item.id)}
                      aria-label={`Select ${item.name}`}
                    />
                  </div>
                  <div className="flex items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 rounded-lg border-primary/20 bg-background px-2 text-primary font-semibold hover:bg-primary/5"
                      onClick={() => onEditLibraryItem(item)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold">{item.name}</div>
                    {item.category ? (
                      <p className="truncate text-[10px] text-muted-foreground">{item.category}</p>
                    ) : null}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{item.author || '—'}</div>
                  <div className="truncate text-xs text-muted-foreground">{item.shelfLocation || '—'}</div>
                  <div className="min-w-0">
                    <div className="truncate font-mono text-[11px] text-muted-foreground">{item.upc}</div>
                    <div className="truncate text-xs font-semibold text-muted-foreground">
                      {item.status === 'checked_out'
                        ? `Out: ${getStudentName(item.checkedOutTo ?? undefined) || 'Unknown'}`
                        : 'Available'}
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg text-primary hover:bg-primary/10"
                      onClick={() => handlePrintOne(item)}
                      title="Print label"
                    >
                      <Printer className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-center">
                    {item.status === 'checked_out' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 text-amber-600 hover:bg-amber-50 rounded-lg px-2"
                        onClick={() => onReturnLibraryItem(item.id)}
                        title="Force return"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg"
                      onClick={() => onDeleteLibraryItem(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <LibraryPolicySettingsCard categories={categories} />
      </CardContent>
    </Card>
  );
}
