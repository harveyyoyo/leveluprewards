import type { ClassroomThemeKitSettings } from '@/lib/classroomSeatingChart';

export type ThemeKitDefinition = {
  name: string;
  headingFont: string;
  bodyFont: string;
  canvasBg: string;
  canvasPattern: string;
  headerBg: string;
  headerText: string;
  headerBorder: string;
  sidebarBg: string;
  sidebarBorder: string;
  sidebarText: string;
  cardBg: string;
  cardBorder: string;
  cardShadow: string;
  cardRadius: string;
  teacherDeskBg: string;
  teacherDeskText: string;
  teacherDeskBorder?: string;
  isDarkByDefault?: boolean;
};

export const THEME_KIT_DEFINITIONS: Record<string, ThemeKitDefinition> = {
  'tactile-offset-grid': {
    name: 'Tactile Offset Grid',
    headingFont: 'Space Grotesk',
    bodyFont: 'DM Sans',
    canvasBg: '#FDFCF5',
    canvasPattern: 'radial-gradient(circle, #D1D1C1 1.2px, transparent 1.2px) 0 0 / 24px 24px',
    headerBg: '#0A1628',
    headerText: '#FFFFFF',
    headerBorder: 'rgba(255, 255, 255, 0.1)',
    sidebarBg: '#FFFFFF',
    sidebarBorder: 'rgba(10, 22, 40, 0.08)',
    sidebarText: '#0A1628',
    cardBg: '#FFFFFF',
    cardBorder: '1px solid rgba(10, 22, 40, 0.12)',
    cardShadow: '4px 4px 0px 0px rgba(10, 22, 40, 0.12)',
    cardRadius: '14px',
    teacherDeskBg: '#0A1628',
    teacherDeskText: '#FFFFFF',
  },
  'warm-academic-serif': {
    name: 'Warm Academic Serif',
    headingFont: 'Fraunces',
    bodyFont: 'Instrument Sans',
    canvasBg: '#F8F5F0',
    canvasPattern: 'radial-gradient(#E2E2D5 1.5px, transparent 1.5px) 0 0 / 32px 32px',
    headerBg: '#1E2124',
    headerText: '#F8F5F0',
    headerBorder: 'rgba(255, 255, 255, 0.1)',
    sidebarBg: '#FFFFFF',
    sidebarBorder: '#E7E5E4',
    sidebarText: '#1E2124',
    cardBg: '#FFFFFF',
    cardBorder: '2px solid #E7E5E4',
    cardShadow: '0 2px 8px -1px rgba(30, 33, 36, 0.08)',
    cardRadius: '16px',
    teacherDeskBg: '#FFFFFF',
    teacherDeskText: '#1E2124',
    teacherDeskBorder: '2px solid #E7E5E4',
  },
  'tactile-offset-variant': {
    name: 'Tactile Offset Variant',
    headingFont: 'Space Grotesk',
    bodyFont: 'DM Sans',
    canvasBg: '#f7f4ed',
    canvasPattern: 'radial-gradient(circle, #d4d4d8 1.2px, transparent 1.2px) 0 0 / 24px 24px',
    headerBg: '#0f172a',
    headerText: '#FFFFFF',
    headerBorder: 'rgba(255, 255, 255, 0.1)',
    sidebarBg: '#fafafa',
    sidebarBorder: 'rgba(15, 23, 42, 0.08)',
    sidebarText: '#0f172a',
    cardBg: '#fafafa',
    cardBorder: '1px solid rgba(15, 23, 42, 0.10)',
    cardShadow: '3px 3px 0px 0px rgba(15, 23, 42, 0.12)',
    cardRadius: '16px',
    teacherDeskBg: '#0f172a',
    teacherDeskText: '#FFFFFF',
  },
  'retro-chunky-extruded': {
    name: 'Retro Chunky Extruded',
    headingFont: 'Space Grotesk',
    bodyFont: 'DM Sans',
    canvasBg: '#f8f6f0',
    canvasPattern: 'radial-gradient(circle, rgba(0, 0, 0, 0.08) 1.5px, transparent 1.5px) 0 0 / 24px 24px',
    headerBg: '#111827',
    headerText: '#FFFFFF',
    headerBorder: 'rgba(255, 255, 255, 0.12)',
    sidebarBg: 'rgba(255, 255, 255, 0.95)',
    sidebarBorder: '2px solid rgba(17, 24, 39, 0.15)',
    sidebarText: '#111827',
    cardBg: '#FFFFFF',
    cardBorder: '2px solid rgba(17, 24, 39, 0.15)',
    cardShadow: '0px 4px 0px 0px rgba(0, 0, 0, 0.22)',
    cardRadius: '16px',
    teacherDeskBg: '#111827',
    teacherDeskText: '#FFFFFF',
  },
  'paper-craft-bulletin': {
    name: 'Paper Craft Bulletin',
    headingFont: 'Space Grotesk',
    bodyFont: 'DM Sans',
    canvasBg: '#fdfaf5',
    canvasPattern: 'radial-gradient(circle, #d9caa1 1px, transparent 1px) 0 0 / 20px 20px',
    headerBg: '#0f172a',
    headerText: '#FFFFFF',
    headerBorder: 'rgba(255, 255, 255, 0.1)',
    sidebarBg: '#FFFFFF',
    sidebarBorder: '1px solid #e2d9c8',
    sidebarText: '#0f172a',
    cardBg: '#FFFFFF',
    cardBorder: '1px solid #e2d9c8',
    cardShadow: '0 4px 12px -2px rgba(120, 90, 40, 0.10)',
    cardRadius: '12px',
    teacherDeskBg: '#0f172a',
    teacherDeskText: '#FFFFFF',
  },
  'riso-print-room': {
    name: 'Riso Print Room',
    headingFont: 'Space Grotesk',
    bodyFont: 'DM Sans',
    canvasBg: '#faf7f2',
    canvasPattern: 'radial-gradient(circle, rgba(244, 63, 94, 0.12) 1px, transparent 1px) 0 0 / 18px 18px',
    headerBg: '#1e1b4b',
    headerText: '#FFFFFF',
    headerBorder: 'rgba(255, 255, 255, 0.1)',
    sidebarBg: '#FFFFFF',
    sidebarBorder: '2px solid rgba(30, 27, 75, 0.15)',
    sidebarText: '#1e1b4b',
    cardBg: '#FFFFFF',
    cardBorder: '2px solid rgba(30, 27, 75, 0.15)',
    cardShadow: '4px 4px 0px 0px rgba(30, 27, 75, 0.14)',
    cardRadius: '14px',
    teacherDeskBg: '#1e1b4b',
    teacherDeskText: '#FFFFFF',
  },
  'candy-clay': {
    name: 'Candy Clay',
    headingFont: 'Space Grotesk',
    bodyFont: 'DM Sans',
    canvasBg: '#fdf8fa',
    canvasPattern: 'radial-gradient(circle, rgba(244, 114, 182, 0.15) 1.5px, transparent 1.5px) 0 0 / 26px 26px',
    headerBg: '#3b0764',
    headerText: '#FFFFFF',
    headerBorder: 'rgba(255, 255, 255, 0.15)',
    sidebarBg: '#FFFFFF',
    sidebarBorder: '2px solid #fbcfe8',
    sidebarText: '#3b0764',
    cardBg: '#FFFFFF',
    cardBorder: '2px solid #fbcfe8',
    cardShadow: '0 8px 24px -4px rgba(244, 114, 182, 0.22)',
    cardRadius: '24px',
    teacherDeskBg: '#3b0764',
    teacherDeskText: '#FFFFFF',
  },
  'candy-shop': {
    name: 'Candy Shop',
    headingFont: 'Space Grotesk',
    bodyFont: 'DM Sans',
    canvasBg: '#fffaf5',
    canvasPattern: 'radial-gradient(circle, rgba(251, 146, 60, 0.12) 1.5px, transparent 1.5px) 0 0 / 24px 24px',
    headerBg: '#1c1917',
    headerText: '#FFFFFF',
    headerBorder: 'rgba(255, 255, 255, 0.1)',
    sidebarBg: '#FFFFFF',
    sidebarBorder: '2px solid #fed7aa',
    sidebarText: '#1c1917',
    cardBg: '#FFFFFF',
    cardBorder: '2px solid #fed7aa',
    cardShadow: '3px 3px 0px 0px #fdba74',
    cardRadius: '20px',
    teacherDeskBg: '#1c1917',
    teacherDeskText: '#FFFFFF',
  },
  'scholastic-gallery': {
    name: 'Scholastic Gallery',
    headingFont: 'Instrument Serif',
    bodyFont: 'Inter',
    canvasBg: '#FAF9F6',
    canvasPattern: 'radial-gradient(circle, #d6d3cb 1px, transparent 1px) 0 0 / 28px 28px',
    headerBg: '#1A1A1A',
    headerText: '#FAF9F6',
    headerBorder: 'rgba(255, 255, 255, 0.1)',
    sidebarBg: '#FFFFFF',
    sidebarBorder: '1px solid #e7e5e0',
    sidebarText: '#1A1A1A',
    cardBg: '#FFFFFF',
    cardBorder: '1px solid #dcdad4',
    cardShadow: '0 3px 12px -2px rgba(26, 26, 26, 0.08)',
    cardRadius: '10px',
    teacherDeskBg: '#1A1A1A',
    teacherDeskText: '#FAF9F6',
  },
  'precision-blueprint': {
    name: 'Precision Blueprint',
    headingFont: 'Space Grotesk',
    bodyFont: 'DM Sans',
    canvasBg: '#0b1626',
    canvasPattern:
      'linear-gradient(rgba(56, 189, 248, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(56, 189, 248, 0.08) 1px, transparent 1px) 0 0 / 24px 24px',
    headerBg: '#07101e',
    headerText: '#38bdf8',
    headerBorder: 'rgba(56, 189, 248, 0.25)',
    sidebarBg: '#091322',
    sidebarBorder: '1px solid rgba(56, 189, 248, 0.25)',
    sidebarText: '#38bdf8',
    cardBg: '#0c1b30',
    cardBorder: '1px solid rgba(56, 189, 248, 0.35)',
    cardShadow: '0 0 16px -2px rgba(56, 189, 248, 0.18)',
    cardRadius: '8px',
    teacherDeskBg: '#07101e',
    teacherDeskText: '#38bdf8',
    teacherDeskBorder: '1px solid rgba(56, 189, 248, 0.4)',
    isDarkByDefault: true,
  },
  'isometric-block-system': {
    name: 'Isometric Block System',
    headingFont: 'Space Grotesk',
    bodyFont: 'DM Sans',
    canvasBg: '#fdfbf7',
    canvasPattern: 'radial-gradient(circle, #cbd5e1 1.2px, transparent 1.2px) 0 0 / 22px 22px',
    headerBg: '#0f172a',
    headerText: '#FFFFFF',
    headerBorder: 'rgba(255, 255, 255, 0.1)',
    sidebarBg: '#FFFFFF',
    sidebarBorder: '2px solid rgba(15, 23, 42, 0.12)',
    sidebarText: '#0f172a',
    cardBg: '#FFFFFF',
    cardBorder: '2px solid rgba(15, 23, 42, 0.14)',
    cardShadow: '4px 4px 0px 0px rgba(15, 23, 42, 0.16)',
    cardRadius: '12px',
    teacherDeskBg: '#0f172a',
    teacherDeskText: '#FFFFFF',
  },
  'carnival-ticket': {
    name: 'Carnival Ticket',
    headingFont: 'Space Grotesk',
    bodyFont: 'DM Sans',
    canvasBg: '#fcf8ed',
    canvasPattern: 'radial-gradient(circle, rgba(234, 179, 8, 0.18) 1.5px, transparent 1.5px) 0 0 / 20px 20px',
    headerBg: '#1e1b18',
    headerText: '#fde047',
    headerBorder: 'rgba(253, 224, 71, 0.2)',
    sidebarBg: '#FFFFFF',
    sidebarBorder: '2px dashed rgba(202, 138, 4, 0.4)',
    sidebarText: '#1e1b18',
    cardBg: '#FFFFFF',
    cardBorder: '2px dashed rgba(202, 138, 4, 0.5)',
    cardShadow: '3px 3px 0px 0px rgba(202, 138, 4, 0.3)',
    cardRadius: '16px',
    teacherDeskBg: '#1e1b18',
    teacherDeskText: '#fde047',
  },
  'comic-pop': {
    name: 'Comic Pop',
    headingFont: 'Space Grotesk',
    bodyFont: 'DM Sans',
    canvasBg: '#fffbeb',
    canvasPattern: 'radial-gradient(circle, rgba(253, 224, 71, 0.4) 1.8px, transparent 1.8px) 0 0 / 16px 16px',
    headerBg: '#0f172a',
    headerText: '#facc15',
    headerBorder: '2px solid #facc15',
    sidebarBg: '#FFFFFF',
    sidebarBorder: '3px solid #000000',
    sidebarText: '#000000',
    cardBg: '#FFFFFF',
    cardBorder: '3px solid #000000',
    cardShadow: '4px 4px 0px 0px #000000',
    cardRadius: '16px',
    teacherDeskBg: '#facc15',
    teacherDeskText: '#000000',
  },
  'gamify': {
    name: 'Gamify',
    headingFont: 'Space Grotesk',
    bodyFont: 'DM Sans',
    canvasBg: '#090d16',
    canvasPattern:
      'linear-gradient(rgba(147, 51, 234, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(147, 51, 234, 0.08) 1px, transparent 1px) 0 0 / 24px 24px',
    headerBg: '#030712',
    headerText: '#a855f7',
    headerBorder: 'rgba(168, 85, 247, 0.3)',
    sidebarBg: '#060911',
    sidebarBorder: '1px solid rgba(168, 85, 247, 0.3)',
    sidebarText: '#a855f7',
    cardBg: '#0f172a',
    cardBorder: '1px solid rgba(168, 85, 247, 0.4)',
    cardShadow: '0 0 16px -2px rgba(168, 85, 247, 0.28)',
    cardRadius: '14px',
    teacherDeskBg: '#030712',
    teacherDeskText: '#a855f7',
    teacherDeskBorder: '1px solid rgba(168, 85, 247, 0.5)',
    isDarkByDefault: true,
  },
  'board-game': {
    name: 'Board Game',
    headingFont: 'Space Grotesk',
    bodyFont: 'DM Sans',
    canvasBg: '#f7f3eb',
    canvasPattern: 'radial-gradient(circle, rgba(180, 83, 9, 0.12) 1.5px, transparent 1.5px) 0 0 / 24px 24px',
    headerBg: '#1c1917',
    headerText: '#fef3c7',
    headerBorder: 'rgba(254, 243, 199, 0.15)',
    sidebarBg: '#FFFFFF',
    sidebarBorder: '2px solid rgba(217, 119, 6, 0.25)',
    sidebarText: '#1c1917',
    cardBg: '#FFFFFF',
    cardBorder: '2px solid rgba(217, 119, 6, 0.25)',
    cardShadow: '3px 3px 0px 0px rgba(180, 83, 9, 0.18)',
    cardRadius: '16px',
    teacherDeskBg: '#1c1917',
    teacherDeskText: '#fef3c7',
  },
  'neo-brutalism': {
    name: 'Neo Brutalism',
    headingFont: 'Space Grotesk',
    bodyFont: 'Space Grotesk',
    canvasBg: '#ffffff',
    canvasPattern: 'none',
    headerBg: '#000000',
    headerText: '#ffffff',
    headerBorder: '2px solid #ffffff',
    sidebarBg: '#ffffff',
    sidebarBorder: '3px solid #000000',
    sidebarText: '#000000',
    cardBg: '#ffffff',
    cardBorder: '3px solid #000000',
    cardShadow: '5px 5px 0px 0px #000000',
    cardRadius: '0px',
    teacherDeskBg: '#000000',
    teacherDeskText: '#ffffff',
  },
};

