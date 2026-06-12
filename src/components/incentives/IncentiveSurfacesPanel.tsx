'use client';

import { GraduationCap, Home, Megaphone, Monitor } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Settings } from '@/components/providers/SettingsProvider';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  INCENTIVE_SURFACE_KEYS,
  INCENTIVE_SURFACE_META,
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
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
};

export function IncentiveSurfacesPanel({ settings, updateSettings }: IncentiveSurfacesPanelProps) {
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
          Manage cards on the Manage tab. Turn each surface on or off independently — hallway displays
          and student apps do not have to match.
        </p>
      </div>

      {INCENTIVE_SURFACE_KEYS.map((surface) => {
        const Icon = SURFACE_ICONS[surface];
        const meta = INCENTIVE_SURFACE_META[surface];
        const settingsKey = settingsKeyForIncentiveSurface(surface);
        const checked = incentivesVisibleOnSurface(settings, surface);

        return (
          <motion.div
            key={surface}
            variants={{
              hidden: { opacity: 0, y: 8 },
              visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 420, damping: 32 } },
            }}
            className="flex items-center justify-between gap-4 rounded-2xl border bg-background px-4 py-3"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span
                className={cn(
                  'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-muted/30',
                  checked ? 'text-primary' : 'text-muted-foreground',
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
              checked={checked}
              onCheckedChange={(next) => updateSettings({ [settingsKey]: next })}
              aria-label={`Show incentives on ${meta.label}`}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
};
