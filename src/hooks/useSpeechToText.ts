'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** One recognized alternative, and the result slot it belongs to (final once `isFinal` is true). */
type SpeechRecognitionAlternativeLike = { transcript: string };
type SpeechRecognitionResultLike = { [index: number]: SpeechRecognitionAlternativeLike; isFinal: boolean };
type SpeechRecognitionEventLike = { results: { length: number; [index: number]: SpeechRecognitionResultLike } };
type SpeechRecognitionErrorEventLike = { error: string };

/**
 * The bits of the browser's built-in speech recognizer we actually use. Not every browser's
 * type library has this (nor, in older TypeScript, does `lib.dom`), so it's typed here just
 * enough to drive it, rather than relying on the global `SpeechRecognition*` types.
 */
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Turns speech into text using the browser's own dictation — nothing is recorded or sent to a
 * server, it all happens on the device. Not every browser has this (Chrome and Edge do; some
 * versions of Safari and Firefox don't), so always check `supported` before showing a mic
 * button.
 *
 * While the mic is on, `onSpeaking` fires on every update with everything said so far *in this
 * one recording* (never combined with text that was already there) — the caller decides where
 * that text goes and how to merge it with what was already typed.
 */
export function useSpeechToText(onSpeaking: (textSoFar: string, isFinal: boolean) => void, lang = 'en-US') {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onSpeakingRef = useRef(onSpeaking);
  onSpeakingRef.current = onSpeaking;

  useEffect(() => {
    setSupported(getSpeechRecognitionCtor() != null);
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(
    (onError?: (message: string) => void) => {
      const Ctor = getSpeechRecognitionCtor();
      if (!Ctor) {
        onError?.('This browser cannot listen for speech. Try typing instead, or use Chrome.');
        return;
      }
      // Only one recording at a time.
      recognitionRef.current?.abort();

      const recognition = new Ctor();
      recognition.lang = lang;
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        let text = '';
        let isFinal = false;
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i]!;
          text += result[0]?.transcript ?? '';
          if (result.isFinal) isFinal = true;
        }
        onSpeakingRef.current(text.trim(), isFinal);
      };
      recognition.onerror = (event) => {
        setListening(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          onError?.('The microphone is blocked. Allow it for this site and try again.');
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
          onError?.('Could not hear you. Try again.');
        }
      };
      recognition.onend = () => setListening(false);

      recognitionRef.current = recognition;
      setListening(true);
      recognition.start();
    },
    [lang],
  );

  // Stop listening if the component using this goes away.
  useEffect(() => () => recognitionRef.current?.abort(), []);

  return { supported, listening, start, stop };
}
