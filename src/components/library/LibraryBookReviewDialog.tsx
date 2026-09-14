'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Sparkles, Send, Check, BookOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useFunctions } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { callLibrary } from '@/lib/library/libraryOperations';
import { DID_NOT_READ_NOTE } from '@/lib/library/libraryStudentRating';

const QUICK_TAGS = [
  'Loved it! ⭐',
  'Page Turner 📖',
  'Very Funny 😂',
  'Learned a lot 💡',
  'Awesome Pictures 🎨',
  'A bit scary 👻',
];

const STAR_LABELS = [
  'Did not enjoy it',
  'Not my favorite',
  'It was okay',
  'Really good book',
  'Loved it! Amazing read',
];

export function LibraryBookReviewDialog({
  isOpen,
  setIsOpen,
  schoolId,
  studentId,
  studentName,
  itemId,
  bookTitle,
  coverUrl,
  onReviewed,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  schoolId: string;
  studentId: string;
  studentName?: string;
  itemId: string;
  bookTitle: string;
  coverUrl?: string;
  onReviewed?: (rating: number) => void;
}) {
  const functions = useFunctions();
  const { toast } = useToast();

  const [rating, setRating] = useState<number | null>(null);
  const [didNotRead, setDidNotRead] = useState(false);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setRating(null);
    setDidNotRead(false);
    setHoverRating(null);
    setSelectedTags([]);
    setComment('');
    setBusy(false);
    setSubmitted(false);
  }, [isOpen, itemId]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]));
  };

  const shownStars = hoverRating ?? rating ?? 0;

  const handleSubmit = async () => {
    if (!itemId || !studentId || busy) return;
    if (!didNotRead && rating == null) return;
    setBusy(true);

    try {
      const fullReview = didNotRead
        ? DID_NOT_READ_NOTE
        : [selectedTags.join(', '), comment.trim()].filter(Boolean).join('\n');

      const result = await callLibrary<{ alreadyReviewed?: boolean; didNotRead?: boolean; message?: string }>(
        functions,
        'libraryCirculation',
        {
          schoolId,
          action: 'review',
          itemId,
          studentId,
          studentName,
          rating: didNotRead ? 0 : rating,
          didNotRead,
          reviewText: fullReview,
        },
      );

      if (result.alreadyReviewed) {
        toast({
          title: 'You already rated this book',
          description: 'Thanks — we already saved your answer.',
        });
        setIsOpen(false);
        return;
      }

      setSubmitted(true);
      toast({
        title: didNotRead ? 'Got it' : 'Thanks for the stars!',
        description: didNotRead
          ? 'We will not count this as a rating.'
          : 'You earned +5 bonus reading points.',
      });
      onReviewed?.(didNotRead ? 0 : rating!);
      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
      }, 1500);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not save your answer',
        description: (err as Error).message,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md text-center">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-1 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-500">
            <Sparkles className="h-7 w-7" />
          </div>
          <DialogTitle className="text-xl">How was “{bookTitle || 'this book'}”?</DialogTitle>
          <DialogDescription>
            Tap the stars, or say you did not get a chance to read it. This helps us pick books for you next time.
          </DialogDescription>
        </DialogHeader>

        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt=""
            className="mx-auto h-24 w-16 rounded-md border object-cover shadow-sm"
          />
        ) : null}

        {submitted ? (
          <div className="space-y-3 py-8 duration-200 animate-in zoom-in-95">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600">
              <Check className="h-8 w-8 stroke-[3]" />
            </div>
            <h4 className="text-lg font-bold text-foreground">
              {didNotRead ? 'Got it — thanks!' : 'Thanks for rating!'}
            </h4>
            {!didNotRead ? (
              <Badge className="bg-amber-500 px-3 py-1 font-black text-white hover:bg-amber-500">
                +5 Reading Points Added
              </Badge>
            ) : (
              <p className="text-sm text-muted-foreground">We will not count this as a rating.</p>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-2 text-left">
            <div className="flex flex-col items-center justify-center gap-1.5 py-2">
              <motion.div
                className="flex items-center gap-2"
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.06 } },
                }}
              >
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = shownStars >= star;
                  return (
                    <motion.button
                      key={star}
                      type="button"
                      aria-label={`${star} star${star === 1 ? '' : 's'}`}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => {
                        setDidNotRead(false);
                        setRating(star);
                      }}
                      className="p-1 focus:outline-none"
                      variants={{
                        hidden: { opacity: 0, y: 8, scale: 0.8 },
                        show: {
                          opacity: 1,
                          y: 0,
                          scale: 1,
                          transition: { type: 'spring', stiffness: 420, damping: 22 },
                        },
                      }}
                      whileTap={{ scale: 1.18 }}
                    >
                      <Star
                        className={`h-10 w-10 transition-colors ${
                          active
                            ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
                            : 'fill-muted/40 text-muted-foreground/40'
                        }`}
                      />
                    </motion.button>
                  );
                })}
              </motion.div>
              <span className="text-xs font-bold text-muted-foreground">
                {didNotRead
                  ? DID_NOT_READ_NOTE
                  : rating == null
                    ? 'Tap the stars'
                    : STAR_LABELS[rating - 1]}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setDidNotRead(true);
                setRating(null);
                setHoverRating(null);
              }}
              className={`flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition-all ${
                didNotRead
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border/80 bg-background text-foreground hover:bg-muted/60'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              I didn&apos;t get a chance to read it
            </button>

            {!didNotRead ? (
              <>
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">Quick reactions:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_TAGS.map((tag) => {
                      const selected = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`rounded-full border px-2.5 py-1 text-xs transition-all ${
                            selected
                              ? 'border-primary bg-primary font-bold text-primary-foreground shadow-sm'
                              : 'border-border/80 bg-background text-foreground hover:bg-muted/60'
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">A short note (optional):</span>
                  <Textarea
                    placeholder="What did you think of the story, characters, or facts?"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={500}
                    className="h-20 resize-none rounded-xl text-xs"
                  />
                </div>
              </>
            ) : null}
          </div>
        )}

        {!submitted && (
          <DialogFooter className="mt-2 flex-row justify-between gap-2 sm:justify-between">
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} disabled={busy}>
              Skip
            </Button>
            <Button
              size="sm"
              onClick={() => void handleSubmit()}
              disabled={busy || (!didNotRead && rating == null)}
              className="gap-1.5 rounded-xl font-bold"
            >
              <Send className="h-3.5 w-3.5" />
              {didNotRead ? 'Save' : 'Save my stars (+5 pts)'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
