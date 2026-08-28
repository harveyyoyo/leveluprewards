'use client';

import { useState } from 'react';
import { Edit, Plus, Tag, Trash2 } from 'lucide-react';
import { CategoryIconBadge } from '@/components/categories/CategoryIconBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Helper } from '@/components/ui/helper';
import { EmptyState } from '@/components/ui/empty-state';
import { AdminRecordListHeader } from '@/components/admin/AdminRecordListHeader';
import { TabWalkthroughHeaderAction } from '@/components/tabWalkthrough/TabWalkthroughContext';
import { Switch } from '@/components/ui/switch';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useCurrency } from '@/hooks/useCurrency';
import type { Category, Teacher } from '@/lib/types';
import { cn } from '@/lib/utils';

export type AwardCategoriesPanelProps = {
  categories: Category[] | null | undefined;
  teachers?: Teacher[] | null | undefined;
  mode?: 'admin' | 'teacher';
  className?: string;
  isGraphic?: boolean;
  onAddCategory?: () => void;
  onEditCategory?: (category: Category) => void;
  onDeleteCategory?: (categoryId: string) => void;
  onUpdateCategory?: (category: Category) => void | Promise<void>;
  /** When set, only matching rows show edit (overrides admin-only edit). */
  canEditCategory?: (category: Category) => boolean;
  canDeleteCategory?: (category: Category) => boolean;
  showWalkthrough?: boolean;
};

function categoryListGridColumns(showCreatedBy: boolean, showHouseToggle: boolean): string {
  if (!showCreatedBy) {
    return showHouseToggle
      ? 'minmax(160px,1fr) 88px 3.25rem 3.25rem'
      : 'minmax(160px,1fr) 88px 3.25rem';
  }
  const base = '76px minmax(160px,1fr) 88px';
  const toggles = showHouseToggle ? ' 3.25rem 3.25rem' : ' 3.25rem';
  return `${base}${toggles} minmax(120px,180px) 44px`;
}

export function AwardCategoriesPanel({
  categories,
  teachers,
  mode = 'admin',
  className,
  isGraphic = false,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onUpdateCategory,
  canEditCategory,
  canDeleteCategory,
  showWalkthrough = true,
}: AwardCategoriesPanelProps) {
  const { settings } = useSettings();
  const { icon, label } = useCurrency();
  const [busyId, setBusyId] = useState<string | null>(null);
  const isAdmin = mode === 'admin';
  const rowCanEdit = (c: Category) =>
    Boolean(onEditCategory) && (canEditCategory ? canEditCategory(c) : isAdmin);
  const rowCanDelete = (c: Category) =>
    Boolean(onDeleteCategory) && (canDeleteCategory ? canDeleteCategory(c) : isAdmin);
  const canToggleRow = Boolean(onUpdateCategory) && isAdmin;
  const showCreatedBy = isAdmin;
  const showHouseToggle = settings.enableHouses && canToggleRow;
  const listGrid = categoryListGridColumns(showCreatedBy, showHouseToggle);

  const patchCategory = async (category: Category, patch: Partial<Category>) => {
    if (!onUpdateCategory) return;
    setBusyId(category.id);
    try {
      await onUpdateCategory({ ...category, ...patch });
    } finally {
      setBusyId(null);
    }
  };

  const canAdd = Boolean(onAddCategory);

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
                ? `Set incentive categories and default ${label.toLowerCase()} values used when printing coupons or awarding ${label.toLowerCase()} manually.`
                : `Create teacher-specific categories and default ${label.toLowerCase()} values for your classes.`
            }
          >
            <CardTitle className="flex items-center gap-2 text-xl font-black leading-tight sm:text-2xl">
              <Tag className="w-5 h-5 shrink-0 text-destructive" /> Categories
            </CardTitle>
          </Helper>
        </div>
        <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {showWalkthrough ? <TabWalkthroughHeaderAction className="shrink-0" /> : null}
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
              gridClassName={listGrid}
              columns={
                showCreatedBy
                  ? [
                      { label: 'Edit' },
                      { label: 'Category Name' },
                      { label: label, className: 'text-center' },
                      ...(showHouseToggle ? [{ label: 'House', className: 'text-center' as const }] : []),
                      { label: 'Golden', className: 'text-center' },
                      { label: 'Created By' },
                      { label: 'Delete', className: 'text-right' },
                    ]
                  : [
                      { label: 'Category Name' },
                      { label: label, className: 'text-center' },
                      ...(showHouseToggle ? [{ label: 'House', className: 'text-center' as const }] : []),
                      { label: 'Golden', className: 'text-center' },
                    ]
              }
            />
          ) : null}
          {categories?.map((c) => (
            <li
              key={c.id}
              className={cn(
                'grid items-center gap-2 rounded-xl border bg-secondary/20 px-3 py-3 transition-colors hover:border-primary/20 hover:bg-background sm:gap-3 sm:py-2',
              )}
              style={{ gridTemplateColumns: listGrid }}
            >
              {rowCanEdit(c) ? (
                <div className="order-3 flex items-center md:order-none">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 rounded-lg border-primary/20 bg-background hover:bg-primary/5 text-primary font-semibold"
                    onClick={() => onEditCategory?.(c)}
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                </div>
              ) : null}
              <div className="order-1 flex min-w-0 items-center gap-3 md:order-none">
                <CategoryIconBadge category={c} size="sm" />
                <span className="truncate text-sm font-bold">{c.name}</span>
              </div>
              <div className="order-2 whitespace-nowrap text-right text-sm font-bold text-primary md:order-none md:text-center">
                <Badge variant="secondary" className="px-2 font-bold tabular-nums">
                  {c.points} {icon}
                </Badge>
              </div>
              {showHouseToggle ? (
                <div className="order-4 flex items-center justify-center md:order-none">
                  <Switch
                    checked={c.countsForHousePoints !== false}
                    disabled={busyId === c.id}
                    onCheckedChange={(checked) =>
                      void patchCategory(c, { countsForHousePoints: checked })
                    }
                    aria-label={`${c.name} counts toward house ${label.toLowerCase()}`}
                  />
                </div>
              ) : null}
              {canToggleRow ? (
                <div className="order-5 flex items-center justify-center md:order-none">
                  <Switch
                    checked={c.isGoldenTicket === true}
                    disabled={busyId === c.id}
                    onCheckedChange={(checked) =>
                      void patchCategory(c, { isGoldenTicket: checked || undefined })
                    }
                    aria-label={`${c.name} golden ticket`}
                  />
                </div>
              ) : null}
              {showCreatedBy ? (
                <div className="order-6 col-span-2 min-w-0 truncate text-xs font-medium text-muted-foreground md:order-none md:col-span-1 md:text-sm">
                  {c.teacherId ? teachers?.find((t) => t.id === c.teacherId)?.name || 'Unknown' : 'Admin'}
                </div>
              ) : null}
              {rowCanDelete(c) ? (
                <div className="order-3 flex items-center justify-end md:order-none">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg"
                    onClick={() => onDeleteCategory?.(c.id)}
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
