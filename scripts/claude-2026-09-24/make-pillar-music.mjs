/**
 * Original, royalty-free music beds + sound effects for the Claude 2026-09-24
 * pillar spotlight videos, synthesized from scratch (no samples).
 *
 *   node scripts/claude-2026-09-24/make-pillar-music.mjs
 *
 * Reads sceneSpecs.json + voiceDurations.json so musical moments (drops,
 * the before→after switch, etc.) land on the same frames as the video cuts.
 * Writes music as MP3 (sound effects stay WAV) to promo-video/public/music/claude-2026-09-24/.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMO = path.join(__dirname, '..', '..', 'promo-video');
const OUT = path.join(PROMO, 'public', 'music', 'claude-2026-09-24');
const SRC = path.join(PROMO, 'src', 'claude-2026-09-24');
const specs = JSON.parse(fs.readFileSync(path.join(SRC, 'sceneSpecs.json'), 'utf8'));
const voices = JSON.parse(fs.readFileSync(path.join(SRC, 'voiceDurations.json'), 'utf8'));

const SR = 44100;
const FPS = 30;

/* ── timeline (mirrors buildTimeline in common.tsx) ─────────────────── */

function timeline(id) {
  const scenes = {};
  const cues = {};
  let cursor = 0;
  for (const spec of specs[id]) {
    const gap = spec.gap ?? 8;
    let t = 6;
    cues[spec.name] = [];
    for (const v of spec.voices) {
      const len = Math.ceil(voices[id][v] * FPS);
      cues[spec.name].push({ at: t / FPS, len: len / FPS });
      t += len + gap;
    }
    const dur = Math.max(spec.min, t - gap + 12) + (spec.tail ?? 0);
    scenes[spec.name] = cursor / FPS;
    cursor += dur;
  }
  const tl = { scenes, total: cursor / FPS };
  // Same landing moments as houses.tsx (landFrame) and raffle.tsx (spinBeats).
  if (cues.reveal?.[0] && id === 'houses-sorting') tl.revealLand = cues.reveal[0].at + cues.reveal[0].len * 0.8;
  if (cues.spin?.[1]) tl.spinLand = cues.spin[1].at + cues.spin[1].len * 0.78;
  return tl;
}

/* ── tiny synth toolkit ─────────────────────────────────────────────── */

let seed = 1234567;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const noise = () => rand() * 2 - 1;
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const TAU = Math.PI * 2;

function svf(kind = 'lp') {
  let low = 0, band = 0;
  return (x, fc, q = 0.7) => {
    const f = 2 * Math.sin((Math.PI * Math.min(fc, 7000)) / SR);
    low += f * band;
    const high = x - low - (1 / q) * band;
    band += f * high;
    return kind === 'lp' ? low : kind === 'bp' ? band : high;
  };
}

function adsr(i, n, a, d, s, r) {
  const t = i / SR, len = n / SR;
  if (t < a) return t / a;
  if (t < a + d) return 1 - (1 - s) * ((t - a) / d);
  if (t < len - r) return s;
  return Math.max(0, s * ((len - t) / r));
}

const buf = (sec) => new Float32Array(Math.max(1, Math.ceil(sec * SR)));

