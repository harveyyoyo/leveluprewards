'use client';

import { useCallback, useRef } from 'react';
import { useSettings } from '@/components/providers/SettingsProvider';

export type SoundEffect =
  | 'login'
  | 'success'
  | 'error'
  | 'click'
  | 'hover'
  | 'swoosh'
  | 'redeem'
  | 'trash'
  /** Classroom seating — soft tap (independent of kiosk success/redeem). */
  | 'classroom_tap'
  | 'classroom_award'
  | 'classroom_big_award'
  | 'classroom_deduct';

export type AudioThemeId = 'retro_arcade' | 'modern_chime' | 'sci_fi_synth';

const createSynth = () => {
  if (typeof window === 'undefined') return null;

  // Use a singleton pattern for AudioContext to avoid creating multiple instances.
  if (!(window as any).__audioCtx) {
    try {
      (window as any).__audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.error("Web Audio API is not supported in this browser.", e);
      return null;
    }
  }
  const audioCtx: AudioContext = (window as any).__audioCtx;

  const playNote = (
    frequency: number,
    startTime: number,
    duration: number,
    type: OscillatorType = 'triangle',
    volume: number = 0.1
  ) => {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    gainNode.gain.setValueAtTime(volume, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  };

  const play = async (sound: SoundEffect, theme: AudioThemeId = 'retro_arcade') => {
    // Crucially, resume the audio context if it's suspended.
    if (audioCtx.state === 'suspended') {
      try {
        await audioCtx.resume();
      } catch (e) {
        console.error("Could not resume audio context", e);
        return;
      }
    }

    const now = audioCtx.currentTime;

    // Classroom point sounds — warm chimes (same on all themes; not harsh arcade blips).
    switch (sound) {
      case 'classroom_tap':
        playNote(587.33, now, 0.07, 'sine', 0.032);
        break;
      case 'classroom_award':
        playNote(523.25, now, 0.11, 'sine', 0.042);
        playNote(659.25, now + 0.07, 0.11, 'sine', 0.042);
        playNote(783.99, now + 0.14, 0.24, 'sine', 0.045);
        break;
      case 'classroom_big_award':
        playNote(523.25, now, 0.09, 'sine', 0.04);
        playNote(659.25, now + 0.06, 0.09, 'sine', 0.04);
        playNote(783.99, now + 0.12, 0.09, 'sine', 0.04);
        playNote(987.77, now + 0.18, 0.09, 'sine', 0.038);
        playNote(1046.5, now + 0.24, 0.38, 'sine', 0.048);
        break;
      case 'classroom_deduct':
        playNote(440, now, 0.1, 'sine', 0.035);
        playNote(369.99, now + 0.08, 0.18, 'sine', 0.03);
        break;
      default:
        break;
    }
    if (
      sound === 'classroom_tap' ||
      sound === 'classroom_award' ||
      sound === 'classroom_big_award' ||
      sound === 'classroom_deduct'
    ) {
      return;
    }

    // Theme-specific sounds
    if (theme === 'modern_chime') {
      switch (sound) {
        case 'hover':
          playNote(900, now, 0.05, 'sine', 0.02);
          break;
        case 'click':
        case 'trash':
          playNote(600, now, 0.06, 'sine', 0.04);
          break;
        case 'login':
        case 'success':
          playNote(880.00, now, 0.15, 'sine', 0.04); // A5
          playNote(1109.73, now + 0.05, 0.15, 'sine', 0.04); // C#6
          playNote(1318.51, now + 0.1, 0.3, 'sine', 0.04); // E6
          break;
        case 'error':
          playNote(220, now, 0.12, 'sine', 0.06);
          playNote(196, now + 0.08, 0.22, 'sine', 0.06);
          break;
        case 'swoosh':
          if (audioCtx.state === 'suspended') return;
          const noise = audioCtx.createBufferSource();
          const bufferSize = audioCtx.sampleRate * 0.25;
          const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
          noise.buffer = buffer;

          const filter = audioCtx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(4000, now);
          filter.frequency.exponentialRampToValueAtTime(800, now + 0.25);

          const noiseGain = audioCtx.createGain();
          noiseGain.gain.setValueAtTime(0.06, now);
          noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

          noise.connect(filter);
          filter.connect(noiseGain);
          noiseGain.connect(audioCtx.destination);

          noise.start(now);
          noise.stop(now + 0.25);
          break;
        case 'redeem':
          playNote(1046.50, now, 0.08, 'sine', 0.03); // C6
          playNote(1174.66, now + 0.06, 0.08, 'sine', 0.03); // D6
          playNote(1318.51, now + 0.12, 0.08, 'sine', 0.03); // E6
          playNote(1567.98, now + 0.18, 0.08, 'sine', 0.03); // G6
          playNote(2093.00, now + 0.24, 0.4, 'sine', 0.04); // C7
          break;
      }
    } else if (theme === 'sci_fi_synth') {
      switch (sound) {
        case 'hover':
          playNote(1400, now, 0.03, 'sawtooth', 0.015);
          break;
        case 'click':
        case 'trash':
          playNote(700, now, 0.04, 'triangle', 0.04);
          playNote(400, now + 0.02, 0.04, 'sawtooth', 0.02);
          break;
        case 'login':
        case 'success':
          playNote(440, now, 0.08, 'sawtooth', 0.03);
          playNote(554.37, now + 0.06, 0.08, 'sawtooth', 0.03);
          playNote(659.25, now + 0.12, 0.08, 'sawtooth', 0.03);
          playNote(880, now + 0.18, 0.35, 'triangle', 0.04);
          break;
        case 'error':
          playNote(180, now, 0.15, 'sawtooth', 0.06);
          playNote(90, now + 0.08, 0.3, 'sawtooth', 0.08);
          break;
        case 'swoosh':
          if (audioCtx.state === 'suspended') return;
          const noise = audioCtx.createBufferSource();
          const bufferSize = audioCtx.sampleRate * 0.2;
          const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
          noise.buffer = buffer;

          const filter = audioCtx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.Q.setValueAtTime(8, now);
          filter.frequency.setValueAtTime(100, now);
          filter.frequency.exponentialRampToValueAtTime(3000, now + 0.2);

          const noiseGain = audioCtx.createGain();
          noiseGain.gain.setValueAtTime(0.12, now);
          noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

          noise.connect(filter);
          filter.connect(noiseGain);
          noiseGain.connect(audioCtx.destination);

          noise.start(now);
          noise.stop(now + 0.2);
          break;
        case 'redeem':
          playNote(293.66, now, 0.06, 'sawtooth', 0.04);
          playNote(392.00, now + 0.05, 0.06, 'sawtooth', 0.04);
          playNote(587.33, now + 0.10, 0.06, 'sawtooth', 0.04);
          playNote(880.00, now + 0.15, 0.12, 'sawtooth', 0.04);
          playNote(1760.00, now + 0.25, 0.45, 'triangle', 0.05);
          break;
      }
    } else {
      // Classic retro arcade (default)
      switch (sound) {
        case 'hover':
          playNote(1200, now, 0.04, 'square', 0.02);
          break;
        case 'click':
        case 'trash':
          playNote(800, now, 0.08, 'square', 0.05);
          break;
        case 'login':
        case 'success':
          playNote(523.25, now, 0.1, 'sine', 0.08); // C5
          playNote(659.25, now + 0.1, 0.1, 'sine', 0.08); // E5
          playNote(783.99, now + 0.2, 0.2, 'sine', 0.08); // G5
          break;
        case 'error':
          playNote(164.81, now, 0.15, 'sawtooth', 0.08); // E3
          playNote(155.56, now + 0.15, 0.25, 'sawtooth', 0.08); // D#3
          break;
        case 'swoosh':
          if (audioCtx.state === 'suspended') return;
          const noise = audioCtx.createBufferSource();
          const bufferSize = audioCtx.sampleRate * 0.2;
          const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
          noise.buffer = buffer;

          const filter = audioCtx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(2000, now);
          filter.frequency.exponentialRampToValueAtTime(100, now + 0.2);

          const noiseGain = audioCtx.createGain();
          noiseGain.gain.setValueAtTime(0.2, now);
          noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

          noise.connect(filter);
          filter.connect(noiseGain);
          noiseGain.connect(audioCtx.destination);

          noise.start(now);
          noise.stop(now + 0.2);
          break;
        case 'redeem':
          playNote(587.33, now, 0.1, 'triangle', 0.08); // D5
          playNote(698.46, now + 0.1, 0.1, 'triangle', 0.08); // F5
          playNote(880.00, now + 0.2, 0.1, 'triangle', 0.08); // A5
          playNote(1046.50, now + 0.3, 0.4, 'sine', 0.08); // C6
          break;
      }
    }
  };

  return { play };
};

export type UseArcadeSoundOptions = {
  /** When true, plays even if school-wide sounds are off (e.g. classroom award toggle). */
  ignoreSchoolSoundMute?: boolean;
};

export const useArcadeSound = (options?: UseArcadeSoundOptions) => {
  const { settings } = useSettings();
  const synthRef = useRef<ReturnType<typeof createSynth>>(null);

  if (!synthRef.current) {
    (synthRef as any).current = createSynth();
  }

  // Match kiosk profile UI: undefined means "on" (default).
  const soundEnabled = settings.soundEnabled !== false;
  const studentAudioTheme = (settings as any).studentAudioTheme;
  const ignoreSchoolSoundMute = options?.ignoreSchoolSoundMute === true;

  const playSound = useCallback(
    (sound: SoundEffect) => {
      if (!ignoreSchoolSoundMute && !soundEnabled) return;
      void synthRef.current?.play(sound, studentAudioTheme || 'retro_arcade');
    },
    [soundEnabled, studentAudioTheme, ignoreSchoolSoundMute],
  );

  return playSound;
};