export function getThemeKitDefinition(slug?: string): ThemeKitDefinition | null {
  if (!slug) return null;
  return THEME_KIT_DEFINITIONS[slug] ?? null;
}

export function buildThemeKitCssProperties(
  slug?: string,
  settings?: ClassroomThemeKitSettings,
): React.CSSProperties | undefined {
  if (!slug && !settings) return undefined;
  const def = getThemeKitDefinition(slug);
  if (!def && !settings) return undefined;

  const isDark = settings?.darkMode ?? def?.isDarkByDefault ?? false;
  const headingFont =
    settings?.headingFont && settings.headingFont !== 'Theme default'
      ? settings.headingFont
      : def?.headingFont || 'Space Grotesk';

  const bodyFont =
    settings?.bodyFont && settings.bodyFont !== 'Theme default'
      ? settings.bodyFont
      : def?.bodyFont || 'DM Sans';

  const corners = settings?.corners;
  const depth = settings?.depth;

  // Compute card radius based on settings or def
  const cardRadius =
    corners !== undefined
      ? `${corners}px`
      : def?.cardRadius || '16px';

  // Compute card shadow based on depth or def
  let cardShadow = def?.cardShadow || '0 4px 12px -2px rgba(0, 0, 0, 0.08)';
  if (depth !== undefined) {
    if (depth === 'Flat' || (depth as any) === 0) {
      cardShadow = 'none';
    } else if (depth === 'Extra') {
      cardShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)';
    } else if (typeof (depth as unknown) === 'number') {
      const numDepth = depth as unknown as number;
      const offset = Math.round(numDepth * 0.8);
      const blur = Math.round(numDepth * 2);
      cardShadow = `${offset}px ${offset}px ${blur}px 0px rgba(0, 0, 0, ${Math.min(0.35, 0.08 + numDepth * 0.025)})`;
    }
  }

  // Base canvas colors
  let canvasBg = def?.canvasBg || (isDark ? '#0b0f19' : '#FDFCF5');
  let canvasPattern = def?.canvasPattern || 'none';
  let headerBg = def?.headerBg || (isDark ? '#030712' : '#0A1628');
  let headerText = def?.headerText || '#FFFFFF';
  let headerBorder = def?.headerBorder || 'rgba(255, 255, 255, 0.1)';
  let sidebarBg = def?.sidebarBg || (isDark ? '#0f172a' : '#FFFFFF');
  let sidebarBorder = def?.sidebarBorder || (isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(10, 22, 40, 0.08)');
  let sidebarText = def?.sidebarText || (isDark ? '#FFFFFF' : '#0A1628');
  let cardBg = def?.cardBg || (isDark ? '#131c31' : '#FFFFFF');
  let cardBorder = def?.cardBorder || (isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(10, 22, 40, 0.12)');
  let teacherDeskBg = def?.teacherDeskBg || (isDark ? '#030712' : '#0A1628');
  let teacherDeskText = def?.teacherDeskText || '#FFFFFF';

  if (isDark && !def?.isDarkByDefault) {
    canvasBg = '#0b0f19';
    canvasPattern = 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 1.2px, transparent 1.2px) 0 0 / 24px 24px';
    headerBg = '#030712';
    headerText = '#FFFFFF';
    headerBorder = 'rgba(255, 255, 255, 0.12)';
    sidebarBg = '#0f172a';
    sidebarBorder = '1px solid rgba(255, 255, 255, 0.12)';
    sidebarText = '#FFFFFF';
    cardBg = '#131c31';
    cardBorder = '1px solid rgba(255, 255, 255, 0.12)';
    teacherDeskBg = '#030712';
    teacherDeskText = '#FFFFFF';
  }

  // Filter computation for hue & vividness
  const filterParts: string[] = [];
  if (settings?.hue && settings.hue !== 0) {
    filterParts.push(`hue-rotate(${settings.hue}deg)`);
  }
  if (settings?.vivid && settings.vivid !== 100) {
    filterParts.push(`saturate(${settings.vivid}%)`);
  }

  const filterString = filterParts.length > 0 ? filterParts.join(' ') : undefined;

  const style: Record<string, string> = {
    '--theme-canvas-bg': canvasBg,
    '--theme-canvas-pattern': canvasPattern,
    '--theme-header-bg': headerBg,
    '--theme-header-text': headerText,
    '--theme-header-border': headerBorder,
    '--theme-sidebar-bg': sidebarBg,
    '--theme-sidebar-border': sidebarBorder,
    '--theme-sidebar-text': sidebarText,
    '--theme-card-bg': cardBg,
    '--theme-card-border': cardBorder,
    '--theme-card-shadow': cardShadow,
    '--theme-card-radius': cardRadius,
    '--theme-font-heading': `'${headingFont}', sans-serif`,
    '--theme-font-body': `'${bodyFont}', sans-serif`,
    '--theme-teacher-desk-bg': teacherDeskBg,
    '--theme-teacher-desk-text': teacherDeskText,
    fontFamily: `'${bodyFont}', sans-serif`,
  };

  if (filterString) {
    style['--theme-filter'] = filterString;
  }

  return style as React.CSSProperties;
}

export function buildThemeGoogleFontsUrl(
  slug?: string,
  settings?: ClassroomThemeKitSettings,
): string | null {
  const def = getThemeKitDefinition(slug);
  const headingFont =
    settings?.headingFont && settings.headingFont !== 'Theme default'
      ? settings.headingFont
      : def?.headingFont;

  const bodyFont =
    settings?.bodyFont && settings.bodyFont !== 'Theme default'
      ? settings.bodyFont
      : def?.bodyFont;

  const fontsToLoad = new Set<string>();
  if (headingFont) fontsToLoad.add(headingFont);
  if (bodyFont) fontsToLoad.add(bodyFont);

  if (fontsToLoad.size === 0) return null;

  const parts = Array.from(fontsToLoad).map(
    (f) => `family=${f.replaceAll(' ', '+')}:ital,wght@0,400;0,600;0,700;1,400;1,600`,
  );

  return `https://fonts.googleapis.com/css2?${parts.join('&')}&display=swap`;
}