const I = {
  kick(g = 1, tone = 1) {
    const b = buf(0.45);
    let ph = 0;
    for (let i = 0; i < b.length; i++) {
      const t = i / SR;
      const f = 45 * tone + 120 * Math.exp(-t * 32);
      ph += (TAU * f) / SR;
      b[i] = Math.sin(ph) * Math.exp(-t * 7.5) * g + (t < 0.004 ? noise() * 0.4 * g : 0);
    }
    return b;
  },
  snare(g = 1, decay = 20) {
    const b = buf(0.3), hp = svf('hp');
    for (let i = 0; i < b.length; i++) {
      const t = i / SR;
      b[i] = (hp(noise(), 1800) * Math.exp(-t * decay) + Math.sin(TAU * 185 * t) * Math.exp(-t * 35) * 0.6) * g;
    }
    return b;
  },
  clap(g = 1) {
    const b = buf(0.35), bp = svf('bp');
    for (let i = 0; i < b.length; i++) {
      const t = i / SR;
      let e = Math.exp(-Math.max(0, t - 0.022) * 16) * (t > 0.022 ? 1 : 0);
      for (const o of [0, 0.011, 0.022]) if (t >= o && t < o + 0.01) e = Math.max(e, Math.exp(-(t - o) * 250));
      b[i] = bp(noise(), 1300, 1.2) * e * g * 2.2;
    }
    return b;
  },
  hat(g = 1, open = false) {
    const b = buf(open ? 0.3 : 0.06), hp = svf('hp');
    for (let i = 0; i < b.length; i++) b[i] = hp(noise(), 7000) * Math.exp(-(i / SR) * (open ? 11 : 70)) * g;
    return b;
  },
  shaker(g = 1) {
    const b = buf(0.08), bp = svf('bp');
    for (let i = 0; i < b.length; i++) {
      const t = i / SR;
      b[i] = bp(noise(), 5500, 1) * Math.min(1, t / 0.015) * Math.exp(-t * 45) * g;
    }
    return b;
  },
  snap(g = 1) {
    const b = buf(0.12), bp = svf('bp');
    for (let i = 0; i < b.length; i++) b[i] = bp(noise(), 2400, 3) * Math.exp(-(i / SR) * 60) * g * 3;
    return b;
  },
  timpani(m, g = 1) {
    const b = buf(1.2);
    const f = mtof(m);
    for (let i = 0; i < b.length; i++) {
      const t = i / SR;
      b[i] = (Math.sin(TAU * f * (1 + 0.05 * Math.exp(-t * 20)) * t) + 0.3 * Math.sin(TAU * f * 1.5 * t)) * Math.exp(-t * 3.5) * g + noise() * Math.exp(-t * 40) * 0.2 * g;
    }
    return b;
  },
  bass808(m, dur, g = 1) {
    const b = buf(dur + 0.1);
    let ph = 0;
    const f = mtof(m);
    for (let i = 0; i < b.length; i++) {
      const t = i / SR;
      ph += (TAU * f * (1 + 0.4 * Math.exp(-t * 40))) / SR;
      b[i] = Math.tanh(Math.sin(ph) * 2.2) * adsr(i, b.length, 0.003, 0.2, 0.7, 0.08) * g * 0.8;
    }
    return b;
  },
  synth(m, dur, o = {}) {
    const { type = 'saw', g = 1, a = 0.005, d = 0.15, s = 0.6, r = 0.1, cutoff = 2500, env = 0, q = 0.8, voices: nv = 1, detune = 0.12, vib = 0, duty = 0.5 } = o;
    const b = buf(dur + r), lp = svf('lp');
    const phases = Array.from({ length: nv }, () => rand());
    const f0 = mtof(m);
    for (let i = 0; i < b.length; i++) {
      const t = i / SR;
      let x = 0;
      for (let v = 0; v < nv; v++) {
        const det = nv > 1 ? (v / (nv - 1) - 0.5) * detune : 0;
        const f = f0 * 2 ** (det / 12) * (1 + vib * Math.sin(TAU * 5.5 * t) * Math.min(1, t * 3));
        phases[v] = (phases[v] + f / SR) % 1;
        const p = phases[v];
        x +=
          type === 'saw' ? 2 * p - 1
          : type === 'square' ? (p < duty ? 1 : -1)
          : type === 'tri' ? 1 - 4 * Math.abs(p - 0.5)
          : Math.sin(TAU * p);
      }
      x /= Math.sqrt(nv);
      const e = adsr(i, b.length, a, d, s, r);
      const fc = cutoff * (1 + env * Math.exp(-t * 12));
      b[i] = (type === 'sine' || type === 'tri' ? x : lp(x, fc, q)) * e * g;
    }
    return b;
  },
  pluck(m, dur, g = 1, bright = 0.5) {
    // Karplus-Strong string.
    const f = mtof(m);
    const n = Math.max(2, Math.round(SR / f));
    const line = new Float32Array(n);
    for (let i = 0; i < n; i++) line[i] = noise();
    const b = buf(dur + 0.05);
    let idx = 0, last = 0;
    const damp = 0.5 + bright * 0.49;
    for (let i = 0; i < b.length; i++) {
      const cur = line[idx];
      const next = cur * damp + last * (1 - damp);
      last = cur;
      line[idx] = next * 0.996;
      idx = (idx + 1) % n;
      b[i] = cur * g * Math.min(1, (b.length - i) / (SR * 0.03));
    }
    return b;
  },
  epiano(m, dur, g = 1) {
    const b = buf(dur + 0.4);
    const f = mtof(m);
    for (let i = 0; i < b.length; i++) {
      const t = i / SR;
      const trem = 1 + 0.12 * Math.sin(TAU * 4.5 * t);
      b[i] =
        (Math.sin(TAU * f * t) + 0.35 * Math.sin(TAU * 2 * f * t) * Math.exp(-t * 6) + 0.12 * Math.sin(TAU * 7 * f * t) * Math.exp(-t * 25)) *
        Math.exp(-t * 1.4) * trem * g * Math.min(1, t / 0.004) * Math.min(1, (b.length - i) / (SR * 0.3));
    }
    return b;
  },
  bell(m, dur, g = 1) {
    const b = buf(dur);
    const f = mtof(m);
    const parts = [[1, 1, 2.2], [2.01, 0.5, 3.5], [2.76, 0.35, 5], [5.4, 0.2, 9], [8.9, 0.1, 14]];
    for (let i = 0; i < b.length; i++) {
      const t = i / SR;
      let x = 0;
      for (const [r, a, d] of parts) x += Math.sin(TAU * f * r * t) * a * Math.exp(-t * d);
      b[i] = x * g * Math.min(1, t / 0.002);
    }
    return b;
  },
  marimba(m, dur, g = 1) {
    const b = buf(Math.min(dur + 0.5, 1.2));
    const f = mtof(m);
    for (let i = 0; i < b.length; i++) {
      const t = i / SR;
      b[i] = (Math.sin(TAU * f * t) * Math.exp(-t * 5) + 0.4 * Math.sin(TAU * 4 * f * t) * Math.exp(-t * 28) + 0.1 * Math.sin(TAU * 9.9 * f * t) * Math.exp(-t * 60)) * g * Math.min(1, t / 0.002);
    }
    return b;
  },
  chipNoise(g = 1, decay = 25) {
    const b = buf(0.25);
    let v = 0;
    for (let i = 0; i < b.length; i++) {
      if (i % 6 === 0) v = noise();
      b[i] = v * Math.exp(-(i / SR) * decay) * g;
    }
    return b;
  },
  riser(dur, g = 1) {
    const b = buf(dur), bp = svf('bp');
    for (let i = 0; i < b.length; i++) {
      const p = i / b.length;
      b[i] = bp(noise(), 300 + 5000 * p * p, 2) * p * p * g * 2;
    }
    return b;
  },
  crackle(dur, g = 1) {
    const b = buf(dur), lp = svf('lp');
    for (let i = 0; i < b.length; i++) b[i] = lp(noise(), 1200) * 0.15 * g + (rand() < 0.0006 ? noise() * g * 0.9 : 0);
    return b;
  },
};

/* ── mixer ──────────────────────────────────────────────────────────── */

