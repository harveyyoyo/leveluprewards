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

const updateThemeJS = `
      ${standardThemes}

      function updateTheme(event) {
        let themeKey = document.getElementById("theme-select").value;
        if (event && event.target) {
            themeKey = event.target.value;
        }
        const theme = THEMES[themeKey] || THEMES.light;
        const root = document.documentElement;
        
        for (const [key, value] of Object.entries(theme)) {
          if (key === "page-gradient") continue;
          root.style.setProperty(key, value);
        }
        
        // Preserve their specific light/dark CSS logic by setting dataset
        root.dataset.theme = themeKey;
        
        // Update page backgrounds if they use .page
        document.querySelectorAll(".page").forEach((p) => {
          if (theme["page-gradient"]) {
             p.style.background = theme["page-gradient"];
          }
        });
      }
`;

function processFile(filename) {
  const file = path.join(DIR, filename);
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace select options
  content = content.replace(/<select id="theme-select"[^>]*>[\s\S]*?<\/select>/, `<select id="theme-select" onchange="updateTheme(event)">${standardOptions}</select>`);
  
  // Inject script right before </script> in <head>
  // Wait, levelup-pillars-flyer.html might have multiple scripts. Let's find the main init block.
  // We can just append it before the closing </head>
  content = content.replace(/<\/head>/, `
    <script>
      ${updateThemeJS}
      
      document.addEventListener("DOMContentLoaded", function() {
        const sel = document.getElementById("theme-select");
        if(sel) {
          sel.value = "light";
          updateTheme();
        }
      });
    </script>
  </head>`);
  
  fs.writeFileSync(file, content);
  console.log('Updated ' + filename);
}

processFile('levelup-pillars-flyer.html');
processFile('levelup-extra-features-flyer.html');
