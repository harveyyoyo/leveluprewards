/**
 * Unifies marketing flyer footers with NYC DOE vendor line + legal/contact links.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(__dirname, '..', 'public', 'marketing');

const FOOTER = `      <footer class="flyer-footer">
        <p class="flyer-footer__vendor">Approved NYC Department of Education (DOE) vendor</p>
        <p class="flyer-footer__links"><a href="https://leveluprewards.app">leveluprewards.app</a> · <a href="mailto:contact@leveluprewards.app">contact@leveluprewards.app</a></p>
        <p class="flyer-footer__copy">© 2026 LevelUp EdTech Enterprises LLC</p>
      </footer>`;

const COPYRIGHT_FOOT_RE =
  /<p class="foot">[^<]*(?:©|\(c\)|LevelUp EdTech|levelUp EDU|Grades \d)[^<]*<\/p>\s*/gi;

function apply(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  if (html.includes('flyer-footer__vendor')) {
    return false;
  }

  html = html.replace(COPYRIGHT_FOOT_RE, '');
  html = html.replace(/<p class="bottom">[^<]*LevelUp EdTech[^<]*<\/p>\s*/gi, '');

  html = html.replace(
    /<p class="foot">Ask your admin[^<]*<\/p>/gi,
    (m) => m.replace('class="foot"', 'class="flyer-note"'),
  );

  html = html.replace(
    /<p class="footer">\s*LevelUp Rewards[\s\S]*?<\/p>/,
    FOOTER.replace(/^      /gm, '          '),
  );

  html = html.replace(
    /<div class="footer-bar">[\s\S]*?<\/div>\s*/,
    `${FOOTER}\n`,
  );

  html = html.replace(
    /(<footer class="footer-cta">[\s\S]*?)<p class="foot">[^<]*<\/p>/,
    '$1',
  );

  html = html.replace(
    /(<footer class="contact">[\s\S]*?)<p class="foot">[^<]*<\/p>\s*/,
    '$1',
  );

  if (!html.includes('flyer-footer')) {
    html = html.replace(/(\s*)<\/article>/, `\n${FOOTER}\n$1</article>`);
  }

  fs.writeFileSync(filePath, html);
  return true;
}

const files = fs.readdirSync(DIR).filter((f) => f.startsWith('flyer') && f.endsWith('.html'));
let n = 0;
for (const f of files) {
  if (apply(path.join(DIR, f))) {
    console.log('Updated', f);
    n += 1;
  }
}
console.log(`Done. ${n} flyers updated.`);
