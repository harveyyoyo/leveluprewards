'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { createScanDeduper } from '@/lib/libraryIntakeHelpers';
import {
  getKioskWedgeBarcodeDetector,
  kioskWedgeFrontCameraConstraints,
  scanVideoFrameForBarcode,
} from '@/lib/kioskWedgeCameraScan';

interface UseKioskWedgeCameraAssistOptions {
  /** Master switch from school settings. */
  enabled: boolean;
  /** Page/flow is active (e.g. wedge tab visible, redeem panel open). */
  active: boolean;
  onScan: (code: string) => void;
  onError?: (message: string) => void;
}

/**
 * Front-camera barcode assist for kiosk wedge flows (demo without USB scanner).
 * Uses native BarcodeDetector when available, WASM ponyfill otherwise, ZXing as last resort.
 */
export function useKioskWedgeCameraAssist({
  enabled,
  active,
  onScan,
  onError,
}: UseKioskWedgeCameraAssistOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopCancelRef = useRef(false);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const zxingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const useZxingFallbackRef = useRef(false);
  const frameSkipRef = useRef(0);
  const [hasCameraPermission, setHasCameraPermission] = useState(true);

  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);
  onScanRef.current = onScan;
  onErrorRef.current = onError;

  const shouldAcceptScan = useMemo(() => createScanDeduper(1200), []);

  const stopCamera = useCallback(() => {
    loopCancelRef.current = true;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    const video = videoRef.current;
    if (video) {
      video.onloadedmetadata = null;
      video.pause();
      video.srcObject = null;
    }
    zxingReaderRef.current = null;
    useZxingFallbackRef.current = false;
  }, []);

  const handleDecoded = useCallback(
    (code: string) => {
      const trimmed = code.trim();
      if (!trimmed || !shouldAcceptScan(trimmed)) return;
      onScanRef.current(trimmed);
    },
    [shouldAcceptScan],
  );

  const runZxingFrame = useCallback(
    async (video: HTMLVideoElement) => {
      if (!useZxingFallbackRef.current) return;
      frameSkipRef.current += 1;
      if (frameSkipRef.current % 3 !== 0) return;
      if (!zxingReaderRef.current) {
        zxingReaderRef.current = new BrowserMultiFormatReader();
      }
      if (!zxingCanvasRef.current) {
        zxingCanvasRef.current = document.createElement('canvas');
      }
      const canvas = zxingCanvasRef.current;
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (w < 32 || h < 32) return;
      const scale = Math.min(1, 640 / w);
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      try {
        const result = await zxingReaderRef.current.decodeFromCanvas(canvas);
        if (result?.getText()) handleDecoded(result.getText());
      } catch (err: unknown) {
        const name = (err as { name?: string })?.name;
        if (name !== 'NotFoundException') {
          console.warn('ZXing wedge-assist decode:', err);
        }
      }
    },
    [handleDecoded],
  );

  const scheduleNextFrame = useCallback(
    function tick(video: HTMLVideoElement) {
      if (loopCancelRef.current) return;
      const rvfc = (video as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number })
        .requestVideoFrameCallback;
      const onFrame = () => {
        if (loopCancelRef.current) return;
        void (async () => {
          if (useZxingFallbackRef.current) {
            await runZxingFrame(video);
          } else {
            const code = await scanVideoFrameForBarcode(video);
            if (code) handleDecoded(code);
          }
          if (!loopCancelRef.current) scheduleNextFrame(video);
        })();
      };
      if (typeof rvfc === 'function') {
        rvfc.call(video, onFrame);
      } else {
        window.setTimeout(onFrame, 66);
      }
    },
    [handleDecoded, runZxingFrame],
  );

  const startCamera = useCallback(async () => {
    if (streamRef.current || !videoRef.current) return;
    loopCancelRef.current = false;
    frameSkipRef.current = 0;

    try {
      try {
        await getKioskWedgeBarcodeDetector();
      } catch {
        useZxingFallbackRef.current = true;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: kioskWedgeFrontCameraConstraints(),
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;

      const beginLoop = async () => {
        try {
          await video.play();
          setHasCameraPermission(true);
          scheduleNextFrame(video);
        } catch (e) {
          console.error('Wedge-assist video play failed', e);
        }
      };

      if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
        await beginLoop();
      } else {
        video.onloadedmetadata = () => {
          video.onloadedmetadata = null;
          void beginLoop();
        };
      }
    } catch (err: unknown) {
      console.error('Wedge-assist camera error:', err);
      setHasCameraPermission(false);
      const message =
        err instanceof Error ? err.message : 'Could not access the front camera. Check permissions.';
      onErrorRef.current?.(message);
      stopCamera();
    }
  }, [scheduleNextFrame, stopCamera]);

  useEffect(() => {
    if (!enabled || !active) {
      stopCamera();
      return;
    }
    void startCamera();
    return () => {
      stopCamera();
    };
  }, [enabled, active, startCamera, stopCamera]);

  return {
    videoRef,
    hasCameraPermission,
  };
}
