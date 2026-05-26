/**
 * Generates long feature showcase narration for all script variants.
 *
 * Usage:
 *   node scripts/generate-feature-promo-voiceover.mjs
 *   node scripts/generate-feature-promo-voiceover.mjs --variant=epic
 *   node scripts/generate-feature-promo-voiceover.mjs --variant=all --engine=openai
 */

import { execSync } from 'child_process';
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
const PROMO = path.join(ROOT, 'promo-video');
const VOICE_ROOT = path.join(PROMO, 'public', 'voiceover', 'feature');
const DEFAULTS_TS = path.join(PROMO, 'src', 'promo', 'featurePromoDefaults.ts');
const SCRIPTS_TS = path.join(PROMO, 'src', 'promo', 'featurePromoScripts.ts');

const FPS = 30;
const FIRST_START = 14;
const GAP_FRAMES = 12;
const OUTRO_PAD_FRAMES = 90;
const DEFAULT_OPENAI_SPEED = 0.93;

dotenv.config({ path: path.join(ROOT, '.env.local') });
dotenv.config({ path: path.join(ROOT, '.env') });

const SEGMENT_IDS = [
  'kiosk', 'idCards', 'themes', 'prizes', 'coupons', 'raffle', 'houses',
  'hallOfFame', 'notifications', 'bulletin', 'library', 'badges', 'analytics', 'attendance',
];

function parseVariantsFromScriptsFile() {
  const raw = fs.readFileSync(SCRIPTS_TS, 'utf8');
  const variantIds = ['epic', 'warm', 'pro', 'hype', 'story'];
  const results = [];

  for (let i = 0; i < variantIds.length; i++) {
    const id = variantIds[i];
    const start = raw.indexOf(`id: "${id}"`);
    const end =
      i + 1 < variantIds.length
        ? raw.indexOf(`id: "${variantIds[i + 1]}"`)
        : raw.indexOf('export const FEATURE_PROMO_VARIANT_BY_ID');
    const section = raw.slice(start, end);

    const voiceMatch = section.match(/ttsVoice: "(.*?)"/);
    const musicMatch = section.match(/musicVolume: ([\d.]+)/);
    const styleMatch = section.match(/musicStyle: "(.*?)"/);
    const instructionsMatch = section.match(
      /ttsInstructions:\s*\n\s*"([^"]+)"/,
    );
    const compMatch = section.match(/compositionId: "(.*?)"/);
    const copy = {};
    for (const m of section.matchAll(/(introEyebrow|introTagline|montageTitle|montageSubtitle|outroHeadline|outroSubline): "(.*?)"/g)) {
      copy[m[1]] = m[2];
    }

    const cues = [];
    const intro = section.match(/id: "intro",\s*text: "(.*?)"/);
    if (intro) cues.push({ id: 'intro', text: intro[1] });

    const segmentBlock = section.match(/segmentCues\(\{([\s\S]*?)\}\)/);
    if (segmentBlock) {
      for (const seg of SEGMENT_IDS) {
        const re = new RegExp(`${seg}: "(.*?)"`);
        const m = segmentBlock[1].match(re);
        if (m) cues.push({ id: seg, text: m[1] });
      }
    }

    const outro = section.match(/id: "outro",\s*text: "(.*?)"/);
    if (outro) cues.push({ id: 'outro', text: outro[1] });

    results.push({
      id,
      compositionId: compMatch?.[1] ?? `FeaturePromo${id[0].toUpperCase()}${id.slice(1)}`,
      ttsVoice: voiceMatch?.[1] ?? 'ash',
      ttsInstructions: instructionsMatch?.[1] ?? '',
      musicVolume: parseFloat(musicMatch?.[1] ?? '0.34'),
      musicStyle: styleMatch?.[1] ?? 'default',
      copy,
      cues,
    });
  }
  return results;
}

function cueLabels() {
  return {
    intro: 'Intro',
    outro: 'Outro',
    portal: 'Portal',
    kiosk: 'Kiosk',
    idCards: 'ID cards',
    themes: 'Themes',
    prizes: 'Prizes',
    coupons: 'Coupons',
    raffle: 'Raffle',
    houses: 'Houses',
    hallOfFame: 'Hall of Fame',
    notifications: 'Notifications',
    bulletin: 'Bulletin',
    library: 'Library',
    badges: 'Badges',
    analytics: 'Analytics',
    attendance: 'Attendance',
  };
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
  return 3.5;
}

function scheduleCues(measured) {
  let cursor = FIRST_START;
  const scheduled = [];
  for (const cue of measured) {
    scheduled.push({ ...cue, startFrame: cursor });
    cursor += cue.durationFrames + GAP_FRAMES;
  }
  return scheduled;
}

function timingFromFeatureNarration(narration, padAfterIntro = 10) {
  const byId = Object.fromEntries(narration.map((c) => [c.id, c]));
  const intro = byId.intro;
  const outro = byId.outro;

  const introEnd =
    (intro?.startFrame ?? 14) + (intro?.durationFrames ?? 60) + padAfterIntro;

  const segmentEnds = [];
  for (let i = 0; i < SEGMENT_IDS.length; i++) {
    const nextId =
      i + 1 < SEGMENT_IDS.length ? SEGMENT_IDS[i + 1] : 'outro';
    const nextCue = byId[nextId];
    segmentEnds.push(
      nextCue?.startFrame ??
        (byId[SEGMENT_IDS[i]]?.startFrame ?? introEnd) +
          (byId[SEGMENT_IDS[i]]?.durationFrames ?? 90) +
          12,
    );
  }

  const lastEnd = segmentEnds[segmentEnds.length - 1] ?? introEnd;
  const total = Math.max(
    lastEnd + 90,
    (outro?.startFrame ?? 0) + (outro?.durationFrames ?? 90) + OUTRO_PAD_FRAMES,
  );

  return { introEnd, segmentEnds, total };
}

