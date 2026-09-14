#!/usr/bin/env node
/**
 * The 8 "premium" interactive flyer builders are edited as source files in
 * flyers/, then served to real visitors from public/marketing/. Those used
 * to be two hand-maintained copies that could silently drift apart — that's
 * exactly how the General Flyer and the Pillars/Additional Features flyers
 * ended up broken in production while flyers/ still had the working version.
 *
 * flyers/ is the source of truth. This script copies it into
 * public/marketing/ so the two can never go out of sync again. Runs as part
 * of `generate:flyers-gallery` and `prebuild`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'flyers');
const destDir = path.join(root, 'public', 'marketing');

const PREMIUM_FLYERS = [
  'levelup-business-cards-flyer.html',
  'levelup-extra-features-flyer.html',
  'levelup-funding-flyer.html',
  'levelup-pillars-flyer.html',
  'levelup-principals-flyer.html',
  'levelup-rewards-basic-settings-flyer.html',
  'levelup-rewards-flyer.html',
  'levelup-teachers-flyer.html',
];

function main() {
  for (const name of PREMIUM_FLYERS) {
    const from = path.join(srcDir, name);
    const to = path.join(destDir, name);
    fs.copyFileSync(from, to);
  }
  console.log('[sync-premium-flyers] copied', PREMIUM_FLYERS.length, 'flyers from flyers/ to public/marketing/');
}

main();
