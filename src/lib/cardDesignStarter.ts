import { safeCardBackground, type CardDesign, type CardElement } from '../../functions/src/cardDesign';
import type { StudentTheme } from './types';

export type CardAssets = Partial<Record<NonNullable<CardElement['binding']>, string>>;
export const newCardPiece = (overrides: Partial<CardElement>): CardElement => ({
  id: crypto.randomUUID(), kind: 'text', x: 24, y: 24, width: 280, height: 65,
  rotation: 0, color: '#111827', text: '', fontSize: 30, font: 'sans-serif', bold: true, ...overrides,
});
export function themeCardStarter(theme: StudentTheme | undefined, name: string, school = 'My school', style: 'theme' | 'stripe' | 'spotlight' = 'theme'): CardDesign {
  const color = theme?.text ?? '#ffffff', primary = theme?.primary ?? '#7c3aed';
  const elements: CardElement[] = [
    newCardPiece({ label: 'School name', binding: 'school', text: school, y: 22, fontSize: 20, color }),
    newCardPiece({ label: 'Student name', binding: 'name', text: name, y: 90, width: 390, height: 100, fontSize: 38, color, fontFamily: theme?.fontFamily }),
    newCardPiece({ label: 'Favorite sticker', text: theme?.emoji || '⭐', x: 415, y: 100, width: 100, height: 100, fontSize: 65 }),
  ];
  if (style === 'stripe') elements.unshift(newCardPiece({ kind: 'rectangle', label: 'Color stripe', x: 0, y: 0, width: 540, height: 65, color: primary, radius: 0 }));
  if (style === 'spotlight') elements.unshift(newCardPiece({ kind: 'circle', label: 'Spotlight', x: 290, y: 0, width: 250, height: 200, color: theme?.accent ?? '#a78bfa', opacity: 0.35 }));
  const backgroundStyle = safeCardBackground(theme?.backgroundStyle);
  return { version: 1, background: theme?.background ?? '#1e1b4b', ...(backgroundStyle ? { backgroundStyle } : {}), elements };
}
const toHex = (css: string, fallback = '#111827') => {
  if (/^#[a-f\d]{6}$/i.test(css)) return css;
  const rgb = css.match(/[\d.]+/g);
  return rgb && rgb.length >= 3 ? '#' + rgb.slice(0, 3).map(n => Math.round(Number(n)).toString(16).padStart(2, '0')).join('') : fallback;
};
/** Read the actual displayed card, keeping text and pictures as separate editable pieces. */
export function captureThemeCard(root: HTMLElement, assets: CardAssets, theme?: StudentTheme): CardDesign {
  const card = root.querySelector<HTMLElement>('.print-id-card');
  if (!card) throw new Error('Your current card is still loading. Try again in a moment.');
  const bounds = card.getBoundingClientRect();
  if (!bounds.width) throw new Error('Your current card is still loading.');
  const scale = 540 / bounds.width;
  const style = getComputedStyle(card);
  const elements: CardElement[] = [];
  const seenBindings = new Set<string>();
  const skip = '.print-barcode, .print-id-qr, .print-id-qr-slot, .credit-card-number';
  const box = (r: DOMRect) => {
    const width = Math.min(540, Math.max(20, r.width * scale));
    const height = Math.min(210, Math.max(20, r.height * scale));
    return { x: Math.max(0, Math.min(540 - width, (r.left - bounds.left) * scale)), y: Math.max(0, Math.min(210 - height, (r.top - bounds.top) * scale)), width, height };
  };
  for (const el of Array.from(card.querySelectorAll<HTMLElement>('.print-id-avatar, .credit-card-chip'))) {
    if (!el.getBoundingClientRect().width) continue;
    const s = getComputedStyle(el);
    if (s.backgroundColor === 'rgba(0, 0, 0, 0)') continue;
    elements.push(newCardPiece({ ...box(el.getBoundingClientRect()), kind: 'rectangle', label: 'Photo frame', color: toHex(s.backgroundColor), radius: Math.min(100, parseFloat(s.borderRadius) * scale || 0) }));
  }
  for (const img of Array.from(card.querySelectorAll('img'))) {
    if (img.closest(skip)) continue;
    const binding = (['photo', 'schoolLogo', 'appLogo', 'themeImage'] as const).find(key => assets[key] === img.getAttribute('src'));
    if (binding) elements.push(newCardPiece({ ...box(img.getBoundingClientRect()), kind: 'image', binding, text: '', label: { photo: 'My photo', schoolLogo: 'School logo', appLogo: 'App logo', themeImage: 'My theme picture' }[binding] }));
  }
  const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const parent = node.parentElement, text = node.textContent?.trim();
    if (!parent || !text || parent.closest(skip + ', svg, script, style')) continue;
    const s = getComputedStyle(parent);
    if (s.display === 'none' || s.visibility === 'hidden') continue;
    const binding = parent.closest('.print-id-name') ? 'name' : parent.closest('.print-id-class') ? 'class' : parent.closest('.print-id-header') ? 'school' : undefined;
    if (binding && seenBindings.has(binding)) continue;
    if (binding) seenBindings.add(binding);
    const bindingNode = binding ? parent.closest('.print-id-name, .print-id-class, .print-id-header') : null;
    const range = document.createRange(); range.selectNodeContents(bindingNode ?? node);
    const r = range.getBoundingClientRect(); if (!r.width || !r.height) continue;
    elements.push(newCardPiece({ ...box(r), text: bindingNode?.textContent?.trim() || text, color: toHex(s.color), fontFamily: s.fontFamily, fontSize: Math.max(10, Math.min(100, parseFloat(s.fontSize) * scale)), bold: Number(s.fontWeight) >= 600, italic: s.fontStyle === 'italic', label: binding ? `${binding} text` : text.slice(0, 35), ...(binding ? { binding } : {}) }));
  }
  if (elements.length > 40) throw new Error('This card has too many pieces to import. Choose a starter below instead.');
  const backgroundStyle = safeCardBackground(style.backgroundImage.replace(/rgba?\([\d.,\s]+\)/g, color => toHex(color)));
  return { version: 1, background: style.backgroundColor === 'rgba(0, 0, 0, 0)' ? theme?.background ?? '#ffffff' : toHex(style.backgroundColor, '#ffffff'), ...(backgroundStyle ? { backgroundStyle } : {}), elements };
}
