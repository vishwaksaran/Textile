/**
 * The banner's ornaments, drawn from motifs the shop actually sells.
 *
 * The eyebrow rule is a temple border — the row of triangular points woven
 * into the edge of a Kanchipuram saree — and the divider is a graduated
 * diamond chain of the kind that runs down a wedding invitation. An arrow
 * was the first attempt and it was simply generic: it could have introduced
 * a software release as easily as a silk collection.
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

/** A temple border: a rule running into a row of woven points. */
export function EyebrowRule({ side }: { side: 'left' | 'right' }) {
  return (
    <svg
      viewBox="0 0 46 14"
      className="h-3 w-12 flex-none"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ transform: side === 'right' ? 'scaleX(-1)' : undefined }}
    >
      {/* the rule, tapering in */}
      <path d="M2 10h14" opacity="0.6" />
      {/* the points, rising toward the words */}
      <path d="M18 10 22 4.5 26 10 30 4.5 34 10 38 4.5 42 10" />
      {/* the ground line the points stand on */}
      <path d="M17 10h26" opacity="0.85" />
    </svg>
  );
}

/**
 * The divider: a chain of diamonds graduating to the largest at the centre,
 * with a rule running out to either side.
 */
export function HeroDivider({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 268 20"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* rules out to the edges */}
      <path d="M6 10h72" opacity="0.5" />
      <path d="M262 10h-72" opacity="0.5" />

      {/* the chain, smallest outward */}
      <path d="M82 10 87 5.5 92 10 87 14.5Z" />
      <path d="M100 10 106.5 4 113 10 106.5 16Z" />
      <path d="M121 10 129 2.5 137 10 129 17.5Z" />
      <path d="M145 10 151.5 4 158 10 151.5 16Z" />
      <path d="M166 10 171 5.5 176 10 171 14.5Z" />

      {/* the thread between them */}
      <path d="M92 10h8M113 10h8M137 10h8M158 10h8" opacity="0.85" />

      {/* a filled heart to the centre stone */}
      <path d="M129 6.5 132.5 10 129 13.5 125.5 10Z" fill="currentColor" stroke="none" />
    </svg>
  );
}
