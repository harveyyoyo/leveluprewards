'use client';

/**
 * Pure Web Audio synthesizer for futuristic classroom sound cues and ambient focus.
 * Zero external mp3 dependencies, instant low-latency playback.
 */

export type ClassroomSoundName =
  | 'attention_gong'
  | 'victory_fanfare'
  | 'drumroll'
  | 'applause'
  | 'warp_speed'
  | 'idea_spark'
  | 'timer_end'
  | 'timer_tick';

export type ClassroomAmbientName = 'cosmic_hum' | 'alpha_waves' | 'rain_drift';

let sharedAudioContext: AudioContext | null = null;
let currentAmbientNode: { stop: () => void } | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioContext) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      sharedAudioContext = new AudioCtx();
    }
  }
  if (sharedAudioContext && sharedAudioContext.state === 'suspended') {
    void sharedAudioContext.resume();
  }
  return sharedAudioContext;
}

function playSynthTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  type: OscillatorType = 'sine',
  gain = 0.08,
) {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gainNode.gain.setValueAtTime(gain, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.00001, startTime + duration);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

export function playClassroomSound(name: ClassroomSoundName, volume = 1.0) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const v = Math.max(0.1, Math.min(1.0, volume));

  switch (name) {
    case 'attention_gong': {
      // Resonant harmonic Tibetan/singing bowl gong (peaceful attention)
      const baseFreq = 261.63; // Middle C
      playSynthTone(ctx, baseFreq, now, 2.8, 'sine', 0.12 * v);
      playSynthTone(ctx, baseFreq * 2.02, now + 0.02, 2.2, 'sine', 0.06 * v);
      playSynthTone(ctx, baseFreq * 3.01, now + 0.04, 1.6, 'sine', 0.03 * v);
      playSynthTone(ctx, baseFreq * 4.76, now + 0.06, 1.2, 'triangle', 0.02 * v);
      break;
    }
    case 'victory_fanfare': {
      // Triumphant 5-tone ascending victory fanfare
      const notes = [392.0, 523.25, 659.25, 783.99, 1046.5]; // G4, C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const time = now + idx * 0.11;
        const dur = idx === notes.length - 1 ? 0.8 : 0.18;
        playSynthTone(ctx, freq, time, dur, 'triangle', 0.08 * v);
        playSynthTone(ctx, freq * 1.002, time, dur, 'sine', 0.06 * v);
      });
      break;
    }
    case 'drumroll': {
      // Suspense building drumroll & chime reveal
      for (let i = 0; i < 16; i++) {
        const step = i * 0.07;
        const freq = 120 + i * 8;
        playSynthTone(ctx, freq, now + step, 0.08, 'triangle', (0.02 + i * 0.005) * v);
      }
      playSynthTone(ctx, 880, now + 1.2, 0.6, 'sine', 0.1 * v);
      playSynthTone(ctx, 1320, now + 1.25, 0.5, 'sine', 0.08 * v);
      break;
    }
    case 'applause': {
      // Warm cheer / wave
      for (let i = 0; i < 8; i++) {
        const jitterTime = now + (i * 0.09) + (Math.random() * 0.04);
        playSynthTone(ctx, 400 + Math.random() * 300, jitterTime, 0.14, 'triangle', 0.04 * v);
        playSynthTone(ctx, 800 + Math.random() * 400, jitterTime, 0.16, 'sine', 0.03 * v);
      }
      break;
    }
    case 'warp_speed': {
      // Futuristic sci-fi transition swoosh
      playSynthTone(ctx, 180, now, 0.35, 'sawtooth', 0.03 * v);
      playSynthTone(ctx, 440, now + 0.08, 0.35, 'triangle', 0.05 * v);
      playSynthTone(ctx, 880, now + 0.16, 0.45, 'sine', 0.07 * v);
      playSynthTone(ctx, 1760, now + 0.24, 0.55, 'sine', 0.06 * v);
      break;
    }
    case 'idea_spark': {
      // Bright sparkling crystal chime
      playSynthTone(ctx, 987.77, now, 0.18, 'sine', 0.06 * v);
      playSynthTone(ctx, 1318.51, now + 0.08, 0.25, 'sine', 0.07 * v);
      playSynthTone(ctx, 1975.53, now + 0.16, 0.45, 'sine', 0.09 * v);
      break;
    }
    case 'timer_end': {
      // Celebratory time's up chime
      playSynthTone(ctx, 523.25, now, 0.22, 'sine', 0.08 * v);
      playSynthTone(ctx, 659.25, now + 0.12, 0.22, 'sine', 0.08 * v);
      playSynthTone(ctx, 783.99, now + 0.24, 0.22, 'sine', 0.08 * v);
      playSynthTone(ctx, 1046.5, now + 0.38, 0.85, 'sine', 0.12 * v);
      playSynthTone(ctx, 1318.51, now + 0.44, 0.75, 'sine', 0.09 * v);
      break;
    }
    case 'timer_tick': {
      // Gentle subtle soft tick
      playSynthTone(ctx, 800, now, 0.03, 'sine', 0.02 * v);
      break;
    }
  }
}

/**
 * Starts continuous ambient focus soundscapes.
 */
export function startClassroomAmbient(name: ClassroomAmbientName, volume = 0.4): { stop: () => void } | null {
  stopClassroomAmbient();
  const ctx = getAudioContext();
  if (!ctx) return null;

  try {
    const v = Math.max(0.05, Math.min(1.0, volume));
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.05 * v, ctx.currentTime + 1.2);
    gainNode.connect(ctx.destination);

    if (name === 'alpha_waves') {
      // Gentle binaural beat (calm focus: 216Hz and 220Hz -> 4Hz alpha pulse)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(216, ctx.currentTime);
      osc2.frequency.setValueAtTime(220, ctx.currentTime);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      osc1.start();
      osc2.start();

      const stop = () => {
        try {
          gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
          setTimeout(() => {
            try {
              osc1.stop();
              osc2.stop();
              osc1.disconnect();
              osc2.disconnect();
            } catch {
              /* ignore */
            }
          }, 900);
        } catch {
          /* ignore */
        }
      };

      currentAmbientNode = { stop };
      return currentAmbientNode;
    } else {
      // Cosmic hum: Filtered warm white/pink noise
      const bufferSize = ctx.sampleRate * 3;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        data[i] = (b0 + b1 + b2) * 0.12;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(name === 'rain_drift' ? 650 : 380, ctx.currentTime);

      noiseSource.connect(filter);
      filter.connect(gainNode);
      noiseSource.start();

      const stop = () => {
        try {
          gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
          setTimeout(() => {
            try {
              noiseSource.stop();
              noiseSource.disconnect();
            } catch {
              /* ignore */
            }
          }, 900);
        } catch {
          /* ignore */
        }
      };

      currentAmbientNode = { stop };
      return currentAmbientNode;
    }
  } catch (err) {
    console.warn('[classroomSoundSynth] Ambient start error:', err);
    return null;
  }
}

export function stopClassroomAmbient() {
  if (currentAmbientNode) {
    currentAmbientNode.stop();
    currentAmbientNode = null;
  }
}

export function isClassroomAmbientPlaying(): boolean {
  return currentAmbientNode !== null;
}
