'use client';

import { motion } from 'framer-motion';
import { useSettings } from '@/components/providers/SettingsProvider';
import { globalAnimatedBackdropActive } from '@/lib/animatedBackdrop';

const NOISE_SVG =
  'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")';

/** Full-viewport portal hub background — rendered outside overflow-hidden `<main>` so edges are not clipped. */
export function PortalChooseBackdrop() {
  const { settings } = useSettings();
  const animBackdrop = globalAnimatedBackdropActive(settings);
  const isBrandAppearance =
    settings.colorScheme === 'default' || settings.colorScheme === 'sapphire';
  const showPortalLocalDecor =
    !animBackdrop &&
    !settings.legacyMode &&
    (isBrandAppearance ||
      (settings.graphicMode === 'graphics' && !!settings.enableAnimatedBackground));

  if (animBackdrop) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 min-h-dvh bg-background"
      aria-hidden
    >
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            'linear-gradient(to right, hsl(var(--primary) / 0.14) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--primary) / 0.1) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_100%_0%,hsl(var(--primary)/0.14),transparent_58%)]" />
      {showPortalLocalDecor ? (
        <>
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: NOISE_SVG }} />
          <motion.div
            animate={{ x: [0, 28, 0], y: [0, -18, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="absolute -right-[12%] -top-[18%] h-[min(580px,70vh)] w-[min(580px,70vw)] rounded-full bg-primary/20 blur-[130px]"
          />
          <motion.div
            animate={{ x: [0, -20, 0], y: [0, 26, 0] }}
            transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
            className="absolute bottom-14 left-16 h-[420px] w-[420px] rounded-full bg-chart-2/20 blur-[135px]"
          />
          <motion.div
            animate={{ x: [0, 18, 0], y: [0, -28, 0] }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            className="absolute top-1/2 left-1/2 h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-chart-3/18 blur-[160px]"
          />
        </>
      ) : null}
    </div>
  );
}
