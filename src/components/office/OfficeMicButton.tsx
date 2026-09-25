'use client';

import { useRef } from 'react';
import { Mic, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { cn } from '@/lib/utils';

type OfficeMicButtonProps = {
  /** The text already in the box right now — read once when the mic turns on. */
  getValue: () => string;
  /** Sets the box's text: what was already there, plus everything said so far. */
  onChange: (fullText: string) => void;
  className?: string;
};

/**
 * A "speak instead of typing" button for a text box. Uses the browser's own dictation — nothing
 * is recorded or sent anywhere but the text it hears. It quietly doesn't render in browsers that
 * don't support this (some Safari and Firefox versions), so no dead button ever shows up.
 */
export function OfficeMicButton({ getValue, onChange, className }: OfficeMicButtonProps) {
  const { toast } = useToast();
  // What was already typed, captured the moment recording starts, so dictation adds on top of
  // it instead of replacing it.
  const baseRef = useRef('');
  const { supported, listening, start, stop } = useSpeechToText((textSoFar) => {
    const base = baseRef.current;
    onChange(base && textSoFar ? `${base} ${textSoFar}` : base || textSoFar);
  });

  if (!supported) return null;

  const handleClick = () => {
    if (listening) {
      stop();
      return;
    }
    baseRef.current = getValue().trim();
    start((message) => toast({ variant: 'destructive', title: 'Microphone', description: message }));
  };

  return (
    <Button
      type="button"
      variant={listening ? 'destructive' : 'outline'}
      size="sm"
      className={cn('rounded-xl gap-2', className)}
      aria-pressed={listening}
      title={listening ? 'Stop listening' : 'Speak instead of typing'}
      onClick={handleClick}
    >
      {listening ? <Square className="h-3.5 w-3.5 animate-pulse" aria-hidden /> : <Mic className="h-4 w-4" aria-hidden />}
      {listening ? 'Listening… tap to stop' : 'Speak'}
    </Button>
  );
}
