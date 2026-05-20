'use client';

import Link from 'next/link';
import { BookMarked, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Helper } from '@/components/ui/helper';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useAppContext } from '@/components/AppProvider';
import {
  LIBRARY_REWARD_MODE_LABELS,
  resolveLibraryRewardMode,
  type LibraryRewardMode,
} from '@/lib/libraryPolicy';
import type { Category } from '@/lib/types';

export function LibraryPolicySettingsCard({ categories }: { categories?: Category[] | null }) {
  const { schoolId } = useAppContext();
  const { settings, updateSettings } = useSettings();
  const categoryList = categories ?? [];
  const rewardMode = resolveLibraryRewardMode(settings);
  const portalHref = schoolId ? `/${schoolId}/library/self-checkout` : '#';

  const setRewardMode = (mode: LibraryRewardMode) => {
    const updates: Parameters<typeof updateSettings>[0] = { libraryRewardMode: mode };
    if (mode === 'none') {
      updates.libraryLateFeesEnabled = false;
      updates.libraryOnTimeReturnPoints = 0;
    }
    updateSettings(updates);
  };

  return (
    <div className="space-y-4">
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookMarked className="h-4 w-4 text-primary" />
            Loans &amp; returns
          </CardTitle>
          <CardDescription>
            Choose whether late or on-time returns affect fines, school reward points, a separate library balance, or
            nothing at all.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>When books are returned</Label>
            <Select value={rewardMode} onValueChange={(v) => setRewardMode(v as LibraryRewardMode)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(LIBRARY_REWARD_MODE_LABELS) as LibraryRewardMode[]).map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {LIBRARY_REWARD_MODE_LABELS[mode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

          {rewardMode === 'app_points' ? (
            <div className="space-y-2 sm:col-span-2">
              <Helper content="Points in this category go up or down when books are returned on time or late. Create a Library category under Categories if needed.">
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
          ) : null}

          {rewardMode !== 'none' ? (
            <>
              <div className="flex items-center justify-between gap-3 sm:col-span-2 rounded-lg border bg-muted/30 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold">
                    {rewardMode === 'fines' ? 'Late fines' : 'Late deductions'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {rewardMode === 'fines'
                      ? 'Add to the student library fine balance per day overdue'
                      : 'Deduct per calendar day overdue on return'}
                  </p>
                </div>
                <Switch
                  checked={settings.libraryLateFeesEnabled !== false}
                  onCheckedChange={(v) => updateSettings({ libraryLateFeesEnabled: v })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lib-late-ppd">
                  {rewardMode === 'fines' ? 'Fine per day' : 'Late amount per day'}
                </Label>
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
              {rewardMode !== 'fines' ? (
                <div className="space-y-2">
                  <Label htmlFor="lib-ontime">On-time return bonus</Label>
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
              ) : null}
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Student self-checkout portal</CardTitle>
          <CardDescription>
            A full-screen kiosk page: students scan their ID card, then scan each book. Staff need an admin or
            librarian passcode to leave the page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2">
            <div>
              <p className="text-sm font-semibold">Auto library student portal</p>
              <p className="text-xs text-muted-foreground">Enable the dedicated self-checkout URL for a library iPad</p>
            </div>
            <Switch
              checked={settings.libraryAutoStudentPortalEnabled === true}
              onCheckedChange={(v) => updateSettings({ libraryAutoStudentPortalEnabled: v })}
            />
          </div>
          {settings.libraryAutoStudentPortalEnabled && schoolId ? (
            <Button variant="outline" className="rounded-xl w-full sm:w-auto" asChild>
              <Link href={portalHref} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open self-checkout portal
              </Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
