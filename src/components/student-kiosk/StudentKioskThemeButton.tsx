'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { httpsCallable } from 'firebase/functions';
import { Palette } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getReadableErrorMessage } from '@/lib/errorMessage';
import { normalizeStudentTheme } from '@/lib/themeContrast';
import type { Student, StudentTheme } from '@/lib/types';

const ThemeGeneratorModal = dynamic(
  () => import('@/components/themes/ThemeGeneratorModal').then((m) => m.ThemeGeneratorModal),
  { ssr: false },
);

type Props = {
  schoolId: string;
  student: Student;
  classLabel?: string;
  themed?: boolean;
  primaryForeground?: string;
  /** `sidebar` matches full-width kiosk actions like More prizes; `inline` is compact. */
  layout?: 'sidebar' | 'inline';
  className?: string;
};

export function StudentKioskThemeButton({
  schoolId,
  student,
  classLabel = 'Unassigned',
  themed,
  primaryForeground = '#ffffff',
  layout = 'inline',
  className,
}: Props) {
  const { settings } = useSettings();
  const playSound = useArcadeSound();
  const { functions } = useFirebase();
  const { toast } = useToast();
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);

  const themesEnabled = settings.enableStudentThemes !== false;
  const studentName =
    `${student.firstName}${student.lastName ? ` ${student.lastName}` : ''}`.trim() || student.firstName;

  if (!themesEnabled) return null;

  const persistTheme = async (theme: StudentTheme | null) => {
    if (!functions) {
      toast({
        variant: 'destructive',
        title: 'Not ready',
        description: 'Connection is still starting. Try again in a moment.',
      });
      return;
    }
    setSavingTheme(true);
    try {
      const fn = httpsCallable<
        { schoolId: string; studentId: string; theme?: StudentTheme | null; remove?: boolean },
        { success: boolean }
      >(functions, 'setStudentKioskTheme');
      if (theme === null) {
        await fn({ schoolId, studentId: student.id, remove: true });
      } else {
        const normalized = normalizeStudentTheme(theme);
        if (!normalized) throw new Error('Invalid theme');
        await fn({ schoolId, studentId: student.id, theme: normalized });
      }
      setThemeModalOpen(false);
      toast({
        title: theme === null ? 'Theme removed' : 'Theme saved',
        description:
          theme === null
            ? 'Your page uses the school default look again.'
            : 'Your colors are updated on this kiosk.',
      });
      if (settings.soundEnabled) playSound('success');
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not save theme',
        description: getReadableErrorMessage(e, 'Try again or ask a teacher for help.'),
      });
    } finally {
      setSavingTheme(false);
    }
  };

  const sidebar = layout === 'sidebar';
  const triggerStyle = themed
    ? sidebar
      ? {
          backgroundColor: 'var(--theme-primary)',
          color: primaryForeground,
        }
      : {
          borderColor: 'var(--theme-primary)',
          backgroundColor: 'color-mix(in srgb, var(--theme-card) 88%, white)',
          color: 'var(--theme-text)',
        }
    : undefined;

  return (
    <>
      <Button
        type="button"
        variant={sidebar ? 'default' : 'outline'}
        size={sidebar ? 'default' : 'sm'}
        className={cn(
          sidebar
            ? 'h-12 w-full shrink-0 text-sm font-black uppercase tracking-wide shadow-md sm:h-14 sm:text-base'
            : 'h-9 w-auto shrink-0 justify-center gap-1.5 rounded-full px-3.5 text-[11px] font-bold uppercase tracking-widest',
          sidebar && !themed && 'bg-gradient-to-r from-primary to-primary/90',
          !sidebar && themed && 'shadow-sm',
          className,
        )}
        style={triggerStyle}
        aria-label="Change theme"
        title="Change theme"
        onClick={() => {
          if (settings.soundEnabled) playSound('click');
          setThemeModalOpen(true);
        }}
      >
        <span className={cn('flex items-center justify-center gap-1.5', sidebar && 'w-full')}>
          <Palette className={cn('shrink-0 opacity-90', sidebar ? 'h-4 w-4 sm:h-5 sm:w-5' : 'h-3.5 w-3.5')} aria-hidden />
          {sidebar ? 'Change theme' : 'Edit Theme'}
        </span>
      </Button>

      {themeModalOpen ? (
        <ThemeGeneratorModal
          isOpen={themeModalOpen}
          onOpenChange={setThemeModalOpen}
          studentName={studentName}
          previewStudent={student}
          classLabel={classLabel}
          currentTheme={student.theme}
          onSave={(theme) => void persistTheme(theme)}
          onRemoveTheme={student.theme ? () => void persistTheme(null) : undefined}
        />
      ) : null}
      {savingTheme ? (
        <span className="sr-only" role="status">
          Saving theme…
        </span>
      ) : null}
    </>
  );
}
