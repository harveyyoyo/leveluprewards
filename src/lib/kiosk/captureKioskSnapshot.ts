import { toBlob } from 'html-to-image';

const MAX_WIDTH = 720;

function pickSnapshotRoot(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return (
    document.querySelector<HTMLElement>('[data-kiosk-snapshot-root]')
    ?? document.querySelector<HTMLElement>('#screen-view')
    ?? document.body
  );
}

/** Capture the visible kiosk shell as a compressed JPEG blob. */
export async function captureKioskSnapshotBlob(): Promise<Blob | null> {
  const root = pickSnapshotRoot();
  if (!root) return null;

  const width = Math.min(root.scrollWidth || root.clientWidth, MAX_WIDTH);
  const height = Math.min(root.scrollHeight || root.clientHeight, 1280);

  const pngBlob = await toBlob(root, {
    cacheBust: true,
    pixelRatio: 1,
    width,
    height,
    skipFonts: true,
    filter: (node) => {
      if (!(node instanceof HTMLElement)) return true;
      if (node.dataset.kioskSnapshotExclude === 'true') return false;
      if (node.classList.contains('no-print')) return false;
      return true;
    },
  });

  if (!pngBlob) return null;

  const bitmap = await createImageBitmap(pngBlob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return pngBlob;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const jpegBlob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.72);
  });

  return jpegBlob ?? pngBlob;
}
