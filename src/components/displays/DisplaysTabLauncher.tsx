'use client';

import { motion } from 'framer-motion';
import { ExternalLink, MonitorPlay } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/components/providers/SettingsProvider';
import { displaysFeatureEnabled, displaysRealmOpenHref } from '@/lib/displays/displayRoutes';

export function DisplaysTabLauncher({ schoolId }: { schoolId: string }) {
  const { settings } = useSettings();
  const displaysOn = displaysFeatureEnabled(settings);
  const displaysUrl = displaysRealmOpenHref(schoolId);

  if (!displaysOn) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <p className="text-center text-muted-foreground">
          Turn on Displays in Settings to configure Hall of Fame, Smart Screen, and the bulletin board.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[min(70vh,640px)] flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-600 to-indigo-500 shadow-2xl shadow-indigo-900/20"
      >
        <MonitorPlay className="h-10 w-10 text-white" aria-hidden />
      </motion.div>

      <div className="max-w-md space-y-3">
        <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
          Displays
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          Smart Screen, the bulletin board, and Hall of Fame live in their own display space —
          configure them and launch any of them fullscreen on your hallway monitor.
        </p>
      </div>

      <Button
        asChild
        size="lg"
        className="min-w-[14rem] rounded-full bg-gradient-to-r from-sky-700 to-indigo-600 px-8 text-base font-bold shadow-lg hover:from-sky-600 hover:to-indigo-500"
      >
        <a href={displaysUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="mr-2 h-5 w-5" aria-hidden />
          Open Displays
        </a>
      </Button>

      <p className="text-xs text-muted-foreground">Opens in a new tab</p>
    </div>
  );
}
