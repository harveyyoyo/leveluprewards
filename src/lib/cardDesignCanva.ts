/** Canva round-trip helpers: a sized template to download, and fitting a finished picture back onto the card. */

export const CARD_ART_WIDTH = 540;
export const CARD_ART_HEIGHT = 210;
/** Template is 3× the on-screen art area so prints stay sharp. */
export const CANVA_TEMPLATE_WIDTH = CARD_ART_WIDTH * 3;
export const CANVA_TEMPLATE_HEIGHT = CARD_ART_HEIGHT * 3;
/** Same total picture budget the saved card allows (see sanitizeCardDesign). */
export const CARD_IMAGE_BUDGET = 350000;
export const UPLOADED_ART_LABEL = 'Uploaded card art';

/** Draws the downloadable template: art area with a safe zone and plain-language guide text. */
export function drawCanvaTemplate(canvas: HTMLCanvasElement, withGuides = true) {
  const w = CANVA_TEMPLATE_WIDTH, h = CANVA_TEMPLATE_HEIGHT;
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
  if (!withGuides) return;
  const safe = 60;
  ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
  ctx.fillRect(0, 0, w, safe); ctx.fillRect(0, h - safe, w, safe);
  ctx.fillRect(0, safe, safe, h - safe * 2); ctx.fillRect(w - safe, safe, safe, h - safe * 2);
  ctx.setLineDash([24, 14]); ctx.lineWidth = 4; ctx.strokeStyle = '#ef4444';
  ctx.strokeRect(safe, safe, w - safe * 2, h - safe * 2);
  ctx.setLineDash([]);
  ctx.fillStyle = '#334155'; ctx.textAlign = 'center';
  ctx.font = 'bold 56px sans-serif';
  ctx.fillText('Student ID card art', w / 2, h / 2 - 50);
  ctx.font = '36px sans-serif';
  ctx.fillText(`${w} × ${h} px · keep words and faces inside the dashed line`, w / 2, h / 2 + 15);
  ctx.fillText('Name, school and scan code are added below this art automatically', w / 2, h / 2 + 70);
  ctx.font = '28px sans-serif'; ctx.fillStyle = '#ef4444';
  ctx.fillText('Pink edge may get trimmed when printed', w / 2, h - 18);
}

export function downloadCanvaTemplate(withGuides = true) {
  const canvas = document.createElement('canvas');
  drawCanvaTemplate(canvas, withGuides);
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = withGuides ? 'id-card-art-template-guide.png' : 'id-card-art-template-blank.png';
  link.click();
}

/**
 * Crops a finished design to the card's art shape (center crop) and shrinks it until it
 * fits the picture budget. Returns a data URL the card can store.
 */
export async function fitUploadedArt(file: File, budget: number): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url; await image.decode();
    const target = CARD_ART_WIDTH / CARD_ART_HEIGHT;
    let sw = image.width, sh = image.height;
    if (sw / sh > target) sw = sh * target; else sh = sw / target;
    const sx = (image.width - sw) / 2, sy = (image.height - sh) / 2;
    const canvas = document.createElement('canvas');
    for (const width of [CANVA_TEMPLATE_WIDTH, 1200, 960, 720, 540]) {
      const w = Math.min(width, Math.round(sw));
      canvas.width = w; canvas.height = Math.round(w / target);
      canvas.getContext('2d')!.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.85, 0.7, 0.55]) {
        const data = canvas.toDataURL('image/webp', quality);
        if (data.length <= budget) return data;
      }
    }
    throw new Error('too large');
  } finally {
    URL.revokeObjectURL(url);
  }
}
