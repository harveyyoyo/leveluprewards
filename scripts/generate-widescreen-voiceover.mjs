/**
 * Generates widescreen promo narration MP3s.
 * Default: OpenAI tts-1-hd (requires OPENAI_API_KEY in .env.local).
 *
 * Usage:
 *   node scripts/generate-widescreen-voiceover.mjs
 *   node scripts/generate-widescreen-voiceover.mjs --voice=alloy
 *   node scripts/generate-widescreen-voiceover.mjs --engine=edge --voice=en-US-JennyNeural
 *
 * Env: OPENAI_API_KEY, WIDESCREEN_TTS_ENGINE, WIDESCREEN_OPENAI_VOICE (alloy|onyx|nova|…)
 */

import { execFileSync, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  OPENAI_TTS_MODEL,
  synthesizeOpenAI,
} from './lib/openai-tts.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'promo-video', 'public', 'voiceover', 'widescreen');
const DEFAULTS_TS = path.join(ROOT, 'promo-video', 'src', 'promo', 'widescreenPromoDefaults.ts');
const PROPS_JSON = path.join(ROOT, 'promo-video', 'widescreen-promo-props.json');

const CUE_LABELS = {
  intro: 'Welcome',
  selector: 'ID cards',
  home: 'Kiosk sign-in',
  dashboard: 'Prize shop',
  outro: 'Scan only',
};

const CUES = [
  {
    id: 'intro',
    text: 'LevelUp is a rewards system built for schools. Students scan in, earn points, and pick their prizes.',
  },
  {
    id: 'selector',
    text: 'Each student gets a digital ID card you can print or scan.',
  },
  {
    id: 'home',
    text: 'At the kiosk, students sign in and see their points right away.',
  },
  {
    id: 'dashboard',
    text: 'They browse the prize shop and scan to redeem.',
  },
  {
    id: 'outro',
    text: 'No keyboard, no mouse, no touchscreen. Just a quick scan and you\'re done.',
  },
];

const PROMO_COPY = {
  introEyebrow: 'Welcome to LevelUp',
  introTagline: 'Rewards built for schools',
  outroHeadline: 'Scanning only',
  outroSubline: 'Just a quick scan and you\'re done',
};

const FPS = 30;
const FIRST_START = 14;
const GAP_FRAMES = 0;

/** Microsoft neural — Andrew reads like a real presenter, not synthetic TTS. */
const DEFAULT_EDGE_VOICE = 'en-US-AndrewMultilingualNeural';
const DEFAULT_EDGE_RATE = '+0%';
const DEFAULT_OPENAI_VOICE = 'cedar';
const DEFAULT_OPENAI_SPEED = 0.92;

const WIDESCREEN_TTS_INSTRUCTIONS =
  'Speak like a calm school tech coordinator showing a colleague the product for the first time. Conversational, unhurried, slight warmth — never announcer or sales pitch.';

dotenv.config({ path: path.join(ROOT, '.env.local') });
dotenv.config({ path: path.join(ROOT, '.env') });

function parseArgs() {
  const dryRun = process.argv.includes('--dry-run');
  let engine = process.env.WIDESCREEN_TTS_ENGINE?.trim().toLowerCase();
  let edgeVoice = process.env.WIDESCREEN_EDGE_VOICE?.trim();
  let edgeRate = process.env.WIDESCREEN_EDGE_RATE?.trim();
  let openaiVoice = process.env.WIDESCREEN_OPENAI_VOICE?.trim();

  let voiceArg = '';
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--engine=')) engine = arg.split('=')[1]?.trim().toLowerCase();
    if (arg.startsWith('--voice=')) voiceArg = arg.split('=')[1]?.trim() ?? '';
  }

  if (!engine || engine === 'default') {
    engine = 'edge';
  }
  if (voiceArg) {
    if (voiceArg.startsWith('en-')) edgeVoice = voiceArg;
    else openaiVoice = voiceArg;
  }
  if (!edgeVoice) edgeVoice = DEFAULT_EDGE_VOICE;
  if (!edgeRate) edgeRate = DEFAULT_EDGE_RATE;
  if (!openaiVoice) openaiVoice = DEFAULT_OPENAI_VOICE;

  return { dryRun, engine, edgeVoice, edgeRate, openaiVoice };
}

