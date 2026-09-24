'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Layers,
  Moon,
  Palette,
  RotateCcw,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  CLASSROOM_THEME_BATCHES,
  CLASSROOM_THEME_DESIGNS,
  type ClassroomThemeDesign,
} from '@/lib/classroom/classroomThemeKitData';
import { classroomHref } from '@/lib/classroomRealmUrl';
import {
  loadClassroomPrefs,
  saveClassroomPrefs,
  type ClassroomDesign,
} from '@/lib/classroomSeatingChart';

const FONTS = [
  'Theme default',
  'Space Grotesk',
  'DM Sans',
  'Outfit',
  'Manrope',
  'Figtree',
  'Public Sans',
];

const CORNERS = [
  { label: 'Default', value: -1 },
  { label: 'Sharp', value: 0 },
  { label: 'Soft', value: 10 },
  { label: 'Round', value: 20 },
];

const DEPTHS = ['Flat', 'Theme', 'Extra'] as const;

type ThemeTweakSettings = {
  active: number;
  headingFont: string;
  bodyFont: string;
  hue: number;
  vivid: number;
  corners: number;
  depth: (typeof DEPTHS)[number];
  darkMode: boolean;
};

const DEFAULT_SETTINGS: ThemeTweakSettings = {
  active: 0,
  headingFont: 'Theme default',
  bodyFont: 'Theme default',
  hue: 0,
  vivid: 100,
  corners: -1,
  depth: 'Theme',
  darkMode: false,
};

const STORAGE_KEY = 'classroom-theme-kit-settings';
const PREVIEW_WIDTH = 1440;
const PREVIEW_HEIGHT = 900;

function buildOverrides(s: ThemeTweakSettings): string {
  const fonts = [s.headingFont, s.bodyFont].filter((f) => f !== 'Theme default');
  const link = fonts.length
    ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fonts
        .map((f) => `family=${f.replaceAll(' ', '+')}:wght@400;700`)
        .join('&')}&display=swap">`
    : '';

  let css = '';
  if (s.bodyFont !== 'Theme default') {
    css += `body, body * { font-family: '${s.bodyFont}', sans-serif !important; }`;
  }
  if (s.headingFont !== 'Theme default') {
    css += `h1, h2, h3, h4, [class*="font-display"], [class*="font-heading"] { font-family: '${s.headingFont}', sans-serif !important; }`;
  }
  if (s.darkMode) {
    const totalHue = (180 + s.hue) % 360;
    css += `
      html {
        filter: invert(0.92) hue-rotate(${totalHue}deg) saturate(${Math.round(s.vivid * 1.05)}%) !important;
        background: #111114 !important;
      }
      body {
        background-color: transparent !important;
      }
      img, video, picture, [style*="url("] {
        filter: invert(1) hue-rotate(180deg) !important;
      }
    `;
  } else if (s.hue !== 0 || s.vivid !== 100) {
    css += `html { filter: hue-rotate(${s.hue}deg) saturate(${s.vivid}%); }`;
  }
  if (s.corners >= 0) {
    css += `[class*="rounded"]:not([class*="rounded-full"]) { border-radius: ${s.corners}px !important; }`;
  }
  if (s.depth === 'Flat') {
    css += `* { box-shadow: none !important; text-shadow: none !important; }`;
  }
  if (s.depth === 'Extra') {
    css += `[class*="shadow"] { filter: drop-shadow(0 6px 0 rgba(0,0,0,.22)); }`;
  }

  return `${link}<style id="theme-overrides">${css}</style>`;
}

