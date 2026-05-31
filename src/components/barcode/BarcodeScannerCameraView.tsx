'use client';

import type { Ref } from 'react';
import { Camera, ScanLine, ZoomIn } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
  BARCODE_SCANNER_ZOOM_MAX,
  BARCODE_SCANNER_ZOOM_DEFAULT,
  BARCODE_SCANNER_ZOOM_MIN,
  BARCODE_SCANNER_ZOOM_STEP,
  formatBarcodeScannerZoomLabel,
} from '@/lib/barcodeScannerVideo';
import type { BarcodeScannerStatus } from '@/lib/barcodeScannerStatus';
import { cn } from '@/lib/utils';

export type BarcodeScannerCameraViewProps = {
  videoRef: Ref<HTMLVideoElement | null>;
  hasCameraPermission: boolean;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  className?: string;
  viewportClassName?: string;
  showZoomSlider?: boolean;
  hintText?: string;
  /** Dashed aim frame inside the viewport */
  showAimFrame?: boolean;
  /** Live scan diagnostics (kiosk troubleshooting). */
  scanStatus?: BarcodeScannerStatus | null;
  showScanFeedback?: boolean;
};

function phaseDotClass(phase: BarcodeScannerStatus['phase']): string {
  switch (phase) {
    case 'scanning':
      return 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]';
    case 'lookup':
    case 'paused':
      return 'bg-amber-400 animate-pulse';
    case 'starting':
    case 'camera-ready':
      return 'bg-sky-400 animate-pulse';
    case 'error':
      return 'bg-red-500';
    default:
      return 'bg-muted-foreground/50';
  }
}

export function BarcodeScannerCameraView({
  videoRef,
  hasCameraPermission,
  zoom,
  onZoomChange,
  className,
  viewportClassName,
  showZoomSlider = true,
  hintText,
  showAimFrame = true,
  scanStatus,
  showScanFeedback = false,
}: BarcodeScannerCameraViewProps) {
  const feedbackOn = showScanFeedback && scanStatus;
  const displayHint = hintText ?? scanStatus?.hint ?? 'Position barcode within the frame';

  return (
    <div className={cn('space-y-3', className)}>
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-xl border-2 border-border bg-black shadow-xl',
          viewportClassName,
        )}
      >
        <video
          ref={videoRef as React.Ref<HTMLVideoElement>}
          className="absolute inset-0 h-full w-full object-cover"
          playsInline
          muted
        />
        {showAimFrame ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              className={cn(
                'h-3/4 w-3/4 rounded-[1.5rem] border-2 border-dashed transition-colors duration-300',
                scanStatus?.phase === 'scanning'
                  ? 'border-emerald-300/70'
                  : scanStatus?.phase === 'lookup' || scanStatus?.phase === 'paused'
                    ? 'border-amber-300/80'
                    : 'border-white/30 animate-pulse',
              )}
            />
          </div>
        ) : null}

        {feedbackOn ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/75 to-transparent px-2 pb-6 pt-2">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white">
              <span className={cn('h-2 w-2 shrink-0 rounded-full', phaseDotClass(scanStatus.phase))} aria-hidden />
              <ScanLine className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
              <span className="truncate">{scanStatus.hint}</span>
            </div>
          </div>
        ) : null}

        {feedbackOn && scanStatus.framesDecoded > 0 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-5">
            <p className="truncate text-[9px] font-medium tabular-nums text-white/85">{scanStatus.detail}</p>
            <p className="mt-0.5 text-[9px] font-bold tabular-nums text-white/60">
              {scanStatus.framesPerSec > 0 ? `${scanStatus.framesPerSec} fps` : '— fps'}
              {' · '}
              {scanStatus.framesDecoded} tries
              {scanStatus.detectorKind !== 'none' ? ` · ${scanStatus.detectorKind} detector` : ''}
            </p>
          </div>
        ) : null}

        {!hasCameraPermission ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 p-6 text-center backdrop-blur-sm">
            <Camera className="mb-4 h-12 w-12 text-destructive" />
            <p className="font-bold text-foreground">Camera access required</p>
            <p className="mt-2 text-xs text-muted-foreground">Please enable camera in settings</p>
          </div>
        ) : null}
      </div>

      {showZoomSlider && hasCameraPermission ? (
        <div className="space-y-1.5 px-1">
          <div className="flex items-center justify-between gap-2">
            <Label
              htmlFor="barcode-scanner-zoom"
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
            >
              <ZoomIn className="h-3.5 w-3.5" aria-hidden />
              Zoom
            </Label>
            <span className="text-[10px] font-bold tabular-nums text-muted-foreground">
              {formatBarcodeScannerZoomLabel(zoom)}
            </span>
          </div>
          <Slider
            id="barcode-scanner-zoom"
            min={BARCODE_SCANNER_ZOOM_MIN}
            max={BARCODE_SCANNER_ZOOM_MAX}
            step={BARCODE_SCANNER_ZOOM_STEP}
            value={[zoom]}
            onValueChange={(values) => onZoomChange(values[0] ?? BARCODE_SCANNER_ZOOM_DEFAULT)}
            aria-label="Camera digital zoom"
          />
        </div>
      ) : null}

      {displayHint ? (
        <p className="text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">{displayHint}</p>
      ) : null}

      {feedbackOn && scanStatus.phase === 'scanning' && scanStatus.framesDecoded > 30 && scanStatus.framesPerSec > 0 ? (
        <p className="text-center text-[10px] font-medium leading-snug text-muted-foreground">
          Tip: fill the dashed box, hold still 1 second, and increase zoom if the barcode looks small.
        </p>
      ) : null}
    </div>
  );
}
