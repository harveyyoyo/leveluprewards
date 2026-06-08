'use client';

import { useEffect, type ReactNode } from 'react';
import { Maximize2, Minimize2, Monitor, Smartphone } from 'lucide-react';
import type { Settings } from '@/components/providers/SettingsProvider';
import { SmartScreenDisplay } from '@/components/displays/SmartScreenDisplay';
import { useSmartScreenDisplayData } from '@/hooks/useSmartScreenDisplayData';
import {
  type SmartScreenLayout,
  type SmartScreenSettingsSnapshot,
  validSmartScreenLayout,
} from '@/lib/smartScreen/smartScreenSettings';
import { readSmartScreenSetting } from '@/lib/smartScreen/smartScreenSettings';
import { resolveSmartScreenTheme, SMART_SCREEN_THEME_PAGE_META } from '@/lib/smartScreenThemes';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type PreviewOrientation = 'mirror' | 'portrait';

type SmartScreenPreviewFrameProps = {
  schoolId: string;
  schoolSettings: Settings;
  draftSettings: SmartScreenSettingsSnapshot;
  screenProfileName?: string | null;
  isJewishOrthodox?: boolean;
  displayData: ReturnType<typeof useSmartScreenDisplayData>;
  className?: string;
};

function SmartScreenPreviewFrame({
  schoolId,
  schoolSettings,
  draftSettings,
  screenProfileName,
  isJewishOrthodox,
  displayData,
  className,
}: SmartScreenPreviewFrameProps) {
  return (
    <div className={cn('h-full w-full overflow-hidden', className)}>
      <SmartScreenDisplay
        schoolId={schoolId}
        schoolSettings={schoolSettings}
        screenSettings={draftSettings}
        screenProfileName={screenProfileName}
        variant="preview"
        previewDensity="full"
        isJewishOrthodox={isJewishOrthodox}
        {...displayData}
      />
    </div>
  );
}

const ORIENTATION_OPTIONS: {
  id: PreviewOrientation;
  label: string;
  shortLabel: string;
  icon: typeof Monitor;
}[] = [
  { id: 'mirror', label: 'Wide — clock left, modules right', shortLabel: 'Wide', icon: Monitor },
  { id: 'portrait', label: 'Tall — portrait monitor', shortLabel: 'Tall', icon: Smartphone },
];

type SmartScreenPreviewLayout = 'inline' | 'docked';

type SmartScreenScaledPreviewProps = {
  schoolId: string;
  schoolSettings: Settings;
  draftSettings: SmartScreenSettingsSnapshot;
  screenProfileName?: string | null;
  isJewishOrthodox?: boolean;
  className?: string;
  headerAction?: ReactNode;
  layout?: SmartScreenPreviewLayout;
  widescreen?: boolean;
  onWidescreenChange?: (widescreen: boolean) => void;
  onOrientationChange?: (orientation: PreviewOrientation) => void;
};

function previewAspectClass(layout: SmartScreenLayout) {
  return layout === 'portrait' ? 'aspect-[9/16]' : 'aspect-video';
}

export function SmartScreenScaledPreview({
  schoolId,
  schoolSettings,
  draftSettings,
  screenProfileName,
  isJewishOrthodox = false,
  className,
  headerAction,
  layout = 'inline',
  widescreen = false,
  onWidescreenChange,
  onOrientationChange,
}: SmartScreenScaledPreviewProps) {
  const isDocked = layout === 'docked';

  const activeLayout =
    validSmartScreenLayout(readSmartScreenSetting('smartScreenLayout', schoolSettings, undefined, draftSettings)) ||
    'mirror';
  const previewOrientation: PreviewOrientation = activeLayout === 'portrait' ? 'portrait' : 'mirror';
  const isDashboard = activeLayout === 'dashboard';
  const isPortrait = activeLayout === 'portrait';

  const themeKey = resolveSmartScreenTheme(
    readSmartScreenSetting('smartScreenTheme', schoolSettings, undefined, draftSettings),
  );
  const themePageMeta = SMART_SCREEN_THEME_PAGE_META[themeKey];

  const configuredZip = (
    readSmartScreenSetting('smartScreenLocationZip', schoolSettings, undefined, draftSettings) || ''
  ).trim();
  const displayData = useSmartScreenDisplayData(schoolId, configuredZip);

  useEffect(() => {
    if (!widescreen || !onWidescreenChange) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onWidescreenChange(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onWidescreenChange, widescreen]);

  const frameProps = {
    schoolId,
    schoolSettings,
    draftSettings,
    screenProfileName,
    isJewishOrthodox,
    displayData,
  };

  const orientationToolbar =
    onOrientationChange && !isDashboard ? (
      <div
        className="flex items-center rounded-lg border bg-muted/30 p-0.5"
        role="group"
        aria-label="Preview orientation"
      >
        {ORIENTATION_OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = previewOrientation === option.id;
          return (
            <Button
              key={option.id}
              type="button"
              size="sm"
              variant={active ? 'default' : 'ghost'}
              className={cn(
                'h-7 gap-1 rounded-md px-2 text-[10px] font-bold uppercase tracking-wide',
                !active && 'text-muted-foreground',
              )}
              onClick={() => onOrientationChange(option.id)}
              aria-pressed={active}
              title={option.label}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {option.shortLabel}
            </Button>
          );
        })}
      </div>
    ) : null;

  const widescreenToggle =
    isDocked && onWidescreenChange ? (
      <Button
        type="button"
        variant={widescreen ? 'default' : 'outline'}
        size="sm"
        className="h-7 rounded-lg gap-1 px-2 text-xs"
        onClick={() => onWidescreenChange(!widescreen)}
        aria-pressed={widescreen}
      >
        {widescreen ? (
          <>
            <Minimize2 className="h-3.5 w-3.5" aria-hidden />
            Back
          </>
        ) : (
          <>
            <Maximize2 className="h-3.5 w-3.5" aria-hidden />
            Widescreen
          </>
        )}
      </Button>
    ) : null;

  return (
    <div className={cn(isDocked ? 'flex h-full min-h-0 flex-col gap-1.5' : 'space-y-2', className)}>
      <div className={cn('flex shrink-0 flex-wrap items-center justify-between gap-1.5', isDocked && 'px-0.5')}>
        <div className="min-w-0">
          <p className="text-xs font-bold">Live preview</p>
          <p className="text-[10px] text-muted-foreground">
            {widescreen
              ? 'Widescreen mode — Back returns to settings'
              : isDashboard
                ? 'Dashboard layout — change in settings'
                : isDocked
                  ? 'Pinned while you edit'
                  : 'Updates as you edit'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {orientationToolbar}
          <span className="rounded-full border bg-muted/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-muted-foreground">
            Draft
          </span>
          {headerAction}
          {widescreenToggle}
        </div>
      </div>

      <div
        className={cn(
          'flex min-h-0 w-full items-center justify-center overflow-hidden',
          isDocked ? 'min-h-0 flex-1' : 'min-h-[220px]',
          widescreen && 'min-h-[min(72dvh,720px)]',
        )}
        style={{ backgroundColor: themePageMeta.pageBg }}
      >
        <div
          className={cn(
            'overflow-hidden rounded-xl border shadow-sm',
            previewAspectClass(activeLayout),
            isPortrait ? 'h-full max-h-full w-auto max-w-full' : 'h-auto max-h-full w-full max-w-full',
          )}
        >
          <SmartScreenPreviewFrame {...frameProps} />
        </div>
      </div>
    </div>
  );
}