class Mix {
  constructor(sec) {
    this.n = Math.ceil(sec * SR);
    this.L = new Float32Array(this.n);
    this.R = new Float32Array(this.n);
    this.scL = new Float32Array(this.n);
    this.scR = new Float32Array(this.n);
    this.send = new Float32Array(this.n);
    this.kicks = [];
  }
  add(t, b, { gain = 1, pan = 0, rev = 0.15, sc = false } = {}) {
    const start = Math.round(t * SR);
    const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4);
    const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
    const L = sc ? this.scL : this.L, R = sc ? this.scR : this.R;
    for (let i = 0; i < b.length; i++) {
      const j = start + i;
      if (j < 0 || j >= this.n) continue;
      L[j] += b[i] * gl;
      R[j] += b[i] * gr;
      this.send[j] += b[i] * gain * rev;
    }
  }
  kick(t, g = 1, tone = 1) {
    this.kicks.push(t);
    this.add(t, I.kick(g, tone), { rev: 0.02 });
  }
  finish(duckDepth = 0.55) {
    // Sidechain "pump" for the sc bus.
    let k = 0;
    const kicks = this.kicks.sort((a, b) => a - b);
    for (let i = 0; i < this.n; i++) {
      const t = i / SR;
      while (k + 1 < kicks.length && kicks[k + 1] <= t) k++;
      const since = kicks.length && t >= kicks[k] ? t - kicks[k] : 9;
      const d = 1 - duckDepth * Math.exp(-since / 0.11);
      this.L[i] += this.scL[i] * d;
      this.R[i] += this.scR[i] * d;
    }
    // Freeverb-lite on the send bus.
    const combs = (offset) =>
      [1116, 1188, 1277, 1356, 1422, 1491].map((d) => ({ d: d + offset, b: new Float32Array(d + offset), i: 0, f: 0 }));
    for (const [out, offset] of [[this.L, 0], [this.R, 23]]) {
      const cs = combs(offset);
      const aps = [556, 441, 341].map((d) => ({ b: new Float32Array(d + offset), i: 0 }));
      for (let i = 0; i < this.n; i++) {
        const x = this.send[i] * 0.3;
        let y = 0;
        for (const c of cs) {
          const o = c.b[c.i];
          c.f = o * 0.6 + c.f * 0.4;
          c.b[c.i] = x + c.f * 0.82;
          c.i = (c.i + 1) % c.b.length;
          y += o;
        }
        for (const a of aps) {
          const o = a.b[a.i];
          a.b[a.i] = y + o * 0.5;
          y = o - y;
          a.i = (a.i + 1) % a.b.length;
        }
        out[i] += y * 0.35;
      }
    }
    let peak = 1e-9;
    for (let i = 0; i < this.n; i++) {
      this.L[i] = Math.tanh(this.L[i] * 0.9);
      this.R[i] = Math.tanh(this.R[i] * 0.9);
      peak = Math.max(peak, Math.abs(this.L[i]), Math.abs(this.R[i]));
    }
    const norm = 0.89 / peak;
    for (let i = 0; i < this.n; i++) {
      this.L[i] *= norm;
      this.R[i] *= norm;
    }
    return [this.L, this.R];
  }
}

function writeWav(name, [L, R]) {
  const n = L.length;
  const data = Buffer.alloc(44 + n * 4);
  data.write('RIFF', 0);
  data.writeUInt32LE(36 + n * 4, 4);
  data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(2, 22);
  data.writeUInt32LE(SR, 24);
  data.writeUInt32LE(SR * 4, 28);
  data.writeUInt16LE(4, 32);
  data.writeUInt16LE(16, 34);
  data.write('data', 36);
  data.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4);
  }
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `${name}.wav`), data);
  console.log(`[music] ${name}.wav  ${(n / SR).toFixed(1)}s`);
}

/** Calls fn(t, bar, step) for every 16th-note step until `end`. */
function steps(bpm, end, fn, from = 0) {
  const st = 60 / bpm / 4;
  for (let k = 0; from + k * st < end; k++) fn(from + k * st, Math.floor(k / 16), k % 16, st);
}

const chordAt = (prog, bar) => prog[bar % prog.length];

/* ── tracks ─────────────────────────────────────────────────────────── */

