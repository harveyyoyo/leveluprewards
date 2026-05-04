'use client';

import { Edit, Palette, Plus, Tag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Helper } from '@/components/ui/helper';
import { EmptyState } from '@/components/ui/empty-state';
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
          <Button variant="outline" className="rounded-xl" onClick={onRandomizeColors}>
            <Palette className="mr-2 h-4 w-4" /> Randomize Colors
          </Button>
          <Button onClick={onAddCategory} className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" /> Add Category
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 h-[calc(100vh-22rem)] max-h-[420px] min-h-[250px] overflow-y-auto pr-1">
          {categories?.map((c) => (
            <li
              key={c.id}
              className="flex justify-between items-center bg-secondary/20 p-4 rounded-2xl border hover:border-primary/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: c.color || '#cccccc' }} />
                <div>
                  <p className="font-bold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.points} pts
                    <span className="ml-2 font-medium">
                      • Added by {c.teacherId ? teachers?.find((t) => t.id === c.teacherId)?.name || 'Unknown Teacher' : 'Admin'}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEditCategory(c)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  onClick={() => onDeleteCategory(c.id)}
                >
                  <Trash2 className="w-4 h-4" />
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

