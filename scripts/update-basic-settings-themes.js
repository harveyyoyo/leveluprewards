const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'public', 'marketing');

const principalsFile = path.join(DIR, 'levelup-principals-flyer.html');
const principalsContent = fs.readFileSync(principalsFile, 'utf8');

const themesMatch = principalsContent.match(/const THEMES = \{[\s\S]*?^      \};/m);
if (!themesMatch) throw new Error("Could not find THEMES in principals");
const standardThemes = themesMatch[0];

const standardOptions = `
          <option value="navy">Bold Navy</option>
          <option value="green">Emerald Forest</option>
          <option value="sunset">Purple Sunset</option>
          <option value="cyber">Classic Neon</option>
          <option value="crimson">Crimson Culture</option>
          <option value="gold">Quest Gold</option>
          <option value="aurora">Winter Aurora</option>
          <option value="sapphire">Royal Sapphire</option>
          <option value="obsidian">Grayscale Midnight</option>
          <option value="sand">Sahara Sand</option>
          <option value="light" selected>Classic Light (Default)</option>
          <option value="light-sky">Light Sky Breeze</option>
          <option value="light-mint">Light Mint Garden</option>
          <option value="light-amber">Light Amber Sun</option>
          <option value="light-rose">Light Rose Brief</option>
          <option value="light-slate">Light Slate Pro</option>
`;

const updateThemeJS = `
      ${standardThemes}

      function applyBasicSettingsTheme(themeKey) {
        // Fallback or use standard logic
        const theme = THEMES[themeKey] || THEMES.light;
        const root = document.body;
        
        // Remove old theme classes (theme-clean, theme-blue, etc)
        root.className = root.className.replace(/theme-[\\w-]+/g, '').trim();
        root.classList.add('theme-' + themeKey);

        // Map standard theme variables to the basic-settings specific variables
        // if they don't explicitly exist.
        // basic-settings uses: --navy, --navy-deep, --gold-bg, --gold-text, --blob, --border
        root.style.setProperty('--navy', theme['--strong'] || theme['--text'] || '#1e293b');
        root.style.setProperty('--navy-deep', theme['--text'] || '#0f172a');
        root.style.setProperty('--gold-bg', theme['--panel'] || theme['--callout-bg'] || '#f1f5f9');
        root.style.setProperty('--gold-text', theme['--accent'] || '#334155');
        root.style.setProperty('--blob', theme['--hair'] || theme['--badge-border'] || '#e2e8f0');
        root.style.setProperty('--border', theme['--hair'] || theme['--card-border'] || '#cbd5e1');

        // It also hides shape-navy and shape-blob on light/clean mode
        const shapes = document.querySelectorAll('.shape-navy, .shape-blob');
        if (themeKey.startsWith('light') || themeKey === 'clean') {
           shapes.forEach(el => el.style.display = 'none');
        } else {
           shapes.forEach(el => el.style.display = 'block');
        }
      }
`;

function processFile() {
  const file = path.join(DIR, 'levelup-rewards-basic-settings-flyer.html');
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace select options
  content = content.replace(/<select id="theme-select"[^>]*>[\s\S]*?<\/select>/, `<select id="theme-select" class="sidebar-select" onchange="applyBasicSettingsTheme(this.value)">${standardOptions}</select>`);
  
  // Replace old applyBasicSettingsTheme and inject new logic
  content = content.replace(/function applyBasicSettingsTheme[\s\S]*?^      }/m, updateThemeJS);
  
  // Also fix the fact that there's a duplicate interactive link now
  content = content.replace(/<a class="interactive-list-link"[^>]*>.*?<\/a>/gs, '');

  fs.writeFileSync(file, content);
  console.log('Updated basic settings flyer');
}

processFile();