const TRACKS = {
  'neon-trap'(m, len, tl) {
    const drop = tl.scenes.earn;
    const prog = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
    const roots = [33, 29, 36, 31];
    // intro: dark pad + hats, riser into the drop
    steps(140, drop, (t, bar, s, st) => {
      if (s === 0) for (const n of chordAt(prog, bar)) m.add(t, I.synth(n, st * 16, { voices: 5, cutoff: 900, a: 0.2, r: 0.4, g: 0.25 }), { sc: false, rev: 0.4 });
      if (s % 2 === 0) m.add(t, I.hat(0.25), { pan: 0.3 });
    });
    m.add(Math.max(0, drop - 1.4), I.riser(1.4, 0.5), { rev: 0.3 });
    steps(140, len, (t, bar, s, st) => {
      const ch = chordAt(prog, bar);
      if ([0, 7, 10].includes(s)) {
        m.kick(t, 1);
        m.add(t, I.bass808(roots[bar % 4], st * 3, 0.9), { rev: 0 });
      }
      if (s === 4 || s === 12) m.add(t, I.clap(0.8), { rev: 0.25 });
      if (s % 2 === 0) m.add(t, I.hat(0.35), { pan: 0.3 });
      if (bar % 2 === 1 && s >= 12) {
        m.add(t, I.hat(0.25), { pan: 0.3 });
        m.add(t + st / 2, I.hat(0.2), { pan: 0.3 });
      }
      if ([0, 3, 6].includes(s)) for (const n of ch) m.add(t, I.synth(n + 12, st * 2, { voices: 5, cutoff: 2600, env: 1, g: 0.2, r: 0.12 }), { sc: true, rev: 0.3, pan: -0.2 });
      const mel = [69, 72, 76, 74, 72, 69, 67, 69];
      if (s % 4 === 2) m.add(t, I.pluck(mel[(bar * 4 + s / 4) % 8 | 0] + 12, st * 2, 0.25, 0.7), { sc: true, pan: 0.35, rev: 0.35 });
    }, drop);
  },

  'bounce-house'(m, len, tl) {
    const prog = [[62, 65, 69], [58, 62, 65], [60, 65, 69], [60, 64, 67]];
    const roots = [38, 34, 41, 36];
    const fills = Object.values(tl.scenes).slice(1);
    steps(124, len, (t, bar, s, st) => {
      if (s % 4 === 0) m.kick(t, 0.95);
      if (s === 4 || s === 12) m.add(t, I.clap(0.7), { rev: 0.3 });
      if (s % 4 === 2) m.add(t, I.hat(0.35, true), { pan: 0.25 });
      m.add(t, I.shaker(0.12), { pan: -0.3 });
      if (s % 4 === 2) m.add(t, I.synth(roots[bar % 4] + (s % 8 === 6 ? 12 : 0), st * 1.6, { type: 'saw', cutoff: 700, env: 2, g: 0.55, r: 0.04 }), { rev: 0 });
      if ([2, 6, 10, 14].includes(s) || s === 7)
        for (const n of chordAt(prog, bar)) m.add(t, I.epiano(n + 12, st * 1.2, 0.18), { sc: true, rev: 0.25 });
      const hook = [74, 0, 77, 0, 74, 72, 0, 69];
      if (s % 2 === 0 && bar % 2 === 1 && hook[s / 2]) m.add(t, I.pluck(hook[s / 2] + 12, st * 2, 0.3, 0.8), { pan: 0.3, rev: 0.35 });
    });
    for (const f of fills) for (let k = 0; k < 4; k++) m.add(f - 0.24 + k * 0.06, I.snare(0.35 + k * 0.1), { rev: 0.2 });
  },

  'sunny-pop'(m, len, tl) {
    const full = tl.scenes.twist;
    const prog = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]];
    const roots = [36, 31, 33, 29];
    steps(116, len, (t, bar, s, st) => {
      const ch = chordAt(prog, bar);
      const arp = [ch[0], ch[1], ch[2], ch[1] + 12, ch[2], ch[1], ch[0] + 12, ch[2]];
      if (s % 2 === 0) m.add(t, I.pluck(arp[s / 2] + 12, st * 2, t < full ? 0.25 : 0.32, 0.75), { pan: 0.25, rev: 0.3 });
      if (t < full) {
        if (s === 0) for (const n of ch) m.add(t, I.synth(n, st * 16, { type: 'tri', a: 0.3, g: 0.12, r: 0.4 }), { rev: 0.4 });
        return;
      }
      if (s === 0 || s === 8 || s === 10) m.kick(t, 0.85);
      if (s === 4 || s === 12) m.add(t, I.clap(0.6), { rev: 0.3 });
      m.add(t, I.shaker(0.14), { pan: -0.35 });
      if (s % 2 === 0) m.add(t, I.synth(roots[bar % 4] + 12, st * 1.8, { type: 'square', duty: 0.4, cutoff: 900, env: 1, g: 0.4, r: 0.05 }), { rev: 0 });
      const glock = [79, 76, 79, 81, 79, 76, 74, 76];
      if (s % 4 === 0 && bar % 2 === 1) m.add(t, I.bell(glock[(s / 4 + bar * 2) % 8] + 12, 0.8, 0.1), { pan: 0.4, rev: 0.4 });
    });
  },

  'news-theme'(m, len, tl) {
    const prog = [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]];
    const roots = [38, 34, 31, 33];
    m.add(0, I.timpani(38, 1), { rev: 0.4 });
    for (const n of [50, 53, 57, 62]) m.add(0, I.synth(n, 0.9, { voices: 5, cutoff: 3000, env: 1, g: 0.3, r: 0.4 }), { rev: 0.5 });
    steps(120, len, (t, bar, s, st) => {
      const ch = chordAt(prog, bar);
      m.add(t, I.synth(roots[bar % 4] + (s % 4 === 3 ? 19 : 12), st * 0.7, { cutoff: 1400, env: 1.5, g: 0.35, r: 0.03 }), { sc: true, rev: 0.1 });
      m.add(t, I.hat(s % 4 === 2 ? 0.28 : 0.14), { pan: 0.3 });
      if (s === 0) m.add(t, I.timpani(roots[bar % 4], 0.7), { rev: 0.35 });
      if (s === 0 || s === 8) m.kick(t, 0.7);
      if (s === 4 || s === 12) m.add(t, I.snare(0.45), { rev: 0.3 });
      if (s === 0 || s === 6) for (const n of ch) m.add(t, I.synth(n + 12, st * 3, { voices: 5, cutoff: 2800, env: 1, g: 0.18, r: 0.2 }), { rev: 0.45, pan: -0.15 });
    }, 1.0);
    const sign = tl.scenes.signoff;
    m.add(sign - 1.2, I.riser(1.2, 0.4), { rev: 0.4 });
    m.add(sign, I.timpani(38, 1), { rev: 0.5 });
  },

  'morning-ukulele'(m, len, tl) {
    const prog = [[60, 64, 67, 72], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67]];
    const roots = [36, 33, 29, 31];
    const strum = [0, 4, 6, 10, 12, 14];
    const party = tl.scenes.points;
    steps(110, len, (t, bar, s, st) => {
      const ch = chordAt(prog, bar);
      if (strum.includes(s)) ch.forEach((n, k) => m.add(t + k * 0.012 * (s % 4 === 2 ? -1 : 1) + 0.02, I.pluck(n, st * 3, 0.22, 0.85), { pan: -0.2 + k * 0.1, rev: 0.25 }));
      if (s === 0 || s === 8) m.kick(t, 0.6);
      if (s === 4 || s === 12) m.add(t, I.snap(0.4), { rev: 0.25 });
      if (s % 2 === 1) m.add(t, I.shaker(0.1), { pan: 0.35 });
      if (s === 0 || s === 6 || s === 10) m.add(t, I.pluck(roots[bar % 4], st * 4, 0.5, 0.3), { rev: 0.05 });
      const whistle = [76, 0, 79, 0, 76, 74, 72, 0];
      if (s % 2 === 0 && bar % 2 === 0 && whistle[s / 2]) m.add(t, I.synth(whistle[s / 2] + 12, st * 1.8, { type: 'sine', a: 0.03, g: 0.13, vib: 0.01, r: 0.1 }), { pan: 0.3, rev: 0.4 });
      if (t >= party && t < party + 4 && s % 2 === 0) m.add(t, I.bell(84 + [0, 4, 7, 12][(s / 2) % 4], 0.6, 0.07), { pan: 0.4, rev: 0.5 });
    });
  },

  'lofi-book'(m, len, tl) {
    const prog = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]];
    const roots = [29, 28, 26, 24];
    const swing = (s, st) => (s % 2 === 1 ? st * 0.28 : 0);
    const reveal = tl.scenes.reveal;
    // music-box opening under "Chapter one"
    const box = [72, 76, 79, 84, 83, 79, 76, 74, 72, 74, 76, 72];
    box.forEach((n, i) => { if (i * 0.38 < reveal) m.add(0.1 + i * 0.38, I.bell(n + 12, 1.2, 0.12), { rev: 0.6, pan: 0.2 }); });
    m.add(0, I.crackle(len, 0.5), { rev: 0 });
    steps(78, len, (t, bar, s, st) => {
      const tt = t + swing(s, st);
      const ch = chordAt(prog, bar);
      if (s === 0) ch.forEach((n, k) => m.add(tt + k * 0.025, I.epiano(n, st * 15, 0.16), { rev: 0.4, pan: -0.1 + k * 0.07 }));
      if (t < reveal) return;
      if (s === 0 || s === 6 || s === 10) m.kick(tt, 0.55, 0.9);
      if (s === 4 || s === 12) m.add(tt, I.snare(0.28, 30), { rev: 0.35 });
      if (s % 2 === 0) m.add(tt, I.hat(0.12), { pan: 0.3 });
      if (s === 0 || s === 10) m.add(tt, I.synth(roots[bar % 4] + 12, st * 5, { type: 'sine', g: 0.4, a: 0.01, r: 0.1 }), { rev: 0 });
    });
  },

  'marimba-morning'(m, len) {
    const prog = [[55, 59, 62], [50, 54, 57], [52, 55, 59], [48, 52, 55]];
    const roots = [43, 38, 40, 36];
    steps(104, len, (t, bar, s, st) => {
      const ch = chordAt(prog, bar);
      const arp = [ch[0], ch[1], ch[2], ch[0] + 12, ch[2], ch[1], ch[2] + 12, ch[1] + 12];
      if (s % 2 === 0) m.add(t, I.marimba(arp[s / 2] + 12, st * 2, 0.3), { pan: 0.2, rev: 0.3 });
      if (s === 0 || s === 8) m.kick(t, 0.5);
      if (s === 4 || s === 12) m.add(t, I.snap(0.45), { rev: 0.3 });
      if (s % 2 === 1) m.add(t, I.shaker(0.09), { pan: -0.3 });
      if (s === 0 || s === 6 || s === 8) m.add(t, I.pluck(roots[bar % 4], st * 3, 0.45, 0.25), { rev: 0.05 });
      const top = [79, 0, 78, 79, 0, 74, 0, 76];
      if (bar % 2 === 1 && s % 2 === 0 && top[s / 2]) m.add(t, I.marimba(top[s / 2] + 12, st * 2, 0.18), { pan: -0.25, rev: 0.4 });
    });
  },

  chiptune(m, len) {
    const prog = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
    const roots = [36, 33, 29, 31];
    const lead = [
      [72, 72, 79, 79, 81, 79, 76, 72],
      [74, 76, 77, 76, 74, 72, 71, 67],
    ];
    steps(150, len, (t, bar, s, st) => {
      const ch = chordAt(prog, bar);
      m.add(t, I.synth(ch[s % 3] + 24, st * 0.9, { type: 'square', duty: 0.125, g: 0.07, a: 0.001, d: 0.05, s: 0.5, r: 0.01, cutoff: 7000 }), { pan: -0.3, rev: 0.05 });
      if (s % 2 === 0) m.add(t, I.synth(roots[bar % 4] + (s % 4 === 2 ? 24 : 12), st * 1.8, { type: 'tri', g: 0.45, a: 0.001, r: 0.01 }), { rev: 0 });
      if (s % 2 === 0) {
        const n = lead[bar % 2][s / 2];
        m.add(t, I.synth(n + 12, st * 1.7, { type: 'square', duty: 0.25, g: 0.12, a: 0.002, d: 0.08, s: 0.7, r: 0.02, cutoff: 7000, vib: 0.004 }), { pan: 0.2, rev: 0.1 });
      }
      if (s === 0 || s === 8 || s === 10) m.kick(t, 0.6, 1.3);
      if (s === 4 || s === 12) m.add(t, I.chipNoise(0.35, 18), { rev: 0.05 });
      if (s % 2 === 0) m.add(t, I.chipNoise(0.08, 90), { pan: 0.3 });
    });
  },

  'before-after-funk'(m, len, tl) {
    const reveal = tl.scenes.reveal;
    // BEFORE: out-of-tune, sad music box, muffled
    const sad = [69, 72, 71, 67, 69, 64, 65, 64, 62, 64];
    sad.forEach((n, i) => {
      const t = 0.2 + i * 0.45;
      if (t < reveal - 0.3) m.add(t, I.bell(n + 12 + (rand() - 0.5) * 0.6, 1.5, 0.12), { rev: 0.5, pan: 0.1 });
    });
    for (let t = 0; t < reveal - 0.5; t += 1.8) for (const n of [45, 48, 52]) m.add(t, I.synth(n - 0.25, 1.8, { voices: 3, cutoff: 500, a: 0.3, r: 0.5, g: 0.12 }), { rev: 0.3 });
    m.add(reveal - 0.8, I.riser(0.8, 0.5), { rev: 0.3 });
    // AFTER: bright funk vamp (Em9 → A13)
    const vamp = [[64, 67, 71, 74, 78], [61, 66, 67, 71, 73]];
    const bassline = [40, 0, 52, 40, 0, 47, 0, 50, 40, 0, 52, 0, 45, 47, 0, 43];
    steps(112, len, (t, bar, s, st) => {
      const ch = vamp[bar % 2];
      if ([0, 3, 10].includes(s)) m.kick(t, 0.85);
      if (s === 4 || s === 12) m.add(t, I.snare(0.55), { rev: 0.2 });
      m.add(t, I.hat(s % 2 === 0 ? 0.22 : 0.12), { pan: 0.3 });
      if (bassline[s]) m.add(t, I.pluck(bassline[s] + (bar % 2 ? 5 : 0), st * 1.5, 0.7, 0.55), { rev: 0 });
      if ([2, 5, 7, 10, 13].includes(s)) ch.forEach((n, k) => m.add(t + k * 0.006, I.pluck(n, st * 0.8, 0.12, 0.9), { sc: true, pan: -0.3 + k * 0.12, rev: 0.2 }));
      if (s === 0 && bar % 2 === 0) for (const n of [76, 79, 83]) m.add(t, I.synth(n, st * 6, { voices: 3, cutoff: 3000, env: 1, g: 0.12, r: 0.2 }), { rev: 0.4, pan: 0.3 });
    }, reveal);
  },
};

