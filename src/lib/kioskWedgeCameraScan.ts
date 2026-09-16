'use client';

export {
  BARCODE_CAMERA_FORMATS as KIOSK_WEDGE_BARCODE_FORMATS,
  type BarcodeCameraFormat as KioskWedgeBarcodeFormat,
  getBarcodeCameraDetector as getKioskWedgeBarcodeDetector,
  scanVideoFrameForBarcode,
} from '@/lib/barcodeCameraScan';

/** Ideal constraints for fast front-camera decode on laptops/tablets. */
export function kioskWedgeFrontCameraConstraints(): MediaTrackConstraints {
  return {
    facingMode: 'user',
    width: { ideal: 640, max: 1280 },
    height: { ideal: 480, max: 720 },
    frameRate: { ideal: 30, max: 30 },
  };
}

/** Fallback constraints when facingMode: 'user' fails (e.g. desktop with external webcam). */
export function kioskWedgeFallbackCameraConstraints(): MediaTrackConstraints {
  return {
    width: { ideal: 640, max: 1280 },
    height: { ideal: 480, max: 720 },
    frameRate: { ideal: 30, max: 30 },
  };
}

