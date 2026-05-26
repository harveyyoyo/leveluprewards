/**
 * Preview OpenAI TTS voices on one promo line (uses OPENAI_API_KEY from .env.local).
 *
 *   node scripts/preview-openai-voices.mjs
 *   node scripts/preview-openai-voices.mjs --text="Your custom line here"
 *
 * Output: promo-video/public/voiceover/previews/openai-<voice>.mp3
 * Open that folder and play files in Explorer / VLC.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'promo-video', 'public', 'voiceover', 'previews');

/** Voices supported by tts-1-hd (same as widescreen promo) */
const VOICES = ['alloy', 'ash', 'coral', 'echo', 'fable', 'onyx', 'nova', 'sage', 'shimmer'];

const DEFAULT_TEXT =
  'LevelUp — school rewards built for real classrooms.';

dotenv.config({ path: path.join(ROOT, '.env.local') });
dotenv.config({ path: path.join(ROOT, '.env') });

function getText() {
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--text=')) return arg.slice('--text='.length);
  }
  return DEFAULT_TEXT;
}

async function main() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    console.error('Set OPENAI_API_KEY in .env.local first.');
    process.exit(1);
  }

  const text = getText();
  const only = process.argv
    .slice(2)
    .filter((a) => !a.startsWith('--'))
    .map((a) => a.toLowerCase());
  const list = only.length ? VOICES.filter((v) => only.includes(v)) : VOICES;

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey: key });

  console.log(`Text: "${text}"\n`);

  for (const voice of list) {
    const out = path.join(OUT_DIR, `openai-${voice}.mp3`);
    process.stdout.write(`${voice}... `);
    const res = await client.audio.speech.create({
      model: 'tts-1-hd',
      voice,
      input: text,
      speed: 1.05,
    });
    fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
    console.log(path.relative(ROOT, out));
  }

  console.log(`\n✓ Play MP3s in:\n  ${OUT_DIR}`);
  console.log('Pick a voice, then:');
  console.log('  node scripts/generate-widescreen-voiceover.mjs --voice=<name>');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
