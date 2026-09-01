'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CLASSROOM_REALM_THEMES,
  classroomRealmSwatchBackground,
  type ClassroomRealmTheme,
  type ClassroomRealmThemeId,
} from '@/lib/classroom/classroomRealmThemes';

export function ClassroomRealmThemePicker({
  value,
  onSelect,
}: {
  value: ClassroomRealmThemeId;
  onSelect: (id: ClassroomRealmThemeId) => void;
}) {
  const activeTheme = CLASSROOM_REALM_THEMES.find((t) => t.id === value) ?? CLASSROOM_REALM_THEMES[0];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CLASSROOM_REALM_THEMES.map((theme) => {
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
              style={{ background: classroomRealmSwatchBackground(theme) }}
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
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#102016]">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-sm font-bold text-white">{theme.label}</p>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-white/60">
                {theme.description}
              </p>
            </button>
          );
        })}
      </div>

      {activeTheme ? <ClassroomRealmThemePreview theme={activeTheme} /> : null}
    </div>
  );
}

function ClassroomRealmThemePreview({ theme }: { theme: ClassroomRealmTheme }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/10"
      style={{ background: classroomRealmSwatchBackground(theme), minHeight: '5rem' }}
      aria-label={`Preview of ${theme.label} theme`}
    >
      <div
        className="absolute inset-y-0 left-0 w-1.5 opacity-90"
        style={{
          backgroundImage: `linear-gradient(180deg, ${theme.tokens.accentFrom}, ${theme.tokens.accentTo})`,
        }}
      />
      <div className="flex items-center gap-3 px-5 py-4">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-base shadow-md shadow-black/30"
          style={{
            backgroundImage: `linear-gradient(135deg, ${theme.tokens.accentFrom}, ${theme.tokens.accentTo})`,
          }}
          aria-hidden
        >
          {theme.icon}
        </span>
        <div>
          <p
            className="text-[9px] font-black uppercase tracking-[0.35em]"
            style={{ color: theme.tokens.accentText }}
          >
            {theme.label}
          </p>
          <p className="font-serif text-sm font-bold text-white">Classroom Realm</p>
        </div>
      </div>
    </div>
  );
}
