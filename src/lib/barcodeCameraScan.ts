'use client';

import type { BrowserMultiFormatReader } from '@zxing/browser';

/** Barcode formats for student cards, coupons, library books, and UPC. */
export const BARCODE_CAMERA_FORMATS = [
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

export type BarcodeCameraFormat = (typeof BARCODE_CAMERA_FORMATS)[number];

/** Matches the dashed aim frame in BarcodeScannerCameraView (75% of viewport). */
export const BARCODE_AIM_FRAME_RATIO = 0.75;

/** Max decode width after ROI crop (keeps ZXing / WASM fast). */
export const BARCODE_DECODE_MAX_WIDTH = 640;

export type BarcodeScanEngine =
  | 'native-video'
  | 'native-roi'
  | 'zxing-roi'
  | 'zxing-full'
  | null;

export type BarcodeScanAttempt = {
  code: string | null;
  engine: BarcodeScanEngine;
};

let detectorPromise: Promise<BarcodeDetector> | null = null;
let zxingModulePromise: Promise<typeof import('@zxing/browser')> | null = null;
let detectorKind: 'native' | 'wasm' = 'wasm';

export function loadZxingModule() {
  if (!zxingModulePromise) {
    zxingModulePromise = import('@zxing/browser');
  }
  return zxingModulePromise;
}

async function createDetector(): Promise<BarcodeDetector> {
  const formats = [...BARCODE_CAMERA_FORMATS];
  const GlobalDetector = (globalThis as typeof globalThis & { BarcodeDetector?: typeof BarcodeDetector })
    .BarcodeDetector;
  if (GlobalDetector) {
    try {
      const native = new GlobalDetector({ formats });
      const supported = await GlobalDetector.getSupportedFormats();
      if (supported.length > 0) {
        detectorKind = 'native';
        return native;
      }
    } catch {
      // Fall through to WASM ponyfill.
    }
  }
  const { BarcodeDetector: PonyfillDetector } = await import('barcode-detector/pure');
  detectorKind = 'wasm';
  return new PonyfillDetector({ formats });
}

export function getBarcodeCameraDetector(): Promise<BarcodeDetector> {
  if (!detectorPromise) {
    detectorPromise = createDetector().catch((err) => {
      detectorPromise = null;
      throw err;
    });
  }
  return detectorPromise;
}

export function getBarcodeDetectorKind(): 'native' | 'wasm' | 'none' {
  if (!detectorPromise) return 'none';
  return detectorKind;
}

/** Warm WASM + native detector modules before the user opens the scan tab. */
export function preloadBarcodeScanStack(): void {
  void loadZxingModule();
  void getBarcodeCameraDetector().catch(() => {
    // ZXing fallback remains available.
  });
}

/** Ideal constraints for fast rear/environment camera decode on kiosks and tablets. */
export function barcodeRearCameraConstraints(deviceId?: string): MediaTrackConstraints {
  const base: MediaTrackConstraints = {
    facingMode: 'environment',
    width: { ideal: 640, max: 1280 },
    height: { ideal: 480, max: 720 },
    frameRate: { ideal: 30, max: 30 },
  };
  if (deviceId) {
    return { ...base, deviceId: { exact: deviceId } };
  }
  return base;
}

export type BarcodeScanRoi = {
  /** Fraction of frame width/height centered on the aim frame (default 0.75). */
  ratio?: number;
};

let roiCanvas: HTMLCanvasElement | null = null;
let fullCanvas: HTMLCanvasElement | null = null;

/** Draw the center ROI from `video` onto a reusable canvas; returns false if frame not ready. */
export function drawBarcodeScanRoi(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  roi: BarcodeScanRoi = {},
): boolean {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (w < 32 || h < 32) return false;

  const ratio = roi.ratio ?? BARCODE_AIM_FRAME_RATIO;
  const roiW = Math.round(w * ratio);
  const roiH = Math.round(h * ratio);
  const sx = Math.round((w - roiW) / 2);
  const sy = Math.round((h - roiH) / 2);

  const scale = Math.min(1, BARCODE_DECODE_MAX_WIDTH / roiW);
  canvas.width = Math.round(roiW * scale);
  canvas.height = Math.round(roiH * scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  ctx.drawImage(video, sx, sy, roiW, roiH, 0, 0, canvas.width, canvas.height);
  return true;
}

function drawFullFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement): boolean {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (w < 32 || h < 32) return false;
  const scale = Math.min(1, BARCODE_DECODE_MAX_WIDTH / w);
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return true;
}

function getRoiCanvas(): HTMLCanvasElement {
  if (!roiCanvas) {
    roiCanvas = document.createElement('canvas');
  }
  return roiCanvas;
}

function getFullCanvas(): HTMLCanvasElement {
  if (!fullCanvas) {
    fullCanvas = document.createElement('canvas');
  }
  return fullCanvas;
}

async function detectWithBarcodeDetector(source: HTMLVideoElement | HTMLCanvasElement): Promise<string | null> {
  try {
    const detector = await getBarcodeCameraDetector();
    const results = await detector.detect(source);
    return results[0]?.rawValue?.trim() || null;
  } catch {
    return null;
  }
}

async function decodeWithZxing(
  source: HTMLCanvasElement,
  reader: BrowserMultiFormatReader,
): Promise<string | null> {
  try {
    const result = await reader.decodeFromCanvas(source);
    return result?.getText()?.trim() || null;
  } catch (err: unknown) {
    const name = (err as { name?: string })?.name;
    if (name === 'NotFoundException') return null;
    throw err;
  }
}

/** Try native detector + ZXing on ROI, then full frame — best chance to read student cards. */
export async function scanVideoFrameHybrid(
  video: HTMLVideoElement,
  zxingReader: BrowserMultiFormatReader | null,
  roi: BarcodeScanRoi = { ratio: BARCODE_AIM_FRAME_RATIO },
): Promise<BarcodeScanAttempt> {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    return { code: null, engine: null };
  }
  if (video.videoWidth < 32 || video.videoHeight < 32) {
    return { code: null, engine: null };
  }

  const nativeVideo = await detectWithBarcodeDetector(video);
  if (nativeVideo) return { code: nativeVideo, engine: 'native-video' };

  const roiCanvasEl = getRoiCanvas();
  if (drawBarcodeScanRoi(video, roiCanvasEl, roi)) {
    const nativeRoi = await detectWithBarcodeDetector(roiCanvasEl);
    if (nativeRoi) return { code: nativeRoi, engine: 'native-roi' };

    if (zxingReader) {
      const zxingRoi = await decodeWithZxing(roiCanvasEl, zxingReader);
      if (zxingRoi) return { code: zxingRoi, engine: 'zxing-roi' };
    }
  }

  if (zxingReader) {
    const fullCanvasEl = getFullCanvas();
    if (drawFullFrame(video, fullCanvasEl)) {
      const zxingFull = await decodeWithZxing(fullCanvasEl, zxingReader);
      if (zxingFull) return { code: zxingFull, engine: 'zxing-full' };
    }
  }

  return { code: null, engine: null };
}

/** @deprecated Use scanVideoFrameHybrid */
export async function scanVideoFrameForBarcode(
  video: HTMLVideoElement,
  roi: BarcodeScanRoi = { ratio: BARCODE_AIM_FRAME_RATIO },
): Promise<string | null> {
  const attempt = await scanVideoFrameHybrid(video, null, roi);
  return attempt.code;
}

/** @deprecated Use scanVideoFrameHybrid */
export async function scanVideoFrameWithZxing(
  video: HTMLVideoElement,
  reader: import('@zxing/browser').BrowserMultiFormatReader,
  roi: BarcodeScanRoi = { ratio: BARCODE_AIM_FRAME_RATIO },
): Promise<string | null> {
  const attempt = await scanVideoFrameHybrid(video, reader, roi);
  return attempt.code;
}

export function describeBarcodeScanEngine(engine: BarcodeScanEngine): string {
  switch (engine) {
    case 'native-video':
      return 'Native (full frame)';
    case 'native-roi':
      return 'Native (aim frame)';
    case 'zxing-roi':
      return 'ZXing (aim frame)';
    case 'zxing-full':
      return 'ZXing (full frame)';
    default:
      return '—';
  }
}
