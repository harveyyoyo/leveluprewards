'use client';

import { Award, Edit, Loader2, Plus, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Helper } from '@/components/ui/helper';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import DynamicIcon from '@/components/DynamicIcon';
import { AutoCircularToggles } from '@/components/AutoCircularToggles';

export function AdminBadgesTab(props: any) {
  const {
    categories,
    badgesLoading,
    badges,
    students,
    badgeTogglingId,
    setBadgeTogglingId,
    onToggleBadge,
    setBadgeEarnersFor,
    setEditingCategoryBadge,
    setIsCategoryBadgeModalOpen,
    setCategoryBadgeToDelete,
    setEditingCategoryBadgeNull,
    setIsAddSampleCategoryBadgesOpen,
    isAddingSampleCategoryBadges,
  } = props;

  return (
    <Card className="border-t-4 border-primary shadow-md">
      <CardHeader className="flex flex-row justify-between items-center py-6">
        <div>
          <Helper content="Define badges students earn by reaching a points threshold in a category within a time period (e.g. Good Behavior badge for 50 points this month).">
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-destructive" /> Badges
            </CardTitle>
          </Helper>
          <CardDescription>Category-based badges. Enable in Settings → Features → Recognition → Badges.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => { setEditingCategoryBadgeNull(); setIsCategoryBadgeModalOpen(true); }} className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" /> Add badge
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsAddSampleCategoryBadgesOpen(true)}
            className="rounded-xl"
            disabled={isAddingSampleCategoryBadges || !categories?.length}
          >
            {isAddingSampleCategoryBadges ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Award className="mr-2 h-4 w-4" />}
            Add sample badges
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {badgesLoading ? (
          <ul className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {[1, 2, 3].map((i: number) => (
              <li key={i} className="flex justify-between items-center bg-secondary/20 p-4 rounded-2xl border">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-8 w-20" />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {(badges || []).map((b: any) => {
              const cat = categories?.find((c: any) => c.id === b.categoryId);
              const periodLabel = b.period === 'month' ? 'This month' : b.period === 'semester' ? 'This semester' : b.period === 'year' ? 'This year' : 'All time';
              const isToggling = badgeTogglingId === b.id;
              const earnersCount = (students || []).filter((s: any) => s.earnedBadges?.some((e: any) => e.badgeId === b.id)).length;
              return (
                <li
                  key={b.id}
                  className={cn(
                    'flex justify-between items-center p-4 rounded-2xl border transition-colors',
                    b.enabled === false ? 'bg-muted/30 opacity-75' : 'bg-secondary/20 hover:border-primary/20'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center border-2 shrink-0"
                      style={{ borderColor: b.accentColor || undefined, backgroundColor: b.accentColor ? `${b.accentColor}20` : undefined }}
                    >
                      <DynamicIcon name={b.icon} className="w-5 h-5" style={b.accentColor ? { color: b.accentColor } : undefined} />
                    </div>
                    <div>
                      <p className="font-bold">{b.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {cat?.name ?? 'Unknown'} · {b.pointsRequired} pts · {periodLabel}
                        {b.tier && ` · ${b.tier}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      {isToggling ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      ) : (
                        <AutoCircularToggles
                          record={{ ...b, enabled: b.enabled !== false }}
                          defs={[{ key: 'enabled', label: 'Enabled', shortLabel: 'ACT' }]}
                          onToggle={async (key, val) => {
                            setBadgeTogglingId(b.id);
                            try {
                              await onToggleBadge(b, val);
                            } finally {
                              setBadgeTogglingId(null);
                            }
                          }}
                        />
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 text-muted-foreground"
                      onClick={() => setBadgeEarnersFor(b)}
                      title="Who earned this badge"
                    >
                      <Users className="h-4 w-4" />
                      {earnersCount}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => { setEditingCategoryBadge(b); setIsCategoryBadgeModalOpen(true); }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => setCategoryBadgeToDelete(b)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
            {(!badges || badges.length === 0) && (
              <EmptyState
                icon={Award}
                title="No badges yet"
                description="Badges reward milestones — e.g. a Good Behavior badge for earning 50 points this month."
                action={{ label: 'Add your first badge', icon: Plus, onClick: () => { setEditingCategoryBadgeNull?.(); setIsCategoryBadgeModalOpen?.(true); } }}
                secondaryAction={{ label: 'Add samples', onClick: () => setIsAddSampleCategoryBadgesOpen?.(true) }}
              />
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

