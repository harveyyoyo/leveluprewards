import fs from 'fs';
import path from 'path';

// --- Color Utility Functions ---

function hslToRgb(h, s, l) {
  h /= 360;
  s /= 100;
  l /= 100;
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(l1, l2) {
  const lightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  return (lightest + 0.05) / (darkest + 0.05);
}

// --- Parsing and Validation ---

const TARGET_FILE = path.join(process.cwd(), 'src', 'app', 'globals.css');
const MIN_CONTRAST = 4.5;

const pairsToCheck = [
  ['background', 'foreground'],
  ['primary', 'primary-foreground'],
  ['card', 'card-foreground'],
  ['popover', 'popover-foreground'],
  ['secondary', 'secondary-foreground'],
  ['muted', 'muted-foreground'],
  ['accent', 'accent-foreground'],
  ['destructive', 'destructive-foreground'],
];

function validateThemes() {
  if (!fs.existsSync(TARGET_FILE)) {
    console.error(`Could not find ${TARGET_FILE}`);
    process.exit(1);
  }

  const css = fs.readFileSync(TARGET_FILE, 'utf-8');
  const blockRegex = /([^{]+)\{([^}]+)\}/g;
  let match;
  let hasErrors = false;

  console.log('Validating Theme Readability (WCAG AA Contrast >= 4.5:1)...\n');

  // To properly handle CSS variables that are inherited from :root or .dark into specific themes
  // We need to keep track of the base values
  let rootVariables = {};
  let darkVariables = {};

  while ((match = blockRegex.exec(css)) !== null) {
    const selectorStr = match[1].trim();
    const bodyStr = match[2];

    // Check if it's a theme selector
    if (
      selectorStr.includes(':root') ||
      selectorStr.includes('.dark') ||
      selectorStr.includes('[data-color-scheme')
    ) {
      const isDarkMode = selectorStr.includes('.dark');
      
      // Parse variables in this block
      const vars = {};
      const varRegex = /--([a-zA-Z0-9-]+):\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/g;
      let varMatch;
      while ((varMatch = varRegex.exec(bodyStr)) !== null) {
        vars[varMatch[1]] = {
          h: parseFloat(varMatch[2]),
          s: parseFloat(varMatch[3]),
          l: parseFloat(varMatch[4]),
        };
      }

      // Save base variables for inheritance
      if (selectorStr === ':root') {
        rootVariables = { ...vars };
      } else if (selectorStr === '.dark') {
        darkVariables = { ...rootVariables, ...vars }; // .dark might inherit from :root
      }

      // If it's a specific theme, it inherits from :root or .dark
      let currentVars = { ...vars };
      if (selectorStr.includes('[data-color-scheme') && !selectorStr.includes('.dark')) {
          currentVars = { ...rootVariables, ...vars };
      } else if (selectorStr.includes('[data-color-scheme') && selectorStr.includes('.dark')) {
          currentVars = { ...darkVariables, ...vars };
      }

      // Now check pairs for this selector if it defines at least some variables
      if (Object.keys(vars).length > 0) {
        for (const [bgKey, fgKey] of pairsToCheck) {
          const bg = currentVars[bgKey];
          const fg = currentVars[fgKey];

          if (bg && fg) {
            const rgbBg = hslToRgb(bg.h, bg.s, bg.l);
            const rgbFg = hslToRgb(fg.h, fg.s, fg.l);
            
            const lumBg = getLuminance(...rgbBg);
            const lumFg = getLuminance(...rgbFg);
            
            const ratio = getContrastRatio(lumBg, lumFg);

            if (ratio < MIN_CONTRAST) {
              console.error(
                `❌ Contrast failed in "${selectorStr.split('\n').pop().trim()}"`
              );
              console.error(
                `   --${bgKey} vs --${fgKey}: ${ratio.toFixed(2)}:1 (Minimum: ${MIN_CONTRAST}:1)`
              );
              console.error(`   Background HSL: ${bg.h} ${bg.s}% ${bg.l}%`);
              console.error(`   Foreground HSL: ${fg.h} ${fg.s}% ${fg.l}%\n`);
              hasErrors = true;
            }
          }
        }
      }
    }
  }

  if (hasErrors) {
    console.error('Theme validation failed. Please adjust HSL lightness values to meet WCAG AA standards.');
    process.exit(1);
  } else {
    console.log('✅ All themes passed readability validation!');
  }
}

validateThemes();
