import { describe, expect, it } from 'vitest';
import {
  getThemeKitDefinition,
  buildThemeKitCssProperties,
  buildThemeGoogleFontsUrl,
  THEME_KIT_DEFINITIONS,
} from './classroomThemeKitStyles';

describe('classroomThemeKitStyles', () => {
  it('has definitions for all 15 themes', () => {
    const expectedSlugs = [
      'tactile-offset-grid',
      'warm-academic-serif',
      'tactile-offset-variant',
      'retro-chunky-extruded',
      'paper-craft-bulletin',
      'riso-print-room',
      'candy-clay',
      'candy-shop',
      'scholastic-gallery',
      'precision-blueprint',
      'isometric-block-system',
      'carnival-ticket',
      'comic-pop',
      'gamify',
      'board-game',
      'neo-brutalism',
    ];

    for (const slug of expectedSlugs) {
      const def = getThemeKitDefinition(slug);
      expect(def).toBeDefined();
      expect(def?.canvasBg).toBeTruthy();
      expect(def?.headerBg).toBeTruthy();
      expect(def?.sidebarBg).toBeTruthy();
      expect(def?.cardBg).toBeTruthy();
    }
  });

  it('builds CSS variables for tactile-offset-grid', () => {
    const style = buildThemeKitCssProperties('tactile-offset-grid', {
      headingFont: 'Space Grotesk',
      bodyFont: 'DM Sans',
      hue: 0,
      vivid: 100,
      corners: 14,
      depth: 'Theme',
      darkMode: false,
    }) as Record<string, string>;

    expect(style).toBeDefined();
    expect(style['--theme-canvas-bg']).toBe('#FDFCF5');
    expect(style['--theme-header-bg']).toBe('#0A1628');
    expect(style['--theme-sidebar-bg']).toBe('#FFFFFF');
    expect(style['--theme-card-bg']).toBe('#FFFFFF');
    expect(style['--theme-card-radius']).toBe('14px');
    expect(style['--theme-font-heading']).toContain('Space Grotesk');
    expect(style['--theme-font-body']).toContain('DM Sans');
  });

  it('applies dark mode variables when darkMode is enabled', () => {
    const style = buildThemeKitCssProperties('warm-academic-serif', {
      headingFont: 'Fraunces',
      bodyFont: 'Instrument Sans',
      hue: 0,
      vivid: 100,
      corners: 12,
      depth: 'Flat',
      darkMode: true,
    }) as Record<string, string>;

    expect(style).toBeDefined();
    expect(style['--theme-canvas-bg']).toBe('#0b0f19');
    expect(style['--theme-header-bg']).toBe('#030712');
    expect(style['--theme-sidebar-bg']).toBe('#0f172a');
    expect(style['--theme-card-bg']).toBe('#131c31');
  });

  it('generates Google Fonts URL for custom fonts', () => {
    const url = buildThemeGoogleFontsUrl('warm-academic-serif', {
      headingFont: 'Fraunces',
      bodyFont: 'Instrument Sans',
      hue: 0,
      vivid: 100,
      corners: 16,
      depth: 'Theme',
      darkMode: false,
    });

    expect(url).toContain('family=Fraunces');
    expect(url).toContain('family=Instrument+Sans');
  });
});
