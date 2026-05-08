'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

interface UseBarcodeScanner {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    hasCameraPermission: boolean;
    startScanning: () => void;
    stopScanning: () => void;
}

export function useBarcodeScanner(
    isActive: boolean,
    onScan: (code: string) => void,
    onError?: (message: string) => void,
): UseBarcodeScanner {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState(true);
    const codeReaderRef = useRef(new BrowserMultiFormatReader());
    const streamRef = useRef<MediaStream | null>(null);
    const controlsRef = useRef<{ stop: () => void } | null>(null);
    const isStartingRef = useRef(false);
    const onScanRef = useRef(onScan);
    const onErrorRef = useRef(onError);

    useEffect(() => {
        onScanRef.current = onScan;
    }, [onScan]);

    useEffect(() => {
        onErrorRef.current = onError;
    }, [onError]);

    const stopScanning = useCallback(() => {
        controlsRef.current?.stop();
        controlsRef.current = null;
        isStartingRef.current = false;

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.onloadedmetadata = null;
            videoRef.current.pause();
            videoRef.current.srcObject = null;
        }
    }, []);

    const startScanning = useCallback(async () => {
        if (isStartingRef.current || streamRef.current || controlsRef.current) return;
        isStartingRef.current = true;

        try {
            // First, request camera permission with facingMode preference.
            // This triggers the permission prompt on mobile browsers and
            // ensures devices are discoverable afterwards.
            let stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
            });

            // Now that permission is granted, enumerate devices to find
            // the best rear camera (labels are only available after permission).
            try {
                const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();
                const rearCamera = videoInputDevices.find(device => device.label.toLowerCase().includes('back'))
                    || videoInputDevices.find(device => device.label.toLowerCase().includes('environment'));

                const selectedDeviceId = rearCamera?.deviceId;

                // If we found a specific rear camera and it's different from
                // the one already in use, switch to it.
                if (selectedDeviceId) {
                    const currentTrack = stream.getVideoTracks()[0];
                    const currentDeviceId = currentTrack?.getSettings()?.deviceId;
                    if (currentDeviceId !== selectedDeviceId) {
                        stream.getTracks().forEach(track => track.stop());
                        stream = await navigator.mediaDevices.getUserMedia({
                            video: {
                                deviceId: { exact: selectedDeviceId },
                            },
                        });
                    }
                }
            } catch (enumError) {
                // Device enumeration failed — continue with the initial stream
                console.warn('Device enumeration failed, using default camera:', enumError);
            }

            streamRef.current = stream;

            if (videoRef.current) {
                const video = videoRef.current;
                video.srcObject = stream;
                const beginDecode = async () => {
                    try {
                        await video.play();
                        controlsRef.current = await codeReaderRef.current.decodeFromVideoElement(video, (result, error) => {
                            if (result) {
                                onScanRef.current(result.getText());
                            }
                            if (error && error.name !== 'NotFoundException') {
                                console.error('Barcode scan error:', error);
                            }
                        });
                    } catch (e) {
                        console.error('Video play failed', e);
                    } finally {
                        isStartingRef.current = false;
                    }
                };

                if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
                    void beginDecode();
                } else {
                    video.onloadedmetadata = () => {
                        video.onloadedmetadata = null;
                        void beginDecode();
                    };
                }
                setHasCameraPermission(true);
            } else {
                isStartingRef.current = false;
                stream.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        } catch (err: any) {
            console.error('Camera initialization error:', err);
            setHasCameraPermission(false);
            onErrorRef.current?.(err.message || 'Could not access the camera. Please check permissions.');
            stopScanning();
        }
    }, [stopScanning]);

    useEffect(() => {
        if (!isActive) {
            stopScanning();
            return;
        }

        startScanning();

        return () => {
            stopScanning();
        };
    }, [isActive, startScanning, stopScanning]);

    return {
        videoRef,
        hasCameraPermission,
        startScanning,
        stopScanning,
    };
}

