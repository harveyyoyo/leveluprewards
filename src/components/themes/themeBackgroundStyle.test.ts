import { describe, expect, it } from 'vitest';
import {
    buildLinearGradientCss,
    parseEditableLinearGradient,
    replaceCssColor,
    uniqueBackgroundColors,
} from './themeBackgroundStyle';

describe('themeBackgroundStyle', () => {
    it('parses AI-style multi-stop linear gradients', () => {
        const css =
            'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)';
        const parsed = parseEditableLinearGradient(css);
        expect(parsed).not.toBeNull();
        expect(parsed?.colorA).toBe('#667eea');
        expect(parsed?.colorB).toBe('#f093fb');
        expect(parsed?.middleColors).toEqual(['#764ba2']);
    });

    it('extracts unique colors from radial gradients', () => {
        const css =
            'radial-gradient(ellipse at top, #1a1a2e 0%, #16213e 50%, #0f3460 100%)';
        expect(uniqueBackgroundColors(css)).toEqual(['#1a1a2e', '#16213e', '#0f3460']);
    });

    it('replaces colors in place', () => {
        const css = 'radial-gradient(circle, #111111 0%, #222222 100%)';
        expect(replaceCssColor(css, '#111111', '#abcdef')).toBe(
            'radial-gradient(circle, #abcdef 0%, #222222 100%)',
        );
    });

    it('rebuilds linear gradients with middle stops', () => {
        expect(buildLinearGradientCss('135', ['#111111', '#222222', '#333333'])).toBe(
            'linear-gradient(135deg, #111111 0%, #222222 50%, #333333 100%)',
        );
    });
});
