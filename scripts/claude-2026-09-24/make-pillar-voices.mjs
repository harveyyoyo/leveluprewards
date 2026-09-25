/**
 * Narration for the Claude 2026-09-24 pillar spotlight videos, using
 * Google Gemini text-to-speech (natural, directable voices).
 *
 *   node scripts/claude-2026-09-24/make-pillar-voices.mjs            # only missing lines
 *   node scripts/claude-2026-09-24/make-pillar-voices.mjs --force    # regenerate all
 *   node scripts/claude-2026-09-24/make-pillar-voices.mjs --only=rewards-neon
 *   node scripts/claude-2026-09-24/make-pillar-voices.mjs --sampler  # voice sampler MP3
 *
 * Writes MP3s to promo-video/public/voiceover/claude-2026-09-24/<video>/<n>.mp3
 * and measured lengths to promo-video/src/claude-2026-09-24/voiceDurations.json.
 * Needs GEMINI_API_KEY in .env.local.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const PROMO = path.join(ROOT, 'promo-video');
const OUT = path.join(PROMO, 'public', 'voiceover', 'claude-2026-09-24');
const DURATIONS = path.join(PROMO, 'src', 'claude-2026-09-24', 'voiceDurations.json');
// Pro sounds best; its daily quota is small, so fall back to Flash (same voices) on 429.
const MODELS = [process.env.GEMINI_TTS_MODEL?.trim() || 'gemini-2.5-pro-preview-tts', 'gemini-2.5-flash-preview-tts'];
let modelIdx = 0;

dotenv.config({ path: path.join(ROOT, '.env.local') });
// Worktrees don't carry .env.local — fall back to the main checkout's copy.
dotenv.config({ path: path.join(ROOT, '..', '..', '..', '.env.local') });

const HYPE = 'Say this like an energetic social media hype video, punchy, confident, smiling';
const WARM = 'Say this like a warm, friendly, upbeat teacher';

/** video id → lines. `voice` is a Gemini prebuilt voice; `style` is spoken direction (not read aloud). */
export const SCRIPTS = {
  'rewards-neon': [
    { voice: 'Fenrir', style: HYPE, text: 'Be kind. Work hard. Show up.' },
    { voice: 'Fenrir', style: HYPE, text: 'And earn real points.' },
    { voice: 'Fenrir', style: HYPE, text: 'Students scan in at the kiosk, and watch their points roll in.' },
    { voice: 'Fenrir', style: HYPE, text: 'Then spend them on prizes they actually want.' },
    { voice: 'Fenrir', style: HYPE, text: 'LevelUp Rewards. Part of LevelUp EDU.' },
  ],
  'attendance-clean': [
    { voice: 'Sulafat', style: WARM, text: "Seven fifty-nine. The bell's about to ring." },
    { voice: 'Sulafat', style: WARM, text: "Getting kids to class on time is hard. Unless it's fun." },
    { voice: 'Sulafat', style: WARM, text: 'With LevelUp Attendance, students check in with one tap, earn points for being on time, and your reports build themselves.' },
    { voice: 'Sulafat', style: WARM, text: 'Show up. Level up. LevelUp Attendance.' },
  ],
  'library-storybook': [
    { voice: 'Vindemiatrix', style: 'Read this like a cozy bedtime storyteller, gentle, playful, a little dramatic', text: 'Chapter one. The mystery of the missing book.' },
    { voice: 'Vindemiatrix', style: 'Read this like a cozy bedtime storyteller, gentle and playful', text: 'Meet LevelUp Library. Scan any book in, and kids check out on their own.' },
    { voice: 'Vindemiatrix', style: 'Read this like a cozy bedtime storyteller, gentle and playful', text: 'Scan it. Borrow it. Read it, and earn points.' },
    { voice: 'Vindemiatrix', style: 'Read this like a storyteller wrapping up a story with a smile', text: 'The end, of lost library books. LevelUp Library, from LevelUp EDU.' },
  ],
  'classroom-arcade': [
    { voice: 'Algenib', style: 'Say this like a booming retro arcade game announcer', text: 'Player one. Teacher. Ready?' },
    { voice: 'Algenib', style: 'Say this like an excited retro arcade game announcer', text: 'Tap any seat on your LevelUp seating chart, to give points instantly.' },
    { voice: 'Algenib', style: 'Say this like an excited retro arcade game announcer', text: 'Every tap fills the class X P bar.' },
    { voice: 'Algenib', style: 'Shout this like an arcade announcer celebrating a huge win', text: 'Level up!' },
    { voice: 'Algenib', style: 'Say this like a proud retro arcade game announcer', text: 'LevelUp Classroom. Seating charts, one-tap points, and a live class screen.' },
  ],
  'rewards-countdown': [
    { voice: 'Laomedeia', style: HYPE, text: 'Three reasons students love LevelUp Rewards.' },
    { voice: 'Laomedeia', style: HYPE, text: 'Number three. Teachers hand out coupons, kids scan them for points.' },
    { voice: 'Laomedeia', style: HYPE, text: 'Number two. They see their balance the second they sign in.' },
    { voice: 'Laomedeia', style: HYPE, text: 'And number one. Real prizes. Pizza, homework passes, even lunch with a teacher.' },
    { voice: 'Laomedeia', style: HYPE, text: 'LevelUp Rewards. Bring it to your school.' },
  ],
  'attendance-news': [
    { voice: 'Charon', style: 'Say this like a polished TV news anchor with breaking news, with a hint of a smile', text: 'Breaking news from School A B C. Students are showing up on time.' },
    { voice: 'Charon', style: 'Say this like a polished TV news anchor', text: 'The reason? LevelUp Attendance. Every on-time check-in earns points, and streaks earn even more.' },
    { voice: 'Charon', style: 'Say this like a polished TV news anchor', text: "Teachers see who's here at a glance. No more paper roll call." },
    { voice: 'Charon', style: 'Say this like a TV news anchor warmly signing off', text: 'LevelUp Attendance. Back to you.' },
  ],
  'library-texts': [
    { voice: 'Leda', style: 'Say this like an excited, proud ten year old kid', text: 'Mom! I checked out a book all by myself today!' },
    { voice: 'Aoede', style: 'Say this like a curious, amused mom', text: 'Wait, how?' },
    { voice: 'Leda', style: 'Say this like an excited, proud ten year old kid', text: 'I just scanned it at the library kiosk. And I got points for reading!' },
    { voice: 'Aoede', style: 'Say this like an impressed mom, smiling', text: "Okay. That's actually really cool." },
    { voice: 'Sulafat', style: WARM, text: 'LevelUp Library. Reading kids get excited about.' },
  ],
  'classroom-before-after': [
    { voice: 'Puck', style: 'Say this dry, tired, and a little funny', text: 'Before. Sticky notes, a clipboard, and a very loud room.' },
    { voice: 'Puck', style: 'Say this with bright relief and a big smile', text: 'After. LevelUp Classroom.' },
    { voice: 'Puck', style: 'Say this bright, friendly and confident', text: 'Your seating chart, points in one tap, and a live screen the whole class can see.' },
    { voice: 'Puck', style: 'Say this bright, friendly and confident', text: 'Less chaos. More learning. LevelUp Classroom.' },
  ],
  'attendance-scan-in': [
    { voice: 'Achird', style: WARM, text: "It's seven fifty-two. Maya walks in, and heads straight for the LevelUp kiosk." },
    { voice: 'Achird', style: WARM, text: 'One tap of her student card.' },
    { voice: 'Achird', style: 'Say this warm and delighted', text: "And she's checked in. On time, with ten bonus points." },
    { voice: 'Achird', style: WARM, text: 'Attendance done. Rewards earned. That is LevelUp EDU.' },
  ],
  'houses-sorting': [
    { voice: 'Orus', style: 'Say this slowly, like a dramatic movie trailer narrator, hushed and mysterious', text: 'Every student has one question on their mind. Which house will I be in?' },
    { voice: 'Orus', style: 'Say this like a dramatic movie trailer narrator, building excitement', text: 'With LevelUp Houses, you can hold a real sorting ceremony, right on your classroom screen.' },
    { voice: 'Orus', style: 'Announce this like a grand ceremony host, pausing for suspense before the name, then triumphant', text: 'And your house is... Phoenix!' },
    { voice: 'Orus', style: 'Say this like an inspiring trailer narrator', text: 'From then on, every point a student earns counts toward their house.' },
    { voice: 'Orus', style: 'Say this like a proud trailer narrator', text: 'LevelUp Houses. Part of LevelUp EDU.' },
  ],
  'houses-race': [
    { voice: 'Sadachbia', style: 'Say this like a hyped-up sports commentator opening a big game', text: 'Welcome to the House Cup! Four houses. One trophy.' },
    { voice: 'Sadachbia', style: 'Say this like a fast, excited sports commentator calling a close race', text: 'Tide pulls ahead after a huge reading week! But here comes Phoenix, on time every single morning!' },
    { voice: 'Sadachbia', style: 'Say this like a sports commentator losing their mind at the finish', text: "It's neck and neck! Summit surges! And Nova takes it at the buzzer!" },
    { voice: 'Sadachbia', style: 'Say this like a sports commentator wrapping up, warm and upbeat', text: 'Every class award, every coupon, every on-time check-in moves the board. LevelUp Houses.' },
  ],
  'raffle-gameshow': [
    { voice: 'Puck', style: 'Say this like a big, cheesy TV game show host', text: "It's Friday. You know what that means. Raffle time!" },
    { voice: 'Puck', style: 'Say this like an excited TV game show host', text: 'With LevelUp Raffle, the points students earn all week turn into raffle tickets.' },
    { voice: 'Puck', style: 'Say this like an excited TV game show host building suspense', text: 'Pull the jackpot, or spin the wheel, right on your class screen.' },
    { voice: 'Puck', style: 'Announce this like a game show host revealing the big winner', text: "And this week's winner is... Jordan!" },
    { voice: 'Puck', style: 'Say this like a TV game show host signing off', text: 'LevelUp Raffle. Part of LevelUp Rewards.' },
  ],

  // ── Cartoon stories (added 2026-09-25) ──
  'story-classroom-onetap': [
    { voice: 'Kore', style: 'Say this like a warm, playful teacher asking the class a question', text: 'Okay class. Who knows seven times eight?' },
    { voice: 'Leda', style: 'Shout this like an excited kid who knows the answer', text: 'Fifty-six!' },
    { voice: 'Achird', style: WARM, text: "One tap on Ms. Rivera's tablet, and Leo gets five points, right on the class screen." },
    { voice: 'Achird', style: WARM, text: 'The whole class sees it. And now, everyone wants to be next.' },
    { voice: 'Achird', style: WARM, text: 'LevelUp Classroom. Praise everyone can see.' },
  ],
  'story-library-checkout': [
    { voice: 'Sulafat', style: 'Say this like a warm storyteller', text: 'Jordan finds the perfect book.' },
    { voice: 'Sulafat', style: 'Say this like a warm storyteller', text: 'No line at the desk. Jordan just scans it at the LevelUp library station.' },
    { voice: 'Sulafat', style: 'Say this warm and delighted', text: 'Checked out, with a due date, and reading points too.' },
    { voice: 'Zephyr', style: 'Say this like a thrilled kid, one word at a time', text: 'Best. Library. Ever!' },
    { voice: 'Sulafat', style: WARM, text: 'LevelUp Library. Made for readers.' },
  ],
  'story-rewards-prizeday': [
    { voice: 'Laomedeia', style: HYPE, text: "Maya's been saving her points all month." },
    { voice: 'Laomedeia', style: HYPE, text: 'And today, she is cashing in.' },
    { voice: 'Laomedeia', style: HYPE, text: 'Pizza slice. Two hundred points. Redeemed!' },
    { voice: 'Leda', style: 'Say this like a happy kid with a mouth full of pizza', text: 'Totally worth it!' },
    { voice: 'Laomedeia', style: HYPE, text: 'LevelUp Rewards. Good choices. Real prizes.' },
  ],
  'story-houses-assembly': [
    { voice: 'Fenrir', style: 'Say this like an excited school assembly announcer', text: "It's Friday assembly, and the House Cup standings are in!" },
    { voice: 'Fenrir', style: 'Say this like an excited announcer building suspense', text: "Phoenix and Tide are tied. Until Tide's reading points roll in!" },
    { voice: 'Fenrir', style: 'Shout this like an announcer as the crowd erupts', text: 'Tide takes the lead! The whole house goes wild!' },
    { voice: 'Fenrir', style: 'Say this like a proud, upbeat announcer', text: 'LevelUp Houses. Every point brings your school together.' },
  ],
  'story-family-portal': [
    { voice: 'Sulafat', style: 'Say this like a warm storyteller', text: 'Lunch break. Dad opens the LevelUp family portal.' },
    { voice: 'Sulafat', style: 'Say this like a warm storyteller', text: "Leo's in class today, and his teacher left a note. Ten points, for helping a classmate." },
    { voice: 'Iapetus', style: 'Say this like a proud dad, softly, with a big smile', text: "That's my kid." },
    { voice: 'Sulafat', style: WARM, text: 'Families see the good stuff, as it happens.' },
    { voice: 'Sulafat', style: WARM, text: 'LevelUp EDU. Bring families into every win.' },
  ],
  'story-classroom-hallpass': [
    { voice: 'Achird', style: WARM, text: 'Leo needs a quick hall pass.' },
    { voice: 'Achird', style: WARM, text: 'Ms. Rivera taps his seat. Pass started, with a timer.' },
    { voice: 'Achird', style: WARM, text: "The class screen shows who's out, and for how long." },
    { voice: 'Achird', style: WARM, text: "Back in two minutes. One more tap, and he's back in class." },
    { voice: 'Achird', style: WARM, text: 'LevelUp Classroom. Hall passes, without the paperwork.' },
  ],

  // ── Office + vending (added 2026-09-25) ──
  'story-office-ask': [
    { voice: 'Sulafat', style: 'Say this like a warm storyteller', text: "Monday morning in the school office. The phone's ringing, and a parent is at the desk." },
    { voice: 'Despina', style: 'Say this like a friendly, slightly worried mom', text: 'Hi! Is Leo here today?' },
    { voice: 'Sulafat', style: 'Say this like a warm storyteller', text: 'Ms. Park just asks LevelUp Office. Who is absent today?' },
    { voice: 'Sulafat', style: 'Say this warm and delighted', text: "The answer pops up in seconds. Leo's not on the list. He checked in at seven fifty-two." },
    { voice: 'Erinome', style: 'Say this like a cheerful, kind school secretary', text: "He's in class! Anything else I can help with?" },
    { voice: 'Sulafat', style: WARM, text: 'LevelUp Office. Your whole school, one question away.' },
  ],
  'office-rapid': [
    { voice: 'Aoede', style: 'Say this upbeat and confident, like a modern tech ad', text: 'Your school office has questions. LevelUp Office has answers.' },
    { voice: 'Aoede', style: 'Say this upbeat, like typing a question', text: 'Who is absent today?' },
    { voice: 'Aoede', style: 'Say this upbeat, like typing a question', text: 'Families who owe more than a hundred dollars?' },
    { voice: 'Aoede', style: 'Say this upbeat and impressed', text: 'And every bus, live on the map.' },
    { voice: 'Aoede', style: 'Say this upbeat and confident', text: 'Just ask. LevelUp Office.' },
  ],
  'story-office-bus': [
    { voice: 'Achird', style: WARM, text: 'Three twenty. The buses are rolling.' },
    { voice: 'Achird', style: WARM, text: 'Driver mode marks every kid on, and off, the bus.' },
    { voice: 'Achird', style: WARM, text: 'Back at the office, every bus shows up live on the map.' },
    { voice: 'Achird', style: 'Say this warm, with a little suspense then relief', text: 'Bus four running late? The office sees it right away.' },
    { voice: 'Achird', style: WARM, text: 'LevelUp Office. Every ride, on the radar.' },
  ],
  'story-office-pickup': [
    { voice: 'Sulafat', style: 'Say this like a warm storyteller', text: "One fifteen. Leo's mom is here for an early pickup." },
    { voice: 'Sulafat', style: 'Say this like a warm storyteller', text: 'Ms. Park logs it at the front desk. Picked up by Mom, one fifteen.' },
    { voice: 'Sulafat', style: 'Say this like a warm storyteller', text: 'Attendance updates on its own. Left early today.' },
    { voice: 'Sulafat', style: WARM, text: 'No clipboards. No guessing. Every arrival and pickup, in one place.' },
    { voice: 'Sulafat', style: WARM, text: 'LevelUp Office. The front desk, sorted.' },
  ],
  'story-rewards-vending': [
    { voice: 'Laomedeia', style: HYPE, text: "This isn't just any vending machine." },
    { voice: 'Laomedeia', style: HYPE, text: 'Jordan taps his student card.' },
    { voice: 'Laomedeia', style: HYPE, text: 'Picks a prize with his points.' },
    { voice: 'Laomedeia', style: 'Say this with a big dramatic build then pop', text: 'And... drop!' },
    { voice: 'Zephyr', style: 'Say this like an amazed, thrilled kid', text: 'No way!' },
    { voice: 'Laomedeia', style: HYPE, text: 'The LevelUp rewards vending machine. Points you can hold.' },
  ],
};

