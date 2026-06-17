'use client';

import { useMemo } from 'react';
import { collection, doc, query, updateDoc } from 'firebase/firestore';
import { GraduationCap, Home, Megaphone, Monitor } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Settings } from '@/components/providers/SettingsProvider';
import { Switch } from '@/components/ui/switch';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { BulletinBoardIncentiveRecord } from '@/lib/bulletinBoard';
import { cn } from '@/lib/utils';
import {
  INCENTIVE_SURFACE_KEYS,
  INCENTIVE_SURFACE_META,
  incentiveAssignedToSurface,
  incentivesVisibleOnSurface,
  settingsKeyForIncentiveSurface,
  type IncentiveSurfaceKey,
} from '@/lib/incentives/incentiveSurfaces';

const SURFACE_ICONS: Record<IncentiveSurfaceKey, typeof Megaphone> = {
  bulletinBoard: Megaphone,
  smartScreen: Monitor,
  studentKiosk: GraduationCap,
  studentPortal: Home,
};

type IncentiveSurfacesPanelProps = {
  schoolId: string;
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
};

export function IncentiveSurfacesPanel({ schoolId, settings, updateSettings }: IncentiveSurfacesPanelProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const incentivesQuery = useMemoFirebase(
    () => (schoolId ? query(collection(firestore, 'schools', schoolId, 'bulletinBoardIncentives')) : null),
    [firestore, schoolId],
  );
  const { data: incentives, isLoading } = useCollection<BulletinBoardIncentiveRecord>(incentivesQuery);

  const sortedIncentives = useMemo(() => {
    if (!incentives?.length) return [];
    return [...incentives].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }, [incentives]);

  const handleSurfaceAssignment = async (
    incentive: BulletinBoardIncentiveRecord,
    surface: IncentiveSurfaceKey,
    next: boolean,
  ) => {
    if (!schoolId || !firestore || !incentive.id) return;
    try {
      const currentSurfaces = { ...(incentive.surfaces ?? {}) };
      if (next) {
        currentSurfaces[surface] = true;
      } else {
        delete currentSurfaces[surface];
      }
      await updateDoc(doc(firestore, 'schools', schoolId, 'bulletinBoardIncentives', incentive.id), {
        surfaces: currentSurfaces,
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: 'Could not change where this incentive appears.',
      });
    }
  };

  return (
    <motion.div
      className="space-y-4"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.06 } },
      }}
    >
      <div className="rounded-2xl border bg-muted/10 p-4">
        <p className="text-sm font-bold">Where students see incentives</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Turn each surface on or off, then add or remove individual incentives from that surface.
          Create incentives on the Manage tab first.
        </p>
      </div>

      {INCENTIVE_SURFACE_KEYS.map((surface) => {
        const Icon = SURFACE_ICONS[surface];
        const meta = INCENTIVE_SURFACE_META[surface];
        const settingsKey = settingsKeyForIncentiveSurface(surface);
        const surfaceEnabled = incentivesVisibleOnSurface(settings, surface);
        const assignedCount = sortedIncentives.filter((item) =>
          incentiveAssignedToSurface(item, surface),
        ).length;

        return (
          <motion.div
            key={surface}
            variants={{
              hidden: { opacity: 0, y: 8 },
              visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 420, damping: 32 } },
            }}
            className="overflow-hidden rounded-2xl border bg-background"
          >
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={cn(
                    'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-muted/30',
                    surfaceEnabled ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold">{meta.label}</p>
                  <p className="text-xs text-muted-foreground">{meta.description}</p>
                </div>
              </div>
              <Switch
                checked={surfaceEnabled}
                onCheckedChange={(next) => updateSettings({ [settingsKey]: next })}
                aria-label={`Show incentives on ${meta.label}`}
              />
            </div>

            <div
              className={cn(
                'border-t px-4 py-3',
                !surfaceEnabled && 'pointer-events-none opacity-50',
              )}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Assigned incentives
                </p>
                <span className="rounded-full border bg-muted/30 px-2 py-0.5 text-[10px] font-black">
                  {assignedCount}
                </span>
              </div>

              {isLoading ? (
                <p className="py-4 text-center text-xs text-muted-foreground">Loading incentives...</p>
              ) : sortedIncentives.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  No incentives yet. Create them on the Manage tab.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {sortedIncentives.map((incentive) => {
                    const assigned = incentiveAssignedToSurface(incentive, surface);
                    return (
                      <li
                        key={`${surface}-${incentive.id}`}
                        className="flex items-center justify-between gap-3 rounded-xl border bg-muted/10 px-3 py-2"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="shrink-0 text-lg" role="img" aria-hidden>
                            {incentive.icon || '🎯'}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">{incentive.title}</p>
                            <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                              +{Number(incentive.points) || 0} pts
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={assigned}
                          onCheckedChange={(next) => void handleSurfaceAssignment(incentive, surface, next)}
                          aria-label={`${assigned ? 'Remove' : 'Add'} ${incentive.title} on ${meta.label}`}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
