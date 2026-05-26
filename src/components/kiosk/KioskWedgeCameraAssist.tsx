'use client';

import { useState } from 'react';
import { Camera, CameraOff } from 'lucide-react';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useKioskWedgeCameraAssist } from '@/hooks/useKioskWedgeCameraAssist';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export type KioskWedgeCameraAssistProps = {
  /** Wedge/manual flow is on screen (not camera-only redemption tab). */
  active: boolean;
  onScan: (code: string) => void;
  onError?: (message: string) => void;
  className?: string;
};

/**
 * Optional front-camera assist while wedge scanning stays enabled.
 * Admin enables in Basic settings; operators toggle a small preview on the kiosk page.
 */
export function KioskWedgeCameraAssist({
  active,
  onScan,
  onError,
  className,
}: KioskWedgeCameraAssistProps) {
  const { settings } = useSettings();
  const enabled = settings.kioskWedgeDemoCameraEnabled === true;
  const [previewOpen, setPreviewOpen] = useState(false);

  const { videoRef, hasCameraPermission } = useKioskWedgeCameraAssist({
    enabled,
    active: enabled && active,
    onScan,
    onError,
  });

  if (!enabled) return null;

  return (
    <div
      className={cn('no-print fixed z-[75] flex flex-col items-start gap-2', className)}
      style={{ bottom: '1rem', left: '1rem' }}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-xl border-2 border-primary/40 bg-black shadow-lg transition-all',
          previewOpen ? 'opacity-100' : 'h-px w-px overflow-hidden border-0 opacity-0',
        )}
        style={previewOpen ? { width: 'min(42vw, 200px)' } : undefined}
        aria-hidden={!previewOpen}
      >
        <video
          ref={videoRef}
          className={cn('w-full object-cover', previewOpen ? 'aspect-[4/3]' : 'h-px w-px')}
          playsInline
          muted
          tabIndex={previewOpen ? 0 : -1}
          aria-label={previewOpen ? 'Front camera preview for barcode aiming' : undefined}
          style={previewOpen ? { transform: 'scaleX(-1)' } : undefined}
        />
        {previewOpen ? (
          <>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-[55%] w-[75%] rounded-lg border-2 border-dashed border-white/35" />
            </div>
            {!hasCameraPermission ? (
              <div className="absolute inset-0 flex items-center justify-center bg-background/90 p-2 text-center text-[10px] font-semibold text-destructive">
                Camera blocked
              </div>
            ) : null}
            <p className="bg-black/70 px-2 py-1 text-center text-[9px] font-bold uppercase tracking-wider text-white/90">
              Aim barcode in frame
            </p>
          </>
        ) : null}
      </div>

      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="h-8 gap-1.5 rounded-full border-2 px-3 text-[10px] font-bold uppercase tracking-wider shadow-md"
        onClick={() => setPreviewOpen((v) => !v)}
        aria-pressed={previewOpen}
        aria-label={previewOpen ? 'Hide demo camera preview' : 'Show demo camera preview'}
      >
        {previewOpen ? (
          <>
            <CameraOff className="h-3.5 w-3.5" aria-hidden />
            Hide camera
          </>
        ) : (
          <>
            <Camera className="h-3.5 w-3.5" aria-hidden />
            Show camera
          </>
        )}
      </Button>
    </div>
  );
}