/** Voices in the sampler (the owner picks favorites from this). */
const SAMPLER_VOICES = [
  'Puck', 'Fenrir', 'Laomedeia', 'Sadachbia', 'Achird', 'Sulafat', 'Charon', 'Orus',
  'Vindemiatrix', 'Aoede', 'Leda', 'Algenib', 'Kore', 'Zephyr', 'Gacrux', 'Iapetus',
];

async function synthesizeGemini({ apiKey, voice, style, text, outPath }) {
  const prompt = style ? `${style}: ${text}` : text;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELS[modelIdx]}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
        },
      }),
    });
    const json = await res.json().catch(() => ({}));
    const data = json?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (res.ok && data) {
      const pcm = trimSilence(Buffer.from(data, 'base64'));
      encodePcm(pcm, outPath);
      return pcm;
    }
    if (res.status === 429 && modelIdx + 1 < MODELS.length) {
      modelIdx++;
      console.log(`[voice] quota hit, switching to ${MODELS[modelIdx]}`);
      continue;
    }
    if (attempt >= 4) throw new Error(`Gemini TTS failed (${res.status}): ${JSON.stringify(json).slice(0, 300)}`);
    await new Promise((r) => setTimeout(r, 4000 * attempt));
  }
}

const RATE = 24000;

