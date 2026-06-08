'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { Student } from '@/lib/types';
import { useTranslation } from '@/components/providers/LocaleProvider';

/** Optional spacing below the student name bar when not inside a spaced flex column. */
export const studentKioskHeaderGapClass =
  'mb-1.5 sm:mb-2 [@media(max-height:760px)]:mb-1';

export type StudentKioskTopBarProps = {
  student: Student;
  points: number;
  themed: boolean;
  primaryForeground: string;
  photoDisplayMode?: string;
  /** Shown beside the name (house badge, emoji, etc.). */
  nameExtras?: ReactNode;
  /** e.g. logout controls */
  trailingActions?: ReactNode;
};

export function StudentKioskTopBar({
  student,
  points,
  themed,
  primaryForeground,
  photoDisplayMode,
  nameExtras,
  trailingActions,
}: StudentKioskTopBarProps) {
  const { t } = useTranslation();
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
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 [@media(max-height:760px)]:gap-1.5">
        <div className="min-w-0 flex-1">
          <p
            className="text-[9px] font-bold uppercase tracking-[0.28em] opacity-60 sm:text-[10px] [@media(max-height:760px)]:hidden"
            style={{ color: themed ? 'var(--theme-page-text)' : undefined }}
          >
            {t('student.kiosk.welcomeBack')}
          </p>
            <div className="mt-1.5 flex min-w-0 items-center gap-2 sm:mt-2 sm:gap-2.5 [@media(max-height:760px)]:mt-0 [@media(max-height:760px)]:gap-1.5">
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg text-xs font-black uppercase sm:h-10 sm:w-10 [@media(max-height:760px)]:h-8 [@media(max-height:760px)]:w-8',
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
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h1
                  className="truncate text-lg font-black uppercase leading-tight tracking-wide sm:text-xl md:text-2xl lg:text-3xl [@media(max-height:760px)]:text-base"
                  style={{ color: themed ? 'var(--theme-page-text)' : undefined }}
                >
                  {displayName}
                </h1>
              </div>
            </div>
            {nameExtras}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1 sm:gap-1.5">
          {trailingActions ? (
            <div className="flex flex-wrap items-center justify-end gap-1.5">{trailingActions}</div>
          ) : null}
          <div className="text-right">
            <p
              className="text-[9px] font-bold uppercase tracking-[0.28em] opacity-60 sm:text-[10px] [@media(max-height:760px)]:hidden"
              style={{ color: themed ? 'var(--theme-page-text)' : undefined }}
            >
              {t('student.kiosk.balance')}
            </p>
            <p
              className="text-2xl font-black tabular-nums leading-none sm:text-3xl md:text-4xl [@media(max-height:760px)]:text-xl"
              style={{ color: themed ? 'var(--theme-primary)' : 'hsl(var(--primary))' }}
            >
              {points.toLocaleString()}
            </p>
          </div>
        </div>
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
  const { t } = useTranslation();
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
            {t('student.kiosk.categories')}
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
