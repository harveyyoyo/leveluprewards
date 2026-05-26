/**
 * Shared OpenAI speech synthesis for promo voiceovers.
 * Default: gpt-4o-mini-tts (higher quality than tts-1-hd).
 */

import fs from 'fs';
import path from 'path';

export const OPENAI_TTS_MODEL =
  process.env.OPENAI_TTS_MODEL?.trim() || 'gpt-4o-mini-tts';

export const LEGACY_OPENAI_TTS_MODEL = 'tts-1-hd';

export function safeWriteFile(targetPath, bytes) {
  const dir = path.dirname(targetPath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.${path.basename(targetPath)}.${process.pid}.tmp`);
  fs.writeFileSync(tmp, bytes);
  try {
    if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
  } catch {
    fs.copyFileSync(tmp, targetPath);
    fs.unlinkSync(tmp);
    return;
  }
  fs.renameSync(tmp, targetPath);
}

/**
 * @param {object} opts
 * @param {string} opts.apiKey
 * @param {string} opts.text
 * @param {string} opts.outPath
 * @param {string} opts.voice
 * @param {number} [opts.speed]
 * @param {string} [opts.instructions]
 * @param {string} [opts.model]
 */
export async function synthesizeOpenAI({
  apiKey,
  text,
  outPath,
  voice,
  speed = 0.93,
  instructions,
  model = OPENAI_TTS_MODEL,
}) {
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey });
  const useInstructions =
    instructions &&
    model.includes('gpt-4o-mini-tts');

  const response = await client.audio.speech.create({
    model,
    voice,
    input: text,
    speed,
    ...(useInstructions ? { instructions } : {}),
  });

  safeWriteFile(outPath, Buffer.from(await response.arrayBuffer()));
}
