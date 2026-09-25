'use client';
import { useRef, useState, type ReactNode } from 'react';
import { captureThemeCard, themeCardStarter, type CardAssets } from '@/lib/cardDesignStarter';
import { CANVA_TEMPLATE_HEIGHT, CANVA_TEMPLATE_WIDTH, CARD_IMAGE_BUDGET, UPLOADED_ART_LABEL, downloadCanvaTemplate, fitUploadedArt } from '@/lib/cardDesignCanva';
import type { StudentTheme } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArtworkElement } from './CardArtwork';
import { blankCardDesign, type CardDesign, type CardElement } from '../../../functions/src/cardDesign';

export function StudentCardDesigner({ value, onChange, name, currentTheme, currentCard, assets = {} }: { value?: CardDesign; onChange: (design: CardDesign) => void; name: string; currentTheme?: StudentTheme; currentCard?: ReactNode; assets?: CardAssets }) {
  const source = useRef<HTMLDivElement>(null);
  const [starter] = useState(() => currentTheme?.cardDesign ?? (currentTheme ? themeCardStarter(currentTheme, name, assets.school) : blankCardDesign()));
  const design = value ?? starter;
  const artworkHeight = design.artworkHeight ?? 210;
  const [zoom, setZoom] = useState(100);
  const [snap, setSnap] = useState(false);
  const [uploading, setUploading] = useState(false);
  const latest = useRef(design); latest.current = design;
  const [selected, select] = useState<string>();
  const [past, setPast] = useState<CardDesign[]>([]);
  const [future, setFuture] = useState<CardDesign[]>([]);
  const [error, setError] = useState('');
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; x: number; y: number; before: CardDesign; resize?: boolean }>();
  const item = design.elements.find(e => e.id === selected);
  const commit = (next: CardDesign) => { const before = latest.current; setPast(p => [...p.slice(-29), before]); setFuture([]); onChange(next); };
  const patch = (changes: Partial<CardElement>) => { if (item?.locked && !('locked' in changes)) return; commit({ ...design, elements: design.elements.map(e => e.id === selected ? { ...e, ...changes } : e) }); };
  const add = (kind: CardElement['kind'], text = '', base = latest.current) => {
    if (base.elements.length >= 40) { setError('Your card can hold up to 40 pieces. Remove one to add another.'); return; }
    const id = crypto.randomUUID();
    commit({ ...base, elements: [...base.elements, { id, kind, text, x: 30, y: 30, width: kind === 'text' ? 260 : 120, height: 100, rotation: 0, color: '#7c3aed', fontSize: 32, font: 'sans-serif', bold: true }] }); select(id);
  };
  const point = (event: React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    return { x: (event.clientX - r.left) * 540 / r.width, y: (event.clientY - r.top) * artworkHeight / r.height };
  };
  const upload = async (file?: File) => {
    if (!file) return;
    setError('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5000000) { setError('Choose a PNG, JPG, or WebP picture smaller than 5 MB.'); return; }
    setUploading(true);
    const url = URL.createObjectURL(file);
    try {
      const image = new Image(); image.src = url; await image.decode();
      const canvas = document.createElement('canvas'); const scale = Math.min(1, 600 / Math.max(image.width, image.height));
      canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
      canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL('image/webp', 0.75);
      if (data.length + latest.current.elements.filter(e => e.kind === 'image').reduce((sum, e) => sum + e.text.length, 0) > 350000) throw new Error();
      add('image', data);
    } catch { setError('That picture could not fit. Try a smaller picture or remove another picture.'); }
    finally { URL.revokeObjectURL(url); setUploading(false); }
  };
  const uploadArt = async (file?: File) => {
    if (!file) return;
    setError('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 15000000) { setError('Choose a PNG or JPG picture smaller than 15 MB.'); return; }
    setUploading(true);
    try {
      const base = latest.current;
      const others = base.elements.filter(e => e.label !== UPLOADED_ART_LABEL);
      const used = others.filter(e => e.kind === 'image' && !e.binding).reduce((sum, e) => sum + e.text.length, 0);
      const data = await fitUploadedArt(file, CARD_IMAGE_BUDGET - used);
      const id = crypto.randomUUID();
      commit({ ...base, elements: [{ id, kind: 'image', text: data, x: 0, y: 0, width: 540, height: artworkHeight, rotation: 0, color: '#000000', fontSize: 32, font: 'sans-serif', bold: false, label: UPLOADED_ART_LABEL, locked: true }, ...others] });
      select(id);
    } catch { setError('That picture could not fit on the card. Try saving it from Canva as a JPG, or remove other pictures first.'); }
    finally { setUploading(false); }
  };
  const loadCurrent = () => {
    try { commit(currentTheme?.cardDesign ?? (currentCard && source.current ? captureThemeCard(source.current, assets, currentTheme) : themeCardStarter(currentTheme, name, assets.school))); select(undefined); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not open your current card.'); }
  };
  const copy = () => {
    if (!item || design.elements.length >= 40) return;
    if (item.kind === 'image' && !item.binding && design.elements.filter(e => e.kind === 'image').reduce((sum, e) => sum + e.text.length, item.text.length) > 350000) { setError('This picture is too large to copy.'); return; }
    const id = crypto.randomUUID(); commit({ ...design, elements: [...design.elements, { ...item, id, locked: false }] }); select(id);
  };
  return <section onKeyDown={event => {
    if ((event.target as HTMLElement).closest('input, textarea, select')) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey && future.length) { setPast(p => [...p, design]); onChange(future[0]); setFuture(f => f.slice(1)); }
      else if (!event.shiftKey && past.length) { setFuture(f => [design, ...f]); onChange(past[past.length - 1]); setPast(p => p.slice(0, -1)); }
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') { event.preventDefault(); copy(); return; }
    if (!item || item.locked) return;
    if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); commit({ ...design, elements: design.elements.filter(e => e.id !== item.id) }); select(undefined); }
    const steps: Record<string, [number, number]> = { ArrowLeft: [-1,0], ArrowRight: [1,0], ArrowUp: [0,-1], ArrowDown: [0,1] };
    if (steps[event.key]) { event.preventDefault(); const [dx,dy] = steps[event.key], step = event.shiftKey ? 10 : 1; patch({ x: Math.max(0,Math.min(540-item.width,item.x+dx*step)), y: Math.max(0,Math.min(artworkHeight-item.height,item.y+dy*step)) }); }
  }} className="space-y-4 rounded-2xl border bg-slate-50 p-4 text-slate-900">
    <div aria-hidden="true" ref={source} style={{position:"fixed",left:-10000,top:0,width:540,pointerEvents:"none"}}>{currentCard}</div>
    <div className="flex flex-wrap items-center gap-2"><span className="mr-auto font-bold">Your card studio</span>
      <Button variant="outline" disabled={!past.length} onClick={() => { const previous = past[past.length - 1]; setFuture(f => [design, ...f]); setPast(p => p.slice(0, -1)); onChange(previous); }}>Undo</Button>
      <Button variant="outline" disabled={!future.length} onClick={() => { setPast(p => [...p, design]); onChange(future[0]); setFuture(f => f.slice(1)); }}>Redo</Button>
      <Button variant="outline" onClick={loadCurrent}>Start from my current card</Button>
      <Button variant="outline" onClick={() => { commit(blankCardDesign()); select(undefined); }}>Start blank</Button>
    </div>
    {currentCard && <details className="rounded-xl border bg-white p-3"><summary className="cursor-pointer text-sm font-bold">See my current card</summary><div className="mt-3 flex justify-center">{currentCard}</div></details>}
    <div className="flex flex-wrap gap-2 rounded-xl border bg-white p-3"><span className="w-full text-sm font-bold">Ready-made starting designs · uses your theme colors</span>{(['theme', 'stripe', 'spotlight'] as const).map(style => <Button key={style} variant="outline" onClick={() => { commit(themeCardStarter(currentTheme, name, assets.school, style)); select(undefined); }}>{style === 'theme' ? 'My theme' : style === 'stripe' ? 'Color stripe' : 'Spotlight'}</Button>)}</div>
    <details className="rounded-xl border bg-white p-3">
      <summary className="cursor-pointer text-sm font-bold">Design it in Canva instead</summary>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
        <li>Download a template below.</li>
        <li>In Canva, choose <b>Create a design → Custom size</b> and type <b>{CANVA_TEMPLATE_WIDTH} × {CANVA_TEMPLATE_HEIGHT}</b> pixels. Drop the guide picture in as the bottom layer if you want to see the safe area.</li>
        <li>Make your art. The student&apos;s name, school, and scan code are added underneath automatically, so leave them out.</li>
        <li>Hide or delete the guide, then <b>Share → Download</b> as PNG or JPG.</li>
        <li>Come back here and press <b>Upload finished art</b>.</li>
      </ol>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => downloadCanvaTemplate(true)}>Download template with guides</Button>
        <Button variant="outline" onClick={() => downloadCanvaTemplate(false)}>Download blank template</Button>
        <label className="cursor-pointer rounded-md border bg-slate-900 px-3 py-2 text-sm font-medium text-white">{uploading ? 'Adding your art…' : 'Upload finished art'}<input disabled={uploading} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { void uploadArt(e.target.files?.[0]); e.target.value = ''; }} /></label>
      </div>
      <p className="mt-2 text-xs text-slate-500">Your art fills the whole top of the card and sits behind everything else. You can still add text and stickers on top. Uploading again replaces it.</p>
    </details>
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => add('text', 'Make it yours!')}>+ Text</Button>
      <Button variant="outline" onClick={() => add('rectangle')}>+ Rectangle</Button>
      <Button variant="outline" onClick={() => add('circle')}>+ Circle</Button>
      <Button variant="outline" onClick={() => add('triangle')}>+ Triangle</Button>
      <Button variant="outline" onClick={() => add('star')}>+ Star</Button>
      {['⭐', '⚽', '🌈', '🚀', '🎮'].map(s => <Button key={s} variant="outline" aria-label={`Add ${s} sticker`} onClick={() => add('text', s)}>{s}</Button>)}
      <label className="cursor-pointer rounded-md border bg-white px-3 py-2 text-sm font-medium">{uploading ? 'Adding picture…' : '+ Picture'}<input disabled={uploading} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }} /></label>
      <label className="flex items-center gap-2 text-sm">Background<input aria-label="Card background" type="color" value={design.background} onChange={e => commit({ ...design, background: e.target.value, backgroundStyle: design.backgroundStyle ? design.backgroundStyle.replace(/#[a-f0-9]{6}/i, e.target.value) : undefined })} /></label>
    </div>
    <div className="flex flex-wrap items-center gap-4 text-sm">
      <label className="flex gap-2"><input type="checkbox" checked={!!design.backgroundStyle} onChange={e => commit({...design, backgroundStyle: e.target.checked ? 'linear-gradient(135deg, '+design.background+', '+(currentTheme?.primary ?? '#7c3aed')+')' : undefined})} />Blend two colors</label>
      {design.backgroundStyle && <label>Second color <input aria-label="Second background color" type="color" value={design.backgroundStyle.match(/#[a-f0-9]{6}/gi)?.[1] ?? '#7c3aed'} onChange={e => commit({...design, backgroundStyle: 'linear-gradient(135deg, '+design.background+', '+e.target.value+')'})} /></label>}
      <label className="flex gap-2"><input type="checkbox" checked={snap} onChange={e => setSnap(e.target.checked)} />Snap to grid</label>
      <label>Zoom <select aria-label="Canvas zoom" value={zoom} onChange={e => setZoom(Number(e.target.value))}>{[100,125,150,200].map(n => <option key={n} value={n}>{n}%</option>)}</select></label>
    </div>
    <p className="text-sm text-slate-600">Drag pieces to move them. Pick a piece to change its size, color, or position. Use the corner handle to resize, or arrow keys to move a piece. Your scan code stays protected.</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
      <div className="overflow-auto"><div className="flex flex-col self-start overflow-hidden rounded-xl border bg-white shadow-lg" style={{ aspectRatio: '540 / 340', width: `${zoom}%` }}>
        <svg ref={svg} viewBox={`0 0 540 ${artworkHeight}`} className="block w-full touch-none" style={{ background: design.backgroundStyle || design.background }} aria-label="Card design canvas"
          onPointerDown={e => { if (e.target === e.currentTarget) select(undefined); }}
          onPointerMove={e => { const d = drag.current; if (!d) return; const p = point(e); const step = (n: number) => snap ? Math.round(n/10)*10 : n; onChange({ ...design, elements: design.elements.map(el => el.id !== d.id ? el : d.resize ? { ...el, width: Math.max(20,Math.min(540-el.x,step(p.x-el.x))), height: Math.max(20,Math.min(artworkHeight-el.y,step(p.y-el.y))) } : { ...el, x: Math.max(0,Math.min(540-el.width,step(p.x-d.x))), y: Math.max(0,Math.min(artworkHeight-el.height,step(p.y-d.y))) }) }); }}
          onPointerUp={() => { if (drag.current) { const before = drag.current.before; setPast(p => [...p.slice(-29), before]); setFuture([]); drag.current = undefined; } }}
          onPointerCancel={() => { if (drag.current) onChange(drag.current.before); drag.current = undefined; }}>
          {design.elements.map(e => <g key={e.id} role="button" tabIndex={0} aria-label={`Select ${e.kind === 'text' ? e.text : e.kind}`} style={{ cursor: 'move' }}
            transform={`translate(${e.x} ${e.y}) rotate(${e.rotation} ${e.width / 2} ${e.height / 2})`}
            onFocus={() => select(e.id)}
            onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(e.id); } }}
            onPointerDown={event => { event.preventDefault(); select(e.id); if(e.locked) return; const p = point(event); drag.current = { id: e.id, x: p.x - e.x, y: p.y - e.y, before: design }; svg.current!.setPointerCapture(event.pointerId); }}>
            <g opacity={e.opacity ?? 1}><ArtworkElement element={e} assets={assets} /></g><rect width={e.width} height={e.height} fill="transparent" stroke={selected === e.id ? '#2563eb' : 'none'} strokeWidth="2" strokeDasharray="5 3" />
            {selected === e.id && !e.locked && e.rotation === 0 && <rect aria-label="Resize piece" x={e.width-7} y={e.height-7} width={14} height={14} fill="#2563eb" style={{cursor:'nwse-resize'}} onPointerDown={event => { event.stopPropagation(); event.preventDefault(); drag.current={id:e.id,x:0,y:0,before:design,resize:true};svg.current!.setPointerCapture(event.pointerId); }} />}
          </g>)}
        </svg>
        <div className="flex flex-1 items-center justify-between gap-4 border-t p-4"><div><p className="font-bold">{name}</p><p className="text-xs text-slate-500">School details and scan code appear on the finished card.</p></div><span aria-hidden className="text-2xl">▦</span></div>
      </div>
      </div><aside className="space-y-3 rounded-xl border bg-white p-3">
        <h3 className="font-bold">{item ? 'Edit this piece' : 'Choose a piece'}</h3>
        {item && <>
          <label className="block text-sm">Piece name<input className="w-full rounded border p-2" value={item.label ?? ''} maxLength={60} onChange={e => patch({label:e.target.value})} disabled={item.locked} /></label>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={item.locked ?? false} onChange={e => patch({locked:e.target.checked})} />Lock this piece</label>
          <fieldset className="space-y-3" disabled={item.locked}>
          {item.kind === 'text' && !item.binding && <label className="block text-sm">Words or sticker<textarea className="mt-1 w-full rounded border p-2" maxLength={160} value={item.text} onChange={e => patch({ text: e.target.value })} /></label>}
          {item.kind !== 'image' && <label className="flex justify-between text-sm">Color<input type="color" aria-label="Piece color" value={item.color} onChange={e => patch({ color: e.target.value })} /></label>}
          {(['x', 'y', 'width', 'height', 'rotation', ...(item.kind === 'text' ? ['fontSize'] : [])] as const).map(key => {
            const field = key as 'x' | 'y' | 'width' | 'height' | 'rotation' | 'fontSize';
            const max = field === 'x' ? 540 - item.width : field === 'y' ? artworkHeight - item.height : field === 'width' ? 540 - item.x : field === 'height' ? artworkHeight - item.y : field === 'rotation' ? 180 : 100;
            return <label key={field} className="block text-xs">{{ x: 'Across', y: 'Down', width: 'Width', height: 'Height', rotation: 'Turn', fontSize: 'Letter size' }[field]}: {Math.round(item[field])}<input className="block w-full" type="range" min={field === 'rotation' ? -180 : ['width', 'height'].includes(field) ? 20 : field === 'fontSize' ? 10 : 0} max={max} value={item[field]} onChange={e => patch({ [field]: Number(e.target.value) })} /></label>;
          })}
          {item.kind === 'text' && <><label className="block text-sm">Letter style<select className="w-full rounded border p-2" value={item.font} onChange={e => patch({ font: e.target.value as CardElement['font'], fontFamily: undefined })}><option value="sans-serif">Simple</option><option value="serif">Book</option><option value="monospace">Typewriter</option></select></label><label className="flex gap-2 text-sm"><input type="checkbox" checked={item.bold} onChange={e => patch({ bold: e.target.checked })} />Bold letters</label></>}
          <label className="block text-xs">Opacity: {Math.round((item.opacity ?? 1)*100)}%<input className="w-full" aria-label="Opacity" type="range" min="10" max="100" value={(item.opacity ?? 1)*100} onChange={e => patch({opacity:Number(e.target.value)/100})} /></label>
          {item.kind === 'rectangle' && <label className="block text-xs">Rounded corners<input className="w-full" type="range" min="0" max="100" value={item.radius ?? 8} onChange={e => patch({radius:Number(e.target.value)})} /></label>}
          {item.kind === 'text' && <><label className="flex gap-2 text-sm"><input type="checkbox" checked={item.italic ?? false} onChange={e => patch({italic:e.target.checked})} />Italic letters</label><label className="block text-sm">Text alignment<select className="w-full border rounded p-2" value={item.align ?? 'left'} onChange={e => patch({align:e.target.value as CardElement['align']})}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label></>}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => patch({ x: (540 - item.width) / 2 })}>Center</Button>
            <Button size="sm" variant="outline" disabled={design.elements.length >= 40} onClick={copy}>Copy</Button>
            <Button size="sm" variant="outline" onClick={() => commit({ ...design, elements: [...design.elements.filter(e => e.id !== item.id), item] })}>To front</Button>
            <Button size="sm" variant="outline" onClick={() => commit({ ...design, elements: [item, ...design.elements.filter(e => e.id !== item.id)] })}>To back</Button>
            <Button size="sm" variant="destructive" onClick={() => { commit({ ...design, elements: design.elements.filter(e => e.id !== item.id) }); select(undefined); }}>Delete</Button>
          </div></fieldset>
        </>}
        <h3 className="pt-2 text-sm font-bold">All pieces · {design.elements.length}/40</h3>
        <div className="max-h-40 space-y-1 overflow-y-auto">{[...design.elements].reverse().map((e, i) => <button key={e.id} onClick={() => select(e.id)} className={`block w-full truncate rounded px-2 py-1 text-left text-sm ${selected === e.id ? 'bg-blue-100 text-blue-900' : 'bg-slate-100'}`}>{design.elements.length - i}. {e.locked ? '🔒 ' : ''}{e.label || (e.kind === 'text' ? e.text || 'Empty text' : e.kind)}</button>)}</div>
      </aside>
    </div>
    <p className="text-xs text-slate-500">When you are happy with your card, use Save below.</p>
  </section>;
}
