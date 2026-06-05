const COLOR_TOKEN = /#(?:[0-9a-f]{3,8})\b|rgba?\(\s*[\d.,%]+\s*(?:,\s*[\d.,%]+\s*){2,3}\)/gi;

const GRADIENT_ANGLE_OPTS = [45, 90, 135, 180, 225] as const;

export function snapGradientAngleDeg(deg: number): string {
    let best: (typeof GRADIENT_ANGLE_OPTS)[number] = GRADIENT_ANGLE_OPTS[0];
    let bestD = Infinity;
    for (const o of GRADIENT_ANGLE_OPTS) {
        const d = Math.abs(o - deg);
        if (d < bestD) {
            bestD = d;
            best = o;
        }
    }
    return String(best);
}

/** All color tokens in source order (duplicates preserved). */
export function extractCssColors(css: string): string[] {
    return [...css.matchAll(COLOR_TOKEN)].map((m) => m[0]);
}

/** Unique colors in first-seen order — used for AI background editors. */
export function uniqueBackgroundColors(css: string): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const color of extractCssColors(css)) {
        const key = color.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(color);
    }
    return out;
}

export function replaceCssColor(css: string, oldColor: string, newColor: string): string {
    if (!oldColor || oldColor === newColor) return css;
    const escaped = oldColor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return css.replace(new RegExp(escaped, 'gi'), newColor);
}

export type EditableLinearGradient = {
    angle: string;
    colorA: string;
    colorB: string;
    /** Middle stops when AI returns 3+ colors. */
    middleColors: string[];
};

/**
 * Parses common AI/user linear-gradient strings (2+ stops, optional %, rgba).
 * Returns null for radial, repeating, or non-gradient backgrounds.
 */
export function parseEditableLinearGradient(backgroundStyle: string): EditableLinearGradient | null {
    const norm = backgroundStyle.replace(/\s+/g, ' ').trim();
    if (!/^linear-gradient\(/i.test(norm)) return null;

    const colors = extractCssColors(norm);
    if (colors.length < 2) return null;

    const angleMatch = norm.match(/linear-gradient\(\s*(\d+(?:\.\d+)?)\s*deg/i);
    const angle = angleMatch ? snapGradientAngleDeg(parseFloat(angleMatch[1])) : '135';

    return {
        angle,
        colorA: colors[0],
        colorB: colors[colors.length - 1],
        middleColors: colors.length > 2 ? colors.slice(1, -1) : [],
    };
}

export function buildLinearGradientCss(
    angle: string,
    colors: string[],
): string {
    if (colors.length === 0) return '';
    if (colors.length === 1) {
        return `linear-gradient(${angle}deg, ${colors[0]} 0%, ${colors[0]} 100%)`;
    }
    const stops = colors
        .map((c, i) => {
            const pct = Math.round((i / (colors.length - 1)) * 100);
            return `${c} ${pct}%`;
        })
        .join(', ');
    return `linear-gradient(${angle}deg, ${stops})`;
}

export function linearGradientColors(parsed: EditableLinearGradient): string[] {
    return [parsed.colorA, ...parsed.middleColors, parsed.colorB];
}

export function inferBackgroundMode(theme: { backgroundStyle?: string | null } | undefined): 'solid' | 'gradient' | 'custom' {
    if (!theme?.backgroundStyle?.trim()) return 'solid';
    const bs = theme.backgroundStyle.trim();
    if (parseEditableLinearGradient(bs)) return 'gradient';
    return 'custom';
}

export function hexForColorInput(color: string | undefined, fallback: string): string {
    if (!color) return fallback;
    const c = color.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(c)) return c;
    const m3 = c.match(/^#([0-9a-fA-F]{3})$/);
    if (m3) {
        const x = m3[1];
        return `#${x[0]}${x[0]}${x[1]}${x[1]}${x[2]}${x[2]}`;
    }
    const rgb = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (rgb) {
        const r = Math.min(255, parseInt(rgb[1], 10));
        const g = Math.min(255, parseInt(rgb[2], 10));
        const b = Math.min(255, parseInt(rgb[3], 10));
        return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
    }
    return fallback;
}
