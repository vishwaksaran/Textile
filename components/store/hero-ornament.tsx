/**
 * The banner's ornaments: a flourished rule either side of the eyebrow, and
 * a scrolled divider between the headline and the supporting line.
 *
 * Drawn as SVG rather than set as text. The obvious shortcut is a decorative
 * character — ❦ or ◆ between two em dashes — but those render as whatever
 * glyph the reader's font happens to carry, which on a phone is frequently a
 * coloured emoji or a blank box. A path is the same drawing everywhere and
 * scales with the type around it.
 *
 * Both take their colour from `currentColor`, so they inherit the gold of the
 * eyebrow rather than hardcoding a second copy of it.
 */

/** A tapering rule ending in an arrow, pointing toward the words. */
export function EyebrowRule({ side }: { side: 'left' | 'right' }) {
  return (
    <svg
      viewBox="0 0 44 8"
      className="h-2 w-11 flex-none"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ transform: side === 'right' ? 'scaleX(-1)' : undefined }}
    >
      <path d="M2 4h34" />
      <path d="M31 1.6 36 4l-5 2.4" />
    </svg>
  );
}

/**
 * The divider under the headline: a lozenge at the centre, a scroll curling
 * away on each side, and a rule tapering out to nothing.
 */
export function HeroDivider({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 260 18"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* rules out to the edges */}
      <path d="M6 9h74" opacity="0.55" />
      <path d="M254 9h-74" opacity="0.55" />

      {/* scrolls, mirrored about the centre */}
      <path d="M80 9c7 0 7-5 14-5s7 5 14 5" />
      <path d="M180 9c-7 0-7-5-14-5s-7 5-14 5" />

      {/* small terminals where the scrolls begin */}
      <circle cx="80" cy="9" r="1.4" fill="currentColor" stroke="none" opacity="0.8" />
      <circle cx="180" cy="9" r="1.4" fill="currentColor" stroke="none" opacity="0.8" />

      {/* the lozenge */}
      <path d="M130 3.4 135.6 9 130 14.6 124.4 9Z" />
      <path d="M130 6.2 132.8 9 130 11.8 127.2 9Z" fill="currentColor" stroke="none" />
    </svg>
  );
}
