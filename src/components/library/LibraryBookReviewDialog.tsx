'use client';

import { useState } from 'react';
import { Star, Sparkles, Heart, ThumbsUp, Send, Check } from 'lucide-react';
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

const QUICK_TAGS = [
  'Loved it! ⭐',
  'Page Turner 📖',
  'Very Funny 😂',
  'Learned a lot 💡',
  'Awesome Pictures 🎨',
  'A bit scary 👻',
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

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]));
  };

  const handleSubmit = async () => {
    if (!itemId || !studentId || busy) return;
    setBusy(true);

    try {
      const fullReview = [
        selectedTags.join(', '),
        comment.trim(),
      ]
        .filter(Boolean)
        .join('\n');

      await callLibrary(functions, 'libraryCirculation', {
        schoolId,
        action: 'review',
        itemId,
        studentId,
        studentName,
        rating,
        reviewText: fullReview,
      });

      setSubmitted(true);
      toast({
        title: 'Review submitted!',
        description: 'You earned +5 bonus reading points.',
      });
      onReviewed?.(rating);
      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
      }, 1500);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not save review',
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
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-500 mb-1">
            <Sparkles className="h-7 w-7" />
          </div>
          <DialogTitle className="text-xl">How was &ldquo;{bookTitle}&rdquo;?</DialogTitle>
          <DialogDescription>
            Rate this book to help other students choose what to read and earn +5 bonus points!
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-8 space-y-3 animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600">
              <Check className="h-8 w-8 stroke-[3]" />
            </div>
            <h4 className="text-lg font-bold text-foreground">Review Shared!</h4>
            <Badge className="bg-amber-500 hover:bg-amber-500 text-white font-black px-3 py-1">
              +5 Reading Points Added
            </Badge>
          </div>
        ) : (
          <div className="space-y-4 py-2 text-left">
            {/* 5-Star selector */}
            <div className="flex flex-col items-center justify-center gap-1.5 py-2">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map(star => {
                  const active = (hoverRating ?? rating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => setRating(star)}
                      className="p-1 transition-transform hover:scale-125 focus:outline-none"
                    >
                      <Star
                        className={`h-9 w-9 transition-colors ${
                          active
                            ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
                            : 'fill-muted/40 text-muted-foreground/40'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <span className="text-xs font-bold text-muted-foreground">
                {rating === 5
                  ? 'Loved it! Amazing read'
                  : rating === 4
                    ? 'Really good book'
                    : rating === 3
                      ? 'It was okay'
                      : rating === 2
                        ? 'Not my favorite'
                        : 'Did not enjoy it'}
              </span>
            </div>

            {/* Quick tags */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Quick reactions:</span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TAGS.map(tag => {
                  const selected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                        selected
                          ? 'border-primary bg-primary text-primary-foreground font-bold shadow-sm'
                          : 'border-border/80 bg-background hover:bg-muted/60 text-foreground'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional note */}
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground">Short review (optional):</span>
              <Textarea
                placeholder="What did you think of the story, characters, or facts?"
                value={comment}
                onChange={e => setComment(e.target.value)}
                maxLength={500}
                className="h-20 text-xs rounded-xl resize-none"
              />
            </div>
          </div>
        )}

        {!submitted && (
          <DialogFooter className="flex-row justify-between sm:justify-between gap-2 mt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} disabled={busy}>
              Skip
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={busy}
              className="gap-1.5 font-bold rounded-xl"
            >
              <Send className="h-3.5 w-3.5" />
              Submit Review (+5 pts)
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