TRACKS['ceremony-epic'] = (m, len, tl) => {
  const reveal = tl.scenes.reveal;
  const rollup = tl.scenes.rollup;
  // Mysterious minor pads + heartbeat timpani until the reveal.
  const dark = [[45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 58], [40, 47, 52, 56]];
  for (let bar = 0, t = 0; t < reveal; bar++, t += 2.4) {
    for (const n of dark[bar % 4]) m.add(t, I.synth(n, 2.4, { voices: 5, cutoff: 1100, a: 0.6, r: 0.8, g: 0.16, vib: 0.003 }), { rev: 0.6 });
    m.add(t, I.timpani(33, 0.6), { rev: 0.4 });
    m.add(t + 0.35, I.timpani(33, 0.35), { rev: 0.4 });
  }
  // Timpani roll building into the reveal.
  const roll0 = Math.max(0, reveal - 0.2);
  const land = reveal + (tl.revealLand ?? 2.4);
  for (let t = roll0; t < land; t += 0.07) m.add(t, I.timpani(38, 0.15 + 0.6 * ((t - roll0) / (land - roll0))), { rev: 0.3 });
  m.add(land - 1.2, I.riser(1.2, 0.5), { rev: 0.4 });
  // Triumphant hit and heroic major progression after the reveal.
  m.add(land, I.timpani(33, 1), { rev: 0.5 });
  const hero = [[48, 55, 60, 64, 67], [43, 50, 55, 59, 62], [45, 52, 57, 60, 64], [41, 48, 53, 57, 60]];
  steps(92, len, (t, bar, st16, st) => {
    const ch = hero[bar % 4];
    if (st16 === 0) for (const n of ch) m.add(t, I.synth(n, st * 16, { voices: 5, cutoff: 3200, a: 0.05, r: 0.6, g: 0.14 }), { rev: 0.5 });
    if (st16 === 0 || st16 === 10) m.add(t, I.timpani(ch[0] - 12, 0.6), { rev: 0.4 });
    if (st16 % 4 === 0) m.add(t, I.snare(0.18, 30), { rev: 0.4 });
    const horn = [72, 0, 76, 79, 0, 76, 74, 0];
    if (st16 % 2 === 0 && horn[st16 / 2] && t > rollup - 0.5) m.add(t, I.synth(horn[st16 / 2], st * 2.5, { voices: 3, cutoff: 2200, a: 0.03, g: 0.15, vib: 0.004, r: 0.2 }), { rev: 0.5, pan: 0.2 });
  }, land);
};

