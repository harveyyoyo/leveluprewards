import { toPng } from 'html-to-image';

/** Rasterize a branded QR wrapper (canvas + logo overlay) as a PNG download. */
export async function downloadBrandedQrPng(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: '#ffffff',
  });
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  link.click();
}