function preparePreviewHtml(html: string, overrides = ''): string {
  const withOverrides = html.includes('</head>')
    ? html.replace('</head>', `${overrides}</head>`)
    : html + overrides;
  const themeBlock = withOverrides.match(/@theme\s*\{([\s\S]*?)\}/)?.[1];
  if (!themeBlock) return withOverrides;

  const colors: Record<string, string> = {};
  const fontFamily: Record<string, string[]> = {};
  const transitionTimingFunction: Record<string, string> = {};

  for (const match of themeBlock.matchAll(/--(color|font|ease)-([\w-]+):\s*([^;]+);/g)) {
    const [, type, name, value] = match;
    if (!type || !name || !value) continue;
    if (type === 'color') colors[name] = value.trim();
    if (type === 'font') fontFamily[name] = [value.trim()];
    if (type === 'ease') transitionTimingFunction[name] = value.trim();
  }

  const config = JSON.stringify({
    theme: { extend: { colors, fontFamily, transitionTimingFunction } },
  }).replaceAll('</', '<\\/');

  return withOverrides.replace(
    '<script src="https://cdn.tailwindcss.com"></script>',
    `<script src="https://cdn.tailwindcss.com"></script><script>tailwind.config=${config}</script>`,
  );
}

function PreviewFrame({
  title,
  html,
  overrides,
}: {
  title: string;
  html: string;
  overrides: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const fitPreview = () => {
      const nextScale = Math.min(
        container.clientWidth / PREVIEW_WIDTH,
        container.clientHeight / PREVIEW_HEIGHT,
        1.25,
      );
      setScale(nextScale);
    };

    fitPreview();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', fitPreview);
      return () => window.removeEventListener('resize', fitPreview);
    }
    const observer = new ResizeObserver(fitPreview);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const renderedHtml = useMemo(
    () => preparePreviewHtml(html, overrides),
    [html, overrides],
  );

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-inner"
    >
      <div
        className="absolute left-1/2 top-1/2 origin-top-left"
        style={{
          width: PREVIEW_WIDTH,
          height: PREVIEW_HEIGHT,
          transform: `scale(${scale}) translate(-50%, -50%)`,
        }}
      >
        <iframe
          title={title}
          srcDoc={renderedHtml}
          width={PREVIEW_WIDTH}
          height={PREVIEW_HEIGHT}
          className="block border-0 bg-white"
          sandbox="allow-scripts"
        />
      </div>
    </div>
  );
}

