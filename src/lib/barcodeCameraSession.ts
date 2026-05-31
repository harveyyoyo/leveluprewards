'use client';

import type { BrowserMultiFormatReader } from '@zxing/browser';
import {
  barcodeRearCameraConstraints,
  loadZxingModule,
  preloadBarcodeScanStack,
} from '@/lib/barcodeCameraScan';

type SharedSession = {
  stream: MediaStream | null;
  startPromise: Promise<MediaStream> | null;
  hookRefCount: number;
  loginScanWarm: boolean;
  couponCameraWarm: boolean;
};

const session: SharedSession = {
  stream: null,
  startPromise: null,
  hookRefCount: 0,
  loginScanWarm: false,
  couponCameraWarm: false,
};

function refreshKioskWarmState(): void {
  const warm = session.loginScanWarm || session.couponCameraWarm;
  if (!warm && session.hookRefCount === 0) {
    stopSharedStream();
  }
}

function stopSharedStream(): void {
  if (session.stream) {
    session.stream.getTracks().forEach((track) => track.stop());
    session.stream = null;
  }
}

async function openSharedStream(): Promise<MediaStream> {
  preloadBarcodeScanStack();
  const { BrowserMultiFormatReader } = await loadZxingModule();

  const tryGetUserMedia = async (constraints: MediaTrackConstraints) =>
    navigator.mediaDevices.getUserMedia({ video: constraints, audio: false });

  let stream: MediaStream;
  try {
    stream = await tryGetUserMedia(barcodeRearCameraConstraints());
  } catch {
    stream = await tryGetUserMedia({
      facingMode: 'user',
      width: { ideal: 640, max: 1280 },
      height: { ideal: 480, max: 720 },
      frameRate: { ideal: 30, max: 30 },
    });
  }

  try {
    const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();
    const rearCamera =
      videoInputDevices.find((device) => device.label.toLowerCase().includes('back')) ||
      videoInputDevices.find((device) => device.label.toLowerCase().includes('environment'));
    const selectedDeviceId = rearCamera?.deviceId;

    if (selectedDeviceId) {
      const currentTrack = stream.getVideoTracks()[0];
      const currentDeviceId = currentTrack?.getSettings()?.deviceId;
      if (currentDeviceId !== selectedDeviceId) {
        stream.getTracks().forEach((track) => track.stop());
        stream = await tryGetUserMedia(barcodeRearCameraConstraints(selectedDeviceId));
      }
    }
  } catch {
    // Keep the stream we already have.
  }

  session.stream = stream;
  return stream;
}

export function setKioskBarcodeCameraWarm(enabled: boolean): void {
  syncKioskBarcodeCameraWarm({ loginScan: enabled });
}

export function syncKioskBarcodeCameraWarm(opts: {
  loginScan?: boolean;
  couponCamera?: boolean;
}): void {
  if (typeof opts.loginScan === 'boolean') session.loginScanWarm = opts.loginScan;
  if (typeof opts.couponCamera === 'boolean') session.couponCameraWarm = opts.couponCamera;
  refreshKioskWarmState();
}

export function isKioskBarcodeCameraWarm(): boolean {
  return session.loginScanWarm || session.couponCameraWarm;
}

/** Acquire a shared camera stream (reused across kiosk scanner remounts when warm). */
export async function acquireBarcodeCameraStream(): Promise<MediaStream> {
  session.hookRefCount += 1;

  if (session.stream?.active) {
    return session.stream;
  }

  if (session.startPromise) {
    return session.startPromise;
  }

  session.startPromise = openSharedStream()
    .catch((err) => {
      stopSharedStream();
      throw err;
    })
    .finally(() => {
      session.startPromise = null;
    });

  return session.startPromise;
}

/** Release a hook reference; stream stays open while kiosk warm is enabled. */
export function releaseBarcodeCameraStream(force = false): void {
  session.hookRefCount = Math.max(0, session.hookRefCount - 1);
  if (force || (session.hookRefCount === 0 && !isKioskBarcodeCameraWarm())) {
    stopSharedStream();
  }
}

export function getActiveBarcodeCameraStream(): MediaStream | null {
  return session.stream?.active ? session.stream : null;
}