TRACKS['stadium-stomp'] = (m, len) => {
  // "Stomp stomp clap" arena beat with power chords and brass stabs.
  const prog = [[52, 59, 64], [48, 55, 60], [50, 57, 62], [47, 54, 59]];
  steps(120, len, (t, bar, s, st) => {
    const ch = prog[bar % 4];
    if (s === 0 || s === 2 || s === 8 || s === 10) m.kick(t, 0.95, 0.8);
    if (s === 4 || s === 12) m.add(t, I.clap(1), { rev: 0.4 });
    if (s % 2 === 0) m.add(t, I.hat(0.18), { pan: 0.3 });
    if (s % 2 === 0) for (const n of [ch[0] - 12, ch[1] - 12]) m.add(t, I.synth(n, st * 1.8, { voices: 3, cutoff: 1800, env: 1, g: 0.2, r: 0.04 }), { sc: true, rev: 0.1 });
    if (s === 0 || s === 6) for (const n of ch) m.add(t, I.synth(n + 12, st * 2.5, { voices: 5, cutoff: 3500, env: 1.5, g: 0.13, r: 0.15 }), { rev: 0.4, pan: -0.2 });
    if (s === 14 && bar % 2 === 1) for (let k = 0; k < 4; k++) m.add(t + k * st * 0.25, I.snare(0.25 + k * 0.08), { rev: 0.3 });
  });
};

TRACKS['gameshow-swing'] = (m, len, tl) => {
  // Swingy big-band-ish loop, drum roll during the wheel, fanfare on the win.
  const prog = [[60, 64, 67, 70], [65, 69, 72, 75], [60, 64, 67, 70], [67, 71, 74, 77]];
  const walk = [[36, 40, 43, 45], [41, 45, 48, 50], [36, 40, 43, 44], [43, 47, 50, 49]];
  const spinStart = tl.scenes.spin;
  const land = spinStart + (tl.spinLand ?? 5);
  steps(132, len, (t, bar, s, st) => {
    const sw = s % 4 === 2 ? st * 0.35 : 0;
    const ch = prog[bar % 4];
    if (t > spinStart + 1.2 && t < land) return; // wheel spins over the drum roll
    if (s % 4 === 0) m.add(t, I.pluck(walk[bar % 4][s / 4], st * 3.5, 0.6, 0.35), { rev: 0.05 });
    if (s % 4 === 0) m.add(t, I.hat(0.2, s % 8 === 4), { pan: 0.3 });
    if (s % 4 === 2) m.add(t + sw, I.hat(0.14), { pan: 0.3 });
    if (s === 4 || s === 12) m.add(t, I.snare(0.35), { rev: 0.25 });
    if (s === 0 || s === 8) m.kick(t, 0.6);
    if (s === 6 || s === 14) for (const n of ch) m.add(t + sw, I.synth(n, st * 1.5, { voices: 3, cutoff: 2600, env: 1, g: 0.14, a: 0.01, r: 0.08 }), { rev: 0.3, pan: -0.15 });
  });
  for (let t = spinStart + 1.2; t < land; t += 0.045) m.add(t, I.snare(0.12 + 0.35 * ((t - spinStart) / (land - spinStart)), 45), { rev: 0.2 });
  m.add(land, I.timpani(36, 0.9), { rev: 0.4 });
  [[60, 64, 67], [64, 67, 72], [67, 72, 76, 79]].forEach((ch, i) =>
    ch.forEach((n) => m.add(land + i * 0.18, I.synth(n + 12, i === 2 ? 1.2 : 0.16, { voices: 3, cutoff: 3500, a: 0.01, g: 0.16, r: 0.3 }), { rev: 0.45 })),
  );
};

/* ── Cartoon story tracks (added 2026-09-25) ── */

TRACKS['playful-pizz'] = (m, len) => {
  // Pizzicato strings + glockenspiel, bouncy classroom feel.
  const prog = [[65, 69, 72], [70, 74, 77], [72, 76, 79], [65, 69, 72]];
  const roots = [41, 46, 48, 41];
  const mel = [77, 76, 74, 72, 74, 76, 77, 79];
  steps(120, len, (t, bar, s, st) => {
    const ch = prog[bar % 4];
    if (s % 4 === 0) m.add(t, I.pluck(roots[bar % 4], st * 2, 0.55, 0.35), { rev: 0.1 });
    if (s % 4 === 2) m.add(t, I.pluck(roots[bar % 4] + 7, st * 2, 0.4, 0.35), { rev: 0.1 });
    if (s % 2 === 0) m.add(t, I.pluck(ch[(s / 2) % 3] + 12, st * 1.5, 0.22, 0.6), { pan: -0.25, rev: 0.25 });
    if (s % 4 === 0 && bar % 2 === 1) m.add(t, I.bell(mel[(s / 4 + bar * 4) % 8] + 12, 0.7, 0.08), { pan: 0.35, rev: 0.4 });
    if (s === 4 || s === 12) m.add(t, I.snap(0.35), { rev: 0.2 });
    if (s === 0 || s === 8) m.kick(t, 0.45);
    if (s % 2 === 1) m.add(t, I.shaker(0.07), { pan: 0.3 });
  });
};

