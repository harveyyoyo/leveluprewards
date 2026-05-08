'use client';

import { Edit, Loader2, Plus, Trash2, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Helper } from '@/components/ui/helper';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import DynamicIcon from '@/components/DynamicIcon';
import { AdminRecordListHeader } from '@/components/admin/AdminRecordListHeader';

function achievementCriteriaLabel(ach: any) {
  if (ach.criteria.type === 'points') return `>= ${ach.criteria.threshold} current`;
  if (ach.criteria.type === 'lifetimePoints') return `>= ${ach.criteria.threshold} lifetime`;
  if (ach.criteria.type === 'coupons') return `Cat: ${ach.criteria.threshold}`;
  if (ach.criteria.type === 'manual') return 'Manual';
  return '-';
}

export function AdminBonusPointsTab(props: any) {
  const {
    achievementsLoading,
    achievements,
    isAddingSamples,
    setIsAddSampleBadgesOpen,
    setEditingAchievement,
    setIsBadgeModalOpen,
    setAchievementToDelete,
  } = props;

  return (
    <Card className="w-full border-t-4 border-primary shadow-md overflow-hidden">
      <CardHeader className="flex flex-row justify-between items-center py-6">
        <div>
          <Helper content="Define bonus point milestones. When students hit these point thresholds they earn extra bonus points. Enable in Settings > Extra features > Recognition.">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-destructive" /> Bonus Points
            </CardTitle>
          </Helper>
          <CardDescription>Create milestones that award extra points when students reach point thresholds.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsAddSampleBadgesOpen(true)} className="rounded-xl" disabled={isAddingSamples}>
            {isAddingSamples ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trophy className="mr-2 h-4 w-4" />}
            Add sample milestones
          </Button>
          <Button onClick={() => { setEditingAchievement(null); setIsBadgeModalOpen(true); }} className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" /> Add milestone
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {achievementsLoading ? (
          <ul className="space-y-2 pr-1">
            {[1, 2, 3].map((i: number) => (
              <li key={i} className="flex justify-between items-center bg-secondary/20 p-4 rounded-2xl border">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-8 w-20" />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="pr-1 space-y-1">
            {achievements && achievements.length > 0 ? (
              <AdminRecordListHeader
                gridClassName="grid-cols-[76px_minmax(180px,1fr)_minmax(140px,180px)_100px_minmax(90px,120px)_44px]"
                columns={[
                  { label: 'Edit' },
                  { label: 'Milestone Name' },
                  { label: 'Requirement' },
                  { label: 'Bonus Award', className: 'text-center' },
                  { label: 'Tier' },
                  { label: 'Delete', className: 'text-right' },
                ]}
              />
            ) : null}
            {(achievements || []).map((ach: any) => (
              <li
                key={ach.id}
                className="grid grid-cols-[76px_minmax(180px,1fr)_minmax(140px,180px)_100px_minmax(90px,120px)_44px] items-center gap-3 rounded-xl border bg-secondary/20 px-3 py-2 transition-colors hover:border-primary/20 hover:bg-background"
              >
                <div className="flex items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 rounded-lg border-primary/20 bg-background hover:bg-primary/5 text-primary font-semibold"
                    onClick={() => { setEditingAchievement(ach); setIsBadgeModalOpen(true); }}
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                </div>
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="size-8 rounded-lg flex items-center justify-center border shrink-0 bg-background"
                    style={{ borderColor: ach.accentColor || undefined }}
                  >
                    <DynamicIcon name={ach.icon} className="w-4 h-4" style={ach.accentColor ? { color: ach.accentColor } : undefined} />
                  </div>
                  <span className="truncate text-sm font-bold">{ach.name}</span>
                </div>
                <div className="truncate text-sm font-medium text-muted-foreground">{achievementCriteriaLabel(ach)}</div>
                <div className="text-center text-sm font-bold text-primary">
                  {(ach.bonusPoints ?? 0) >= 1 ? `+${ach.bonusPoints} pts` : '-'}
                  {ach.enableWheelSpin ? ' + wheel' : ''}
                </div>
                <div className="truncate text-sm font-medium text-muted-foreground">{ach.tier || '-'}</div>
                <div className="flex items-center justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg"
                    onClick={() => setAchievementToDelete(ach)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </li>
            ))}
            {(!achievements || achievements.length === 0) && (
              <EmptyState
                icon={Trophy}
                title="No milestones yet"
                description="Milestones give students extra bonus points when they hit point thresholds (e.g. +25 pts at 100 total)."
                action={{ label: 'Add first milestone', icon: Plus, onClick: () => { setEditingAchievement?.(null); setIsBadgeModalOpen?.(true); } }}
                secondaryAction={{ label: 'Add samples', onClick: () => setIsAddSampleBadgesOpen?.(true) }}
              />
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
