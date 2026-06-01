'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { BrowserMultiFormatReader } from '@zxing/browser';
import {
    applyBarcodeScannerVideoStyle,
    clearBarcodeScannerVideoStyle,
    clampBarcodeScannerZoom,
    persistBarcodeScannerZoom,
    readStoredBarcodeScannerZoom,
} from '@/lib/barcodeScannerVideo';
import {
    acquireBarcodeCameraStream,
    releaseBarcodeCameraStream,
} from '@/lib/barcodeCameraSession';
import {
    describeBarcodeScanEngine,
    getBarcodeCameraDetector,
    getBarcodeDetectorKind,
    loadZxingModule,
    preloadBarcodeScanStack,
    scanVideoFrameHybrid,
} from '@/lib/barcodeCameraScan';
import { createScanDeduper } from '@/lib/library/libraryIntakeHelpers';
import {
    barcodeScannerHintForPhase,
    INITIAL_BARCODE_SCANNER_STATUS,
    type BarcodeScannerPhase,
    type BarcodeScannerStatus,
} from '@/lib/barcodeScannerStatus';

export type { BarcodeScannerStatus };

export type UseBarcodeScannerOptions = {
    /** Feature/setting gate: when false the camera never starts. */
    cameraEnabled?: boolean;
    /** Keep the shared camera stream open while decode is paused. */
    keepCameraWarm?: boolean;
    /** Show live scan feedback on the camera UI (kiosk). */
    showScanFeedback?: boolean;
};

interface UseBarcodeScanner {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    hasCameraPermission: boolean;
    zoom: number;
    setZoom: (zoom: number) => void;
    scanStatus: BarcodeScannerStatus;
    startScanning: () => void;
    stopScanning: () => void;
    resumeScanning: () => void;
}

function buildStatus(
    partial: Partial<BarcodeScannerStatus> & Pick<BarcodeScannerStatus, 'phase' | 'decodeActive'>,
): BarcodeScannerStatus {
    const hint = partial.hint ?? barcodeScannerHintForPhase(partial.phase, partial.decodeActive);
    return {
        ...INITIAL_BARCODE_SCANNER_STATUS,
        ...partial,
        hint,
    };
}