export function ClassroomThemeKitStudio({ schoolId }: { schoolId: string }) {
  const [settings, setSettings] = useState<ThemeTweakSettings>(DEFAULT_SETTINGS);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [controlsOpen, setControlsOpen] = useState(true);

  const activeIndex = Math.min(
    Math.max(0, settings.active),
    CLASSROOM_THEME_DESIGNS.length - 1,
  );
  const activeDesign: ClassroomThemeDesign =
    CLASSROOM_THEME_DESIGNS[activeIndex] ?? CLASSROOM_THEME_DESIGNS[0];

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSettings((prev) => ({ ...prev, ...JSON.parse(saved) }));
      }
    } catch {
      // Storage unavailable or disabled
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Storage write error
    }
  }, [settings]);

  const updateSetting = <K extends keyof ThemeTweakSettings>(
    key: K,
    value: ThemeTweakSettings[K],
  ) => {
    setSettings((s) => ({ ...s, [key]: value }));
  };

  const overrides = useMemo(() => buildOverrides(settings), [settings]);
  const backHref = `/${schoolId.toLowerCase()}/classroom`;
  const standaloneHref = `/classroom-themes/${activeDesign.slug}.html${settings.darkMode ? '?dark=1' : ''}`;

  const [applied, setApplied] = useState(false);

  const handleApplyToClassroom = () => {
    if (typeof window === 'undefined') return;
    const THEME_MAP: Record<string, ClassroomDesign> = {
      'gamify': 'playful',
      'comic-pop': 'playful',
      'clay-3d': 'playful',
      'candy-clay': 'playful',
      'retro-arcade': 'playful',
      'board-game': 'playful',
      'candy-shop': 'playful',
      'carnival-ticket': 'playful',
      'neon-arcade': 'midnight',
      'cyber-grid': 'midnight',
      'aurora-glow': 'aurora',
      'gradient-wave': 'aurora',
      'synthwave': 'midnight',
      'corporate-clean': 'minimal',
      'neo-grotesque': 'minimal',
      'bold-editorial': 'brutalist',
      'notebook': 'minimal',
      'neo-brutalism': 'brutalist',
      'tactile-stationery': 'minimal',
      'scholastic-gallery': 'minimal',
      'warm-academic-serif': 'minimal',
      'precision-blueprint': 'midnight',
      'riso-print-room': 'playful',
      'paper-craft-bulletin': 'playful',
      'retro-chunky-extruded': 'playful',
      'tactile-offset-grid': 'playful',
      'tactile-offset-variant': 'playful',
      'isometric-block-system': 'playful',
    };
    const mappedDesign: ClassroomDesign = settings.darkMode
      ? 'midnight'
      : (THEME_MAP[activeDesign.slug] || 'playful');

    const scopes = ['admin', 'staff', ''];
    scopes.forEach((scope) => {
      const existing = loadClassroomPrefs(schoolId, scope);
      saveClassroomPrefs(schoolId, scope, {
        ...existing,
        design: mappedDesign,
        themeKitSlug: activeDesign.slug,
        themeKitSettings: settings,
      });
    });

    setApplied(true);
    setTimeout(() => setApplied(false), 3500);
  };

  return (
    <div className="flex h-screen w-full flex-col bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Top Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900/90 px-3 sm:px-5 backdrop-blur-sm z-30">
        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-zinc-300 hover:text-white hover:bg-zinc-800 gap-1.5"
          >
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Classroom</span>
            </Link>
          </Button>

          <div className="h-4 w-px bg-zinc-700 mx-1 hidden sm:block" />

          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors flex items-center gap-1.5"
            title={sidebarOpen ? 'Hide themes list' : 'Show themes list'}
          >
            <Layers className="h-3.5 w-3.5 text-emerald-400" />
            <span>{sidebarOpen ? 'Hide Themes' : 'Choose Theme'}</span>
          </button>

          <div className="hidden md:flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-400" />
              Classroom Theme Studio
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-zinc-800/90 border border-zinc-700/80 px-3 py-1 text-xs font-medium text-zinc-300">
            <span className="text-emerald-400 font-bold">{activeIndex + 1} of 15</span>
            <span className="text-zinc-500">·</span>
            <span className="truncate max-w-[140px] md:max-w-none">{activeDesign.name}</span>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 hover:text-white transition-colors select-none">
            <input
              type="checkbox"
              aria-label="Dark mode"
              checked={settings.darkMode}
              onChange={(e) => updateSetting('darkMode', e.target.checked)}
              className="h-3.5 w-3.5 rounded border-zinc-600 bg-zinc-700 text-emerald-500 accent-emerald-500 cursor-pointer"
            />
            <Moon className={settings.darkMode ? 'h-3.5 w-3.5 text-amber-400' : 'h-3.5 w-3.5 text-zinc-400'} />
            <span className="hidden sm:inline">Dark</span>
          </label>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white text-xs gap-1.5"
          >
            <a href={standaloneHref} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Open Full Screen</span>
            </a>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setControlsOpen((v) => !v)}
            className="text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs gap-1"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span className="hidden md:inline">{controlsOpen ? 'Hide Tweaks' : 'Customize'}</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleApplyToClassroom}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-md px-3.5 h-8 rounded-lg"
          >
            <Check className="h-3.5 w-3.5 stroke-[3]" />
            <span>{applied ? '✓ Applied to Classroom!' : 'Apply to Classroom'}</span>
          </Button>

          <Button
            asChild
            size="sm"
            className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs gap-1.5 h-8 rounded-lg"
          >
            <Link href={classroomHref(schoolId)}>
              <span>Open Classroom</span>
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Workspace Area */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left Sidebar: 15 Themes grouped by 5 batches */}
        {sidebarOpen && (
          <aside className="w-72 shrink-0 overflow-y-auto border-r border-zinc-800 bg-zinc-900/60 p-3 space-y-5 transition-all">
            <div className="px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                15 Seating Chart Looks
              </h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Click any design to preview it live.
              </p>
            </div>

            {CLASSROOM_THEME_BATCHES.map((batch) => (
              <div key={batch.id} className="space-y-1.5">
                <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-emerald-400/90">
                  {batch.label}
                </p>
                <div className="space-y-1">
                  {batch.ids.map((id) => {
                    const design = CLASSROOM_THEME_DESIGNS[id];
                    if (!design) return null;
                    const isSelected = activeIndex === id;
                    return (
                      <button
                        key={design.slug}
                        type="button"
                        onClick={() => updateSetting('active', id)}
                        className={`group w-full rounded-xl border p-2.5 text-left transition-all duration-150 ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-950/50 text-white shadow-sm ring-1 ring-emerald-500/50'
                            : 'border-zinc-800 bg-zinc-900 text-zinc-100 hover:border-zinc-600 hover:bg-zinc-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold leading-tight truncate text-white">
                            {design.name}
                          </span>
                          {isSelected && (
                            <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] leading-tight text-zinc-300 mt-1 line-clamp-2">
                          {design.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </aside>
        )}

        {/* Center: Scaled Live Preview + Bottom Tweak Bar */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-zinc-950">
          <div className="min-h-0 flex-1 p-2 sm:p-4">
            <PreviewFrame
              title={activeDesign.name}
              html={activeDesign.html}
              overrides={overrides}
            />
          </div>

          {/* Bottom Customizer Bar */}
          {controlsOpen && (
            <div className="shrink-0 border-t border-zinc-800 bg-zinc-900/95 px-4 py-3 backdrop-blur-md">
              <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
                {/* Heading Font */}
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Heading Font
                  </span>
                  <select
                    value={settings.headingFont}
                    onChange={(e) => updateSetting('headingFont', e.target.value)}
                    className="h-8 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {FONTS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Body Font */}
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Body Font
                  </span>
                  <select
                    value={settings.bodyFont}
                    onChange={(e) => updateSetting('bodyFont', e.target.value)}
                    className="h-8 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {FONTS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Color Shift */}
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Color Shift · {settings.hue}°
                  </span>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    value={settings.hue}
                    onChange={(e) => updateSetting('hue', Number(e.target.value))}
                    className="h-8 w-32 accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Vividness */}
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Vividness · {settings.vivid}%
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={200}
                    value={settings.vivid}
                    onChange={(e) => updateSetting('vivid', Number(e.target.value))}
                    className="h-8 w-32 accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Corners */}
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Corners
                  </span>
                  <div className="flex h-8 items-center gap-0.5 rounded-lg border border-zinc-700 bg-zinc-800 p-0.5">
                    {CORNERS.map((c) => (
                      <button
                        key={c.label}
                        type="button"
                        onClick={() => updateSetting('corners', c.value)}
                        className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                          settings.corners === c.value
                            ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Depth */}
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Shadows & Depth
                  </span>
                  <div className="flex h-8 items-center gap-0.5 rounded-lg border border-zinc-700 bg-zinc-800 p-0.5">
                    {DEPTHS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => updateSetting('depth', d)}
                        className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                          settings.depth === d
                            ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dark Mode */}
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Dark Mode
                  </span>
                  <label className="flex h-8 items-center gap-2 cursor-pointer rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors select-none">
                    <input
                      type="checkbox"
                      aria-label="Dark mode"
                      checked={settings.darkMode}
                      onChange={(e) => updateSetting('darkMode', e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-600 bg-zinc-700 text-emerald-500 accent-emerald-500 cursor-pointer"
                    />
                    <Moon className={settings.darkMode ? 'h-3.5 w-3.5 text-amber-400' : 'h-3.5 w-3.5 text-zinc-400'} />
                    <span>Dark</span>
                  </label>
                </div>

                {/* Reset button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSettings({
                      ...DEFAULT_SETTINGS,
                      active: activeIndex,
                    })
                  }
                  className="h-8 border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white text-xs gap-1.5"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset Tweaks
                </Button>

                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 pb-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Choices saved on this computer</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
