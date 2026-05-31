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

/** Mirror preview and apply digital zoom (decode still uses full sensor frame). */
export function applyBarcodeScannerVideoStyle(video: HTMLVideoElement, zoom: number): void {
  const z = clampBarcodeScannerZoom(zoom);
  video.style.transform = `scaleX(-1) scale(${z})`;
  video.style.transformOrigin = 'center center';
}

/** Mirror front-camera preview for face train / sign-in (face-api uses raw video frames). */
export function applyFaceCameraPreviewStyle(video: HTMLVideoElement): void {
  applyBarcodeScannerVideoStyle(video, BARCODE_SCANNER_ZOOM_DEFAULT);
}

export function clearBarcodeScannerVideoStyle(video: HTMLVideoElement): void {
  video.style.transform = '';
  video.style.transformOrigin = '';
}

export function formatBarcodeScannerZoomLabel(zoom: number): string {
  return `${clampBarcodeScannerZoom(zoom).toFixed(1)}×`;
}
