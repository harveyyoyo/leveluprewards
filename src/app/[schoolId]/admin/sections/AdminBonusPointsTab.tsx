'use client';

import { useEffect, useRef, useState } from 'react';
import { Edit, Loader2, Plus, Sparkles, Trash2, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  StaffPortalSectionCard,
  StaffPortalSectionCardContent,
  StaffPortalSectionCardHeader,
  StaffPortalSectionCardTitle,
} from '@/components/staff/StaffPortalSection';
import { StaffPortalTabPanel } from '@/components/staff/StaffPortalTabHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import DynamicIcon from '@/components/DynamicIcon';
import { AdminRecordListHeader } from '@/components/admin/AdminRecordListHeader';
import { TabWalkthroughHeaderAction } from '@/components/tabWalkthrough/TabWalkthroughContext';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore } from '@/firebase';
import { updateAchievement, addAchievement } from '@/lib/db/achievements';
import { SAMPLE_BADGES } from '@/lib/sampleBadges';
import type { Achievement } from '@/lib/types';

export function AdminBonusPointsTab(props: any) {
  const {
    achievementsLoading,
    achievements,
    setEditingAchievement,
    setIsBadgeModalOpen,
    setAchievementToDelete,
  } = props;

  const { settings, updateSettings } = useSettings();
  const { schoolId, categories = [] } = useAppContext();
  const firestore = useFirestore();

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const autoSeededRef = useRef(false);

  // Auto-seed starter sample milestones once if the list is empty
  useEffect(() => {
    if (
      !achievementsLoading &&
      Array.isArray(achievements) &&
      achievements.length === 0 &&
      !settings.achievementsStarterSeeded &&
      !autoSeededRef.current &&
      firestore &&
      schoolId
    ) {
      autoSeededRef.current = true;
      (async () => {
        try {
          for (const sample of SAMPLE_BADGES) {
            await addAchievement(firestore, schoolId, { ...sample, enabled: true });
          }
          await updateSettings({ achievementsStarterSeeded: true });
        } catch (err) {
          console.error('Failed to auto-seed starter milestones:', err);
        }
      })();
    }
  }, [achievementsLoading, achievements, settings.achievementsStarterSeeded, firestore, schoolId, updateSettings]);

  const handleToggleAchievement = async (ach: Achievement) => {
    if (!firestore || !schoolId || togglingId) return;
    setTogglingId(ach.id);
    try {
      const nextEnabled = ach.enabled === false ? true : false;
      await updateAchievement(firestore, schoolId, { ...ach, enabled: nextEnabled });
    } catch (err) {
      console.error('Failed to toggle milestone:', err);
    } finally {
      setTogglingId(null);
    }
  };

  const isSystemActive = settings.enableAchievements === true;

  const getCategoryName = (catId?: string) => {
    if (!catId) return 'Category';
    const match = categories.find((c: any) => c.id === catId);
    return match ? match.name : 'Category';
  };

  const renderAchievementCriteria = (ach: any) => {
    const criteria = ach?.criteria;
    if (!criteria) return <span>-</span>;
    const thresh = criteria.threshold ?? 0;

    if (criteria.type === 'coupons') {
      const catName = getCategoryName(criteria.categoryId);
      return (
        <div className="flex flex-col">
          <span className="font-semibold text-xs text-foreground truncate">{thresh} in {catName}</span>
          <span className="text-[10px] text-muted-foreground font-medium">Category goal</span>
        </div>
      );
    }

    // Default & lifetime: All-Time Points
    return (
      <div className="flex flex-col">
        <span className="font-semibold text-xs text-foreground">{thresh} all-time pts</span>
        <span className="text-[10px] text-muted-foreground font-medium">Total earned all-time</span>
      </div>
    );
  };

  return (
    <StaffPortalTabPanel
      tabValue="bonuspoints"
      subtitle="Students earn extra bonus points and prize wheel spins when reaching all-time point targets."
      trailing={
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Master ON / OFF Switch in top header */}
          <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/80 px-3 py-1.5 shadow-sm">
            <span className="text-xs font-bold text-muted-foreground">Bonus System</span>
            <Badge
              variant={isSystemActive ? 'default' : 'secondary'}
              className="text-[10px] font-bold uppercase tracking-wider h-5 px-1.5"
            >
              {isSystemActive ? 'ON' : 'OFF'}
            </Badge>
            <Switch
              checked={isSystemActive}
              onCheckedChange={(checked) => updateSettings({ enableAchievements: checked })}
              aria-label="Toggle bonus milestones system"
              className="scale-90"
            />
          </div>

          <TabWalkthroughHeaderAction />
          <Button
            onClick={() => {
              setEditingAchievement(null);
              setIsBadgeModalOpen(true);
            }}
            className="rounded-xl"
          >
            <Plus className="mr-2 h-4 w-4" /> New milestone
          </Button>
        </div>
      }
    >
      <div className="space-y-4 w-full">
        {/* Milestones List Card */}
        <StaffPortalSectionCard className="w-full overflow-hidden">
          <StaffPortalSectionCardContent>
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
              <ul className="overflow-x-auto pb-2 pr-1 space-y-1.5">
                {achievements && achievements.length > 0 ? (
                  <AdminRecordListHeader
                    className="min-w-[800px]"
                    gridClassName="grid-cols-[64px_68px_minmax(180px,1fr)_minmax(150px,190px)_110px_minmax(80px,100px)_44px]"
                    columns={[
                      { label: 'Status' },
                      { label: 'Edit' },
                      { label: 'Milestone' },
                      { label: 'Requirement (How to Earn)' },
                      { label: 'Bonus Award', className: 'text-center' },
                      { label: 'Tier' },
                      { label: 'Delete', className: 'text-right' },
                    ]}
                  />
                ) : null}
                {(achievements || []).map((ach: any) => {
                  const isRowActive = ach.enabled !== false;
                  return (
                    <li
                      key={ach.id}
                      className={`grid grid-cols-[64px_68px_minmax(180px,1fr)_minmax(150px,190px)_110px_minmax(80px,100px)_44px] items-center gap-3 rounded-xl border bg-secondary/20 px-3 py-2.5 transition-colors hover:border-primary/20 hover:bg-background ${
                        !isRowActive ? 'opacity-60 bg-muted/30' : ''
                      }`}
                    >
                      {/* ON/OFF Switch */}
                      <div className="flex items-center">
                        <Switch
                          checked={isRowActive}
                          disabled={togglingId === ach.id}
                          onCheckedChange={() => void handleToggleAchievement(ach)}
                          title={isRowActive ? 'Active — click to pause' : 'Paused — click to activate'}
                          className="scale-90"
                        />
                      </div>

                      {/* Edit Button */}
                      <div className="flex items-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-11 gap-1 rounded-lg border-primary/20 bg-background text-xs font-semibold text-primary hover:bg-primary/5"
                          onClick={() => {
                            setEditingAchievement(ach);
                            setIsBadgeModalOpen(true);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                          Edit
                        </Button>
                      </div>

                      {/* Milestone Name & Icon */}
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div
                          className="size-8 rounded-lg flex items-center justify-center border shrink-0 bg-background"
                          style={{ borderColor: ach.accentColor || undefined }}
                        >
                          <DynamicIcon
                            name={ach.icon}
                            className="w-4 h-4"
                            style={ach.accentColor ? { color: ach.accentColor } : undefined}
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="truncate block text-sm font-bold leading-tight">{ach.name}</span>
                          <span className="text-[10px] text-muted-foreground truncate block leading-tight">
                            {ach.description}
                          </span>
                        </div>
                      </div>

                      {/* Requirement (2-line clean copy) */}
                      <div className="truncate text-sm font-medium">
                        {renderAchievementCriteria(ach)}
                      </div>

                      {/* Bonus Award */}
                      <div className="text-center text-xs font-bold text-primary flex flex-col items-center justify-center">
                        <span>{(ach.bonusPoints ?? 0) >= 1 ? `+${ach.bonusPoints} pts` : '-'}</span>
                        {ach.enableWheelSpin ? (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold flex items-center gap-0.5">
                            🎡 Spin Wheel
                          </span>
                        ) : null}
                      </div>

                      {/* Tier */}
                      <div className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {ach.tier || '-'}
                      </div>

                      {/* Delete */}
                      <div className="flex items-center justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-11 rounded-lg text-destructive hover:bg-destructive/10"
                          onClick={() => setAchievementToDelete(ach)}
                          title="Delete milestone"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
                {(!achievements || achievements.length === 0) && (
                  <EmptyState
                    icon={Trophy}
                    title="No milestones yet"
                    description="Milestones give students extra bonus points and prize wheel spins when reaching all-time point targets."
                    action={{
                      label: 'Create milestone',
                      icon: Plus,
                      onClick: () => {
                        setEditingAchievement?.(null);
                        setIsBadgeModalOpen?.(true);
                      },
                    }}
                  />
                )}
              </ul>
            )}
          </StaffPortalSectionCardContent>
        </StaffPortalSectionCard>
      </div>
    </StaffPortalTabPanel>
  );
}
