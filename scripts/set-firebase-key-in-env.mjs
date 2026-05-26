#!/usr/bin/env node
/**
 * Writes FIREBASE_SERVICE_ACCOUNT_KEY into .env.local from a service account JSON file.
 * Usage: node scripts/set-firebase-key-in-env.mjs <path-to-key.json>
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const ENV_LOCAL = path.join(ROOT, '.env.local');

const KEY = 'FIREBASE_SERVICE_ACCOUNT_KEY';
const KEY_FILE_VAR = 'FIREBASE_SERVICE_ACCOUNT_KEY_FILE';

function usage() {
  console.error('Usage: node scripts/set-firebase-key-in-env.mjs <path-to-service-account.json>');
  process.exit(1);
}

/** Dotenv-safe single-quoted value (JSON is one line). */
function toDotenvQuotedValue(oneLineJson) {
  const escaped = oneLineJson.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `'${escaped}'`;
}

function parseArgs() {
  const arg = process.argv[2];
  if (!arg) usage();
  const resolved = path.resolve(arg);
  if (!fs.existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    process.exit(1);
  }
  return resolved;
}

function loadServiceAccount(filePath) {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error(`Invalid JSON in ${filePath}: ${e.message}`);
    process.exit(1);
  }
  if (parsed?.type !== 'service_account') {
    console.error('Expected JSON with type "service_account".');
    process.exit(1);
  }
  return parsed;
}

function processEnvLines(lines, assignmentLine) {
  const out = [];
  let keySet = false;

  for (const line of lines) {
    const trimmed = line.trim();
    const isKeyLine = trimmed.startsWith(`${KEY}=`) || trimmed.startsWith(`# ${KEY}=`);
    const isKeyFileLine =
      trimmed.startsWith(`${KEY_FILE_VAR}=`) || trimmed.startsWith(`# ${KEY_FILE_VAR}=`);

    if (isKeyLine) {
      const valuePart = trimmed.startsWith('#')
        ? trimmed.replace(/^#\s*/, '').slice(KEY.length + 1)
        : trimmed.slice(KEY.length + 1);
      const bare = valuePart.trim().replace(/^['"]|['"]$/g, '');
      if (!bare) continue;
      if (!keySet) {
        out.push(assignmentLine);
        keySet = true;
      }
      continue;
    }

    if (isKeyFileLine) continue;
    out.push(line);
  }

  if (!keySet) {
    if (out.length && out[out.length - 1].trim() !== '') out.push('');
    out.push('# Firebase Admin (scripts: demo marketing, captures)');
    out.push(assignmentLine);
  }

  return out;
}

function main() {
  const filePath = parseArgs();
  const account = loadServiceAccount(filePath);
  const oneLineJson = JSON.stringify(account);
  const assignmentLine = `${KEY}=${toDotenvQuotedValue(oneLineJson)}`;

  let lines = [];
  if (fs.existsSync(ENV_LOCAL)) {
    lines = fs.readFileSync(ENV_LOCAL, 'utf8').split(/\r?\n/);
  }

  const updated = processEnvLines(lines, assignmentLine);
  fs.writeFileSync(ENV_LOCAL, updated.join('\n').replace(/\n*$/, '') + '\n', 'utf8');

  console.log(`Updated ${path.relative(ROOT, ENV_LOCAL)} with ${KEY} (inline, single line).`);
  console.log(`Source: ${filePath}`);
  console.log(`Cleared ${KEY_FILE_VAR} if it was set.`);
}

main();
