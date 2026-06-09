'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { Student } from '@/lib/types';

/** Optional spacing below the student name bar when not inside a spaced flex column. */
export const studentKioskHeaderGapClass =
  'mb-1.5 sm:mb-2 [@media(max-height:760px)]:mb-1';

export type StudentKioskTopBarProps = {
  student: Student;
  points: number;
  themed: boolean;
  primaryForeground: string;
  photoDisplayMode?: string;
  /** Shown on the welcome row (e.g. house badge). */
  headerExtras?: ReactNode;
  /** e.g. logout controls */
  trailingActions?: ReactNode;
};

export function StudentKioskTopBar({
  student,
  points,
  themed,
  primaryForeground,
  photoDisplayMode,
  headerExtras,
  trailingActions,
}: StudentKioskTopBarProps) {
  const displayName = `${student.firstName}${student.lastName ? ` ${student.lastName}` : ''}`.trim();

  return (
    <div
      className={cn(
        'relative z-10 w-full shrink-0 rounded-2xl border-2 px-3 py-2 sm:px-4 sm:py-2.5 [@media(max-height:760px)]:px-2.5 [@media(max-height:760px)]:py-1.5',
        studentKioskHeaderGapClass,
        !themed && 'border-primary/35 bg-card/95 shadow-sm',
      )}
      style={
        themed
          ? {
              borderColor: 'color-mix(in srgb, var(--theme-primary) 42%, transparent)',
              backgroundColor: 'color-mix(in srgb, var(--theme-card) 94%, white)',
            }
          : undefined
      }
    >
      <div className="mb-1 flex items-center justify-between gap-2 sm:mb-1.5 [@media(max-height:760px)]:mb-0.5">
        <p
          className="text-[10px] font-bold uppercase tracking-[0.28em] opacity-60 sm:text-xs [@media(max-height:760px)]:text-[9px]"
          style={{ color: themed ? 'var(--theme-page-text)' : undefined }}
        >
          Welcome
        </p>
        {headerExtras ? <div className="shrink-0">{headerExtras}</div> : null}
      </div>
      <div
        className={cn(
          'grid w-full items-center gap-2 sm:gap-3 [@media(max-height:760px)]:gap-1.5',
          'grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]',
        )}
      >
        <div className="flex min-w-0 items-center gap-2 sm:gap-3 [@media(max-height:760px)]:gap-1.5 justify-self-start">
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl text-sm font-black uppercase sm:h-14 sm:w-14 md:h-16 md:w-16 [@media(max-height:760px)]:h-9 [@media(max-height:760px)]:w-9',
              !themed && 'student-kiosk-gradient-brand text-white shadow-md',
            )}
            style={
              themed
                ? {
                    backgroundColor: 'var(--theme-primary)',
                    color: primaryForeground,
                  }
                : undefined
            }
          >
            {student.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={student.photoUrl}
                alt=""
                className={cn(
                  'h-full w-full',
                  photoDisplayMode === 'cover' ? 'object-cover' : 'object-contain',
                )}
              />
            ) : (
              <span aria-hidden>
                {(student.firstName?.[0] || '')}
                {(student.lastName?.[0] || '')}
              </span>
            )}
          </div>
          <h1
            className="min-w-0 truncate text-3xl font-black uppercase leading-tight tracking-wide sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl [@media(max-height:760px)]:text-2xl"
            style={{ color: themed ? 'var(--theme-page-text)' : undefined }}
          >
            {displayName}
          </h1>
        </div>

        <div className="shrink-0 justify-self-center px-1 text-center sm:px-2">
          <p
            className="text-4xl font-black tabular-nums leading-none sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl [@media(max-height:760px)]:text-3xl"
            style={{ color: themed ? 'var(--theme-primary)' : 'hsl(var(--primary))' }}
          >
            {points.toLocaleString()}
          </p>
        </div>

        {trailingActions ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 justify-self-end">
            {trailingActions}
          </div>
        ) : (
          <div aria-hidden className="justify-self-end" />
        )}
      </div>
    </div>
  );
}

export type StudentKioskPointCategoriesPanelProps = {
  totals: { label: string; points: number }[];
  themed: boolean;
  /** Optional block below category rows (e.g. Change theme). */
  footer?: ReactNode;
};

export function StudentKioskPointCategoriesPanel({
  totals,
  themed,
  footer,
}: StudentKioskPointCategoriesPanelProps) {
  if (totals.length === 0 && !footer) return footer ?? null;

  return (
    <div
      className={cn(
        'shrink-0 rounded-xl border-2 px-3 py-2.5',
        !themed && 'border-border/60 bg-card/90',
      )}
      style={
        themed
          ? {
              borderColor: 'color-mix(in srgb, var(--theme-primary) 28%, transparent)',
              backgroundColor: 'color-mix(in srgb, var(--theme-card) 92%, white)',
            }
          : undefined
      }
    >
      {totals.length > 0 ? (
        <>
          <p
            className="mb-2 text-center text-[10px] font-black uppercase tracking-[0.2em] opacity-75 sm:text-xs"
            style={themed ? { color: 'var(--theme-page-text)' } : undefined}
          >
            Categories
          </p>
          <ul className="space-y-1.5">
            {totals.map((row) => (
              <li
                key={row.label}
                className="flex items-center justify-between gap-2 text-xs font-bold sm:text-sm"
                style={themed ? { color: 'var(--theme-text)' } : undefined}
              >
                <span className="truncate">{row.label}</span>
                <span
                  className="shrink-0 tabular-nums"
                  style={themed ? { color: 'var(--theme-primary)' } : undefined}
                >
                  {row.points.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {footer ? <div className={cn(totals.length > 0 && 'mt-3 border-t pt-3', themed && 'border-[color-mix(in_srgb,var(--theme-primary)_22%,transparent)]')}>{footer}</div> : null}
    </div>
  );
}