/** Drops leading/trailing silence from 16-bit mono PCM, keeping a little air. */
function trimSilence(pcm) {
  const n = pcm.length / 2;
  const loud = (i) => Math.abs(pcm.readInt16LE(i * 2)) > 500;
  let a = 0;
  while (a < n && !loud(a)) a++;
  let b = n - 1;
  while (b > a && !loud(b)) b--;
  a = Math.max(0, a - Math.round(RATE * 0.04));
  b = Math.min(n - 1, b + Math.round(RATE * 0.12));
  return pcm.subarray(a * 2, (b + 1) * 2);
}

function encodePcm(pcm, outPath) {
  const wav = outPath.replace(/\.mp3$/, '.tmp.wav');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(wav, Buffer.concat([wavHeader(pcm.length, RATE), pcm]));
  execSync(`npx remotion ffmpeg -y -v error -i "${wav}" -b:a 160k "${outPath}"`, { cwd: PROMO });
  fs.unlinkSync(wav);
}

function wavHeader(bytes, rate) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + bytes, 4);
  h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(bytes, 40);
  return h;
}

function probeSeconds(file) {
  const out = execSync(`npx remotion ffprobe -v error -show_entries format=duration -of csv=p=0 "${file}"`, {
    cwd: PROMO,
    encoding: 'utf8',
  });
  return parseFloat(out.trim());
}

