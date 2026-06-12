import fs from 'fs';
import path from 'path';

const REPO_ROOT = process.env.LEVELUP_REPO_ROOT ?? process.cwd();

const REFERENCE_ROOTS = [
  'public',
  'src',
  'scripts',
  'promo-video',
  'flyers',
  'docs',
];

const SKIP_DIR_NAMES = new Set([
  '.git',
  '.next',
  'node_modules',
  'dist',
  'build',
  '.turbo',
]);

const TEXT_EXTENSIONS = new Set([
  '.html',
  '.tsx',
  '.ts',
  '.mjs',
  '.js',
  '.json',
  '.md',
  '.mdc',
  '.css',
]);

export type MediaReferenceUpdate = {
  referencesUpdated: number;
  filesTouched: string[];
};

function replaceAll(haystack: string, needle: string, replacement: string): string {
  if (!needle || needle === replacement) return haystack;
  return haystack.split(needle).join(replacement);
}

function buildReplacementPairs(
  oldRelPath: string,
  newRelPath: string,
  oldFilename: string,
  newFilename: string,
): string[][] {
  const oldStem = oldFilename.replace(/\.[^.]+$/, '');
  const newStem = newFilename.replace(/\.[^.]+$/, '');
  const pairs: string[][] = [];

  const add = (from: string, to: string) => {
    if (from && from !== to) pairs.push([from, to]);
  };

  add(oldRelPath, newRelPath);
  add(`/${oldRelPath}`, `/${newRelPath}`);
  add(oldFilename, newFilename);

  if (oldRelPath.startsWith('marketing/screenshots/')) {
    add(`/marketing/screenshots/${oldFilename}`, `/marketing/screenshots/${newFilename}`);
    add(`marketing/screenshots/${oldFilename}`, `marketing/screenshots/${newFilename}`);
    add(`--shot=${oldStem}`, `--shot=${newStem}`);
    add(`'${oldStem}'`, `'${newStem}'`);
    add(`"${oldStem}"`, `"${newStem}"`);
    add(`name: "${oldStem}"`, `name: "${newStem}"`);
    add(`"name": "${oldStem}"`, `"name": "${newStem}"`);
  }

  if (oldRelPath.startsWith('capture-library/')) {
    add(oldRelPath, newRelPath);
    const oldClip = oldRelPath.replace(/^capture-library\//, '');
    const newClip = newRelPath.replace(/^capture-library\//, '');
    add(oldClip, newClip);
    const oldClipStem = oldClip.replace(/\.mp4$/i, '');
    const newClipStem = newClip.replace(/\.mp4$/i, '');
    add(oldClipStem, newClipStem);
  }

  return pairs;
}

function walkReferenceFiles(dir: string, out: string[]) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.agent') continue;
    if (SKIP_DIR_NAMES.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkReferenceFiles(full, out);
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (!TEXT_EXTENSIONS.has(ext)) continue;
    if (entry.name === 'package-lock.json') continue;
    out.push(full);
  }
}

/** Replace old asset paths/filenames across the repo (flyers, TS, scripts, etc.). */
export function updateMediaAssetReferences(
  oldRelPath: string,
  newRelPath: string,
  oldFilename: string,
  newFilename: string,
): MediaReferenceUpdate {
  const pairs = buildReplacementPairs(oldRelPath, newRelPath, oldFilename, newFilename);
  const files: string[] = [];
  for (const root of REFERENCE_ROOTS) {
    walkReferenceFiles(path.join(REPO_ROOT, root), files);
  }

  const labelsPath = path.join(REPO_ROOT, 'public', 'marketing', 'media-labels.json');
  if (fs.existsSync(labelsPath)) {
    files.push(labelsPath);
  }

  let referencesUpdated = 0;
  const filesTouched: string[] = [];

  for (const filePath of files) {
    const rel = path.relative(REPO_ROOT, filePath).replace(/\\/g, '/');
    if (rel === oldRelPath.replace(/\\/g, '/')) continue;

    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    for (const [from, to] of pairs) {
      const before = content;
      content = replaceAll(content, from, to);
      if (content !== before) changed = true;
    }
    if (!changed) continue;

    fs.writeFileSync(filePath, content, 'utf8');
    filesTouched.push(rel);
    referencesUpdated += 1;
  }

  return { referencesUpdated, filesTouched };
}
