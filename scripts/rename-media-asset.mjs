/**
 * Rename a marketing screenshot or capture-library clip on disk and update repo references.
 *
 * Usage:
 *   node scripts/rename-media-asset.mjs --path=marketing/screenshots/old.png --name=new-name.png
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..');

const LABELS_FILE = path.join(REPO_ROOT, 'public', 'marketing', 'media-labels.json');
const CAPTURE_ROOT = path.join(REPO_ROOT, 'promo-video', 'public', 'capture-library');
const MARKETING_SHOTS_DIR = path.join(REPO_ROOT, 'public', 'marketing', 'screenshots');

function parseArgs() {
  let relPath = '';
  let newFilename = '';
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--path=')) relPath = arg.slice('--path='.length).replace(/\\/g, '/');
    if (arg.startsWith('--name=')) newFilename = arg.slice('--name='.length).trim();
  }
  return { relPath, newFilename };
}

function isValidMediaFilename(name) {
  return /^[a-z0-9][a-z0-9.-]*\.(png|mp4)$/i.test(name);
}

function resolveMediaAssetFile(relPath) {
  const normalized = relPath.replace(/\\/g, '/');
  if (!normalized || normalized.includes('..')) return null;

  if (normalized.startsWith('capture-library/')) {
    const sub = normalized.slice('capture-library/'.length);
    const full = path.resolve(CAPTURE_ROOT, sub);
    if (!full.startsWith(CAPTURE_ROOT)) return null;
    return full;
  }

  if (normalized.startsWith('marketing/screenshots/')) {
    const name = normalized.slice('marketing/screenshots/'.length);
    if (!name || name.includes('/') || name.includes('\\')) return null;
    const full = path.resolve(MARKETING_SHOTS_DIR, name);
    if (!full.startsWith(MARKETING_SHOTS_DIR)) return null;
    return full;
  }

  return null;
}

const REFERENCE_ROOTS = ['public', 'src', 'scripts', 'promo-video', 'flyers', 'docs'];
const SKIP_DIR_NAMES = new Set(['.git', '.next', 'node_modules', 'dist', 'build', '.turbo']);
const TEXT_EXTENSIONS = new Set(['.html', '.tsx', '.ts', '.mjs', '.js', '.json', '.md', '.mdc', '.css']);

function buildReplacementPairs(oldRelPath, newRelPath, oldFilename, newFilename) {
  const oldStem = oldFilename.replace(/\.[^.]+$/, '');
  const newStem = newFilename.replace(/\.[^.]+$/, '');
  const pairs = [];
  const add = (from, to) => {
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
    const oldClip = oldRelPath.replace(/^capture-library\//, '');
    const newClip = newRelPath.replace(/^capture-library\//, '');
    add(oldClip, newClip);
    add(oldClip.replace(/\.mp4$/i, ''), newClip.replace(/\.mp4$/i, ''));
  }

  return pairs;
}

function walkReferenceFiles(dir, out) {
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

function updateReferences(oldRelPath, newRelPath, oldFilename, newFilename) {
  const pairs = buildReplacementPairs(oldRelPath, newRelPath, oldFilename, newFilename);
  const files = [];
  for (const root of REFERENCE_ROOTS) {
    walkReferenceFiles(path.join(REPO_ROOT, root), files);
  }
  if (fs.existsSync(LABELS_FILE)) files.push(LABELS_FILE);

  const filesTouched = [];
  for (const filePath of files) {
    const rel = path.relative(REPO_ROOT, filePath).replace(/\\/g, '/');
    if (rel === oldRelPath) continue;

    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    for (const [from, to] of pairs) {
      const before = content;
      content = content.split(from).join(to);
      if (content !== before) changed = true;
    }
    if (!changed) continue;
    fs.writeFileSync(filePath, content, 'utf8');
    filesTouched.push(rel);
  }

  return { referencesUpdated: filesTouched.length, filesTouched };
}

function readLabels() {
  try {
    return JSON.parse(fs.readFileSync(LABELS_FILE, 'utf8'));
  } catch {
    return { updatedAt: new Date(0).toISOString(), items: {} };
  }
}

function writeLabels(payload) {
  fs.mkdirSync(path.dirname(LABELS_FILE), { recursive: true });
  fs.writeFileSync(LABELS_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function main() {
  const { relPath, newFilename } = parseArgs();
  if (!relPath || !newFilename) {
    console.error('Usage: node scripts/rename-media-asset.mjs --path=<rel> --name=<filename>');
    process.exit(1);
  }
  if (!isValidMediaFilename(newFilename)) {
    console.error('Invalid filename');
    process.exit(1);
  }

  const oldFilePath = resolveMediaAssetFile(relPath);
  if (!oldFilePath || !fs.existsSync(oldFilePath)) {
    console.error('File not found');
    process.exit(1);
  }

  const oldFilename = path.basename(oldFilePath);
  if (oldFilename === newFilename) {
    console.log(JSON.stringify({ ok: true, newPath: relPath, referencesUpdated: 0, filesTouched: [] }));
    return;
  }

  const parentRel = relPath.slice(0, relPath.length - oldFilename.length);
  const newRelPath = `${parentRel}${newFilename}`;
  const newFilePath = resolveMediaAssetFile(newRelPath);
  if (!newFilePath) {
    console.error('Invalid target path');
    process.exit(1);
  }
  if (fs.existsSync(newFilePath)) {
    console.error(`Target already exists: ${newFilename}`);
    process.exit(1);
  }

  fs.renameSync(oldFilePath, newFilePath);

  const labels = readLabels();
  if (labels.items?.[relPath]) {
    labels.items[newRelPath] = labels.items[relPath];
    delete labels.items[relPath];
    labels.updatedAt = new Date().toISOString();
    writeLabels(labels);
  }

  const { referencesUpdated, filesTouched } = updateReferences(
    relPath,
    newRelPath,
    oldFilename,
    newFilename,
  );

  console.log(
    JSON.stringify({
      ok: true,
      newPath: newRelPath,
      referencesUpdated,
      filesTouched,
    }),
  );
}

main();
