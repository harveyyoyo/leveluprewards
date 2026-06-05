/** Outer ring radius as fraction of render `size` (matches Circular1dBarcode). */
export const CIRCULAR1D_OUTER_RADIUS_FRAC = 0.46;

/** Inner hole radius as fraction of outer radius. */
export const CIRCULAR1D_INNER_RADIUS_RATIO = 0.52;

/** Sample along the bar midline: (outerR + innerR) / 2, as fraction of half the image size. */
export function circular1dSampleRadiusRatio(): number {
  const outer = CIRCULAR1D_OUTER_RADIUS_FRAC;
  const inner = outer * CIRCULAR1D_INNER_RADIUS_RATIO;
  const midline = (outer + inner) / 2;
  return midline * 2;
}

export function circular1dRingRadii(size: number): { cx: number; cy: number; innerR: number; outerR: number; midlineR: number } {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * CIRCULAR1D_OUTER_RADIUS_FRAC;
  const innerR = outerR * CIRCULAR1D_INNER_RADIUS_RATIO;
  return { cx, cy, innerR, outerR, midlineR: (innerR + outerR) / 2 };
}

/** Clone SVG with xmlns + explicit size so browsers can rasterize blob/data URLs. */
export function prepareSvgForRasterize(svg: SVGSVGElement, options?: { omitCenterLabel?: boolean }): SVGSVGElement {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const vb = svg.viewBox?.baseVal;
  const w = Number(svg.getAttribute('width')) || vb?.width || 200;
  const h = Number(svg.getAttribute('height')) || vb?.height || 200;
  clone.setAttribute('width', String(w));
  clone.setAttribute('height', String(h));
  if (!clone.getAttribute('viewBox') && svg.viewBox?.baseVal) {
    const vb = svg.viewBox.baseVal;
    clone.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.width} ${vb.height}`);
  }
  if (options?.omitCenterLabel) {
    clone.querySelectorAll('text').forEach((el) => el.remove());
  }
  return clone;
}

export function svgElementToDataUrl(svg: SVGSVGElement, options?: { omitCenterLabel?: boolean }): string {
  const prepared = prepareSvgForRasterize(svg, options);
  const xml = new XMLSerializer().serializeToString(prepared);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
}

/** Rasterize an on-screen circular barcode SVG to a white canvas. */
export function rasterizeCircular1dSvg(
  svg: SVGSVGElement,
  outputSize = 400,
): Promise<HTMLCanvasElement> {
  const dataUrl = svgElementToDataUrl(svg, { omitCenterLabel: true });

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas unavailable'));
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, outputSize, outputSize);
      ctx.drawImage(img, 0, 0, outputSize, outputSize);
      resolve(canvas);
    };
    img.onerror = () => reject(new Error('Could not load SVG image'));
    img.src = dataUrl;
  });
}
