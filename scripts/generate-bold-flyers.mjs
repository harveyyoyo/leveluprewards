#!/usr/bin/env node
/**
 * Regenerate public/marketing/flyer-*.html using the Bold Navy theme.
 * Does not touch public/marketing/classic/ (original layouts — see export-classic-flyers.mjs).
 * Run: node scripts/generate-bold-flyers.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { FLYER_BOLD_CATALOG } from './flyer-bold-catalog.mjs';

const OUT_DIR = path.join(process.cwd(), 'public', 'marketing');

const FOOTER = `      <footer class="flyer-footer">
        <p class="flyer-footer__vendor">Approved NYC Department of Education (DOE) vendor</p>
        <p class="flyer-footer__links"><a href="https://leveluprewards.app">leveluprewards.app</a> · <a href="mailto:contact@leveluprewards.app">contact@leveluprewards.app</a></p>
        <p class="flyer-footer__copy">© 2026 LevelUp EdTech Enterprises LLC</p>
      </footer>`;

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** @param {import('./flyer-bold-catalog.mjs').BoldFlyer} f */
function renderBlocks(f) {
  const gridClass =
    f.blocksLayout === '3' ? 'blocks blocks--3' : f.blocksLayout === '1' ? 'blocks blocks--1' : 'blocks';
  const items = f.blocks
    .map((b) => {
      if (b.list) {
        const lis = b.list.map((li) => `<li>${li}</li>`).join('\n            ');
        return `<div class="block"><h3>${b.h3}</h3><ul>${lis}</ul></div>`;
      }
      return `<div class="block"><h3>${b.h3}</h3><p>${b.p}</p></div>`;
    })
    .join('\n        ');
  return `<section class="${gridClass}">\n        ${items}\n      </section>`;
}

/** @param {import('./flyer-bold-catalog.mjs').BoldFlyer} f */
function renderImages(f) {
  if (f.screenshots?.length) {
    const imgs = f.screenshots
      .map(
        (s) =>
          `<img src="${s.src}" alt="${escapeHtml(s.alt)}" width="900" height="500" loading="lazy" />`,
      )
      .join('\n          ');
    return `<div class="img-wrap img-wrap--dual">\n          ${imgs}\n        </div>`;
  }
  if (f.screenshot) {
    const s = f.screenshot;
    return `<div class="img-wrap">
        <img src="${s.src}" alt="${escapeHtml(s.alt)}" width="1200" height="600" loading="lazy" />
      </div>`;
  }
  return '';
}

/** @param {import('./flyer-bold-catalog.mjs').BoldFlyer} f */
function renderFlyer(f) {
  const compact = f.compact ? ' flyer--compact' : '';
  const tagline = f.tagline
    ? `<p class="tagline">${f.tagline.replace(/\n/g, '<br />')}</p>`
    : '';
  const note = f.note ? `<p class="note">${f.note}</p>` : '';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(f.title)}</title>
    <script src="/marketing/flyer-embed.js"></script>
  </head>
  <body>
    <p class="hint">Ctrl+P → Letter, backgrounds on</p>
    <article class="flyer${compact}">
      <div class="stripe" aria-hidden="true"></div>
      <header class="top">
        <img src="/logo.png" alt="LevelUp logo" class="flyer-brand-logo" width="80" height="80" />
        <h1>LEVEL UP<em>${f.headerEm}</em></h1>
        ${tagline}
      </header>
      <h2 class="mega">${f.mega}</h2>
      <p class="sub">${f.sub}</p>
      ${renderBlocks(f)}
      ${note}
      ${renderImages(f)}
      <footer class="bottom">
        <div class="cta">
          ${escapeHtml(f.ctaTitle)}
          <small>${escapeHtml(f.ctaSmall)}</small>
        </div>
        <div class="urls">
          <a href="https://leveluprewards.app">leveluprewards.app</a>
          <a href="mailto:contact@leveluprewards.app">contact@leveluprewards.app</a>
        </div>
      </footer>
${FOOTER}
    </article>
  </body>
</html>
`;
}

let count = 0;
for (const f of FLYER_BOLD_CATALOG) {
  const outPath = path.join(OUT_DIR, f.file);
  fs.writeFileSync(outPath, renderFlyer(f), 'utf8');
  console.log('wrote', f.file);
  count += 1;
}
console.log(`Done: ${count} flyer(s).`);
