/**
 * The banner's divider, drawn from a motif the shop actually sells: a
 * graduated diamond chain of the kind that runs down a wedding invitation.
 *
 * A matching temple border once flanked the eyebrow line as well. It came
 * out at roughly ten pixels on the live banner, where the woven points read
 * as scratches beside the small caps rather than as an ornament — a motif
 * that needs to be seen to work, at a size where it cannot be. The divider
 * survives because it is four times wider and sits alone on its own line.
 *
 * Drawn as SVG rather than set as text. The obvious shortcut is a decorative
 * character between two em dashes, but those render as whatever glyph the
 * reader's font happens to carry, which on a phone is frequently a coloured
 * emoji or a blank box. A path is the same drawing everywhere and scales
 * with the type around it, and takes its colour from `currentColor` so the
 * gold is defined once.
 */

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
