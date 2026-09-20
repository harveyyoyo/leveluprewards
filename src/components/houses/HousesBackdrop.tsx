'use client';

/**
 * Atmospheric visual backdrop for the Houses Realm, matching the school's
 * chosen theme (Cosmic, Royal, Arena, Daylight, Parchment, etc.) with
 * sparkles and smooth radial gradient transitions.
 */
export function HousesBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden="true">
      <div className="houses-realm-bg absolute inset-0 transition-opacity duration-700" />
      <div className="houses-realm-stars absolute inset-0 opacity-40" />
      {/* Subtle top spotlight */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] opacity-25 blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(circle, var(--hr-accent-from, #fbbf24) 0%, transparent 70%)',
        }}
      />
    </div>
  );
}
