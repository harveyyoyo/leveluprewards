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
  home: 'Kiosk sign-in',
  selector: 'ID cards',
  dashboard: 'Prize shop',
  outro: 'Scan only',
};
const FPS = 30;
const COMPOSITION_TOTAL = 620;
const FIRST_START = 14;
const GAP_FRAMES = 14;

const DEFAULT_EDGE_VOICE = 'en-US-JennyNeural';
const DEFAULT_EDGE_RATE = '+5%';
/** OpenAI voices: alloy, ash, coral, echo, fable, onyx, nova, sage, shimmer */
const DEFAULT_OPENAI_VOICE = 'marin';
const DEFAULT_OPENAI_SPEED = 0.93;

const WIDESCREEN_TTS_INSTRUCTIONS =
  'Natural conversational narrator for a school product video. Warm, clear, relaxed pace — like explaining the product to a principal, not reading a script.';

dotenv.config({ path: path.join(ROOT, '.env.local') });
dotenv.config({ path: path.join(ROOT, '.env') });

const CUES = [
  {
    id: 'intro',
    text: 'LevelUp is school rewards built around students — scan in, earn points, redeem prizes.',
  },
  {
    id: 'home',
    text: 'Students sign in at the kiosk and see their points in seconds.',
  },
  {
    id: 'selector',
    text: 'Every student gets a digital ID card, ready to print or scan.',
  },
  {
    id: 'dashboard',
    text: 'They pick prizes from the shop — scan to redeem.',
  },
  {
    id: 'outro',
    text: 'No keyboard, mouse, or touchscreen required. LevelUp runs on scans.',
  },
];

const PROMO_COPY = {
  introEyebrow: 'Welcome to LevelUp',
  introTagline: 'Rewards built for scanning',
  outroHeadline: 'Scanning only',
  outroSubline: 'No keyboard · No mouse · No touchscreen',
};

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
    engine = process.env.OPENAI_API_KEY?.trim() ? 'openai' : 'edge';
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

function timingFromWidescreenNarration(narration, padAfterIntro = 12) {
  const byId = Object.fromEntries(narration.map((c) => [c.id, c]));
  const intro = byId.intro;
  const selector = byId.selector;
  const kiosk = byId.kiosk;
  const home = byId.home;
  const dashboard = byId.dashboard;
  const outro = byId.outro;

  const introEnd =
    (intro?.startFrame ?? 14) + (intro?.durationFrames ?? 60) + padAfterIntro;
  const selectorEnd = kiosk?.startFrame ?? introEnd + 90;
  const studentKioskEnd = home?.startFrame ?? selectorEnd + 90;
  const studentHomeEnd = dashboard?.startFrame ?? studentKioskEnd + 90;
  const dashboardEnd = outro?.startFrame ?? studentHomeEnd + 90;
  const actionEnd =
    (outro?.startFrame ?? dashboardEnd) + (outro?.durationFrames ?? 90);
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
  ttsVoice: ${JSON.stringify(props.ttsVoice ?? 'ash')},
  musicVolume: ${props.musicVolume},
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
    console.log('Set OPENAI_API_KEY in .env.local to use OpenAI by default.');
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
    const durationFrames = Math.max(24, Math.ceil(sec * FPS) + 4);
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
