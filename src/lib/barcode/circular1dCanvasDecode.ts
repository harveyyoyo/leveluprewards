import {
  decodeCircular1dFromRingSamples,
  type Circular1dEncodeResult,
} from './circular1d';
import { circular1dSampleRadiusRatio } from './circular1dGeometry';

export type Circular1dCanvasDecodeOptions = {
  /** Fraction of min(width,height) used as ring midline radius */
  radiusRatio?: number;
  sampleCount?: number;
};

/**
 * Sample darkness along a ring in a canvas/image and decode LU-C1D v1.
 * Works best on high-contrast renders of {@link Circular1dBarcode}.
 */
export function decodeCircular1dFromCanvas(
  source: CanvasImageSource,
  width: number,
  height: number,
  options?: Circular1dCanvasDecodeOptions,
): string | null {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, width, height);
  const image = ctx.getImageData(0, 0, width, height);
  return decodeCircular1dFromImageData(image, options);
}

function sampleRingFromImageData(
  image: ImageData,
  radiusRatio: number,
  sampleCount: number,
): boolean[] {
  const { width, height, data } = image;
  const cx = width / 2;
  const cy = height / 2;
  const radius = (Math.min(width, height) / 2) * radiusRatio;

  const samples: boolean[] = [];
  for (let i = 0; i < sampleCount; i++) {
    const angle = (i / sampleCount) * Math.PI * 2 - Math.PI / 2;
    const x = Math.round(cx + Math.cos(angle) * radius);
    const y = Math.round(cy + Math.sin(angle) * radius);
    if (x < 0 || x >= width || y < 0 || y >= height) {
      samples.push(false);
      continue;
    }
    const idx = (y * width + x) * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    samples.push(lum < 128);
  }
  return samples;
}

export function decodeCircular1dFromImageData(
  image: ImageData,
  options?: Circular1dCanvasDecodeOptions,
): string | null {
  const sampleCount = options?.sampleCount ?? 720;
  const baseRatio = options?.radiusRatio ?? circular1dSampleRadiusRatio();
  const ratios = options?.radiusRatio
    ? [baseRatio]
    : [baseRatio, baseRatio * 0.92, baseRatio * 1.06, baseRatio * 0.85, baseRatio * 1.12];

  for (const ratio of ratios) {
    const samples = sampleRingFromImageData(image, ratio, sampleCount);
    const payload = decodeCircular1dFromRingSamples(samples);
    if (payload) return payload;
  }
  return null;
}

/** Decode from an in-memory encode result (sanity / unit tests). */
export function decodeCircular1dFromEncodeResult(result: Circular1dEncodeResult): string | null {
  const { modules } = result;
  const sampleCount = Math.max(360, modules.length * 4);
  const samples: boolean[] = [];
  for (let i = 0; i < sampleCount; i++) {
    const moduleIdx = Math.floor((i / sampleCount) * modules.length) % modules.length;
    samples.push(modules[moduleIdx] === 1);
  }
  return decodeCircular1dFromRingSamples(samples);
}
