'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LibraryBookCover } from './LibraryBookCover';

export type LibraryAiGuessPreview = {
  title: string;
  author?: string;
  isbn?: string;
  coverUrl?: string;
  publishedYear?: string;
  readingLevel?: string;
  description?: string;
  pageCount?: number;
};

const listMotion = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

const itemMotion = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 320, damping: 24 },
  },
};

export function LibraryAiGuessConfirmDialog({
  open,
  guess,
  remainingCount = 0,
  onOpenChange,
  onConfirm,
  onReject,
}: {
  open: boolean;
  guess: LibraryAiGuessPreview | null;
  remainingCount?: number;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onReject: () => void;
}) {
  const [showMore, setShowMore] = useState(false);
  useEffect(() => {
    setShowMore(false);
  }, [guess?.isbn, guess?.title]);
  const extraBits = [
    guess?.pageCount ? `${guess.pageCount} pages` : '',
    guess?.publishedYear || '',
    guess?.isbn || '',
  ].filter(Boolean);

  if (!guess) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="sm"
        overlayClassName="z-[80]"
        className="z-[90]"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-600" aria-hidden />
            Is this the right book?
          </DialogTitle>
          <DialogDescription>
            The helper guessed this title. Check the cover and name before you add it.
          </DialogDescription>
        </DialogHeader>
        <motion.div variants={listMotion} initial="hidden" animate="show" className="space-y-4">

          <motion.div
            variants={itemMotion}
            className="flex items-start gap-4 rounded-2xl border border-violet-500/30 bg-violet-500/5 p-3"
          >
            <LibraryBookCover
              coverUrl={guess.coverUrl}
              isbn={guess.isbn}
              title={guess.title}
              author={guess.author}
              aspect="thumb"
              className="h-28 w-[4.5rem] shrink-0 rounded-lg border shadow-sm"
            />
            <div className="min-w-0 space-y-1">
              <p className="text-base font-black leading-tight">{guess.title || 'Untitled'}</p>
              {guess.author ? (
                <p className="text-sm text-muted-foreground">by {guess.author}</p>
              ) : null}
              <p className="text-sm font-semibold text-foreground">
                Reading level:{' '}
                <span className="font-bold">{guess.readingLevel?.trim() || 'not listed'}</span>
              </p>
              {guess.publishedYear ? (
                <p className="text-xs text-muted-foreground">{guess.publishedYear}</p>
              ) : null}
            </div>
          </motion.div>

          <motion.div variants={itemMotion}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-full text-xs font-bold"
              onClick={() => setShowMore((open) => !open)}
              aria-expanded={showMore}
            >
              <ChevronDown className={`mr-1 h-3.5 w-3.5 transition-transform ${showMore ? 'rotate-180' : ''}`} />
              {showMore ? 'Hide extra book info' : 'More book info'}
            </Button>
            <AnimatePresence initial={false}>
              {showMore ? (
                <motion.div
                  key="more-book-info"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 26 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 space-y-2 rounded-xl border bg-background/80 p-3 text-sm">
                    {extraBits.length > 0 ? (
                      <p className="text-muted-foreground">{extraBits.join(' · ')}</p>
                    ) : null}
                    {guess.description?.trim() ? (
                      <p className="leading-relaxed text-foreground">{guess.description.trim()}</p>
                    ) : (
                      <p className="text-muted-foreground">No extra summary was found for this book.</p>
                    )}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>

          {remainingCount > 1 ? (
            <motion.p variants={itemMotion} className="text-xs text-muted-foreground">
              {remainingCount - 1} more AI guess{remainingCount - 1 === 1 ? '' : 'es'} waiting after this one.
            </motion.p>
          ) : null}

          <motion.div variants={itemMotion} className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="rounded-xl" onClick={onReject}>
              No, I'll type it
            </Button>
            <Button type="button" className="rounded-xl" onClick={onConfirm}>
              Yes, that's the book
            </Button>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
