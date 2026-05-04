'use client';

import { Book, Edit, Plus, Trash2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Helper } from '@/components/ui/helper';
import { EmptyState } from '@/components/ui/empty-state';
import { ScrollArea } from '@/components/ui/scroll-area';
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
    <Card className="border-t-4 border-primary shadow-md">
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
        <ScrollArea className="h-[calc(100vh-22rem)] max-h-[420px] min-h-[250px] border rounded-lg bg-background/50 p-3">
          {(!libraryItems || libraryItems.length === 0) ? (
            <EmptyState
              icon={Book}
              title="No library items yet"
              description="Add your first item (book, equipment, etc.) with a UPC barcode so students can check it out."
              action={{ label: 'Add your first item', icon: Plus, onClick: onAddLibraryItem }}
            />
          ) : (
            <ul className="space-y-2">
              {libraryItems.map((item) => (
                <li
                  key={item.id}
                  className="flex justify-between items-center bg-card p-4 rounded-xl border transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <p className="font-bold text-base">{item.name}</p>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground font-medium">
                        <span className="font-code text-xs bg-secondary px-2 py-0.5 rounded">{item.upc}</span>
                        {item.status === 'checked_out' ? (
                          <span className="text-amber-600 dark:text-amber-400">
                            Checked out by {getStudentName(item.checkedOutTo ?? undefined) || 'Unknown Student'}
                            {item.checkedOutAt && ` on ${new Date(item.checkedOutAt).toLocaleDateString()}`}
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">Available</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {item.status === 'checked_out' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => onReturnLibraryItem(item.id)}
                        title="Force Return"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Return
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEditLibraryItem(item)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => onDeleteLibraryItem(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
