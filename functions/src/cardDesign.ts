export interface CardElement {
  id: string;
  kind: 'text' | 'rectangle' | 'circle' | 'triangle' | 'star' | 'image';
  x: number; y: number; width: number; height: number;
  rotation: number; color: string; text: string; fontSize: number;
  font: 'sans-serif' | 'serif' | 'monospace'; bold: boolean;
  label?: string; locked?: boolean; opacity?: number; radius?: number;
  italic?: boolean; align?: 'left' | 'center' | 'right'; fontFamily?: string;
  binding?: 'name' | 'class' | 'school' | 'photo' | 'schoolLogo' | 'appLogo' | 'themeImage';
}
export interface CardDesign { version: 1; background: string; backgroundStyle?: string; artworkHeight?: 210 | 275; elements: CardElement[] }
export function safeCardBackground(value: unknown): string | undefined {
  return typeof value === 'string' && value.length <= 500 && /^(linear|radial)-gradient\([a-zA-Z0-9#.,%()\s-]+\)$/.test(value) && !/url|var|expression/i.test(value) ? value : undefined;
}
export const blankCardDesign = (): CardDesign => ({ version: 1, background: '#ffffff', elements: [] });
/** Shared by the callable and browser; never trust stored artwork or uploaded URLs. */
export function sanitizeCardDesign(raw: unknown): CardDesign | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as CardDesign;
  if (d.version !== 1 || !Array.isArray(d.elements) || d.elements.length > 40) return null;
  const hex = (s: unknown) => typeof s === 'string' && /^#[a-f0-9]{6}$/i.test(s);
  const number = (n: unknown, min: number, max: number) => typeof n === 'number' && Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
  let imageBytes = 0;
  const artworkHeight = d.artworkHeight === 275 ? 275 : 210;
  const elements: CardElement[] = [];
  for (const e of d.elements) {
    if (!e || !['text', 'rectangle', 'circle', 'triangle', 'star', 'image'].includes(e.kind)) return null;
    let content = typeof e.text === 'string' ? e.text : '';
    const binding = ['name', 'class', 'school', 'photo', 'schoolLogo', 'appLogo', 'themeImage'].includes(e.binding ?? '') ? e.binding : undefined;
    if (e.kind === 'image' && !['photo', 'schoolLogo', 'appLogo', 'themeImage'].includes(binding ?? '')) {
      imageBytes += content.length;
      if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(content) || imageBytes > 350000) return null;
    } else content = e.kind === 'image' ? '' : content.slice(0, 160);
    const width = number(e.width, 20, 540), height = number(e.height, 20, artworkHeight);
    elements.push({ id: `layer-${elements.length}`, kind: e.kind, text: content,
      x: number(e.x, 0, 540 - width), y: number(e.y, 0, artworkHeight - height), width, height,
      rotation: number(e.rotation, -180, 180), color: hex(e.color) ? e.color : '#111827',
      fontSize: number(e.fontSize, 10, 100), font: ['serif', 'monospace'].includes(e.font) ? e.font : 'sans-serif', bold: e.bold === true,
      ...(binding ? { binding } : {}), label: typeof e.label === 'string' ? e.label.slice(0, 60) : '',
      locked: e.locked === true, opacity: number(e.opacity ?? 1, 0.1, 1), radius: number(e.radius ?? 8, 0, 100),
      italic: e.italic === true, align: e.align === 'center' || e.align === 'right' ? e.align : 'left',
      ...(typeof e.fontFamily === 'string' ? { fontFamily: e.fontFamily.replace(/[^a-zA-Z0-9 ,'-]/g, '').slice(0, 160) } : {}) });
  }
  const backgroundStyle = safeCardBackground(d.backgroundStyle);
  return { version: 1, background: hex(d.background) ? d.background : '#ffffff', elements,
    ...(d.artworkHeight === 275 ? { artworkHeight } : {}), ...(backgroundStyle ? { backgroundStyle } : {}) };
}
