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
  | 'redeem';

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

  const playNote = (frequency: number, startTime: number, duration: number, type: OscillatorType = 'triangle', volume: number = 0.1) => {
      // Don't try to play a note if the context is still suspended.
      if (audioCtx.state === 'suspended') return;
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

  const play = async (sound: SoundEffect) => {
    // Crucially, resume the audio context if it's suspended.
    // This must be done in response to a user gesture.
    if (audioCtx.state === 'suspended') {
      try {
        await audioCtx.resume();
      } catch (e) {
        console.error("Could not resume audio context", e);
        return; // Can't play sound if we can't resume
      }
    }

    const now = audioCtx.currentTime;

    switch (sound) {
      case 'hover':
        playNote(1200, now, 0.04, 'square', 0.02);
        break;

      case 'click':
        playNote(800, now, 0.08, 'square', 0.05);
        break;

      case 'login':
      case 'success':
        playNote(523.25, now, 0.1, 'sine'); // C5
        playNote(659.25, now + 0.1, 0.1, 'sine'); // E5
        playNote(783.99, now + 0.2, 0.2, 'sine'); // G5
        break;

      case 'error':
        playNote(164.81, now, 0.15, 'sawtooth', 0.08); // E3
        playNote(155.56, now + 0.15, 0.25, 'sawtooth', 0.08); // D#3
        break;

      case 'swoosh':
        if (audioCtx.state === 'suspended') return;
        const noise = audioCtx.createBufferSource();
        const bufferSize = audioCtx.sampleRate * 0.2; // 0.2 seconds
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
        playNote(587.33, now, 0.1, 'triangle'); // D5
        playNote(698.46, now + 0.1, 0.1, 'triangle'); // F5
        playNote(880.00, now + 0.2, 0.1, 'triangle'); // A5
        playNote(1046.50, now + 0.3, 0.4, 'sine'); // C6
        break;
    }
  };

  return { play };
};

export const useArcadeSound = () => {
  const { settings } = useSettings();
  const synthRef = useRef<ReturnType<typeof createSynth>>(null);

  if (!synthRef.current) {
    (synthRef as any).current = createSynth();
  }

  const playSound = useCallback((sound: SoundEffect) => {
    // Only play sound if it's enabled in settings.
    if (!settings.soundEnabled) return;
    synthRef.current?.play(sound);
  }, [settings.soundEnabled]);

  return playSound;
};
