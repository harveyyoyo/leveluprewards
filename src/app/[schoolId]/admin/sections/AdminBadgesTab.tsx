'use client';

import { Award, Edit, Loader2, Plus, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  StaffPortalSectionCard,
  StaffPortalSectionCardContent,
  StaffPortalSectionCardHeader,
  StaffPortalSectionCardTitle,
} from '@/components/staff/StaffPortalSection';
import { Helper } from '@/components/ui/helper';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import DynamicIcon from '@/components/DynamicIcon';
import { AutoCircularToggles } from '@/components/admin/AutoCircularToggles';
import { AdminRecordListHeader } from '@/components/admin/AdminRecordListHeader';
import { TabWalkthroughHeaderAction } from '@/components/tabWalkthrough/TabWalkthroughContext';

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
    <StaffPortalSectionCard className="w-full overflow-hidden">
      <StaffPortalSectionCardHeader className="flex flex-row justify-between items-center py-6">
        <div>
          <Helper content="Define badges students earn by reaching a points threshold in a category within a time period (e.g. Good Behavior badge for 50 points this month).">
            <StaffPortalSectionCardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" /> Badges
            </StaffPortalSectionCardTitle>
          </Helper>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TabWalkthroughHeaderAction />
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
      </StaffPortalSectionCardHeader>
      <StaffPortalSectionCardContent>
        {badgesLoading ? (
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
            {badges && badges.length > 0 ? (
              <AdminRecordListHeader
                gridClassName="grid-cols-[76px_minmax(180px,1fr)_minmax(120px,160px)_82px_minmax(100px,140px)_70px_84px]"
                columns={[
                  { label: 'Edit' },
                  { label: 'Badge Name' },
                  { label: 'Reward Category' },
                  { label: 'Points Needed', className: 'text-center' },
                  { label: 'Earn Period' },
                  { label: 'Students Earned', className: 'text-center' },
                  { label: 'Status / Delete', className: 'text-right' },
                ]}
              />
            ) : null}
            {(badges || []).map((b: any) => {
              const cat = categories?.find((c: any) => c.id === b.categoryId);
              const periodLabel = b.period === 'month' ? 'This month' : b.period === 'semester' ? 'This semester' : b.period === 'year' ? 'This year' : 'All time';
              const isToggling = badgeTogglingId === b.id;
              const earnersCount = (students || []).filter((s: any) => s.earnedBadges?.some((e: any) => e.badgeId === b.id)).length;
              return (
                <li
                  key={b.id}
                  className={cn(
                    'grid grid-cols-[76px_minmax(180px,1fr)_minmax(120px,160px)_82px_minmax(100px,140px)_70px_84px] items-center gap-3 rounded-xl border px-3 py-2 transition-colors',
                    b.enabled === false ? 'bg-muted/30 opacity-75' : 'bg-secondary/20 hover:border-primary/20 hover:bg-background'
                  )}
                >
                  <div className="flex items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 rounded-lg border-primary/20 bg-background hover:bg-primary/5 text-primary font-semibold"
                      onClick={() => { setEditingCategoryBadge(b); setIsCategoryBadgeModalOpen(true); }}
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  </div>
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 bg-background"
                      style={{ borderColor: b.accentColor || undefined }}
                    >
                      <DynamicIcon name={b.icon} className="w-4 h-4" style={b.accentColor ? { color: b.accentColor } : undefined} />
                    </div>
                    <span className="truncate text-sm font-bold">{b.name}</span>
                  </div>
                  <div className="truncate text-sm font-medium text-muted-foreground">{cat?.name ?? 'Unknown'}</div>
                  <div className="text-center text-sm font-bold text-primary">{b.pointsRequired} pts</div>
                  <div className="truncate text-sm font-medium text-muted-foreground">{b.tier ? `${periodLabel} / ${b.tier}` : periodLabel}</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 justify-center gap-1.5 text-muted-foreground hover:bg-muted rounded-lg"
                    onClick={() => setBadgeEarnersFor(b)}
                    title="Who earned this badge"
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span className="text-xs font-bold">{earnersCount}</span>
                  </Button>
                  <div className="flex items-center justify-end gap-1">
                    <div className="flex items-center">
                      {isToggling ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-3" />
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
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg"
                      onClick={() => setCategoryBadgeToDelete(b)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </li>
              );
            })}

            {(!badges || badges.length === 0) && (
              <EmptyState
                icon={Award}
                title="No badges yet"
                description="Badges reward milestones, e.g. a Good Behavior badge for earning 50 points this month."
                action={{ label: 'Add your first badge', icon: Plus, onClick: () => { setEditingCategoryBadgeNull?.(); setIsCategoryBadgeModalOpen?.(true); } }}
                secondaryAction={{ label: 'Add samples', onClick: () => setIsAddSampleCategoryBadgesOpen?.(true) }}
              />
            )}
          </ul>
        )}
      </StaffPortalSectionCardContent>
    </StaffPortalSectionCard>
  );
}
