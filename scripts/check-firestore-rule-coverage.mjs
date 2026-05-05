import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const sourceRoots = ['src'];
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx']);
const ignoredDirs = new Set(['node_modules', '.next', '.firebase']);

function normalizeDynamic(segment) {
  const trimmed = segment.trim();
  if (/^['"`][^'"`]*['"`]$/.test(trimmed)) {
    return trimmed.slice(1, -1);
  }
  return '{id}';
}

function normalizeTemplatePath(raw) {
  return raw
    .replace(/\$\{[^}]+\}/g, '{id}')
    .split('/')
    .filter(Boolean)
    .join('/');
}

function splitArgs(source) {
  const args = [];
  let current = '';
  let quote = null;
  let depth = 0;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const prev = source[i - 1];

    if (quote) {
      current += char;
      if (char === quote && prev !== '\\') quote = null;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      current += char;
      continue;
    }

    if (char === '(' || char === '[' || char === '{') depth += 1;
    if (char === ')' || char === ']' || char === '}') depth -= 1;

    if (char === ',' && depth === 0) {
      args.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) args.push(current.trim());
  return args;
}

function findCollectionCalls(source) {
  const calls = [];
  let index = 0;

  while (index < source.length) {
    const start = source.indexOf('collection(', index);
    if (start === -1) break;

    let cursor = start + 'collection('.length;
    let depth = 1;
    let quote = null;

    while (cursor < source.length && depth > 0) {
      const char = source[cursor];
      const prev = source[cursor - 1];

      if (quote) {
        if (char === quote && prev !== '\\') quote = null;
      } else if (char === '"' || char === "'" || char === '`') {
        quote = char;
      } else if (char === '(') {
        depth += 1;
      } else if (char === ')') {
        depth -= 1;
      }

      cursor += 1;
    }

    if (depth === 0) {
      calls.push({
        start,
        argsSource: source.slice(start + 'collection('.length, cursor - 1),
      });
    }

    index = cursor;
  }

  return calls;
}

function collectionPathFromArgs(args) {
  if (args.length < 2) return null;
  if (args[0].trim() !== 'firestore') return null;

  const firstPathArg = args[1];
  if (/^`/.test(firstPathArg)) {
    return normalizeTemplatePath(firstPathArg.slice(1, -1));
  }

  for (let index = 1; index < args.length; index += 1) {
    const isCollectionSegment = (index - 1) % 2 === 0;
    if (isCollectionSegment && !/^['"`]/.test(args[index].trim())) {
      return null;
    }
  }

  const literalSegments = args.slice(1).map(normalizeDynamic);
  if (literalSegments.some((segment) => segment.includes('/'))) {
    return literalSegments
      .flatMap((segment) => segment.split('/'))
      .filter(Boolean)
      .join('/');
  }

  if (!/^['"`]/.test(firstPathArg)) {
    return null;
  }

  return literalSegments.join('/');
}

function normalizeForComparison(firestorePath) {
  return firestorePath
    .split('/')
    .filter(Boolean)
    .map((segment) => (segment.startsWith('{') && segment.endsWith('}') ? '{id}' : segment))
    .join('/');
}

async function listSourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (ignoredDirs.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listSourceFiles(fullPath));
    } else if (extensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function lineNumberFor(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function extractRuleCollectionPaths(rulesSource) {
  const stack = [];
  const collectionPaths = new Set();
  let depth = 0;

  for (const line of rulesSource.split(/\r?\n/)) {
    const trimmed = line.trim();
    const isMatchLine = trimmed.startsWith('match ') && trimmed.endsWith('{');

    if (isMatchLine) {
      while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();

      const rawPath = trimmed.slice('match '.length, -1).trim();
      const parentPath = stack.length ? stack[stack.length - 1].path : '';
      let fullPath = rawPath.startsWith('/databases/')
        ? rawPath.slice(1)
        : [parentPath, rawPath.replace(/^\/+/, '')].filter(Boolean).join('/');

      fullPath = fullPath.replace(/^databases\/\{database\}\/documents\/?/, '');
      fullPath = fullPath.replace(/^\/+/, '');

      if (fullPath) {
        stack.push({ depth, path: fullPath });

        const parts = fullPath.split('/').filter(Boolean);
        if (parts.length > 0) {
          collectionPaths.add(normalizeForComparison(parts.slice(0, -1).join('/')));
        }
      }
    }

    depth += (line.match(/\{/g) || []).length;
    depth -= (line.match(/\}/g) || []).length;
  }

  return collectionPaths;
}

const rules = await readFile(path.join(root, 'firestore.rules'), 'utf8');
const coveredCollections = extractRuleCollectionPaths(rules);
const discovered = new Map();

for (const sourceRoot of sourceRoots) {
  const fullRoot = path.join(root, sourceRoot);
  const files = await listSourceFiles(fullRoot);

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    for (const call of findCollectionCalls(source)) {
      const args = splitArgs(call.argsSource);
      const firestorePath = collectionPathFromArgs(args);
      if (!firestorePath) continue;

      const normalized = normalizeForComparison(firestorePath);
      if (!normalized) continue;

      const locations = discovered.get(normalized) || [];
      locations.push({
        file: path.relative(root, file),
        line: lineNumberFor(source, call.start),
      });
      discovered.set(normalized, locations);
    }
  }
}

const missing = [...discovered.entries()]
  .filter(([firestorePath]) => !coveredCollections.has(firestorePath))
  .sort(([a], [b]) => a.localeCompare(b));

if (missing.length > 0) {
  console.error('Firestore rule coverage check failed.\n');
  console.error('These client collection paths do not appear to have matching firestore.rules blocks:');
  for (const [firestorePath, locations] of missing) {
    const first = locations[0];
    console.error(`- ${firestorePath} (${first.file}:${first.line})`);
  }
  console.error('\nAdd a matching match block to firestore.rules, or update this checker if the path is intentionally indirect.');
  process.exit(1);
}

console.log(`OK: ${discovered.size} client Firestore collection path(s) have matching firestore.rules coverage.`);
