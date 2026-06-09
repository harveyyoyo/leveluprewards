'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Monitor, Smartphone, X } from 'lucide-react';
import type { Settings } from '@/components/providers/SettingsProvider';
import { DisplayPreviewToolbar } from '@/components/displays/DisplayPreviewToolbar';
import { SmartScreenDisplay } from '@/components/displays/SmartScreenDisplay';
import { useSmartScreenDisplayData } from '@/hooks/useSmartScreenDisplayData';
import {
  type SmartScreenLayout,
  type SmartScreenSettingsSnapshot,
  validSmartScreenLayout,
} from '@/lib/smartScreen/smartScreenSettings';
import { readSmartScreenSetting } from '@/lib/smartScreen/smartScreenSettings';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type PreviewOrientation = 'mirror' | 'portrait';

const LANDSCAPE_STAGE = { width: 1280, height: 720 };
const PORTRAIT_STAGE = { width: 720, height: 1280 };

function stageForLayout(layout: SmartScreenLayout) {
  return layout === 'portrait' ? PORTRAIT_STAGE : LANDSCAPE_STAGE;
}

/** Measure the container and fit the fixed-size stage inside it (no cropping, no bars). */
function useFitScale(
  containerRef: React.RefObject<HTMLElement | null>,
  stageWidth: number,
  stageHeight: number,
  /** Re-run when the container mounts (e.g. modal open). Ref identity alone does not change. */
  active = true,
) {
  const [scale, setScale] = useState(0.4);

  useEffect(() => {
    if (!active) return;

    const element = containerRef.current;
    if (!element) return;

    const update = () => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      if (width <= 0 || height <= 0) return;
      setScale(Math.min(width / stageWidth, height / stageHeight));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [containerRef, stageWidth, stageHeight, active]);

  return scale;
}

type SmartScreenPreviewFrameProps = {
  schoolId: string;
  schoolSettings: Settings;
  draftSettings: SmartScreenSettingsSnapshot;
  screenProfileName?: string | null;
  isJewishOrthodox?: boolean;
  displayData: ReturnType<typeof useSmartScreenDisplayData>;
};

function SmartScreenPreviewFrame({
  schoolId,
  schoolSettings,
  draftSettings,
  screenProfileName,
  isJewishOrthodox,
  displayData,
}: SmartScreenPreviewFrameProps) {
  return (
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
  openDisplayHref?: string;
  layout?: SmartScreenPreviewLayout;
  onOrientationChange?: (orientation: PreviewOrientation) => void;
};

export function SmartScreenScaledPreview({
  schoolId,
  schoolSettings,
  draftSettings,
  screenProfileName,
  isJewishOrthodox = false,
  className,
  openDisplayHref,
  layout = 'inline',
  onOrientationChange,
}: SmartScreenScaledPreviewProps) {
  const isDocked = layout === 'docked';
  const containerRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  const activeLayout =
    validSmartScreenLayout(readSmartScreenSetting('smartScreenLayout', schoolSettings, undefined, draftSettings)) ||
    'mirror';
  const previewOrientation: PreviewOrientation = activeLayout === 'portrait' ? 'portrait' : 'mirror';
  const isDashboard = activeLayout === 'dashboard';

  const stage = stageForLayout(activeLayout);
  const scale = useFitScale(containerRef, stage.width, stage.height);
  const modalScale = useFitScale(modalRef, stage.width, stage.height, modalOpen);

  const configuredZip = (
    readSmartScreenSetting('smartScreenLocationZip', schoolSettings, undefined, draftSettings) || ''
  ).trim();
  const displayData = useSmartScreenDisplayData(schoolId, configuredZip);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [modalOpen]);

  const frameProps = {
    schoolId,
    schoolSettings,
    draftSettings,
    screenProfileName,
    isJewishOrthodox,
    displayData,
  };

  const previewToolbar = (
    <DisplayPreviewToolbar
      layout={previewOrientation}
      options={ORIENTATION_OPTIONS}
      onLayoutChange={onOrientationChange && !isDashboard ? onOrientationChange : undefined}
      openDisplayHref={openDisplayHref}
    />
  );

  return (
    <div className={cn(isDocked ? 'flex h-full min-h-0 flex-col gap-1.5' : 'space-y-2', className)}>
      {previewToolbar}

      <button
        type="button"
        ref={containerRef}
        onClick={() => setModalOpen(true)}
        title="Click to enlarge"
        className={cn(
          'group flex min-h-0 w-full cursor-zoom-in justify-center overflow-hidden',
          isDocked ? 'min-h-0 flex-1' : 'min-h-[220px]',
        )}
      >
        <div
          className="overflow-hidden rounded-xl border shadow-sm transition-shadow group-hover:shadow-md"
          style={{ width: stage.width * scale, height: stage.height * scale }}
        >
          <div
            className="origin-top-left"
            style={{
              width: stage.width,
              height: stage.height,
              transform: `scale(${scale})`,
            }}
          >
            <SmartScreenPreviewFrame {...frameProps} />
          </div>
        </div>
      </button>

      {portalReady && modalOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[250] flex flex-col bg-black/70 p-4 sm:p-8"
              role="dialog"
              aria-modal="true"
              aria-label="Smart Screen preview"
              onClick={() => setModalOpen(false)}
            >
              <div
                className="mx-auto flex h-full w-full max-w-[1200px] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2.5">
                  <div className="flex flex-wrap items-center gap-3">{previewToolbar}</div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-lg gap-1 px-2 text-xs"
                    onClick={() => setModalOpen(false)}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                    Close
                  </Button>
                </div>
                <div ref={modalRef} className="flex min-h-0 flex-1 justify-center overflow-hidden p-4">
                  <div
                    className="overflow-hidden rounded-xl border shadow-sm"
                    style={{ width: stage.width * modalScale, height: stage.height * modalScale }}
                  >
                    <div
                      className="origin-top-left"
                      style={{
                        width: stage.width,
                        height: stage.height,
                        transform: `scale(${modalScale})`,
                      }}
                    >
                      <SmartScreenPreviewFrame {...frameProps} />
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
