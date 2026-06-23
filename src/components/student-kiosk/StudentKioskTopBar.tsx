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
  const { t } = useTranslation();
  const displayName = `${student.firstName}${student.lastName ? ` ${student.lastName}` : ''}`.trim();

  return (
    <div
      className={cn(
        'relative z-10 w-full shrink-0 rounded-2xl border-2 px-2.5 py-1.5 sm:px-3 sm:py-1.5 [@media(max-height:760px)]:px-2 [@media(max-height:760px)]:py-1',
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
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-2 sm:gap-x-3">
        <div className="flex min-w-0 items-center gap-2 [@media(max-height:760px)]:gap-1.5">
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg text-[10px] font-black uppercase sm:h-9 sm:w-9 [@media(max-height:760px)]:h-7 [@media(max-height:760px)]:w-7',
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
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-1.5">
              <p
                className="text-[9px] font-bold uppercase tracking-[0.24em] opacity-60 sm:text-[10px] [@media(max-height:760px)]:text-[8px]"
                style={{ color: themed ? 'var(--theme-page-text)' : undefined }}
              >
                {t('student.kiosk.welcomeBack')}
              </p>
              {headerExtras ? <div className="shrink-0">{headerExtras}</div> : null}
            </div>
            <h1
              className="min-w-0 truncate text-base font-black uppercase leading-none tracking-wide sm:text-lg md:text-xl [@media(max-height:760px)]:text-sm"
              style={{ color: themed ? 'var(--theme-page-text)' : undefined }}
            >
              {displayName}
            </h1>
          </div>
        </div>

        <div className="text-center">
          <p
            className="text-[9px] font-bold uppercase tracking-[0.24em] opacity-60 sm:text-[10px] [@media(max-height:760px)]:text-[8px]"
            style={{ color: themed ? 'var(--theme-page-text)' : undefined }}
          >
            {t('student.kiosk.balance')}
          </p>
          <p
            className="text-3xl font-black tabular-nums leading-none sm:text-4xl md:text-5xl [@media(max-height:760px)]:text-2xl"
            style={{ color: themed ? 'var(--theme-primary)' : 'hsl(var(--primary))' }}
          >
            {points.toLocaleString()}
          </p>
        </div>

        {trailingActions ? (
          <div className="flex shrink-0 items-center justify-end">{trailingActions}</div>
        ) : (
          <div aria-hidden />
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
