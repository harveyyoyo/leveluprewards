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
          <option value="light">Classic Light (Default)</option>
          <option value="light-sky">Light Sky Breeze</option>
          <option value="light-mint">Light Mint Garden</option>
          <option value="light-amber">Light Amber Sun</option>
          <option value="light-rose">Light Rose Brief</option>
          <option value="light-slate">Light Slate Pro</option>
`;

function updateFundingFlyer() {
  const file = path.join(DIR, 'levelup-funding-flyer.html');
  let content = fs.readFileSync(file, 'utf8');
  
  content = content.replace(/<select id="theme-select"[\s\S]*?<\/select>/, `<select id="theme-select" onchange="applyFundingTheme(this.value)">${standardOptions}</select>`);
  content = content.replace(/const FUNDING_THEMES = \{[\s\S]*?^      \};/m, standardThemes);
  content = content.replace(/const theme = FUNDING_THEMES\[themeKey\] \|\| FUNDING_THEMES\.light;/g, 'const theme = THEMES[themeKey] || THEMES.light;');
  
  fs.writeFileSync(file, content);
  console.log('Updated funding flyer');
}

updateFundingFlyer();
