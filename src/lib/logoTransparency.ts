'use client';

/**
 * Clears a white/near-white logo background so it reads as transparent on
 * themed ID cards, without touching any pixels that aren't connected to the
 * image's edge — that keeps legitimate white ink *inside* the artwork
 * (letterforms, dots, highlights) intact instead of punching holes in it.
 *
 * Runs entirely client-side via canvas; the uploaded/cropped blob never
 * leaves the browser for this step. Always returns a PNG blob, since PNG is
 * the only format in our upload pipeline that can carry an alpha channel.
 */

/** Per-channel brightness (0-255) above which a pixel counts as "white". */
const WHITE_THRESHOLD = 245;
/** Per-channel brightness at which a border-connected white pixel is fully transparent. */
const FULLY_TRANSPARENT_AT = 253;

function isNearWhite(r: number, g: number, b: number): boolean {
  return r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD;
}

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err instanceof ErrorEvent ? err.error : err);
    };
    img.src = url;
  });
}

/**
 * Exported for unit testing: pure pixel manipulation, no DOM/canvas API
 * involved, so it can run against a plain `{data, width, height}` buffer
 * without needing a real `ImageData`/canvas in the test environment.
 */
export function floodFillWhiteBorder(imageData: {
  data: Uint8ClampedArray | number[];
  width: number;
  height: number;
}): void {
  const { data, width, height } = imageData;
  if (width === 0 || height === 0) return;

  const visited = new Uint8Array(width * height);
  const stack: number[] = [];

  const seed = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (visited[idx]) return;
    const p = idx * 4;
    if (data[p + 3] === 0) return; // already transparent
    if (!isNearWhite(data[p], data[p + 1], data[p + 2])) return;
    visited[idx] = 1;
    stack.push(idx);
  };

  for (let x = 0; x < width; x++) {
    seed(x, 0);
    seed(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    seed(0, y);
    seed(width - 1, y);
  }

  const span = Math.max(1, FULLY_TRANSPARENT_AT - WHITE_THRESHOLD);

  while (stack.length > 0) {
    const idx = stack.pop()!;
    const p = idx * 4;
    // Feather the edge: pixels right at the threshold fade out gradually
    // instead of leaving a hard-edged cutout against anti-aliased artwork.
    const minChannel = Math.min(data[p], data[p + 1], data[p + 2]);
    const whiteness = Math.min(1, Math.max(0, (minChannel - WHITE_THRESHOLD) / span));
    data[p + 3] = Math.round(data[p + 3] * (1 - whiteness));

    const x = idx % width;
    const y = (idx - x) / width;
    seed(x + 1, y);
    seed(x - 1, y);
    seed(x, y + 1);
    seed(x, y - 1);
  }
}

/**
 * Returns a new PNG blob with the border-connected white background made
 * transparent. Falls back to the original blob (unchanged) if anything in
 * the canvas pipeline fails — this is a visual enhancement, not something
 * that should ever block an upload.
 */
export async function makeLogoBackgroundTransparent(blob: Blob): Promise<Blob> {
  try {
    const img = await loadImageFromBlob(blob);
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!width || !height) return blob;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return blob;

    ctx.drawImage(img, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    floodFillWhiteBorder(imageData);
    ctx.putImageData(imageData, 0, 0);

    const out = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/png');
    });
    return out ?? blob;
  } catch (e) {
    console.error('makeLogoBackgroundTransparent: falling back to original image', e);
    return blob;
  }
}
