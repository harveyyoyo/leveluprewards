'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

interface UseBarcodeScanner {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    hasCameraPermission: boolean;
    startScanning: () => void;
    stopScanning: () => void;
}

/**
 * Custom hook that encapsulates camera initialization and barcode scanning.
 * 
 * @param isActive - Whether scanning should be active (e.g., based on tab selection)
 * @param onScan - Callback invoked when a barcode is successfully decoded
 * @param onError - Optional callback for camera/scanning errors
 * @returns Object with videoRef, permission state, and start/stop controls
 */
export function useBarcodeScanner(
    isActive: boolean,
    onScan: (code: string) => void,
    onError?: (message: string) => void,
): UseBarcodeScanner {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState(true);
    const codeReaderRef = useRef(new BrowserMultiFormatReader());
    const streamRef = useRef<MediaStream | null>(null);

    // Consumers typically pass inline arrows, so stash the latest callbacks in
    // refs. This keeps `startScanning` stable — otherwise the `useEffect` below
    // would tear down and re-init the camera stream on every parent render.
    const onScanRef = useRef(onScan);
    const onErrorRef = useRef(onError);
    useEffect(() => {
        onScanRef.current = onScan;
        onErrorRef.current = onError;
    }, [onScan, onError]);

    const stopScanning = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }, []);

    const startScanning = useCallback(async () => {
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
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = async () => {
                    if (videoRef.current) {
                        try {
                            await videoRef.current.play();
                            codeReaderRef.current.decodeFromVideoElement(videoRef.current, (result, error) => {
                                if (result) {
                                    onScanRef.current(result.getText());
                                }
                                if (error && error.name !== 'NotFoundException') {
                                    console.error('Barcode scan error:', error);
                                }
                            });
                        } catch (e) {
                            console.error('Video play failed', e);
                        }
                    }
                };
                setHasCameraPermission(true);
            }
        } catch (err: any) {
            console.error('Camera initialization error:', err);
            setHasCameraPermission(false);
            onErrorRef.current?.(err.message || 'Could not access the camera. Please check permissions.');
        }
    }, []);

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
