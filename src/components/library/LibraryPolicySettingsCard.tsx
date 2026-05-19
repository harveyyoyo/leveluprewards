'use client';

import { BookMarked } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Helper } from '@/components/ui/helper';
import { useSettings } from '@/components/providers/SettingsProvider';
import type { Category } from '@/lib/types';

export function LibraryPolicySettingsCard({ categories }: { categories?: Category[] | null }) {
  const { settings, updateSettings } = useSettings();
  const categoryList = categories ?? [];

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BookMarked className="h-4 w-4 text-primary" />
          Loans &amp; late fees
        </CardTitle>
        <CardDescription>
          Tie overdue books to a points category. Late returns deduct points; optional on-time returns can add points.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="lib-loan-days">Loan period (days)</Label>
          <Input
            id="lib-loan-days"
            type="number"
            min={1}
            max={365}
            value={settings.libraryLoanPeriodDays ?? 14}
            onChange={(e) =>
              updateSettings({ libraryLoanPeriodDays: Math.max(1, parseInt(e.target.value, 10) || 14) })
            }
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Helper content="Points in this category go up or down when books are returned on time or late. Create a “Library” category under Categories if needed.">
            <Label>Points category</Label>
          </Helper>
          <Select
            value={settings.libraryPointsCategoryId || '_none'}
            onValueChange={(v) => updateSettings({ libraryPointsCategoryId: v === '_none' ? undefined : v })}
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">None (no point changes)</SelectItem>
              {categoryList.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} ({c.points > 0 ? `+${c.points}` : c.points} default)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between gap-3 sm:col-span-2 rounded-lg border bg-muted/30 px-3 py-2">
          <div>
            <p className="text-sm font-semibold">Late fees</p>
            <p className="text-xs text-muted-foreground">Deduct points per day overdue on return</p>
          </div>
          <Switch
            checked={settings.libraryLateFeesEnabled !== false}
            onCheckedChange={(v) => updateSettings({ libraryLateFeesEnabled: v })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lib-late-ppd">Late fee (points per day)</Label>
          <Input
            id="lib-late-ppd"
            type="number"
            min={0}
            max={100}
            disabled={settings.libraryLateFeesEnabled === false}
            value={settings.libraryLatePointsPerDay ?? 2}
            onChange={(e) =>
              updateSettings({ libraryLatePointsPerDay: Math.max(0, parseInt(e.target.value, 10) || 0) })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lib-ontime">On-time return bonus (points)</Label>
          <Input
            id="lib-ontime"
            type="number"
            min={0}
            max={500}
            value={settings.libraryOnTimeReturnPoints ?? 0}
            onChange={(e) =>
              updateSettings({ libraryOnTimeReturnPoints: Math.max(0, parseInt(e.target.value, 10) || 0) })
            }
          />
          <p className="text-[10px] text-muted-foreground">0 = disabled</p>
        </div>
      </CardContent>
    </Card>
  );
}
