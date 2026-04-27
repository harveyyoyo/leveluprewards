/**
 * Copies only the face-api weight files this app uses from node_modules into
 * public/face-api/model so the browser loads them from the same origin (works
 * when school networks block third-party CDNs).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'node_modules', '@vladmandic', 'face-api', 'model');
const destDir = path.join(root, 'public', 'face-api', 'model');

const FILES = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model.bin',
  'face_landmark_68_tiny_model-weights_manifest.json',
  'face_landmark_68_tiny_model.bin',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model.bin',
];

function main() {
  if (!fs.existsSync(srcDir)) {
    console.warn('[copy-face-models] skip: node_modules/@vladmandic/face-api/model not found');
    return;
  }
  fs.mkdirSync(destDir, { recursive: true });
  for (const name of FILES) {
    const from = path.join(srcDir, name);
    const to = path.join(destDir, name);
    fs.copyFileSync(from, to);
  }
  console.log('[copy-face-models] copied', FILES.length, 'files to public/face-api/model');
}

main();
