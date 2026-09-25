import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpeechToText } from './useSpeechToText';

let lastInstance: FakeSpeechRecognition | null = null;

/** A tiny stand-in for the browser's SpeechRecognition, just enough to drive the hook. */
class FakeSpeechRecognition {
  lang = '';
  continuous = false;
  interimResults = false;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn(() => this.onend?.());
  abort = vi.fn();

  constructor() {
    lastInstance = this;
  }
}

describe('useSpeechToText', () => {
  beforeEach(() => {
    lastInstance = null;
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = FakeSpeechRecognition;
  });

  afterEach(() => {
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
  });

  it('reports unsupported when neither constructor exists', () => {
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    const { result } = renderHook(() => useSpeechToText(() => {}));
    expect(result.current.supported).toBe(false);
  });

  it('reports supported and starts listening', () => {
    const { result } = renderHook(() => useSpeechToText(() => {}));
    expect(result.current.supported).toBe(true);

    act(() => result.current.start());
    expect(result.current.listening).toBe(true);
    expect(lastInstance?.start).toHaveBeenCalled();
  });

  it('passes the combined transcript from every result seen so far', () => {
    const onSpeaking = vi.fn();
    const { result } = renderHook(() => useSpeechToText(onSpeaking));

    act(() => result.current.start());
    act(() => {
      lastInstance?.onresult?.({
        results: [{ 0: { transcript: 'hello ' }, isFinal: false }],
      });
    });
    expect(onSpeaking).toHaveBeenCalledWith('hello', false);
  });

  it('tells the caller when the microphone is blocked', () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useSpeechToText(() => {}));

    act(() => result.current.start(onError));
    act(() => {
      lastInstance?.onerror?.({ error: 'not-allowed' });
    });
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('blocked'));
    expect(result.current.listening).toBe(false);
  });

  it('stops the recognizer on stop()', () => {
    const { result } = renderHook(() => useSpeechToText(() => {}));
    act(() => result.current.start());
    act(() => result.current.stop());
    expect(lastInstance?.stop).toHaveBeenCalled();
    expect(result.current.listening).toBe(false);
  });
});
