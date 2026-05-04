'use client';

import { Edit, Loader2, Plus, Trash2, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Helper } from '@/components/ui/helper';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import DynamicIcon from '@/components/DynamicIcon';

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
    <Card className="border-t-4 border-primary shadow-md">
      <CardHeader className="flex flex-row justify-between items-center py-6">
        <div>
          <Helper content="Define bonus point milestones. When students hit these point thresholds they earn extra bonus points. Enable in Settings → Features → Recognition.">
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
          <ul className="space-y-2 h-[calc(100vh-22rem)] max-h-[420px] min-h-[250px] overflow-y-auto pr-1">
            {[1, 2, 3].map((i: number) => (
              <li key={i} className="flex justify-between items-center bg-secondary/20 p-4 rounded-2xl border">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-8 w-20" />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="space-y-2 h-[calc(100vh-22rem)] max-h-[420px] min-h-[250px] overflow-y-auto pr-1">
            {(achievements || []).map((ach: any) => (
              <li key={ach.id} className="flex justify-between items-center bg-secondary/20 p-4 rounded-2xl border hover:border-primary/20 transition-colors">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center border-2 shrink-0"
                    style={{ borderColor: ach.accentColor || undefined, backgroundColor: ach.accentColor ? `${ach.accentColor}20` : undefined }}
                  >
                    <DynamicIcon name={ach.icon} className="w-5 h-5" style={ach.accentColor ? { color: ach.accentColor } : undefined} />
                  </div>
                  <div>
                    <p className="font-bold">{ach.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ach.criteria.type === 'points' && `Current points ≥ ${ach.criteria.threshold}`}
                      {ach.criteria.type === 'lifetimePoints' && `Lifetime points ≥ ${ach.criteria.threshold}`}
                      {ach.criteria.type === 'coupons' && `Category threshold ${ach.criteria.threshold}`}
                      {ach.criteria.type === 'manual' && 'Manual award only'}
                      {ach.tier && ` · ${ach.tier}`}
                      {(ach.bonusPoints ?? 0) >= 1 && ` · +${ach.bonusPoints} bonus pts`}
                      {ach.enableWheelSpin && ` · 🎡 Wheel Spin`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingAchievement(ach); setIsBadgeModalOpen(true); }}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => setAchievementToDelete(ach)}
                  >
                    <Trash2 className="w-4 h-4" />
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

