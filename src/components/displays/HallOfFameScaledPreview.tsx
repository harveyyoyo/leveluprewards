'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Monitor, Smartphone, X } from 'lucide-react';
import type { HallOfFameLayout } from '@/lib/hallOfFameUrlConfig';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const HallOfFamePreviewFrame = dynamic(() => import('@/components/displays/HallOfFameRouteView'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-background text-xs font-semibold text-muted-foreground">
      Loading preview…
    </div>
  ),
});

const LANDSCAPE_STAGE = { width: 1280, height: 720 };
const PORTRAIT_STAGE = { width: 720, height: 1280 };

function stageForLayout(layout: HallOfFameLayout) {
  return layout === 'portrait' ? PORTRAIT_STAGE : LANDSCAPE_STAGE;
}

function useFitScale(
  containerRef: React.RefObject<HTMLElement | null>,
  stageWidth: number,
  stageHeight: number,
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

type HallOfFameScaledPreviewProps = {
  layout: HallOfFameLayout;
  className?: string;
  headerAction?: ReactNode;
  onLayoutChange?: (layout: HallOfFameLayout) => void;
};

export function HallOfFameScaledPreview({
  layout,
  className,
  headerAction,
  onLayoutChange,
}: HallOfFameScaledPreviewProps) {
  const containerRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  const stage = stageForLayout(layout);
  const scale = useFitScale(containerRef, stage.width, stage.height);
  const modalScale = useFitScale(modalRef, stage.width, stage.height, modalOpen);

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

  const orientationToolbar = onLayoutChange ? (
    <div
      className="flex items-center rounded-lg border bg-muted/30 p-0.5"
      role="group"
      aria-label="Preview orientation"
    >
      {(
        [
          { id: 'landscape' as const, label: 'Wide — landscape monitor', shortLabel: 'Wide', icon: Monitor },
          { id: 'portrait' as const, label: 'Tall — portrait monitor', shortLabel: 'Tall', icon: Smartphone },
        ] as const
      ).map((option) => {
        const Icon = option.icon;
        const active = layout === option.id;
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
            onClick={() => onLayoutChange(option.id)}
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

  const previewFrame = <HallOfFamePreviewFrame variant="preview" previewLayout={layout} />;

  return (
    <div className={cn('flex h-full min-h-0 flex-col gap-1.5', className)}>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-1.5 px-0.5">
        <div className="min-w-0">
          <p className="text-xs font-bold">Live preview</p>
          <p className="text-[10px] text-muted-foreground">Click to enlarge</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {orientationToolbar}
          {headerAction}
        </div>
      </div>

      <button
        type="button"
        ref={containerRef}
        onClick={() => setModalOpen(true)}
        title="Click to enlarge"
        className="group flex min-h-0 w-full flex-1 cursor-zoom-in justify-center overflow-hidden"
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
            {previewFrame}
          </div>
        </div>
      </button>

      {portalReady && modalOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[250] flex flex-col bg-black/70 p-4 sm:p-8"
              role="dialog"
              aria-modal="true"
              aria-label="Hall of Fame preview"
              onClick={() => setModalOpen(false)}
            >
              <div
                className="mx-auto flex h-full w-full max-w-[1200px] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      <p className="text-sm font-bold">Hall of Fame preview</p>
                      <p className="text-[10px] text-muted-foreground">Esc or click outside to close</p>
                    </div>
                    {orientationToolbar}
                  </div>
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
                      {previewFrame}
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
