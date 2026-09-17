/** Session-persisted digital zoom for barcode camera previews (CSS scale). */
export const BARCODE_SCANNER_ZOOM_STORAGE_KEY = 'levelup:barcode-scanner-zoom';

export const BARCODE_SCANNER_ZOOM_MIN = 1;
export const BARCODE_SCANNER_ZOOM_MAX = 3;
export const BARCODE_SCANNER_ZOOM_STEP = 0.05;
export const BARCODE_SCANNER_ZOOM_DEFAULT = 1;

export function clampBarcodeScannerZoom(value: number): number {
  if (!Number.isFinite(value)) return BARCODE_SCANNER_ZOOM_DEFAULT;
  return Math.min(BARCODE_SCANNER_ZOOM_MAX, Math.max(BARCODE_SCANNER_ZOOM_MIN, value));
}

export function readStoredBarcodeScannerZoom(): number {
  if (typeof sessionStorage === 'undefined') return BARCODE_SCANNER_ZOOM_DEFAULT;
  try {
    const raw = sessionStorage.getItem(BARCODE_SCANNER_ZOOM_STORAGE_KEY);
    if (raw == null) return BARCODE_SCANNER_ZOOM_DEFAULT;
    return clampBarcodeScannerZoom(parseFloat(raw));
  } catch {
    return BARCODE_SCANNER_ZOOM_DEFAULT;
  }
}

export function persistBarcodeScannerZoom(zoom: number): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(BARCODE_SCANNER_ZOOM_STORAGE_KEY, String(clampBarcodeScannerZoom(zoom)));
  } catch {
    // ignore quota / private mode
  }
}

/**
 * Apply digital zoom to the barcode/ISBN scanner preview (decode still uses full sensor frame).
 * This camera normally faces away from the user (aimed at a book), so the preview is NOT
 * mirrored — mirroring it made the book appear to move opposite to how it was actually moved.
 */
export function applyBarcodeScannerVideoStyle(video: HTMLVideoElement, zoom: number): void {
  const z = clampBarcodeScannerZoom(zoom);
  video.style.transform = `scale(${z})`;
  video.style.transformOrigin = 'center center';
}

/** Mirror front-camera preview for face train / sign-in (a selfie-style "look in the mirror" view). */
export function applyFaceCameraPreviewStyle(video: HTMLVideoElement): void {
  video.style.transform = 'scaleX(-1)';
  video.style.transformOrigin = 'center center';
}

export function clearBarcodeScannerVideoStyle(video: HTMLVideoElement): void {
  video.style.transform = '';
  video.style.transformOrigin = '';
}

export function formatBarcodeScannerZoomLabel(zoom: number): string {
  return `${clampBarcodeScannerZoom(zoom).toFixed(1)}×`;
}
