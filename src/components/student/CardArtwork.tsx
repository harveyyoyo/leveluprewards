'use client';
import type { CardDesign, CardElement } from '../../../functions/src/cardDesign';
import type { CardAssets } from '@/lib/cardDesignStarter';

export function ArtworkElement({ element: e, assets = {} }: { element: CardElement; assets?: CardAssets }) {
  const content = e.binding ? assets[e.binding] ?? e.text : e.text;
  if (e.kind === 'image') return content ? <image href={content} width={e.width} height={e.height} preserveAspectRatio="xMidYMid meet" /> : null;
  if (e.kind === 'circle') return <ellipse cx={e.width / 2} cy={e.height / 2} rx={e.width / 2} ry={e.height / 2} fill={e.color} />;
  if (e.kind === 'triangle') return <polygon points={`${e.width / 2},0 ${e.width},${e.height} 0,${e.height}`} fill={e.color} />;
  if (e.kind === 'star') return <polygon points={Array.from({length: 10}, (_, i) => {
    const angle = i * Math.PI / 5 - Math.PI / 2, radius = i % 2 ? 0.22 : 0.5;
    return `${e.width / 2 + Math.cos(angle) * e.width * radius},${e.height / 2 + Math.sin(angle) * e.height * radius}`;
  }).join(' ')} fill={e.color} />;
  if (e.kind === 'rectangle') return <rect width={e.width} height={e.height} rx={e.radius ?? 8} fill={e.color} />;
  return <foreignObject width={e.width} height={e.height}><div style={{ color: e.color, fontSize: e.fontSize, fontFamily: e.fontFamily || e.font, fontWeight: e.bold ? 800 : 400, fontStyle: e.italic ? 'italic' : 'normal', lineHeight: 1.15, textAlign: e.align ?? 'left', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>{content}</div></foreignObject>;
}
export function CardArtwork({ design, assets }: { design: CardDesign; assets?: CardAssets }) {
  return <svg viewBox={`0 0 540 ${design.artworkHeight ?? 210}`} width="100%" height="100%" style={{ background: design.backgroundStyle || design.background, overflow: 'hidden' }} aria-label="Your card artwork">
    {design.elements.map(e => <g key={e.id} opacity={e.opacity ?? 1} transform={`translate(${e.x} ${e.y}) rotate(${e.rotation} ${e.width / 2} ${e.height / 2})`}><ArtworkElement element={e} assets={assets} /></g>)}
  </svg>;
}
