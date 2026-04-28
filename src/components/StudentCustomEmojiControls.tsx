'use client';

import { useRef, useState, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { Button } from '@/components/ui/button';
import { ImagePlus, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getReadableErrorMessage } from '@/lib/errorMessage';

type ThemeColors = { primary?: string };

export function StudentCustomEmojiControls({
  schoolId,
  studentId,
  customEmojiUrl,
  resetTimer,
  activeTheme,
  className,
}: {
  schoolId: string | null | undefined;
  studentId: string;
  customEmojiUrl?: string | null;
  resetTimer: () => void;
  activeTheme?: ThemeColors | null;
  className?: string;
}) {
  const { functions } = useFirebase();
  const { toast } = useToast();
  const playSound = useArcadeSound();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const themedOutline = activeTheme?.primary
    ? {
        borderColor: 'var(--theme-primary)',
        backgroundColor: 'transparent',
        color: 'var(--theme-primary)',
      }
    : undefined;

  const onFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || !schoolId || !functions) return;

      const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
      if (!allowed.includes(file.type)) {
        playSound('error');
        toast({
          variant: 'destructive',
          title: 'Unsupported file',
          description: 'Use PNG, JPG, WebP, or GIF.',
        });
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        playSound('error');
        toast({ variant: 'destructive', title: 'File too large', description: 'Maximum size is 2MB.' });
        return;
      }

      try {
        setBusy(true);
        const imageBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const r = reader.result as string;
            resolve(r.includes(',') ? (r.split(',')[1] || '') : r);
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });

        const uploadStudentCustomEmoji = httpsCallable(functions, 'uploadStudentCustomEmoji');
        const res = await uploadStudentCustomEmoji({
          schoolId,
          studentId,
          imageBase64,
          contentType: file.type || 'image/png',
        });
        const url = (res.data as { customEmojiUrl?: string | null })?.customEmojiUrl;
        if (!url) throw new Error('No URL returned');
        playSound('success');
        toast({ title: 'Emoji saved', description: 'Your sticker will show on your profile and ID card.' });
        resetTimer();
      } catch (err: unknown) {
        console.error('uploadStudentCustomEmoji', err);
        playSound('error');
        toast({
          variant: 'destructive',
          title: 'Upload failed',
          description: getReadableErrorMessage(
            err,
            'Could not upload. Enter the school code on the portal first, then try again.',
          ),
        });
      } finally {
        setBusy(false);
      }
    },
    [schoolId, functions, studentId, toast, playSound, resetTimer],
  );

  const onClear = useCallback(async () => {
    if (!schoolId || !functions) return;
    try {
      setBusy(true);
      const uploadStudentCustomEmoji = httpsCallable(functions, 'uploadStudentCustomEmoji');
      await uploadStudentCustomEmoji({ schoolId, studentId, clear: true });
      playSound('success');
      toast({ title: 'Emoji removed' });
      resetTimer();
    } catch (err: unknown) {
      console.error('clearStudentCustomEmoji', err);
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Could not remove',
        description: getReadableErrorMessage(err, 'Try again in a moment.'),
      });
    } finally {
      setBusy(false);
    }
  }, [schoolId, functions, studentId, toast, playSound, resetTimer]);

  if (!schoolId || !functions) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
        className="sr-only"
        onChange={(ev) => void onFile(ev)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest"
        style={themedOutline}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        aria-label="Upload a picture for your emoji or sticker"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden /> : <ImagePlus className="h-3.5 w-3.5 shrink-0" aria-hidden />}
        My emoji
      </Button>
      {customEmojiUrl ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
          style={activeTheme?.primary ? { color: 'var(--theme-text)', opacity: 0.85 } : undefined}
          disabled={busy}
          onClick={() => void onClear()}
          aria-label="Remove your uploaded emoji"
        >
          <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Remove
        </Button>
      ) : null}
    </div>
  );
}
