'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { FlyerSnapshotPreview } from '@/components/marketing/FlyerSnapshotPreview';
import { buttonVariants } from '@/components/ui/button';
import {
  FLYER_VISUAL_THEME_LABELS,
  flyerSupportsClassic,
  resolveFlyerHref,
  type FlyerVisualTheme,
} from '@/lib/marketingFlyerThemes';
import {
  FLYER_AUDIENCE_LABELS,
  FLYER_AUDIENCE_ORDER,
  getPromotionFlyersByAudience,
  type FlyerAudience,
  type PromotionFlyer,
} from '@/lib/marketingPromotions';
import { cn } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';

const THEME_OPTIONS: readonly FlyerVisualTheme[] = ['bold', 'classic'];

function FlyerCard({
  flyer,
  theme,
}: {
  flyer: PromotionFlyer;
  theme: FlyerVisualTheme;
}) {
  const href = resolveFlyerHref(flyer, theme);
  const classicOnly = theme === 'classic';
  const hasClassic = flyerSupportsClassic(flyer);

  return (
    <article
      className={cn(
        'group flex flex-col overflow-hidden rounded-3xl border bg-white/[0.02] backdrop-blur-md transition-all duration-300 hover:bg-white/[0.04]',
        flyer.preview.border,
        classicOnly && !hasClassic && 'opacity-40',
      )}
    >
      <FlyerSnapshotPreview
        href={href}
        title={flyer.name}
        tag={classicOnly && hasClassic ? 'Classic' : flyer.preview.tag}
      />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-black text-white">{flyer.name}</h3>
          <span className="rounded-full border border-white/[0.1] bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            {classicOnly && hasClassic
              ? FLYER_VISUAL_THEME_LABELS.classic
              : FLYER_VISUAL_THEME_LABELS.bold}
          </span>
        </div>
        <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-400">{flyer.description}</p>
        {classicOnly && !hasClassic ? (
          <p className="mt-2 text-xs text-amber-200/80">Original layout not archived — Bold Navy only.</p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {flyer.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-4">
          {classicOnly && !hasClassic ? (
            <span
              className={cn(
                buttonVariants({ size: 'sm' }),
                'inline-flex w-full cursor-not-allowed gap-1.5 rounded-xl opacity-50 sm:w-auto',
              )}
              aria-disabled
            >
              Not available in original style
            </span>
          ) : (
            <Link
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ size: 'sm' }),
                'w-full gap-1.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-cyan-500 font-bold text-white hover:brightness-110 sm:w-auto',
              )}
            >
              Open &amp; print
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

function ThemeToggle({
  theme,
  onChange,
  classicCount,
}: {
  theme: FlyerVisualTheme;
  onChange: (t: FlyerVisualTheme) => void;
  classicCount: number;
}) {
  return (
    <div
      className="mx-auto mt-8 flex max-w-md flex-col items-center gap-3 sm:max-w-none"
      role="group"
      aria-label="Flyer visual style"
    >
      <p className="text-sm font-semibold text-slate-400">Visual style</p>
      <div className="inline-flex rounded-2xl border border-white/[0.1] bg-slate-950/60 p-1 backdrop-blur-md">
        {THEME_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              'rounded-xl px-4 py-2 text-sm font-bold transition-colors',
              theme === option
                ? 'bg-gradient-to-r from-fuchsia-600 to-cyan-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200',
            )}
            aria-pressed={theme === option}
          >
            {FLYER_VISUAL_THEME_LABELS[option]}
          </button>
        ))}
      </div>
      {theme === 'classic' ? (
        <p className="max-w-lg text-center text-xs text-slate-500">
          {classicCount} flyers use their earlier distinct layouts (neon, scholastic, quest board, etc.). Newer
          topics are Bold Navy until an original is added.
        </p>
      ) : (
        <p className="max-w-lg text-center text-xs text-slate-500">
          Unified navy layout with sky accents — regenerated from{' '}
          <code className="text-slate-400">npm run generate:bold-flyers</code>.
        </p>
      )}
    </div>
  );
}

function AudienceSection({ audience, theme }: { audience: FlyerAudience; theme: FlyerVisualTheme }) {
  const flyers = useMemo(() => {
    const all = getPromotionFlyersByAudience(audience);
    if (theme === 'classic') {
      return all.filter((f) => flyerSupportsClassic(f));
    }
    return all;
  }, [audience, theme]);

  if (flyers.length === 0) return null;

  return (
    <section aria-labelledby={`flyers-${audience}`}>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h2
          id={`flyers-${audience}`}
          className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl"
        >
          {FLYER_AUDIENCE_LABELS[audience]}
        </h2>
        <p className="text-sm text-slate-500">
          {flyers.length} layout{flyers.length === 1 ? '' : 's'}
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {flyers.map((flyer) => (
          <FlyerCard key={`${flyer.id}-${theme}`} flyer={flyer} theme={theme} />
        ))}
      </div>
    </section>
  );
}

export function FlyersGallery() {
  const [theme, setTheme] = useState<FlyerVisualTheme>('bold');

  const classicCount = useMemo(
    () =>
      FLYER_AUDIENCE_ORDER.reduce(
        (n, aud) => n + getPromotionFlyersByAudience(aud).filter((f) => flyerSupportsClassic(f)).length,
        0,
      ),
    [],
  );

  return (
    <>
      <ThemeToggle theme={theme} onChange={setTheme} classicCount={classicCount} />

      <div className="mt-14 space-y-16">
        {FLYER_AUDIENCE_ORDER.map((audience) => (
          <AudienceSection key={`${audience}-${theme}`} audience={audience} theme={theme} />
        ))}
      </div>
    </>
  );
}
