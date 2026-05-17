'use client';

import { useCallback } from 'react';
import { Book, Edit, Plus, Printer, Trash2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Helper } from '@/components/ui/helper';
import { EmptyState } from '@/components/ui/empty-state';
import { TabWalkthroughHeaderAction } from '@/components/tabWalkthrough/TabWalkthroughContext';
import { AdminRecordListHeader } from '@/components/admin/AdminRecordListHeader';
import { usePrint } from '@/components/providers/PrintProvider';
import { useToast } from '@/hooks/use-toast';
import type { LibraryItem } from '@/lib/types';

const LIST_GRID =
  'grid-cols-[72px_minmax(160px,1fr)_minmax(100px,130px)_minmax(90px,120px)_minmax(100px,1fr)_88px_44px_44px]';

export function AdminLibraryTab({
  libraryItems,
  getStudentName,
  onAddLibraryItem,
  onEditLibraryItem,
  onDeleteLibraryItem,
  onReturnLibraryItem,
}: {
  libraryItems: LibraryItem[] | null | undefined;
  getStudentName: (id?: string) => string;
  onAddLibraryItem: () => void;
  onEditLibraryItem: (i: LibraryItem) => void;
  onDeleteLibraryItem: (id: string) => void;
  onReturnLibraryItem: (id: string) => void;
}) {
  const { setLibraryStickersToPrint } = usePrint();
  const { toast } = useToast();

  const handlePrintAll = useCallback(() => {
    const list = libraryItems ?? [];
    if (!list.length) {
      toast({ variant: 'destructive', title: 'No items', description: 'Add library items before printing stickers.' });
      return;
    }
    setLibraryStickersToPrint(list);
    toast({ title: 'Printing stickers', description: `${list.length} barcode sticker(s) sent to the printer.` });
  }, [libraryItems, setLibraryStickersToPrint, toast]);

  const handlePrintOne = useCallback(
    (item: LibraryItem) => {
      setLibraryStickersToPrint([item]);
      toast({ title: 'Printing sticker', description: `Barcode for “${item.name}”.` });
    },
    [setLibraryStickersToPrint, toast],
  );

  return (
    <Card className="w-full border-t-4 border-primary shadow-md overflow-hidden">
      <CardHeader className="flex flex-row justify-between items-center py-6">
        <div>
          <Helper content="Catalog books and equipment with barcodes. Students scan on the portal to check out or return.">
            <CardTitle className="flex items-center gap-2">
              <Book className="w-5 h-5 text-destructive" /> Library Management
            </CardTitle>
          </Helper>
          <CardDescription>Manage items students check out by scanning barcodes.</CardDescription>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <TabWalkthroughHeaderAction />
          <Button variant="outline" className="rounded-xl" onClick={handlePrintAll}>
            <Printer className="mr-2 h-4 w-4" /> Print barcode stickers
          </Button>
          <Button onClick={onAddLibraryItem} className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" /> Add Item
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border bg-background/50 p-3">
          {(!libraryItems || libraryItems.length === 0) ? (
            <EmptyState
              icon={Book}
              title="No library items yet"
              description="Add books or equipment with a unique barcode, then print stickers for each copy."
              action={{ label: 'Add your first item', icon: Plus, onClick: onAddLibraryItem }}
            />
          ) : (
            <ul className="space-y-1">
              <AdminRecordListHeader
                gridClassName={LIST_GRID}
                columns={[
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
              {libraryItems.map((item) => (
                <li
                  key={item.id}
                  className={`grid ${LIST_GRID} items-center gap-2 rounded-xl border bg-secondary/20 px-3 py-2 transition-colors hover:border-primary/20 hover:bg-background`}
                >
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
                      title="Print barcode sticker"
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
      </CardContent>
    </Card>
  );
}
