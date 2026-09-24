'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Building2, Bus, Maximize, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LatLng } from '@/lib/office/officeTransport';

const TILE = 256;
const MIN_ZOOM = 3;
const MAX_ZOOM = 18;
const CARTO_API_KEY = process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim() ?? '';

export type TransportMapMarker = LatLng & {
  id: string;
  kind: 'bus' | 'stop' | 'school' | 'you';
  color: string;
  /** Short text inside a bus marker ("4") or the tooltip for a stop. */
  label?: string;
  title?: string;
  /** Bus: sending live updates (pulses). Stop: already reached (filled). */
  active?: boolean;
  /** Bus not heard from lately — shown faded. */
  faded?: boolean;
  selected?: boolean;
};

export type TransportMapLine = { id: string; color: string; points: LatLng[]; faded?: boolean; dashed?: boolean };

function worldSize(z: number) {
  return TILE * 2 ** z;
}

function project(p: LatLng, z: number) {
  const s = worldSize(z);
  const lat = Math.max(-85.05, Math.min(85.05, p.lat));
  const sin = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((p.lng + 180) / 360) * s,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * s,
  };
}

function unproject(x: number, y: number, z: number): LatLng {
  const s = worldSize(z);
  const lng = (x / s) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / s;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lng };
}

/** Zoom and centre that fit every point with some room around the edges. */
function fitView(points: LatLng[], w: number, h: number): { center: LatLng; zoom: number } | null {
  if (points.length === 0 || w === 0 || h === 0) return null;
  if (points.length === 1) return { center: points[0], zoom: 15 };
  const ps = points.map((p) => project(p, 0));
  const minX = Math.min(...ps.map((p) => p.x));
  const maxX = Math.max(...ps.map((p) => p.x));
  const minY = Math.min(...ps.map((p) => p.y));
  const maxY = Math.max(...ps.map((p) => p.y));
  const dx = Math.max(maxX - minX, 1e-9);
  const dy = Math.max(maxY - minY, 1e-9);
  const zoom = Math.floor(Math.min(Math.log2((w * 0.75) / dx), Math.log2((h * 0.7) / dy)));
  return {
    center: unproject((minX + maxX) / 2, (minY + maxY) / 2, 0),
    zoom: Math.max(MIN_ZOOM, Math.min(16, zoom)),
  };
}

/**
 * A light street map (OpenStreetMap tiles by CARTO) with buses, stops, and route lines.
 * Drag to move, scroll or use +/− to zoom. `fitKey` changing re-frames the map on `fitPoints`.
 */
