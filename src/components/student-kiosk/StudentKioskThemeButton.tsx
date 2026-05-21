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
  () => import('@/components/ThemeGeneratorModal').then((m) => m.ThemeGeneratorModal),
  { ssr: false },
);

type Props = {
  schoolId: string;
  student: Student;
  classLabel?: string;
  themed?: boolean;
};

export function StudentKioskThemeButton({
  schoolId,
  student,
  classLabel = 'Unassigned',
  themed,
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

  const triggerStyle = themed
    ? {
        borderColor: 'var(--theme-primary)',
        backgroundColor: 'color-mix(in srgb, var(--theme-card) 88%, white)',
        color: 'var(--theme-text)',
      }
    : undefined;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(
          'h-10 shrink-0 gap-1.5 rounded-full px-3.5 text-[11px] font-bold uppercase tracking-widest',
          themed && 'shadow-sm',
        )}
        style={triggerStyle}
        aria-label="Edit my theme"
        title="Edit my theme"
        onClick={() => {
          if (settings.soundEnabled) playSound('click');
          setThemeModalOpen(true);
        }}
      >
        <Palette className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
        <span className="hidden sm:inline">My theme</span>
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
