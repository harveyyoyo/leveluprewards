'use client';

import { motion } from 'framer-motion';
import { Castle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { housesRealmOpenHref } from '@/lib/housesRealmUrl';
import { useSettings } from '@/components/providers/SettingsProvider';

export function HousesTabLauncher({ schoolId }: { schoolId: string }) {
  const { settings } = useSettings();
  const housesUrl = housesRealmOpenHref(schoolId);

  if (!settings.enableHouses) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <p className="text-center text-muted-foreground">
          Turn on Houses in Settings to use houses.
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
        className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-600 to-amber-500 shadow-2xl shadow-violet-900/25"
      >
        <Castle className="h-10 w-10 text-white" aria-hidden />
      </motion.div>

      <div className="max-w-md space-y-3">
        <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">Houses</h2>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          Houses runs in its own fullscreen experience — ceremonies, rosters, and Hall of Fame with a
          dedicated look built for presentations.
        </p>
      </div>

      <Button
        asChild
        size="lg"
        className="min-w-[14rem] rounded-full bg-gradient-to-r from-violet-600 to-violet-500 px-8 text-base font-bold shadow-lg hover:from-violet-500 hover:to-violet-400"
      >
        <a href={housesUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="mr-2 h-5 w-5" aria-hidden />
          Open Houses
        </a>
      </Button>

      <p className="text-xs text-muted-foreground">Opens in a new tab</p>
    </div>
  );
}