export function OfficeTransportMap({
  markers,
  lines = [],
  fitPoints,
  fitKey,
  initialCenter,
  onMarkerClick,
  onMapClick,
  className,
  children,
}: {
  markers: TransportMapMarker[];
  lines?: TransportMapLine[];
  fitPoints: LatLng[];
  fitKey: string;
  initialCenter: LatLng;
  onMarkerClick?: (id: string) => void;
  onMapClick?: (p: LatLng) => void;
  className?: string;
  children?: React.ReactNode;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<{ center: LatLng; zoom: number }>({ center: initialCenter, zoom: 13 });
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean; id: number } | null>(null);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const fitPointsRef = useRef(fitPoints);
  fitPointsRef.current = fitPoints;
  const refit = useCallback(() => {
    const next = fitView(fitPointsRef.current, size.w, size.h);
    if (next) setView(next);
  }, [size.w, size.h]);

  // Re-frame when the caller asks (new selection) and once the box has a size.
  const hasSize = size.w > 0 && size.h > 0;
  useEffect(() => {
    if (hasSize) refit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, hasSize]);

  const { zoom } = view;
  const c = project(view.center, zoom);
  const left = c.x - size.w / 2;
  const top = c.y - size.h / 2;

  const tiles = useMemo(() => {
    if (!hasSize) return [];
    const n = 2 ** zoom;
    const out: Array<{ key: string; src: string; x: number; y: number }> = [];
    for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + size.w) / TILE); tx++) {
      for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + size.h) / TILE); ty++) {
        if (ty < 0 || ty >= n) continue;
        const wx = ((tx % n) + n) % n;
        const sub = 'abcd'[(wx + ty) % 4];
        out.push({
          key: `${zoom}-${tx}-${ty}`,
          src: `https://${sub}.basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${wx}/${ty}.png${
            CARTO_API_KEY ? `?key=${encodeURIComponent(CARTO_API_KEY)}` : ''
          }`,
          x: tx * TILE - left,
          y: ty * TILE - top,
        });
      }
    }
    return out;
  }, [hasSize, zoom, left, top, size.w, size.h]);

  const toScreen = (p: LatLng) => {
    const q = project(p, zoom);
    return { x: q.x - left, y: q.y - top };
  };

  const zoomAt = (delta: number, sx = size.w / 2, sy = size.h / 2) => {
    setView((v) => {
      const z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, v.zoom + delta));
      if (z === v.zoom) return v;
      // Keep the point under the cursor in place.
      const cc = project(v.center, v.zoom);
      const anchor = unproject(cc.x - size.w / 2 + sx, cc.y - size.h / 2 + sy, v.zoom);
      const a = project(anchor, z);
      return { zoom: z, center: unproject(a.x - sx + size.w / 2, a.y - sy + size.h / 2, z) };
    });
  };

  // Scroll-to-zoom needs a non-passive listener so the page itself does not scroll.
  const wheelAcc = useRef(0);
  const zoomAtRef = useRef(zoomAt);
  zoomAtRef.current = zoomAt;
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      wheelAcc.current += e.deltaY;
      if (Math.abs(wheelAcc.current) < 60) return;
      const rect = el.getBoundingClientRect();
      zoomAtRef.current(wheelAcc.current > 0 ? -1 : 1, e.clientX - rect.left, e.clientY - rect.top);
      wheelAcc.current = 0;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-map-control]')) return;
    drag.current = { x: e.clientX, y: e.clientY, cx: c.x, cy: c.y, moved: false, id: e.pointerId };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 5) return;
    if (!d.moved) {
      d.moved = true;
      (e.currentTarget as HTMLElement).setPointerCapture(d.id);
    }
    setView((v) => ({ ...v, center: unproject(d.cx - dx, d.cy - dy, v.zoom) }));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.moved || !onMapClick) return;
    if ((e.target as HTMLElement).closest('[data-map-marker]')) return;
    const rect = boxRef.current!.getBoundingClientRect();
    onMapClick(unproject(left + e.clientX - rect.left, top + e.clientY - rect.top, zoom));
  };

  // Draw buses last so they sit above stops.
  const sorted = [...markers].sort((a, b) => order(a) - order(b));

  return (
    <div
      ref={boxRef}
      className={cn(
        'relative touch-none select-none overflow-hidden rounded-2xl border bg-[#f2efe9] dark:border-slate-800 dark:bg-slate-900',
        onMapClick ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing',
        className,
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (drag.current = null)}
      role="application"
      aria-label="Map"
    >
      <div className="absolute inset-0 dark:[filter:invert(0.92)_hue-rotate(180deg)_saturate(0.6)]" aria-hidden>
        {tiles.map((t) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={t.key}
            src={t.src}
            alt=""
            draggable={false}
            className="pointer-events-none absolute h-64 w-64 max-w-none"
            style={{ transform: `translate(${t.x}px, ${t.y}px)` }}
          />
        ))}
      </div>

      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        {lines.map((line) => {
          const pts = line.points.map(toScreen);
          if (pts.length < 2) return null;
          const d = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
          return (
            <g key={line.id} opacity={line.faded ? 0.35 : 0.9}>
              <polyline points={d} fill="none" stroke="white" strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" />
              <polyline
                points={d}
                fill="none"
                stroke={line.color}
                strokeWidth={4}
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={line.dashed ? '2 8' : undefined}
              />
            </g>
          );
        })}
      </svg>

      {sorted.map((m) => {
        const p = toScreen(m);
        if (p.x < -40 || p.y < -40 || p.x > size.w + 40 || p.y > size.h + 40) return null;
        return (
          <button
            key={m.id}
            type="button"
            data-map-marker
            title={m.title ?? m.label}
            aria-label={m.title ?? m.label ?? m.kind}
            onClick={() => onMarkerClick?.(m.id)}
            className={cn('absolute -translate-x-1/2 -translate-y-1/2', !onMarkerClick && 'cursor-default')}
            style={{ left: p.x, top: p.y, zIndex: m.selected ? 30 : order(m) * 10 }}
          >
            <MarkerBody m={m} />
          </button>
        );
      })}

      <div data-map-control className="absolute right-2 top-2 flex flex-col overflow-hidden rounded-xl border bg-white/95 shadow-sm dark:border-slate-700 dark:bg-slate-900/95">
        <MapButton label="Zoom in" onClick={() => zoomAt(1)}>
          <Plus className="h-4 w-4" />
        </MapButton>
        <MapButton label="Zoom out" onClick={() => zoomAt(-1)}>
          <Minus className="h-4 w-4" />
        </MapButton>
        <MapButton label="Show everything" onClick={refit}>
          <Maximize className="h-3.5 w-3.5" />
        </MapButton>
      </div>
      {children}
      <p className="pointer-events-none absolute bottom-1 right-2 text-[10px] text-slate-500/90">© OpenStreetMap · © CARTO</p>
    </div>
  );
}

function order(m: TransportMapMarker) {
  return m.kind === 'bus' ? 3 : m.kind === 'you' ? 2 : m.kind === 'school' ? 1 : 0;
}

function MapButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center border-b text-slate-700 last:border-b-0 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      {children}
    </button>
  );
}

function MarkerBody({ m }: { m: TransportMapMarker }) {
  if (m.kind === 'bus') {
    return (
      <span className={cn('relative flex items-center', m.faded && 'opacity-50')}>
        {m.active && !m.faded ? (
          <span className="absolute inset-0 animate-ping rounded-full opacity-40" style={{ backgroundColor: m.color }} />
        ) : null}
        <span
          className={cn(
            'relative flex h-8 items-center gap-1 rounded-full border-2 border-white px-2 text-xs font-bold text-white shadow-md',
            m.selected && 'ring-4 ring-slate-900/20 dark:ring-white/30',
          )}
          style={{ backgroundColor: m.color }}
        >
          <Bus className="h-3.5 w-3.5" aria-hidden />
          {m.label}
        </span>
      </span>
    );
  }
  if (m.kind === 'school') {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-white bg-slate-900 text-white shadow-md dark:bg-slate-100 dark:text-slate-900">
        <Building2 className="h-3.5 w-3.5" aria-hidden />
      </span>
    );
  }
  if (m.kind === 'you') {
    return <span className="block h-4 w-4 rounded-full border-[3px] border-white bg-blue-600 shadow-md ring-4 ring-blue-500/25" />;
  }
  return (
    <span
      className={cn('block rounded-full border-[3px] shadow-sm', m.selected ? 'h-5 w-5' : 'h-3.5 w-3.5')}
      style={{ borderColor: m.color, backgroundColor: m.active ? m.color : 'white' }}
    />
  );
}