function scheduleVariant(variant, measured) {
  const scheduled = scheduleCues(measured).map((cue) => ({
    id: cue.id,
    label: cueLabels()[cue.id] ?? cue.id,
    text: cue.text,
    file: `voiceover/feature/${variant.id}/${cue.id}.mp3`,
    startFrame: cue.startFrame,
    durationFrames: cue.durationFrames,
  }));

  const timing = timingFromFeatureNarration(scheduled);

  return {
    variantId: variant.id,
    timing,
    narration: scheduled,
    copy: variant.copy,
    ttsVoice: variant.ttsVoice,
    musicVolume: variant.musicVolume,
    musicDuckRatio: 0.28,
    musicStyle: variant.musicStyle,
    musicSrc: variant.musicSrc ?? 'background-music.mp3',
  };
}

function writeDefaultsTs(allProps) {
  const blocks = allProps
    .map((props) => {
      const nar = props.narration
        .map(
          (c) => `      {
        id: ${JSON.stringify(c.id)},
        label: ${JSON.stringify(c.label)},
        text: ${JSON.stringify(c.text)},
        file: ${JSON.stringify(c.file)},
        startFrame: ${c.startFrame},
        durationFrames: ${c.durationFrames},
      }`,
        )
        .join(',\n');
      return `  ${props.variantId}: {
    variantId: ${JSON.stringify(props.variantId)},
    timing: {
      introEnd: ${props.timing.introEnd},
      segmentEnds: [${props.timing.segmentEnds.join(', ')}],
      total: ${props.timing.total},
    },
    narration: [
${nar}
    ],
    copy: ${JSON.stringify(props.copy, null, 2).replace(/\n/g, '\n    ')},
    ttsVoice: ${JSON.stringify(props.ttsVoice)},
    musicVolume: ${props.musicVolume},
    musicDuckRatio: ${props.musicDuckRatio},
    musicStyle: ${JSON.stringify(props.musicStyle ?? 'default')},
    musicSrc: ${JSON.stringify(props.musicSrc ?? 'background-music.mp3')},
  }`;
    })
    .join(',\n');

  const content = `import type { FeatureShowcasePromoProps } from "./featurePromoSchema";
import type { FeaturePromoVariantId } from "./featurePromoScripts";

/** Auto-generated — npm run generate:voiceover:feature */
export const defaultFeaturePromoPropsByVariant: Record<
  FeaturePromoVariantId,
  FeatureShowcasePromoProps
> = {
${blocks}
};

export function getDefaultFeaturePromoProps(
  variantId: FeaturePromoVariantId,
): FeatureShowcasePromoProps {
  return defaultFeaturePromoPropsByVariant[variantId];
}
`;

  fs.writeFileSync(DEFAULTS_TS, content, 'utf8');
}

async function main() {
  const variantArg = process.argv.find((a) => a.startsWith('--variant='))?.split('=')[1] ?? 'all';
  let variants = parseVariantsFromScriptsFile();
  if (!variants?.length) {
    console.error('Could not parse featurePromoScripts.ts');
    process.exit(1);
  }
  if (variantArg !== 'all') {
    variants = variants.filter((v) => v.id === variantArg);
  }

  const useOpenAI = !process.argv.includes('--engine=edge');
  if (useOpenAI && !process.env.OPENAI_API_KEY?.trim()) {
    console.error('Set OPENAI_API_KEY in .env.local');
    process.exit(1);
  }

  const propsDir = path.join(PROMO, 'feature-promo-props');
  fs.mkdirSync(propsDir, { recursive: true });
  const allProps = [];

  for (const variant of variants) {
    console.log(
      `\n=== ${variant.id} (${variant.ttsVoice}, ${OPENAI_TTS_MODEL}) ===\n`,
    );
    const outDir = path.join(VOICE_ROOT, variant.id);
    fs.mkdirSync(outDir, { recursive: true });
    const measured = [];

    for (const cue of variant.cues) {
      const outPath = path.join(outDir, `${cue.id}.mp3`);
      process.stdout.write(`→ ${cue.id}... `);
      if (useOpenAI) {
        await synthesizeOpenAI({
          apiKey: process.env.OPENAI_API_KEY.trim(),
          text: cue.text,
          outPath,
          voice: variant.ttsVoice,
          speed: DEFAULT_OPENAI_SPEED,
          instructions: variant.ttsInstructions,
        });
      } else {
        throw new Error('Only OpenAI supported for feature promos currently');
      }
      const sec = probeDurationSec(outPath);
      const durationFrames = Math.ceil(sec * FPS) + 8;
      measured.push({ ...cue, durationFrames });
      console.log(`${sec.toFixed(1)}s`);
    }

    const props = scheduleVariant(variant, measured);
    allProps.push(props);
    fs.writeFileSync(
      path.join(propsDir, `${variant.id}.json`),
      `${JSON.stringify(props, null, 2)}\n`,
    );
    console.log(`✓ ${variant.id}: ${props.timing.total} frames (~${(props.timing.total / FPS).toFixed(1)}s)`);
  }

  writeDefaultsTs(allProps);
  console.log(`\n✓ Wrote ${allProps.length} variants → ${propsDir} + featurePromoDefaults.ts\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
