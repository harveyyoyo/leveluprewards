/**
 * Visual theme for the Classroom realm (background, glow, accent gradient).
 * Colors apply via `--cr-*` custom properties (see `globals.css`).
 */

export const DEFAULT_CLASSROOM_REALM_THEME = {
  id: 'aurora' as const,
  label: 'Aurora',
  tokens: {
    base: '#0c1222',
    glowTop: 'rgba(99, 102, 241, 0.35)',
    glowBottom: 'rgba(20, 184, 166, 0.14)',
    gradFrom: '#131a2e',
    gradMid: '#0c1222',
    gradTo: '#060a14',
    grid: 'rgba(99, 102, 241, 0.08)',
    accentFrom: '#6366f1',
    accentTo: '#14b8a6',
    accentText: '#a5b4fc',
    onAccent: '#ffffff',
  },
};

export type ClassroomRealmTheme = typeof DEFAULT_CLASSROOM_REALM_THEME;

export function classroomRealmThemeVars(theme: ClassroomRealmTheme = DEFAULT_CLASSROOM_REALM_THEME) {
  const t = theme.tokens;
  return {
    '--cr-base': t.base,
    '--cr-glow-top': t.glowTop,
    '--cr-glow-bottom': t.glowBottom,
    '--cr-grad-from': t.gradFrom,
    '--cr-grad-mid': t.gradMid,
    '--cr-grad-to': t.gradTo,
    '--cr-grid': t.grid,
    '--cr-accent-from': t.accentFrom,
    '--cr-accent-to': t.accentTo,
    '--cr-accent-text': t.accentText,
    '--cr-on-accent': t.onAccent,
  } as Record<string, string>;
}