export function useBarcodeScanner(
    decodeActive: boolean,
    onScan: (code: string) => void | Promise<void>,
    onError?: (message: string) => void,
    options?: UseBarcodeScannerOptions,
): UseBarcodeScanner {
    const cameraEnabled = options?.cameraEnabled !== false;
    const keepCameraWarm = options?.keepCameraWarm ?? cameraEnabled;

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState(true);
    const [cameraReady, setCameraReady] = useState(false);
    const [zoom, setZoomState] = useState(() => readStoredBarcodeScannerZoom());
    const [scanStatus, setScanStatus] = useState<BarcodeScannerStatus>(() =>
        buildStatus({ phase: 'off', decodeActive: false }),
    );
    const zoomRef = useRef(zoom);
    const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const loopCancelRef = useRef(false);
    const decodePausedRef = useRef(false);
    const decodeInFlightRef = useRef(false);
    const lookupInFlightRef = useRef(false);
    const isStartingRef = useRef(false);
    const acquiredStreamRef = useRef(false);
    const framesDecodedRef = useRef(0);
    const fpsWindowRef = useRef({ count: 0, startedAt: Date.now() });
    const lastStatusUiAtRef = useRef(0);
    const onScanRef = useRef(onScan);
    const onErrorRef = useRef(onError);
    const decodeActiveRef = useRef(decodeActive);

    const shouldAcceptScan = useMemo(() => createScanDeduper(1200), []);

    const patchStatus = useCallback((partial: Partial<BarcodeScannerStatus> & { phase?: BarcodeScannerPhase }) => {
        setScanStatus((prev) => {
            const phase = partial.phase ?? prev.phase;
            const decode = partial.decodeActive ?? prev.decodeActive;
            return buildStatus({
                ...prev,
                ...partial,
                phase,
                decodeActive: decode,
            });
        });
    }, []);

    useEffect(() => {
        zoomRef.current = zoom;
    }, [zoom]);

    useEffect(() => {
        onScanRef.current = onScan;
    }, [onScan]);

    useEffect(() => {
        onErrorRef.current = onError;
    }, [onError]);

    useEffect(() => {
        decodeActiveRef.current = decodeActive;
        patchStatus({ decodeActive });
    }, [decodeActive, patchStatus]);

    useEffect(() => {
        if (!cameraEnabled) {
            patchStatus({ phase: 'off', cameraReady: false, decodeActive: false });
        }
    }, [cameraEnabled, patchStatus]);

    const setZoom = useCallback((value: number) => {
        const clamped = clampBarcodeScannerZoom(value);
        setZoomState(clamped);
        persistBarcodeScannerZoom(clamped);
        if (videoRef.current) {
            applyBarcodeScannerVideoStyle(videoRef.current, clamped);
        }
    }, []);

    const resumeScanning = useCallback(() => {
        decodePausedRef.current = false;
        lookupInFlightRef.current = false;
        patchStatus({ phase: decodeActiveRef.current ? 'scanning' : 'camera-ready' });
    }, [patchStatus]);

    const stopDecodeLoop = useCallback(() => {
        loopCancelRef.current = true;
        decodeInFlightRef.current = false;
    }, []);

    const releaseStream = useCallback((force = false) => {
        if (!acquiredStreamRef.current) return;
        acquiredStreamRef.current = false;
        streamRef.current = null;
        releaseBarcodeCameraStream(force);
    }, []);

    const stopCamera = useCallback(
        (force = false) => {
            stopDecodeLoop();
            isStartingRef.current = false;
            decodePausedRef.current = false;
            lookupInFlightRef.current = false;
            setCameraReady(false);
            framesDecodedRef.current = 0;

            releaseStream(force);

            if (videoRef.current) {
                const video = videoRef.current;
                video.onloadedmetadata = null;
                video.pause();
                video.srcObject = null;
                clearBarcodeScannerVideoStyle(video);
            }
            zxingReaderRef.current = null;
            patchStatus({
                phase: 'off',
                cameraReady: false,
                videoWidth: 0,
                videoHeight: 0,
                framesDecoded: 0,
                framesPerSec: 0,
            });
        },
        [patchStatus, releaseStream, stopDecodeLoop],
    );

    const noteFrameAttempt = useCallback(
        (video: HTMLVideoElement, engine: string | null, force = false) => {
            framesDecodedRef.current += 1;
            const win = fpsWindowRef.current;
            win.count += 1;
            const elapsed = Date.now() - win.startedAt;
            let fps = 0;
            if (elapsed >= 1000) {
                fps = Math.round((win.count * 1000) / elapsed);
                win.count = 0;
                win.startedAt = Date.now();
            }
            const now = Date.now();
            if (!force && now - lastStatusUiAtRef.current < 300) return;
            lastStatusUiAtRef.current = now;
            patchStatus({
                phase: lookupInFlightRef.current ? 'lookup' : decodePausedRef.current ? 'paused' : 'scanning',
                cameraReady: true,
                videoWidth: video.videoWidth,
                videoHeight: video.videoHeight,
                framesDecoded: framesDecodedRef.current,
                ...(fps > 0 ? { framesPerSec: fps } : {}),
                lastEngine: engine,
                detectorKind: getBarcodeDetectorKind(),
                detail: [
                    video.videoWidth && video.videoHeight ? `${video.videoWidth}×${video.videoHeight}` : null,
                    getBarcodeDetectorKind() !== 'none' ? `Detector: ${getBarcodeDetectorKind()}` : null,
                    engine ? `Last read: ${engine}` : 'No barcode in last frame',
                    `${framesDecodedRef.current} frames tried`,
                ]
                    .filter(Boolean)
                    .join(' · '),
            });
        },
        [patchStatus],
    );

    const handleDecoded = useCallback(
        (code: string, engineLabel: string) => {
            const trimmed = code.trim();
            if (!trimmed || !shouldAcceptScan(trimmed)) return;
            if (lookupInFlightRef.current || decodePausedRef.current) return;
            if (!decodeActiveRef.current) return;

            lookupInFlightRef.current = true;
            decodePausedRef.current = true;
            patchStatus({
                phase: 'lookup',
                detail: `Read ${trimmed.slice(0, 24)}${trimmed.length > 24 ? '…' : ''} via ${engineLabel}`,
            });

            void Promise.resolve(onScanRef.current(trimmed))
                .catch((err) => {
                    console.error('Barcode scan handler error:', err);
                })
                .finally(() => {
                    lookupInFlightRef.current = false;
                    window.setTimeout(() => {
                        if (decodeActiveRef.current) {
                            decodePausedRef.current = false;
                            patchStatus({ phase: 'scanning' });
                        }
                    }, 300);
                });
        },
        [patchStatus, shouldAcceptScan],
    );

    const ensureZxingReader = useCallback(async () => {
        const { BrowserMultiFormatReader } = await loadZxingModule();
        if (!zxingReaderRef.current) {
            zxingReaderRef.current = new BrowserMultiFormatReader();
        }
        return zxingReaderRef.current;
    }, []);

    const runDecodeFrame = useCallback(
        async (video: HTMLVideoElement) => {
            const reader = await ensureZxingReader();
            const attempt = await scanVideoFrameHybrid(video, reader);
            const engineLabel = describeBarcodeScanEngine(attempt.engine);
            noteFrameAttempt(video, attempt.engine ? engineLabel : null, !!attempt.code);
            if (attempt.code) {
                handleDecoded(attempt.code, engineLabel);
            }
        },
        [ensureZxingReader, handleDecoded, noteFrameAttempt],
    );

    const scheduleNextFrame = useCallback(
        function tick(video: HTMLVideoElement) {
            if (loopCancelRef.current) return;

            const rvfc = (video as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number })
                .requestVideoFrameCallback;
            const onFrame = () => {
                if (loopCancelRef.current) return;
                if (!decodeActiveRef.current || decodePausedRef.current) {
                    scheduleNextFrame(video);
                    return;
                }
                if (decodeInFlightRef.current) {
                    scheduleNextFrame(video);
                    return;
                }
                if (video.videoWidth < 32 || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
                    patchStatus({
                        phase: 'starting',
                        detail: 'Waiting for camera frames…',
                        videoWidth: video.videoWidth,
                        videoHeight: video.videoHeight,
                    });
                    scheduleNextFrame(video);
                    return;
                }

                decodeInFlightRef.current = true;
                void (async () => {
                    try {
                        await runDecodeFrame(video);
                    } finally {
                        decodeInFlightRef.current = false;
                        if (!loopCancelRef.current) scheduleNextFrame(video);
                    }
                })();
            };

            if (typeof rvfc === 'function') {
                rvfc.call(video, onFrame);
            } else {
                window.setTimeout(onFrame, 33);
            }
        },
        [patchStatus, runDecodeFrame],
    );

    const startDecodeLoop = useCallback(
        (video: HTMLVideoElement) => {
            stopDecodeLoop();
            loopCancelRef.current = false;
            framesDecodedRef.current = 0;
            fpsWindowRef.current = { count: 0, startedAt: Date.now() };
            patchStatus({
                phase: 'scanning',
                cameraReady: true,
                videoWidth: video.videoWidth,
                videoHeight: video.videoHeight,
                detectorKind: getBarcodeDetectorKind(),
            });
            scheduleNextFrame(video);
        },
        [patchStatus, scheduleNextFrame, stopDecodeLoop],
    );

    const attachStreamToVideo = useCallback(async (video: HTMLVideoElement) => {
        if (!streamRef.current) return;
        video.srcObject = streamRef.current;
        applyBarcodeScannerVideoStyle(video, zoomRef.current);
        try {
            await video.play();
        } catch (e) {
            console.error('Video play failed', e);
        }
    }, []);

    const beginDecodeIfActive = useCallback(
        (video: HTMLVideoElement | null | undefined) => {
            if (!video || !streamRef.current) return;
            if (decodeActiveRef.current) {
                decodePausedRef.current = false;
                startDecodeLoop(video);
            } else {
                patchStatus({
                    phase: 'camera-ready',
                    cameraReady: true,
                    videoWidth: video.videoWidth,
                    videoHeight: video.videoHeight,
                    detectorKind: getBarcodeDetectorKind(),
                    detail: 'Camera warm — switch to Scan tab',
                });
            }
        },
        [patchStatus, startDecodeLoop],
    );

    const startCamera = useCallback(async () => {
        if (isStartingRef.current) return;

        if (acquiredStreamRef.current && streamRef.current?.active) {
            const video = videoRef.current;
            if (video && video.srcObject !== streamRef.current) {
                await attachStreamToVideo(video);
            }
            setCameraReady(true);
            beginDecodeIfActive(video ?? undefined);
            return;
        }

        isStartingRef.current = true;
        patchStatus({ phase: 'starting', cameraReady: false, detail: 'Requesting camera…' });

        try {
            preloadBarcodeScanStack();
            await getBarcodeCameraDetector().catch(() => undefined);

            const stream = await acquireBarcodeCameraStream();
            acquiredStreamRef.current = true;
            streamRef.current = stream;
            setHasCameraPermission(true);
            setCameraReady(true);

            const video = videoRef.current;
            if (video) {
                await attachStreamToVideo(video);
                beginDecodeIfActive(video);
            } else {
                patchStatus({
                    phase: 'camera-ready',
                    cameraReady: true,
                    detectorKind: getBarcodeDetectorKind(),
                    detail: 'Camera open — waiting for preview',
                });
            }
        } catch (err: unknown) {
            console.error('Camera initialization error:', err);
            setHasCameraPermission(false);
            setCameraReady(false);
            const message =
                err instanceof Error ? err.message : 'Could not access the camera. Please check permissions.';
            patchStatus({ phase: 'error', cameraReady: false, detail: message });
            onErrorRef.current?.(message);
            stopCamera(true);
        } finally {
            isStartingRef.current = false;
        }
    }, [attachStreamToVideo, beginDecodeIfActive, patchStatus, stopCamera]);

    const stopScanning = useCallback(() => {
        stopCamera(true);
    }, [stopCamera]);

    const startScanning = useCallback(() => {
        void startCamera();
    }, [startCamera]);

    useEffect(() => {
        if (!cameraEnabled) {
            stopCamera(true);
            return;
        }

        void startCamera();

        return () => {
            stopDecodeLoop();
            // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup must read latest video node
            const video = videoRef.current;
            if (video) {
                video.pause();
                video.srcObject = null;
                clearBarcodeScannerVideoStyle(video);
            }
            if (!keepCameraWarm) {
                stopCamera(true);
            } else {
                releaseStream(false);
                setCameraReady(false);
            }
        };
    }, [cameraEnabled, keepCameraWarm, startCamera, stopCamera, stopDecodeLoop, releaseStream]);

    useEffect(() => {
        const video = videoRef.current;
        if (!cameraEnabled || !cameraReady || !streamRef.current || !video) return;

        if (video.srcObject !== streamRef.current) {
            void attachStreamToVideo(video).then(() => beginDecodeIfActive(video));
            return;
        }

        if (decodeActive) {
            decodePausedRef.current = false;
            startDecodeLoop(video);
        } else {
            stopDecodeLoop();
            patchStatus({
                phase: 'camera-ready',
                cameraReady: true,
                videoWidth: video.videoWidth,
                videoHeight: video.videoHeight,
                detectorKind: getBarcodeDetectorKind(),
            });
        }
    }, [
        decodeActive,
        cameraEnabled,
        cameraReady,
        attachStreamToVideo,
        beginDecodeIfActive,
        startDecodeLoop,
        stopDecodeLoop,
        patchStatus,
    ]);

    useEffect(() => {
        if (!cameraEnabled || !cameraReady || !streamRef.current) return;
        const video = videoRef.current;
        if (!video || video.srcObject === streamRef.current) return;
        void attachStreamToVideo(video).then(() => beginDecodeIfActive(video));
    });

    useEffect(() => {
        if (!cameraEnabled || !videoRef.current) return;
        applyBarcodeScannerVideoStyle(videoRef.current, zoom);
    }, [zoom, cameraEnabled]);

    return {
        videoRef,
        hasCameraPermission,
        zoom,
        setZoom,
        scanStatus,
        startScanning,
        stopScanning,
        resumeScanning,
    };
}
