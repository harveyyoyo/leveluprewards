#!/usr/bin/env node
/**
 * Replace header screenshot placeholders with the app logo (`/logo.png`).
 * Feature/demo screenshots in body sections are left unchanged.
 */
import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(process.cwd(), 'public', 'marketing');
const brandImg =
  /<img src="\/marketing\/screenshots\/[^"]+" alt="LevelUp(?: logo)?" width="(\d+)" height="(\d+)" \/>/g;
const replacement =
  '<img src="/logo.png" alt="LevelUp logo" class="flyer-brand-logo" width="$1" height="$2" />';

let count = 0;
for (const file of fs.readdirSync(dir).filter((f) => f.startsWith('flyer-') && f.endsWith('.html'))) {
  const filePath = path.join(dir, file);
  const before = fs.readFileSync(filePath, 'utf8');
  const after = before.replace(brandImg, replacement);
  if (after !== before) {
    fs.writeFileSync(filePath, after);
    console.log('updated', file);
    count += 1;
  }
}
console.log(count ? `Done: ${count} file(s).` : 'No files needed updates.');
