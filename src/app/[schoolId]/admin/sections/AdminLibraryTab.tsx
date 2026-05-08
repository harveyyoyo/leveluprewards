'use client';

import { Book, Edit, Plus, Trash2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Helper } from '@/components/ui/helper';
import { EmptyState } from '@/components/ui/empty-state';
import { AdminRecordListHeader } from '@/components/admin/AdminRecordListHeader';
import type { LibraryItem } from '@/lib/types';

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
  return (
    <Card className="w-full border-t-4 border-primary shadow-md overflow-hidden">
      <CardHeader className="flex flex-row justify-between items-center py-6">
        <div>
          <Helper content="Manage library items available for checkout. Assign a unique UPC barcode to each item.">
            <CardTitle className="flex items-center gap-2">
              <Book className="w-5 h-5 text-destructive" /> Library Management
            </CardTitle>
          </Helper>
          <CardDescription>Manage items that students can check out and return.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
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
              description="Add your first item (book, equipment, etc.) with a UPC barcode so students can check it out."
              action={{ label: 'Add your first item', icon: Plus, onClick: onAddLibraryItem }}
            />
          ) : (
            <ul className="space-y-1">
              <AdminRecordListHeader
                gridClassName="grid-cols-[76px_minmax(180px,1fr)_minmax(110px,150px)_minmax(120px,190px)_96px_44px]"
                columns={[
                  { label: 'Edit' },
                  { label: 'Item Name' },
                  { label: 'UPC Barcode' },
                  { label: 'Checkout Status' },
                  { label: 'Force Return', className: 'text-center' },
                  { label: 'Delete', className: 'text-right' },
                ]}
              />
              {libraryItems.map((item) => (
                <li
                  key={item.id}
                  className="grid grid-cols-[76px_minmax(180px,1fr)_minmax(110px,150px)_minmax(120px,190px)_96px_44px] items-center gap-3 rounded-xl border bg-secondary/20 px-3 py-2 transition-colors hover:border-primary/20 hover:bg-background"
                >
                  <div className="flex items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 rounded-lg border-primary/20 bg-background hover:bg-primary/5 text-primary font-semibold"
                      onClick={() => onEditLibraryItem(item)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  </div>
                  <div className="truncate text-sm font-bold">{item.name}</div>
                  <div className="truncate font-mono text-[11px] text-muted-foreground">{item.upc}</div>
                  <div className="truncate text-sm font-bold text-muted-foreground">
                    {item.status === 'checked_out'
                      ? `Out: ${getStudentName(item.checkedOutTo ?? undefined) || 'Unknown'}`
                      : 'Available'}
                  </div>
                  <div className="flex items-center justify-center">
                    {item.status === 'checked_out' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 text-amber-600 hover:bg-amber-50 rounded-lg"
                        onClick={() => onReturnLibraryItem(item.id)}
                        title="Force Return"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span className="text-xs font-bold">Return</span>
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg"
                      onClick={() => onDeleteLibraryItem(item.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