function edgeTtsWorks(cmd, prefix = []) {
  try {
    execFileSync(cmd, [...prefix, '-m', 'edge_tts', '--version'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function ensureEdgeTts() {
  const candidates = [
    { cmd: 'py', prefix: ['-3.12'] },
    { cmd: 'py', prefix: ['-3.11'] },
    { cmd: 'py', prefix: ['-3.10'] },
    { cmd: 'py', prefix: [] },
    { cmd: 'python', prefix: [] },
  ];

  for (const c of candidates) {
    if (edgeTtsWorks(c.cmd, c.prefix)) return c;
  }

  console.log('Installing edge-tts: py -m pip install edge-tts');
  execSync('py -m pip install edge-tts', { stdio: 'inherit', shell: true });

  for (const c of candidates) {
    if (edgeTtsWorks(c.cmd, c.prefix)) return c;
  }

  throw new Error('edge-tts not found. Run: py -m pip install edge-tts');
}

function synthesizeEdge(python, text, outPath, voice, rate) {
  execFileSync(
    python.cmd,
    [
      ...python.prefix,
      '-m',
      'edge_tts',
      '--voice',
      voice,
      '--rate',
      rate,
      '--text',
      text,
      '--write-media',
      outPath,
    ],
    { stdio: 'pipe', maxBuffer: 10 * 1024 * 1024 },
  );
}

function probeDurationSec(filePath) {
  try {
    const out = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      { encoding: 'utf8' },
    ).trim();
    const sec = parseFloat(out);
    if (Number.isFinite(sec) && sec > 0) return sec;
  } catch {
    /* ignore */
  }
  return 3;
}

function scheduleCues(measured) {
  let cursor = FIRST_START;
  const scheduled = [];

  for (const cue of measured) {
    const startFrame = cursor;
    scheduled.push({ ...cue, startFrame });
    cursor = startFrame + cue.durationFrames + GAP_FRAMES;
  }

  return scheduled;
}

/** Align montage cuts to narration cue starts (matches promoMusic.ts). */
function timingFromWidescreenNarration(narration, padAfterIntro = 0) {
  const byId = Object.fromEntries(narration.map((c) => [c.id, c]));
  const intro = byId.intro;
  const home = byId.home;
  const selector = byId.selector;
  const dashboard = byId.dashboard;
  const outro = byId.outro;

  const introEnd =
    (intro?.startFrame ?? 14) + (intro?.durationFrames ?? 60) + padAfterIntro;
  /** Montage: ID cards → kiosk → prizes → closing */
  const selectorEnd = home?.startFrame ?? introEnd + 90;
  const studentKioskEnd = dashboard?.startFrame ?? selectorEnd + 90;
  const studentHomeEnd = outro?.startFrame ?? studentKioskEnd + 90;
  const dashboardEnd =
    (outro?.startFrame ?? studentHomeEnd) + (outro?.durationFrames ?? 90);
  const actionEnd = dashboardEnd;
  const last = narration[narration.length - 1];
  const total = Math.max(
    actionEnd + 60,
    (last?.startFrame ?? 0) + (last?.durationFrames ?? 90) + 60,
  );

  return {
    introEnd,
    selectorEnd,
    studentKioskEnd,
    studentHomeEnd,
    dashboardEnd,
    actionEnd,
    total,
  };
}

function buildDefaultProps(narration, ttsVoice) {
  const narrationOut = narration.map((c) => ({
    id: c.id,
    label: CUE_LABELS[c.id] ?? c.id,
    text: c.text,
    file: `voiceover/widescreen/${c.id}.mp3`,
    startFrame: c.startFrame,
    durationFrames: c.durationFrames,
  }));

  return {
    timing: timingFromWidescreenNarration(narrationOut),
    copy: PROMO_COPY,
    narration: narrationOut,
    ttsVoice,
    musicDuckRatio: 0.28,
    musicVolume: 0.24,
    musicStyle: 'cinematic',
    musicSrc: 'background-music.mp3',
  };
}

function writeDefaultsTs(props) {
  const narrationBlocks = props.narration
    .map(
      (c) => `    {
      id: ${JSON.stringify(c.id)},
      label: ${JSON.stringify(c.label)},
      text: ${JSON.stringify(c.text)},
      file: ${JSON.stringify(c.file)},
      startFrame: ${c.startFrame},
      durationFrames: ${c.durationFrames},
    }`,
    )
    .join(',\n');

  const content = `import type { WidescreenPromoProps } from "./widescreenPromoSchema";

/** Default props — regenerate: npm run generate:voiceover:widescreen */
export const defaultWidescreenPromoProps: WidescreenPromoProps = {
  timing: {
    introEnd: ${props.timing.introEnd},
    selectorEnd: ${props.timing.selectorEnd},
    studentKioskEnd: ${props.timing.studentKioskEnd},
    studentHomeEnd: ${props.timing.studentHomeEnd},
    dashboardEnd: ${props.timing.dashboardEnd},
    actionEnd: ${props.timing.actionEnd},
    total: ${props.timing.total},
  },
  narration: [
${narrationBlocks}
  ],
  copy: {
    introEyebrow: ${JSON.stringify(props.copy?.introEyebrow ?? PROMO_COPY.introEyebrow)},
    introTagline: ${JSON.stringify(props.copy?.introTagline ?? PROMO_COPY.introTagline)},
    outroHeadline: ${JSON.stringify(props.copy?.outroHeadline ?? PROMO_COPY.outroHeadline)},
    outroSubline: ${JSON.stringify(props.copy?.outroSubline ?? PROMO_COPY.outroSubline)},
  },
${props.ttsVoice ? `  ttsVoice: ${JSON.stringify(props.ttsVoice)},\n` : ''}  musicVolume: ${props.musicVolume},
  musicDuckRatio: ${props.musicDuckRatio},
  musicStyle: ${JSON.stringify(props.musicStyle ?? 'cinematic')},
  musicSrc: ${JSON.stringify(props.musicSrc ?? 'background-music.mp3')},
};
`;

  fs.writeFileSync(DEFAULTS_TS, content, 'utf8');
  fs.writeFileSync(PROPS_JSON, `${JSON.stringify(props, null, 2)}\n`, 'utf8');
}

async function main() {
  const { dryRun, engine, edgeVoice, edgeRate, openaiVoice } = parseArgs();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  if (dryRun) {
    for (const c of CUES) console.log(`[${c.id}] ${c.text}`);
    return;
  }

  const useOpenAI = engine === 'openai';
  const python = useOpenAI ? null : ensureEdgeTts();

  if (useOpenAI) {
    console.log(`OpenAI ${OPENAI_TTS_MODEL} · voice ${openaiVoice} · speed ${DEFAULT_OPENAI_SPEED}`);
  } else {
    console.log(`edge-tts · ${edgeVoice} · rate ${edgeRate}`);
    console.log('Pass --engine=openai to use OpenAI TTS instead.');
  }

  const measured = [];
  for (const cue of CUES) {
    const outPath = path.join(OUT_DIR, `${cue.id}.mp3`);
    process.stdout.write(`→ ${cue.id}... `);
    if (useOpenAI) {
      await synthesizeOpenAI({
        apiKey: process.env.OPENAI_API_KEY.trim(),
        text: cue.text,
        outPath,
        voice: openaiVoice,
        speed: DEFAULT_OPENAI_SPEED,
        instructions: WIDESCREEN_TTS_INSTRUCTIONS,
      });
    } else {
      synthesizeEdge(python, cue.text, outPath, edgeVoice, edgeRate);
    }
    const sec = probeDurationSec(outPath);
    const durationFrames = Math.max(24, Math.ceil(sec * FPS));
    measured.push({ ...cue, durationFrames });
    console.log(`${sec.toFixed(1)}s`);
  }

  const scheduled = scheduleCues(measured);
  const props = buildDefaultProps(
    scheduled,
    useOpenAI ? openaiVoice : undefined,
  );
  writeDefaultsTs(props);
  console.log(`\n✓ Regenerated ${scheduled.length} files in voiceover/widescreen/`);
  if (useOpenAI) console.log(`✓ Voice: ${openaiVoice}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
