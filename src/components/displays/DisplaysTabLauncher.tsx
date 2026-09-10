'use client';

import { motion } from 'framer-motion';
import { ExternalLink, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/components/providers/SettingsProvider';
import { displaysFeatureEnabled, displaysRealmOpenHref } from '@/lib/displays/displayRoutes';
import { openStandalonePage } from '@/lib/openStandalonePage';

export function DisplaysTabLauncher({ schoolId }: { schoolId: string }) {
  const { settings } = useSettings();
  const displaysOn = displaysFeatureEnabled(settings);
  const displaysUrl = displaysRealmOpenHref(schoolId);

  if (!displaysOn) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <p className="text-center text-muted-foreground">
          Turn on Displays in Settings to build hallway screens and launch them on a TV.
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
        className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-600 to-indigo-500 shadow-2xl shadow-sky-900/20"
      >
        <Monitor className="h-10 w-10 text-white" aria-hidden />
      </motion.div>

      <div className="max-w-md space-y-3">
        <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">Displays</h2>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          Displays opens in its own studio — Hall of Fame, Smart Screen, and bulletin boards you can
          theme and send to a TV.
        </p>
      </div>

      <Button
        asChild
        size="lg"
        className="min-w-[14rem] rounded-full bg-gradient-to-r from-sky-700 to-indigo-600 px-8 text-base font-bold text-white shadow-lg hover:from-sky-600 hover:to-indigo-500"
      >
        <a href={displaysUrl} onClick={(event) => openStandalonePage(displaysUrl, event)}>
          <ExternalLink className="mr-2 h-5 w-5" aria-hidden />
          Open Displays
        </a>
      </Button>

      <p className="text-xs text-muted-foreground">Opens as its own page</p>
    </div>
  );
}
