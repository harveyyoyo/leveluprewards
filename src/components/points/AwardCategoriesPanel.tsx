'use client';

import { useMemo, useState } from 'react';
import { Edit, Plus, Search, Tag, Trash2 } from 'lucide-react';
import { CategoryIconBadge } from '@/components/categories/CategoryIconBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Helper } from '@/components/ui/helper';
import { EmptyState } from '@/components/ui/empty-state';
import { TabWalkthroughHeaderAction } from '@/components/tabWalkthrough/TabWalkthroughContext';
import { Switch } from '@/components/ui/switch';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useCurrency } from '@/hooks/useCurrency';
import { categoryCurrencyIcon } from '@/lib/currency/resolveCategoryCurrency';
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

const categoryRowClassName =
  'flex w-full min-w-0 items-center gap-3 px-3';

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
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const isAdmin = mode === 'admin';
  const rowCanEdit = (c: Category) =>
    Boolean(onEditCategory) && (canEditCategory ? canEditCategory(c) : isAdmin);
  const rowCanDelete = (c: Category) =>
    Boolean(onDeleteCategory) && (canDeleteCategory ? canDeleteCategory(c) : isAdmin);
  const canToggleRow = Boolean(onUpdateCategory) && isAdmin;
  const showCreatedBy = isAdmin;
  const showHouseToggle = settings.enableHouses && canToggleRow;
  const showActions = Boolean(onEditCategory || onDeleteCategory);

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
  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = categories || [];
    if (!query) return list;
    return list.filter((c) => {
      const createdBy = c.teacherId
        ? teachers?.find((t) => t.id === c.teacherId)?.name || ''
        : 'Admin';
      return (
        c.name.toLowerCase().includes(query) ||
        createdBy.toLowerCase().includes(query) ||
        String(c.points ?? '').includes(query)
      );
    });
  }, [categories, search, teachers]);
  const hasAnyCategories = Boolean(categories && categories.length > 0);

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
      <CardContent className="space-y-3 px-4 pb-4 sm:px-6 sm:pb-6">
        {hasAnyCategories ? (
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories…"
              className="h-10 rounded-xl pl-9"
              aria-label="Search categories"
            />
          </div>
        ) : null}
        <ul className="space-y-2 pr-0 sm:pr-1">
          {filteredCategories.length > 0 ? (
            <li
              className={cn(
                categoryRowClassName,
                'hidden py-1.5 text-[9px] font-black uppercase tracking-wide text-secondary-foreground/80 md:flex',
              )}
            >
              <span className="w-72 min-w-0 shrink-0">Category</span>
              <span className="w-[5.5rem] shrink-0">Amount</span>
              {showHouseToggle ? <span className="w-12 shrink-0 text-center">House</span> : null}
              {showCreatedBy ? <span className="ml-auto w-24 shrink-0">Created by</span> : null}
              {showActions ? <span className="w-[6.75rem] shrink-0 text-right"> </span> : null}
            </li>
          ) : null}
          {filteredCategories.map((c) => (
            <li
              key={c.id}
              className={cn(
                categoryRowClassName,
                'rounded-xl border bg-secondary/20 py-3 transition-colors hover:border-primary/20 hover:bg-background sm:py-2',
              )}
            >
              <div className="flex w-72 min-w-0 shrink-0 items-center gap-3">
                <CategoryIconBadge category={c} size="sm" />
                <span className="truncate text-sm font-bold">{c.name}</span>
                {c.showAsIncentive ? (
                  <Badge variant="outline" className="shrink-0 text-[10px] font-bold uppercase tracking-wide">
                    On displays
                  </Badge>
                ) : null}
              </div>
              <div className="w-[5.5rem] shrink-0 text-left text-sm font-bold text-primary">
                <Badge variant="secondary" className="px-2 font-bold tabular-nums">
                  {Number(c.points ?? 0)} {categoryCurrencyIcon(c.currencyOverride, icon)}
                </Badge>
              </div>
              {showHouseToggle ? (
                <div className="flex w-12 shrink-0 items-center justify-center">
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
              {showCreatedBy ? (
                <div className="ml-auto w-24 shrink-0 truncate text-xs font-medium text-muted-foreground md:text-sm">
                  {c.teacherId ? teachers?.find((t) => t.id === c.teacherId)?.name || 'Unknown' : 'Admin'}
                </div>
              ) : null}
              {showActions ? (
                <div className="flex w-[6.75rem] shrink-0 items-center justify-end gap-1">
                  {rowCanEdit(c) ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 rounded-lg border-primary/20 bg-background hover:bg-primary/5 text-primary font-semibold"
                      onClick={() => onEditCategory?.(c)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  ) : null}
                  {rowCanDelete(c) ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg"
                      onClick={() => onDeleteCategory?.(c.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
          {hasAnyCategories && filteredCategories.length === 0 ? (
            <li className="py-8 text-center text-sm text-muted-foreground">
              No categories match “{search.trim()}”.
            </li>
          ) : null}
          {!hasAnyCategories && (
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
