/**
 * Server-side mirror of src/lib/logoTransparency.ts (the client-side version
 * that runs at upload time). This copy exists so we can also reprocess a
 * logo that's *already* stored in Firebase Storage, without asking the admin
 * to re-select and re-upload the file.
 *
 * Clears a white/near-white logo background so it reads as transparent on
 * themed ID cards, without touching pixels that aren't connected to the
 * image's edge — that keeps legitimate white ink *inside* the artwork
 * (letterforms, dots, highlights) intact instead of punching holes in it.
 */
import { Jimp } from "jimp";

/** Per-channel brightness (0-255) above which a pixel counts as "white". */
const WHITE_THRESHOLD = 245;
/** Per-channel brightness at which a border-connected white pixel is fully transparent. */
const FULLY_TRANSPARENT_AT = 253;

function isNearWhite(r: number, g: number, b: number): boolean {
  return r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD;
}

/** Exported for unit testing: pure pixel manipulation over a raw RGBA buffer. */
export function floodFillWhiteBorder(imageData: {
  data: Buffer | Uint8Array | Uint8ClampedArray | number[];
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
 * Reprocesses an already-encoded raster image buffer (PNG/JPEG/WebP), clearing
 * its border-connected white background. Always returns a PNG buffer, since
 * PNG is the only format here that can carry an alpha channel.
 */
export async function makeLogoBackgroundTransparentBuffer(input: Buffer): Promise<Buffer> {
  const image = await Jimp.read(input);
  floodFillWhiteBorder(image.bitmap);
  return image.getBuffer("image/png");
}
