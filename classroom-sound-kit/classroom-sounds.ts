// ============================================================
// Classroom Sound Kit — tiny Web Audio sound engine
// No dependencies, no audio files. Drop this file anywhere in
// your project and import it.
// ============================================================

// Four built-in styles. Add your own by following the same shape:
// wave = oscillator type, pitch = frequency multiplier,
// dur = duration multiplier, vol = volume multiplier.
export const SOUND_STYLES = {
  Soft:   { wave: "sine",     pitch: 1,    dur: 1,   vol: 1   },
  Arcade: { wave: "square",   pitch: 1.3,  dur: 0.7, vol: 0.35 },
  Wood:   { wave: "triangle", pitch: 0.55, dur: 0.6, vol: 1.4 },
  Bubbly: { wave: "sine",     pitch: 1.9,  dur: 1.4, vol: 0.9 },
};

export type SoundStyle = keyof typeof SOUND_STYLES;

let audioCtx: AudioContext | null = null;
let lastTick = 0;
let masterVolume = 0.7;      // 0..1
let enabled = true;          // master on/off
let currentStyle: SoundStyle = "Soft";

/** Configure the engine. Call this whenever settings change. */
export function configureSound(opts: {
  enabled?: boolean;
  volume?: number;         // 0..100 (percent)
  style?: SoundStyle;
}) {
  if (opts.enabled !== undefined) enabled = opts.enabled;
  if (opts.volume !== undefined) masterVolume = enabled ? opts.volume / 100 : 0;
  if (opts.style !== undefined) currentStyle = opts.style;
}

function tone(from: number, to: number, dur: number, vol: number, delay = 0) {
  if (!enabled) return;
  const st = SOUND_STYLES[currentStyle] ?? SOUND_STYLES.Soft;
  from *= st.pitch;
  to *= st.pitch;
  dur *= st.dur;
  vol *= st.vol;
  try {
    audioCtx ??= new AudioContext();
    if (audioCtx.state === "suspended") void audioCtx.resume();
    const t = audioCtx.currentTime + delay * st.dur;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = st.wave as OscillatorType;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t + dur);
    gain.gain.setValueAtTime(vol * masterVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + dur);
  } catch {
    /* audio not available — stay silent */
  }
}

export type SoundKind =
  | "pop"     // picking a theme / opening something
  | "tick"    // small adjustments (sliders, selects) — throttled
  | "toggle"  // on/off switches, two-note chime
  | "reset"   // reset / undo, descending tone
  | "success" // saved / completed, rising arpeggio
  | "error";  // something went wrong, low buzz

/** Play a named sound. Safe to call anywhere in a click/change handler. */
export function playSound(kind: SoundKind) {
  if (!enabled) return;
  if (kind === "pop") tone(480, 760, 0.12, 0.08);
  else if (kind === "tick") {
    const now = performance.now();
    if (now - lastTick < 60) return;
    lastTick = now;
    tone(1100, 900, 0.05, 0.04);
  } else if (kind === "toggle") {
    tone(523, 523, 0.06, 0.06);
    tone(784, 784, 0.09, 0.06, 0.07);
  } else if (kind === "reset") {
    tone(700, 380, 0.16, 0.07);
  } else if (kind === "success") {
    tone(523, 523, 0.08, 0.06);
    tone(659, 659, 0.08, 0.06, 0.08);
    tone(784, 784, 0.12, 0.06, 0.16);
  } else if (kind === "error") {
    tone(220, 180, 0.18, 0.08);
  }
}

/**
 * Optional: make EVERY button/link/input click on the page blip,
 * so even content rendered by other components makes sound.
 * Call once after app mount, e.g. attachClickSounds(true).
 */
export function attachClickSounds(on: boolean) {
  if (typeof document === "undefined") return;
  const handler = (e: PointerEvent) => {
    if (!on || !enabled) return;
    const now = Date.now();
    if (now - lastTick < 40) return;
    lastTick = now;
    const el = (e.target as HTMLElement | null)?.closest(
      "button,[role=button],a,input,select,label"
    );
    if (!el) return tone(300, 180, 0.08, 0.05);
    const big = (el as HTMLElement).offsetWidth > 140;
    tone(big ? 520 : 680, big ? 320 : 900, 0.09, 0.07);
  };
  document.removeEventListener("pointerdown", handler, true);
  if (on) document.addEventListener("pointerdown", handler, true);
}
