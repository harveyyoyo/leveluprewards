'use client';

import type { Settings } from '@/components/providers/SettingsProvider';
import { SmartScreenDisplay } from '@/components/displays/SmartScreenDisplay';
import { useSmartScreenDisplayData } from '@/hooks/useSmartScreenDisplayData';
import type { SmartScreenSettingsSnapshot } from '@/lib/smartScreen/smartScreenSettings';
import { readSmartScreenSetting } from '@/lib/smartScreen/smartScreenSettings';
import { cn } from '@/lib/utils';

const PREVIEW_WIDTH = 1280;
const PREVIEW_HEIGHT = 720;
const PREVIEW_SCALE = 0.34;
const SCALED_WIDTH = Math.round(PREVIEW_WIDTH * PREVIEW_SCALE);
const SCALED_HEIGHT = Math.round(PREVIEW_HEIGHT * PREVIEW_SCALE);

type SmartScreenScaledPreviewProps = {
  schoolId: string;
  schoolSettings: Settings;
  draftSettings: SmartScreenSettingsSnapshot;
  screenProfileName?: string | null;
  isJewishOrthodox?: boolean;
  className?: string;
};

export function SmartScreenScaledPreview({
  schoolId,
  schoolSettings,
  draftSettings,
  screenProfileName,
  isJewishOrthodox = false,
  className,
}: SmartScreenScaledPreviewProps) {
  const configuredZip = (readSmartScreenSetting('smartScreenLocationZip', schoolSettings, undefined, draftSettings) || '').trim();
  const displayData = useSmartScreenDisplayData(schoolId, configuredZip);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold">Live preview</p>
        <span className="rounded-full border bg-muted/30 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">
          Draft
        </span>
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Updates as you edit. Click Save to push changes to hallway displays.
      </p>
      <div
        className="relative mx-auto overflow-hidden rounded-2xl border bg-black shadow-inner"
        style={{ width: SCALED_WIDTH, maxWidth: '100%', height: SCALED_HEIGHT }}
      >
        <div
          className="pointer-events-none absolute left-0 top-0 origin-top-left"
          style={{
            width: PREVIEW_WIDTH,
            height: PREVIEW_HEIGHT,
            transform: `scale(${PREVIEW_SCALE})`,
          }}
        >
          <SmartScreenDisplay
            schoolId={schoolId}
            schoolSettings={schoolSettings}
            screenSettings={draftSettings}
            screenProfileName={screenProfileName}
            variant="preview"
            isJewishOrthodox={isJewishOrthodox}
            {...displayData}
          />
        </div>
      </div>
    </div>
  );
}
