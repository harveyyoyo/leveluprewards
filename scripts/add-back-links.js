const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'public', 'marketing');
const files = fs.readdirSync(DIR).filter(f => f.startsWith('levelup-') && f.endsWith('.html'));

const backLinkHTML = `\n    <a class="back-link no-print" href="/marketing/index.html" style="position: fixed; top: 1.5rem; left: 1.5rem; z-index: 100; background: white; padding: 0.5rem 1rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 600; color: #0f172a; text-decoration: none; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0; transition: all 0.2s;">&larr; Back to marketing flyers</a>\n`;

for (const file of files) {
  const filePath = path.join(DIR, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove existing back-links if any
  content = content.replace(/<a class="back-link"[^>]*>.*?<\/a>/gs, '');
  content = content.replace(/<a class="back-link" href="interactive\.html"[^>]*>.*?<\/a>/gs, '');
  content = content.replace(/<style>[^<]*\.back-link[^<]*<\/style>/g, '');

  // Inject new back-link right after <body>
  content = content.replace(/<body[^>]*>/i, match => match + backLinkHTML);
  
  fs.writeFileSync(filePath, content);
  console.log('Injected back-link to ' + file);
}