TRACKS['sneaky-tiptoe'] = (m, len) => {
  // Staccato minor walking bass + tiptoe clarinet-ish line.
  const walk = [45, 48, 52, 51, 50, 53, 57, 56];
  const mel = [69, 0, 72, 0, 71, 0, 68, 0, 69, 72, 76, 0, 75, 0, 0, 0];
  steps(112, len, (t, bar, s, st) => {
    if (s % 2 === 0) m.add(t, I.pluck(walk[(s / 2 + bar * 8) % 8] - 12, st * 0.9, 0.6, 0.3), { rev: 0.08 });
    const n = mel[s];
    if (n && bar % 2 === 0) m.add(t, I.synth(n, st * 0.8, { type: 'square', duty: 0.35, cutoff: 1800, a: 0.01, d: 0.1, s: 0.4, g: 0.12, r: 0.05 }), { pan: 0.25, rev: 0.3 });
    if (n && bar % 2 === 1) m.add(t, I.marimba(n + 12, st, 0.2), { pan: -0.25, rev: 0.3 });
    if (s === 4 || s === 12) m.add(t, I.snap(0.3), { rev: 0.2 });
    if (s % 4 === 2) m.add(t, I.hat(0.1), { pan: 0.3 });
  });
};

TRACKS['cozy-jazz'] = (m, len) => {
  // Brushed jazz trio: e-piano comping, upright-ish bass, brushes.
  const prog = [[62, 65, 69, 72], [67, 71, 74, 77], [60, 64, 67, 71], [57, 60, 64, 67]];
  const walk = [[38, 41, 45, 43], [43, 47, 50, 49], [36, 40, 43, 44], [33, 36, 40, 37]];
  steps(96, len, (t, bar, s, st) => {
    const sw = s % 4 === 2 ? st * 0.33 : 0;
    const ch = prog[bar % 4];
    if (s % 4 === 0) m.add(t, I.pluck(walk[bar % 4][s / 4], st * 3.8, 0.55, 0.25), { rev: 0.08 });
    if (s === 6 || s === 12) ch.forEach((n, k) => m.add(t + sw + k * 0.012, I.epiano(n, st * 3, 0.13), { rev: 0.35, pan: -0.1 + k * 0.07 }));
    const bp = svf('bp');
    if (s % 2 === 0) {
      const b = buf(0.18);
      for (let i = 0; i < b.length; i++) b[i] = bp(noise(), 4000, 0.8) * Math.exp(-(i / SR) * 18) * 0.25;
      m.add(t + (s % 4 === 2 ? sw : 0), b, { pan: 0.3, rev: 0.1 });
    }
    if (s === 4 || s === 12) m.add(t, I.snare(0.12, 14), { rev: 0.3 });
  });
};

TRACKS['pizza-funk'] = (m, len, tl) => {
  // Clavinet-y funk; switches to a bright party groove for the pizza scene.
  const party = tl.scenes.pizza;
  const vamp = [[64, 67, 71, 74], [62, 66, 69, 73]];
  const bass = [40, 0, 40, 43, 0, 45, 0, 47, 40, 0, 52, 0, 50, 0, 47, 45];
  steps(106, len, (t, bar, s, st) => {
    const ch = vamp[bar % 2];
    const hot = t >= party;
    if ([0, 3, 10].includes(s)) m.kick(t, 0.8);
    if (s === 4 || s === 12) m.add(t, hot ? I.clap(0.7) : I.snare(0.45), { rev: 0.2 });
    m.add(t, I.hat(s % 2 === 0 ? 0.18 : 0.1, hot && s % 4 === 2), { pan: 0.3 });
    if (bass[s]) m.add(t, I.pluck(bass[s] + (bar % 2 ? -2 : 0), st * 1.4, 0.65, 0.5), { rev: 0 });
    if ([2, 6, 9, 14].includes(s)) ch.forEach((n, k) => m.add(t + k * 0.005, I.pluck(n, st * 0.6, 0.12, 0.95), { sc: true, pan: -0.3 + k * 0.15, rev: 0.15 }));
    if (hot && s % 8 === 0) for (const n of [76, 79, 83]) m.add(t, I.synth(n, st * 3, { voices: 3, cutoff: 3200, env: 1, g: 0.12, r: 0.15 }), { rev: 0.35, pan: 0.3 });
  });
};

TRACKS['assembly-anthem'] = (m, len, tl) => {
  // Marching-band stadium anthem that lifts when Tide wins.
  const win = tl.scenes.win;
  const prog = [[55, 59, 62], [60, 64, 67], [62, 66, 69], [55, 59, 62]];
  steps(116, len, (t, bar, s, st) => {
    const ch = prog[bar % 4];
    const big = t >= win;
    if (s % 4 === 0) m.kick(t, 0.8, 0.9);
    if (s % 2 === 0) m.add(t, I.snare(s % 4 === 2 ? 0.35 : 0.15, 30), { rev: 0.25 });
    if (s === 0) m.add(t, I.timpani(ch[0] - 12, 0.6), { rev: 0.4 });
    if (s === 0 || s === 6 || s === 8) for (const n of ch) m.add(t, I.synth(n + (big ? 12 : 0), st * 2.5, { voices: 5, cutoff: big ? 3800 : 2400, env: 1, g: 0.13, r: 0.2 }), { rev: 0.4, pan: -0.15 });
    if (s % 4 === 0) m.add(t, I.synth(ch[0] - 12, st * 3.5, { type: 'saw', cutoff: 800, g: 0.3, r: 0.05 }), { rev: 0.05 });
    if (big && s % 2 === 0) m.add(t, I.bell(ch[(s / 2) % 3] + 24, 0.5, 0.06), { pan: 0.4, rev: 0.4 });
  });
};

TRACKS['warm-acoustic'] = (m, len) => {
  // Gentle fingerpicked guitar + soft pad, heartfelt.
  const prog = [[48, 55, 60, 64, 67], [45, 52, 57, 60, 64], [41, 48, 53, 57, 60], [43, 50, 55, 59, 62]];
  const pick = [0, 2, 3, 4, 1, 3, 2, 4];
  steps(88, len, (t, bar, s, st) => {
    const ch = prog[bar % 4];
    if (s % 2 === 0) m.add(t, I.pluck(ch[pick[s / 2]], st * 4, 0.3, 0.6), { pan: -0.15 + (s % 4) * 0.05, rev: 0.35 });
    if (s === 0) for (const n of ch.slice(1, 4)) m.add(t, I.synth(n + 12, st * 16, { type: 'tri', a: 0.4, r: 0.6, g: 0.06 }), { rev: 0.5 });
    if (s === 0 || s === 10) m.kick(t, 0.35);
    if (s === 8) m.add(t, I.snap(0.2), { rev: 0.35 });
  });
};

