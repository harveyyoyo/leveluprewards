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
          const labelColor = theme.tone === 'light' ? theme.tokens.fg : '#ffffff';
          const mutedColor =
            theme.tone === 'light' ? theme.tokens.muted : 'rgba(255,255,255,0.60)';
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onSelect(theme.id)}
              aria-pressed={active}
              className={cn(
                'group relative overflow-hidden rounded-2xl border p-3 text-left transition-all',
                active
                  ? theme.tone === 'light'
                    ? 'border-slate-400/70 shadow-lg ring-2 ring-slate-400/40'
                    : 'border-white/60 shadow-lg ring-2 ring-white/50'
                  : theme.tone === 'light'
                    ? 'border-slate-300/70 hover:-translate-y-0.5 hover:border-slate-400'
                    : 'border-white/10 hover:-translate-y-0.5 hover:border-white/30',
              )}
              style={{ background: swatchBackground(theme) }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-base shadow-md shadow-black/20"
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${theme.tokens.accentFrom}, ${theme.tokens.accentTo})`,
                  }}
                  aria-hidden
                >
                  {theme.icon}
                </span>
                {active ? (
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: theme.tone === 'light' ? theme.tokens.fg : '#ffffff',
                      color: theme.tone === 'light' ? '#ffffff' : '#12081f',
                    }}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                ) : null}
              </div>

              <p className="mt-3 text-sm font-bold" style={{ color: labelColor }}>
                {theme.label}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug" style={{ color: mutedColor }}>
                {theme.description}
              </p>
              <p
                className="mt-2 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                style={{
                  color: theme.tokens.accentText,
                  backgroundColor:
                    theme.tone === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
                }}
              >
                {theme.tone === 'light' ? 'Bright' : 'Dark'}
                {theme.pairs ? ` · ${theme.pairs}` : ''}
              </p>
            </button>
          );
        })}
      </div>

      {/* Mini live preview */}
      {activeTheme ? (
        <div
          className="relative overflow-hidden rounded-2xl border"
          style={{
            background: swatchBackground(activeTheme),
            minHeight: '5rem',
            borderColor: activeTheme.tokens.border,
          }}
          aria-label={`Preview of ${activeTheme.label} theme`}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-1.5 opacity-90"
            style={{
              backgroundImage: `linear-gradient(180deg, ${activeTheme.tokens.accentFrom}, ${activeTheme.tokens.accentTo})`,
            }}
          />
          <div className="flex items-center gap-3 px-5 py-4">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-base shadow-md shadow-black/20"
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
              <p
                className="font-serif text-sm font-bold"
                style={{ color: activeTheme.tokens.fg }}
              >
                Houses Realm
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
