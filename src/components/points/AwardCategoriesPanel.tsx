'use client';

import { Edit, Palette, Plus, Tag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Helper } from '@/components/ui/helper';
import { EmptyState } from '@/components/ui/empty-state';
import { AdminRecordListHeader } from '@/components/admin/AdminRecordListHeader';
import { TabWalkthroughHeaderAction } from '@/components/tabWalkthrough/TabWalkthroughContext';
import type { Category, Teacher } from '@/lib/types';
import { cn } from '@/lib/utils';

export type AwardCategoriesPanelProps = {
  categories: Category[] | null | undefined;
  teachers?: Teacher[] | null | undefined;
  mode?: 'admin' | 'teacher';
  className?: string;
  isGraphic?: boolean;
  onRandomizeColors?: () => void | Promise<void>;
  onAddCategory?: () => void;
  onEditCategory?: (category: Category) => void;
  onDeleteCategory?: (categoryId: string) => void;
  showWalkthrough?: boolean;
};

export function AwardCategoriesPanel({
  categories,
  teachers,
  mode = 'admin',
  className,
  isGraphic = false,
  onRandomizeColors,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  showWalkthrough = true,
}: AwardCategoriesPanelProps) {
  const isAdmin = mode === 'admin';
  const canEdit = isAdmin && onEditCategory;
  const canDelete = isAdmin && onDeleteCategory;
  const canAdd = Boolean(onAddCategory);
  const showCreatedBy = isAdmin;

  return (
    <Card
      className={cn(
        'w-full border-t-4 border-primary shadow-md overflow-hidden',
        isGraphic && 'bg-card/60 backdrop-blur-2xl border-chart-1',
        className,
      )}
    >
      <CardHeader className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="min-w-0">
          <Helper
            content={
              isAdmin
                ? 'Set incentive categories and default point values used when printing coupons or awarding points manually.'
                : 'School and personal categories available for printing coupons and manual awards.'
            }
          >
            <CardTitle className="flex items-center gap-2 text-xl font-black leading-tight sm:text-2xl">
              <Tag className="w-5 h-5 shrink-0 text-destructive" /> Award Categories
            </CardTitle>
          </Helper>
        </div>
        <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {showWalkthrough ? <TabWalkthroughHeaderAction className="shrink-0" /> : null}
          {isAdmin && onRandomizeColors ? (
            <Button
              variant="outline"
              className="min-w-[11rem] flex-1 rounded-xl sm:flex-none"
              onClick={() => void onRandomizeColors()}
            >
              <Palette className="mr-2 h-4 w-4" /> Randomize Colors
            </Button>
          ) : null}
          {canAdd ? (
            <Button onClick={onAddCategory} className="min-w-[9rem] flex-1 rounded-xl sm:flex-none">
              <Plus className="mr-2 h-4 w-4" /> Add Category
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
        <ul className="space-y-2 pr-0 sm:pr-1">
          {categories && categories.length > 0 ? (
            <AdminRecordListHeader
              className={showCreatedBy ? 'hidden md:block' : undefined}
              gridClassName={
                showCreatedBy
                  ? 'grid-cols-[76px_minmax(160px,1fr)_76px_minmax(120px,180px)_44px]'
                  : 'grid-cols-[minmax(160px,1fr)_76px]'
              }
              columns={
                showCreatedBy
                  ? [
                      { label: 'Edit' },
                      { label: 'Category Name' },
                      { label: 'Point Value', className: 'text-center' },
                      { label: 'Created By' },
                      { label: 'Delete', className: 'text-right' },
                    ]
                  : [
                      { label: 'Category Name' },
                      { label: 'Point Value', className: 'text-center' },
                    ]
              }
            />
          ) : null}
          {categories?.map((c) => (
            <li
              key={c.id}
              className={cn(
                'grid items-center gap-2 rounded-xl border bg-secondary/20 px-3 py-3 transition-colors hover:border-primary/20 hover:bg-background sm:gap-3 sm:py-2',
                showCreatedBy
                  ? 'grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[76px_minmax(160px,1fr)_76px_minmax(120px,180px)_44px]'
                  : 'grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(160px,1fr)_76px]',
              )}
            >
              {canEdit ? (
                <div className="order-3 flex items-center md:order-none">
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
              ) : null}
              <div className="order-1 flex min-w-0 items-center gap-3 md:order-none">
                <div className="size-8 rounded-lg flex shrink-0 items-center justify-center border bg-background">
                  <div className="size-4 rounded-full border shadow-sm" style={{ backgroundColor: c.color || '#cccccc' }} />
                </div>
                <span className="truncate text-sm font-bold">{c.name}</span>
              </div>
              <div className="order-2 whitespace-nowrap text-right text-sm font-bold text-primary md:order-none md:text-center">{c.points} pts</div>
              {showCreatedBy ? (
                <div className="order-4 col-span-2 min-w-0 truncate text-xs font-medium text-muted-foreground md:order-none md:col-span-1 md:text-sm">
                  {c.teacherId ? teachers?.find((t) => t.id === c.teacherId)?.name || 'Unknown' : 'Admin'}
                </div>
              ) : null}
              {canDelete ? (
                <div className="order-3 flex items-center justify-end md:order-none">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg"
                    onClick={() => onDeleteCategory(c.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
          {(!categories || categories.length === 0) && (
            <EmptyState
              icon={Tag}
              title="No categories yet"
              description={
                isAdmin
                  ? 'Categories group incentives (for example Kindness, Effort, Homework) and set default point values for printed coupons.'
                  : 'Ask an admin to add school categories, or add your own using Add Category.'
              }
              action={
                canAdd && onAddCategory
                  ? { label: 'Add your first category', icon: Plus, onClick: onAddCategory }
                  : undefined
              }
            />
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
