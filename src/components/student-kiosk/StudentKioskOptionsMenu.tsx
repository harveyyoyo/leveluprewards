'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { httpsCallable } from 'firebase/functions';
import { Moon, Palette, Settings, Sparkles, Wand2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { useSettings, colorSchemes, type ColorScheme } from '@/components/providers/SettingsProvider';
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

const SCHEME_KEYS = Object.keys(colorSchemes) as ColorScheme[];

type Props = {
  schoolId: string;
  student: Student;
  classLabel?: string;
  themed?: boolean;
};

export function StudentKioskOptionsMenu({ schoolId, student, classLabel = 'Unassigned', themed }: Props) {
  const { settings, updateSettings } = useSettings();
  const playSound = useArcadeSound();
  const { functions } = useFirebase();
  const { toast } = useToast();
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);

  const darkMode = settings.studentDarkMode ?? settings.darkMode;
  const darkColorized = settings.studentDarkModeColorized ?? settings.darkModeColorized ?? false;
  const colorScheme = (settings.studentColorScheme ?? settings.colorScheme ?? 'sapphire') as ColorScheme;
  const themesEnabled = settings.enableStudentThemes !== false;
  const studentName =
    `${student.firstName}${student.lastName ? ` ${student.lastName}` : ''}`.trim() || student.firstName;

  const playClick = () => {
    if (settings.soundEnabled) playSound('click');
  };

  const setStudentPref = (key: string, value: boolean | string) => {
    updateSettings({ [key]: value } as Parameters<typeof updateSettings>[0]);
    playClick();
  };

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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={cn('h-10 w-10 shrink-0 rounded-full', themed && 'shadow-sm')}
            style={triggerStyle}
            aria-label="Options"
            title="Options"
          >
            <Settings className="h-4 w-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.2em]">
            Options
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="flex items-center gap-2 text-xs font-bold normal-case tracking-normal">
            <Palette className="h-3.5 w-3.5 opacity-70" aria-hidden />
            Screen theme
          </DropdownMenuLabel>
          <DropdownMenuItem
            className="flex items-center justify-between gap-3"
            onSelect={(e) => e.preventDefault()}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <Moon className="h-4 w-4 opacity-70" aria-hidden />
              Dark mode
            </span>
            <Switch
              checked={darkMode}
              onCheckedChange={(checked) => setStudentPref('studentDarkMode', checked)}
              aria-label="Dark mode"
            />
          </DropdownMenuItem>
          <DropdownMenuItem
            className={cn(
              'flex items-center justify-between gap-3',
              !darkMode && 'pointer-events-none opacity-45',
            )}
            onSelect={(e) => e.preventDefault()}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 opacity-70" aria-hidden />
              Colorize dark
            </span>
            <Switch
              checked={darkColorized}
              disabled={!darkMode}
              onCheckedChange={(checked) => setStudentPref('studentDarkModeColorized', checked)}
              aria-label="Colorize dark mode"
            />
          </DropdownMenuItem>
          <div className="px-2 py-2">
            <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Accent colors
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {SCHEME_KEYS.map((key) => {
                const isSelected = colorScheme === key;
                const swatch = colorSchemes[key].swatchColors;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStudentPref('studentColorScheme', key)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-[11px] font-bold transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                        : 'border-border/60 text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    )}
                  >
                    <span className="flex h-3.5 w-5 shrink-0 overflow-hidden rounded-full border border-black/10 shadow-sm">
                      {swatch.map((color) => (
                        <span key={color} className="flex-1" style={{ backgroundColor: color }} />
                      ))}
                    </span>
                    <span className="truncate">{colorSchemes[key].label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {themesEnabled ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 font-semibold"
                onSelect={() => {
                  playClick();
                  setThemeModalOpen(true);
                }}
              >
                <Wand2 className="h-4 w-4 text-purple-500" aria-hidden />
                Customize my colors
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

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
