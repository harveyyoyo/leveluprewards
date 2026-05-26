'use client';

/** Barcode formats used for kiosk wedge-assist (student cards, coupons, UPC). */
export const KIOSK_WEDGE_BARCODE_FORMATS = [
  'qr_code',
  'code_128',
  'code_39',
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'itf',
  'codabar',
  'data_matrix',
  'pdf417',
] as const;

export type KioskWedgeBarcodeFormat = (typeof KIOSK_WEDGE_BARCODE_FORMATS)[number];

let detectorPromise: Promise<BarcodeDetector> | null = null;

async function createDetector(): Promise<BarcodeDetector> {
  const formats = [...KIOSK_WEDGE_BARCODE_FORMATS];
  const GlobalDetector = (globalThis as typeof globalThis & { BarcodeDetector?: typeof BarcodeDetector })
    .BarcodeDetector;
  if (GlobalDetector) {
    try {
      const native = new GlobalDetector({ formats });
      const supported = await GlobalDetector.getSupportedFormats();
      if (supported.length > 0) return native;
    } catch {
      // Fall through to WASM ponyfill.
    }
  }
  const { BarcodeDetector: PonyfillDetector } = await import('barcode-detector/pure');
  return new PonyfillDetector({ formats });
}

export function getKioskWedgeBarcodeDetector(): Promise<BarcodeDetector> {
  if (!detectorPromise) {
    detectorPromise = createDetector().catch((err) => {
      detectorPromise = null;
      throw err;
    });
  }
  return detectorPromise;
}

export async function scanVideoFrameForBarcode(video: HTMLVideoElement): Promise<string | null> {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return null;
  if (video.videoWidth < 32 || video.videoHeight < 32) return null;
  try {
    const detector = await getKioskWedgeBarcodeDetector();
    const results = await detector.detect(video);
    const value = results[0]?.rawValue?.trim();
    return value || null;
  } catch {
    return null;
  }
}

/** Ideal constraints for fast front-camera decode on laptops/tablets. */
export function kioskWedgeFrontCameraConstraints(): MediaTrackConstraints {
  return {
    facingMode: 'user',
    width: { ideal: 640, max: 1280 },
    height: { ideal: 480, max: 720 },
    frameRate: { ideal: 30, max: 30 },
  };
}
