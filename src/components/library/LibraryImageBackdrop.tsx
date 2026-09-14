'use client';

import { motion } from 'framer-motion';
import { clampLibraryBackgroundDim } from '@/lib/library/libraryBackground';

export function LibraryImageBackdrop({
  imageUrl,
  overlayColor,
  dim,
  layoutId = 'library-workspace-backdrop',
}: {
  imageUrl?: string | null;
  overlayColor: string;
  dim?: number | null;
  layoutId?: string;
}) {
  const url = imageUrl?.trim();
  if (!url) return null;

  const wash = clampLibraryBackgroundDim(dim);

  return (
    <motion.div
      layoutId={layoutId}
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'spring', stiffness: 90, damping: 22 }}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="h-full w-full object-cover" />
      <div className="absolute inset-0" style={{ backgroundColor: overlayColor, opacity: wash / 100 }} />
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, color-mix(in srgb, ${overlayColor} 35%, transparent) 0%, transparent 28%, transparent 72%, color-mix(in srgb, ${overlayColor} 45%, transparent) 100%)`,
        }}
      />
    </motion.div>
  );
}