async function makeSampler(apiKey) {
  const dir = path.join(OUT, '_sampler');
  const gap = Buffer.alloc(Math.round(RATE * 0.8) * 2);
  const parts = [];
  for (let i = 0; i < SAMPLER_VOICES.length; i++) {
    const voice = SAMPLER_VOICES[i];
    const file = path.join(dir, `${String(i + 1).padStart(2, '0')}-${voice}.mp3`);
    console.log(`[sampler] ${voice}`);
    const pcm = await synthesizeGemini({
      apiKey,
      voice,
      style: 'Say this in a friendly, upbeat, natural way',
      text: `Voice number ${i + 1}. Students scan in at the kiosk, and watch their points roll in. That's LevelUp EDU.`,
      outPath: file,
    });
    parts.push(pcm, gap);
  }
  const out = path.join(PROMO, '..', 'assets', 'claude-2026-09-24-voice-sampler.mp3');
  encodePcm(Buffer.concat(parts), out);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`[sampler] ${out}`);
}

async function main() {
  const force = process.argv.includes('--force');
  const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY missing (.env.local)');

  if (process.argv.includes('--sampler')) return makeSampler(apiKey);

  const durations = fs.existsSync(DURATIONS) ? JSON.parse(fs.readFileSync(DURATIONS, 'utf8')) : {};
  for (const [video, lines] of Object.entries(SCRIPTS)) {
    if (only && only !== video) continue;
    durations[video] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const file = path.join(OUT, video, `${i + 1}.mp3`);
      if (force || !fs.existsSync(file)) {
        console.log(`[voice] ${video} #${i + 1} (${line.voice}): ${line.text}`);
        await synthesizeGemini({ apiKey, ...line, outPath: file });
      }
      durations[video].push(Math.round(probeSeconds(file) * 100) / 100);
    }
  }
  fs.mkdirSync(path.dirname(DURATIONS), { recursive: true });
  fs.writeFileSync(DURATIONS, JSON.stringify(durations, null, 2) + '\n');
  console.log(JSON.stringify(durations));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
