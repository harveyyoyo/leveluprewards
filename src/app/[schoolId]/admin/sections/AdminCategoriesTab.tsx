'use client';

import { Edit, Palette, Plus, Tag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Helper } from '@/components/ui/helper';
import { EmptyState } from '@/components/ui/empty-state';
import { AdminRecordListHeader } from '@/components/admin/AdminRecordListHeader';
import type { Category, Teacher } from '@/lib/types';

export function AdminCategoriesTab({
  categories,
  teachers,
  onRandomizeColors,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
}: {
  categories: Category[] | null | undefined;
  teachers: Teacher[] | null | undefined;
  onRandomizeColors: () => void | Promise<void>;
  onAddCategory: () => void;
  onEditCategory: (c: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
}) {
  return (
    <Card className="border-t-4 border-primary shadow-md">
      <CardHeader className="flex flex-row justify-between items-center py-6">
        <div>
          <Helper content="Define categories and default point values for coupons.">
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-destructive" /> Reward Categories
            </CardTitle>
          </Helper>
          <CardDescription>Define categories and point values for coupons.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => void onRandomizeColors()}>
            <Palette className="mr-2 h-4 w-4" /> Randomize Colors
          </Button>
          <Button onClick={onAddCategory} className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" /> Add Category
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 h-[calc(100vh-22rem)] min-h-[250px] overflow-y-auto pr-1">
          {categories && categories.length > 0 ? (
            <AdminRecordListHeader
              gridClassName="grid-cols-[76px_minmax(160px,1fr)_76px_minmax(120px,180px)_44px]"
              columns={[
                { label: 'Edit' },
                { label: 'Category Name' },
                { label: 'Point Value', className: 'text-center' },
                { label: 'Created By' },
                { label: 'Delete', className: 'text-right' },
              ]}
            />
          ) : null}
          {categories?.map((c) => (
            <li
              key={c.id}
              className="grid grid-cols-[76px_minmax(160px,1fr)_76px_minmax(120px,180px)_44px] items-center gap-3 rounded-xl border bg-secondary/20 px-3 py-2 transition-colors hover:border-primary/20 hover:bg-background"
            >
              <div className="flex items-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 rounded-lg border-primary/20 bg-background hover:bg-primary/5 text-primary font-semibold"
                  onClick={() => onEditCategory(c)}
                >
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </Button>
              </div>
              <div className="flex min-w-0 items-center gap-3">
                <div className="size-8 rounded-lg flex items-center justify-center border shrink-0 bg-background">
                  <div className="size-4 rounded-full border shadow-sm" style={{ backgroundColor: c.color || '#cccccc' }} />
                </div>
                <span className="truncate text-sm font-bold">{c.name}</span>
              </div>
              <div className="text-center text-sm font-bold text-primary">{c.points} pts</div>
              <div className="truncate text-sm font-medium text-muted-foreground">
                {c.teacherId ? teachers?.find((t) => t.id === c.teacherId)?.name || 'Unknown' : 'Admin'}
              </div>
              <div className="flex items-center justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg"
                  onClick={() => onDeleteCategory(c.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </li>
          ))}
          {(!categories || categories.length === 0) && (
            <EmptyState
              icon={Tag}
              title="No categories yet"
              description="Categories group your rewards (e.g. Kindness, Effort, Homework) and set default point values for coupons."
              action={{ label: 'Add your first category', icon: Plus, onClick: onAddCategory }}
            />
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