const TRACK_VIDEO = {
  'neon-trap': 'rewards-neon',
  'bounce-house': 'rewards-countdown',
  'sunny-pop': 'attendance-clean',
  'news-theme': 'attendance-news',
  'morning-ukulele': 'attendance-scan-in',
  'lofi-book': 'library-storybook',
  'marimba-morning': 'library-texts',
  chiptune: 'classroom-arcade',
  'before-after-funk': 'classroom-before-after',
  'ceremony-epic': 'houses-sorting',
  'stadium-stomp': 'houses-race',
  'gameshow-swing': 'raffle-gameshow',
  'playful-pizz': 'story-classroom-onetap',
  'sneaky-tiptoe': 'story-classroom-hallpass',
  'cozy-jazz': 'story-library-checkout',
  'pizza-funk': 'story-rewards-prizeday',
  'assembly-anthem': 'story-houses-assembly',
  'warm-acoustic': 'story-family-portal',
};

/* ── sound effects ──────────────────────────────────────────────────── */

function sfx() {
  const one = (sec, fill) => {
    const L = new Float32Array(Math.ceil(sec * SR));
    fill(L);
    let peak = 1e-9;
    for (const v of L) peak = Math.max(peak, Math.abs(v));
    for (let i = 0; i < L.length; i++) L[i] = (L[i] / peak) * 0.89;
    return [L, L];
  };
  const put = (L, t, b, g = 1) => {
    const s = Math.round(t * SR);
    for (let i = 0; i < b.length && s + i < L.length; i++) L[s + i] += b[i] * g;
  };
  const out = {
    pop: one(0.12, (L) => {
      let ph = 0;
      for (let i = 0; i < L.length; i++) {
        const t = i / SR;
        ph += (TAU * (300 + 900 * Math.exp(-t * 60))) / SR;
        L[i] = Math.sin(ph) * Math.exp(-t * 40);
      }
    }),
    coin: one(0.45, (L) => {
      put(L, 0, I.synth(83, 0.07, { type: 'square', duty: 0.5, a: 0.001, r: 0.005, cutoff: 7000 }));
      put(L, 0.07, I.synth(88, 0.3, { type: 'square', duty: 0.5, a: 0.001, d: 0.3, s: 0, r: 0.05, cutoff: 7000 }));
    }),
    whoosh: one(0.55, (L) => {
      const bp = svf('bp');
      for (let i = 0; i < L.length; i++) {
        const p = i / L.length;
        L[i] = bp(noise(), 300 + 3500 * Math.sin(Math.PI * p), 1.5) * Math.sin(Math.PI * p) ** 2;
      }
    }),
    impact: one(1.2, (L) => {
      put(L, 0, I.kick(1, 0.8));
      put(L, 0, I.timpani(31, 0.8));
      const lp = svf('lp');
      for (let i = 0; i < L.length; i++) L[i] += lp(noise(), 2000) * Math.exp(-(i / SR) * 9) * 0.6;
    }),
    ding: one(1.4, (L) => put(L, 0, I.bell(88, 1.4))),
    chime: one(2, (L) => {
      put(L, 0, I.bell(84, 1.9));
      put(L, 0.16, I.bell(91, 1.8), 0.8);
    }),
    beep: one(0.4, (L) => {
      put(L, 0, I.synth(91, 0.09, { type: 'square', duty: 0.5, a: 0.002, r: 0.01, cutoff: 5000 }));
      put(L, 0.11, I.synth(96, 0.18, { type: 'square', duty: 0.5, a: 0.002, r: 0.04, cutoff: 5000 }));
    }),
    tick: one(0.06, (L) => {
      for (let i = 0; i < L.length; i++) {
        const t = i / SR;
        L[i] = Math.sin(TAU * 1900 * t) * Math.exp(-t * 140) + noise() * Math.exp(-t * 400) * 0.3;
      }
    }),
    levelup: one(0.9, (L) => {
      [72, 76, 79, 84, 88, 91, 96].forEach((n, i) =>
        put(L, i * 0.055, I.synth(n, i === 6 ? 0.45 : 0.06, { type: 'square', duty: 0.25, a: 0.001, r: 0.02, cutoff: 7000 }), 0.7),
      );
    }),
    buzzer: one(0.9, (L) => {
      for (const [f, g] of [[110, 1], [116.5, 0.8], [220, 0.4]]) put(L, 0, I.synth(45 + 12 * Math.log2(f / 110), 0.8, { type: 'square', duty: 0.5, a: 0.005, r: 0.08, cutoff: 2500 }), g);
    }),
    crowd: one(3, (L) => {
      const bp = svf('bp');
      const bp2 = svf('bp');
      for (let i = 0; i < L.length; i++) {
        const t = i / SR;
        const swell = Math.min(1, t / 0.3) * Math.exp(-Math.max(0, t - 1.2) * 1.6);
        const chatter = 0.6 + 0.4 * Math.sin(TAU * 3.3 * t) * Math.sin(TAU * 1.7 * t + 1);
        L[i] = (bp(noise(), 900 + 300 * Math.sin(TAU * 0.7 * t), 0.8) + 0.5 * bp2(noise(), 2400, 1.2)) * swell * chatter;
        if (rand() < 0.0009 && t < 2) put(L, t, I.clap(0.5), 1);
      }
    }),
    type: one(0.35, (L) => {
      for (const t of [0, 0.09, 0.2]) put(L, t, I.snap(1));
    }),
  };
  for (const [name, stereo] of Object.entries(out)) writeWav(`sfx-${name}`, stereo);
}

/* ── main ───────────────────────────────────────────────────────────── */

const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);
for (const [track, video] of Object.entries(TRACK_VIDEO)) {
  if (only && only !== track) continue;
  const tl = timeline(video);
  const len = tl.total + 2;
  seed = 1234567;
  const m = new Mix(len);
  TRACKS[track](m, len, tl);
  writeWav(track, m.finish(track === 'neon-trap' || track === 'before-after-funk' ? 0.6 : 0.35));
  const wav = path.join(OUT, `${track}.wav`);
  execSync(`npx remotion ffmpeg -y -v error -i "${wav}" -b:a 192k "${wav.replace(/\.wav$/, '.mp3')}"`, { cwd: PROMO });
  fs.unlinkSync(wav);
}
if (!only) sfx();
