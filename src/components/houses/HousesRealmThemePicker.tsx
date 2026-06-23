'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  HOUSES_REALM_THEMES,
  type HousesRealmTheme,
  type HousesRealmThemeId,
} from '@/lib/houses/housesRealmThemes';

export function swatchBackground(theme: HousesRealmTheme): string {
  const t = theme.tokens;
  return [
    `radial-gradient(ellipse 90% 70% at 50% -15%, ${t.glowTop}, transparent 62%)`,
    `radial-gradient(ellipse 70% 50% at 100% 110%, ${t.glowBottom}, transparent 60%)`,
    `linear-gradient(180deg, ${t.gradFrom}, ${t.gradTo})`,
  ].join(', ');
}

export function HousesRealmThemePicker({
  value,
  onSelect,
}: {
  value: HousesRealmThemeId;
  onSelect: (id: HousesRealmThemeId) => void;
}) {
  const activeTheme = HOUSES_REALM_THEMES.find((t) => t.id === value) ?? HOUSES_REALM_THEMES[0];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {HOUSES_REALM_THEMES.map((theme) => {
          const active = theme.id === value;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onSelect(theme.id)}
              aria-pressed={active}
              className={cn(
                'group relative overflow-hidden rounded-2xl border p-3 text-left transition-all',
                active
                  ? 'border-white/60 shadow-lg ring-2 ring-white/50'
                  : 'border-white/10 hover:-translate-y-0.5 hover:border-white/30',
              )}
              style={{ background: swatchBackground(theme) }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-base shadow-md shadow-black/30"
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${theme.tokens.accentFrom}, ${theme.tokens.accentTo})`,
                  }}
                  aria-hidden
                >
                  {theme.icon}
                </span>
                {active ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#12081f]">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                ) : null}
              </div>

              <p className="mt-3 text-sm font-bold text-white">{theme.label}</p>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-white/60">
                {theme.description}
              </p>
              {theme.pairs ? (
                <p
                  className="mt-2 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                  style={{
                    color: theme.tokens.accentText,
                    backgroundColor: 'rgba(255,255,255,0.08)',
                  }}
                >
                  Matches {theme.pairs}
                </p>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Mini live preview */}
      {activeTheme ? (
        <div
          className="relative overflow-hidden rounded-2xl border border-white/10"
          style={{ background: swatchBackground(activeTheme), minHeight: '5rem' }}
          aria-label={`Preview of ${activeTheme.label} theme`}
        >
          {/* Simulated sidebar stripe */}
          <div
            className="absolute left-0 top-0 bottom-0 w-1.5 opacity-90"
            style={{
              backgroundImage: `linear-gradient(180deg, ${activeTheme.tokens.accentFrom}, ${activeTheme.tokens.accentTo})`,
            }}
          />
          <div className="flex items-center gap-3 px-5 py-4">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-base shadow-md shadow-black/30"
              style={{
                backgroundImage: `linear-gradient(135deg, ${activeTheme.tokens.accentFrom}, ${activeTheme.tokens.accentTo})`,
              }}
              aria-hidden
            >
              {activeTheme.icon}
            </span>
            <div>
              <p
                className="text-[9px] font-black uppercase tracking-[0.35em]"
                style={{ color: activeTheme.tokens.accentText }}
              >
                {activeTheme.label}
              </p>
              <p className="font-serif text-sm font-bold text-white">Houses Realm</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
