import { cn } from '@/lib/utils';

/**
 * The bottom tab bar's icons, as inline paths from Material Symbols.
 *
 * WHY THESE AND NOT LUCIDE. Lucide has no saree and no churidar — nor does
 * any other line-icon set; a search across Iconify's ~200,000 icons returns
 * nothing for saree, churidar, salwar or dupatta. Material Symbols is the one
 * family that ships garment shapes: `styler` (a garment on a hanger) and
 * `apparel` (a kurta-shaped tunic). Since those two have to come from here,
 * the whole bar comes from here — Material's filled shapes beside lucide's
 * strokes would look like two different bars stitched together.
 *
 * WHY PATHS AND NOT THE FONT. Material Symbols is a variable icon font whose
 * FILL axis is what produces the filled state. Loading it would mean a
 * webfont and a second render pass for five glyphs, on a site where the
 * Lighthouse work is worth protecting. Each icon is drawn twice instead —
 * outline and filled — and the state swaps the path. Ten paths, no font, no
 * package, no new dependency.
 *
 * Material Symbols is Apache-2.0, so the path data is free to embed.
 */

interface TabIconProps {
  /** Filled for the active tab, outlined otherwise — the FILL axis, by hand. */
  filled?: boolean;
  className?: string;
}

function Glyph({ d, className }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn('h-6 w-6', className)}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

const HOME_OUTLINE =
  'M6 19h3v-5q0-.425.288-.712T10 13h4q.425 0 .713.288T15 14v5h3v-9l-6-4.5L6 10zm-2 0v-9q0-.475.213-.9t.587-.7l6-4.5q.525-.4 1.2-.4t1.2.4l6 4.5q.375.275.588.7T20 10v9q0 .825-.588 1.413T18 21h-4q-.425 0-.712-.288T13 20v-5h-2v5q0 .425-.288.713T10 21H6q-.825 0-1.412-.587T4 19';
const HOME_FILLED =
  'M4 19v-9q0-.475.213-.9t.587-.7l6-4.5q.525-.4 1.2-.4t1.2.4l6 4.5q.375.275.588.7T20 10v9q0 .825-.588 1.413T18 21h-3q-.425 0-.712-.288T14 20v-5q0-.425-.288-.712T13 14h-2q-.425 0-.712.288T10 15v5q0 .425-.288.713T9 21H6q-.825 0-1.412-.587T4 19';

/** `styler` — a saree on a hanger, the way one hangs in the shop. */
const SAREE_OUTLINE =
  'M7 22v-6H5.4q-1 0-1.7-.7T3 13.6q0-.725.4-1.337t1.05-.913L11 8.45V7.8q-.9-.325-1.45-1.087T9 5q0-1.25.875-2.125T12 2t2.125.875T15 5h-2q0-.425-.288-.712T12 4t-.712.288T11 5t.288.713T12 6t.713.288T13 7v1.45l6.55 2.9q.65.3 1.05.913T21 13.6q0 1-.7 1.7t-1.7.7H17v6zm-1.6-8H7v-1h10v1h1.6q.175 0 .288-.125T19 13.55q0-.125-.062-.213t-.188-.137l-6.75-3l-6.75 3q-.125.05-.187.138T5 13.55q0 .2.113.325T5.4 14M9 20h6v-5H9zm0-5h6z';
const SAREE_FILLED =
  'M7 22v-6H5.4q-1 0-1.7-.7T3 13.6q0-.725.4-1.337t1.05-.913L11 8.45V7.8q-.9-.325-1.45-1.087T9 5q0-1.25.875-2.125T12 2t2.125.875T15 5h-2q0-.425-.288-.712T12 4t-.712.288T11 5t.288.713T12 6t.713.288T13 7v1.45l6.55 2.9q.65.3 1.05.913T21 13.6q0 1-.7 1.7t-1.7.7H17v6zm-1.6-8H7v-1h10v1h1.6q.175 0 .288-.125T19 13.55q0-.125-.062-.213t-.188-.137l-6.75-3l-6.75 3q-.125.05-.187.138T5 13.55q0 .2.113.325T5.4 14';

/** `apparel` — a kurta: shoulders, sleeves and a straight tunic body. */
const CHURIDAR_OUTLINE =
  'm6 10.95l-1 .55q-.35.2-.75.1t-.6-.45l-2-3.5q-.2-.35-.1-.75T2 6.3L7.75 3H9.5q.225 0 .363.138T10 3.5V4q0 .825.588 1.413T12 6t1.413-.587T14 4v-.5q0-.225.138-.363T14.5 3h1.75L22 6.3q.35.2.45.6t-.1.75l-2 3.5q-.2.35-.588.438T19 11.475l-1-.5V20q0 .425-.288.713T17 21H7q-.425 0-.712-.288T6 20zM8 7.6V19h8V7.6l3.1 1.7l1.05-1.75l-4.3-2.5q-.375 1.275-1.412 2.113T12 8t-2.437-.837T8.15 5.05l-4.3 2.5L4.9 9.3zm4 4.425';
const CHURIDAR_FILLED =
  'm6 10.95l-1 .55q-.35.2-.75.1t-.6-.45l-2-3.5q-.2-.35-.1-.75T2 6.3L7.75 3H9.5q.225 0 .363.138T10 3.5V4q0 .825.588 1.413T12 6t1.413-.587T14 4v-.5q0-.225.138-.363T14.5 3h1.75L22 6.3q.35.2.45.6t-.1.75l-2 3.5q-.2.35-.588.438T19 11.475l-1-.5V20q0 .425-.288.713T17 21H7q-.425 0-.712-.288T6 20z';

const TRACK_OUTLINE =
  'M3.875 19.125Q3 18.25 3 17H2q-.425 0-.712-.288T1 16V6q0-.825.588-1.412T3 4h12q.825 0 1.413.588T17 6v2h2q.475 0 .9.213t.7.587l2.2 2.925q.1.125.15.275t.05.325V16q0 .425-.288.713T22 17h-1q0 1.25-.875 2.125T18 20t-2.125-.875T15 17H9q0 1.25-.875 2.125T6 20t-2.125-.875m2.838-1.412Q7 17.425 7 17t-.288-.712T6 16t-.712.288T5 17t.288.713T6 18t.713-.288M3 15h.8q.425-.45.975-.725T6 14t1.225.275T8.2 15H15V6H3zm15.713 2.713Q19 17.425 19 17t-.288-.712T18 16t-.712.288T17 17t.288.713T18 18t.713-.288M17 13h4.25L19 10h-2zm-8-2.5';
const TRACK_FILLED =
  'M3.875 19.125Q3 18.25 3 17H2q-.425 0-.712-.288T1 16V6q0-.825.588-1.412T3 4h12q.825 0 1.413.588T17 6v2h2q.475 0 .9.213t.7.587l2.2 2.925q.1.125.15.275t.05.325V16q0 .425-.288.713T22 17h-1q0 1.25-.875 2.125T18 20t-2.125-.875T15 17H9q0 1.25-.875 2.125T6 20t-2.125-.875m2.838-1.412Q7 17.425 7 17t-.288-.712T6 16t-.712.288T5 17t.288.713T6 18t.713-.288m12 0Q19 17.426 19 17t-.288-.712T18 16t-.712.288T17 17t.288.713T18 18t.713-.288M17 13h4.25L19 10h-2z';

const CART_OUTLINE =
  'M6 22q-.825 0-1.412-.587T4 20V8q0-.825.588-1.412T6 6h2q0-1.65 1.175-2.825T12 2t2.825 1.175T16 6h2q.825 0 1.413.588T20 8v12q0 .825-.587 1.413T18 22zm0-2h12V8h-2v2q0 .425-.288.713T15 11t-.712-.288T14 10V8h-4v2q0 .425-.288.713T9 11t-.712-.288T8 10V8H6zm4-14h4q0-.825-.587-1.412T12 4t-1.412.588T10 6M6 20V8z';
const CART_FILLED =
  'M6 22q-.825 0-1.412-.587T4 20V8q0-.825.588-1.412T6 6h2q0-1.65 1.175-2.825T12 2t2.825 1.175T16 6h2q.825 0 1.413.588T20 8v12q0 .825-.587 1.413T18 22zm4-16h4q0-.825-.587-1.412T12 4t-1.412.588T10 6m5.713 4.713Q16 10.425 16 10V8h-2v2q0 .425.288.713T15 11t.713-.288m-6 0Q10 10.426 10 10V8H8v2q0 .425.288.713T9 11t.713-.288';

export const HomeTabIcon = ({ filled, className }: TabIconProps) => (
  <Glyph d={filled ? HOME_FILLED : HOME_OUTLINE} className={className} />
);
export const SareeTabIcon = ({ filled, className }: TabIconProps) => (
  <Glyph d={filled ? SAREE_FILLED : SAREE_OUTLINE} className={className} />
);
export const ChuridarTabIcon = ({ filled, className }: TabIconProps) => (
  <Glyph d={filled ? CHURIDAR_FILLED : CHURIDAR_OUTLINE} className={className} />
);
export const TrackTabIcon = ({ filled, className }: TabIconProps) => (
  <Glyph d={filled ? TRACK_FILLED : TRACK_OUTLINE} className={className} />
);
export const CartTabIcon = ({ filled, className }: TabIconProps) => (
  <Glyph d={filled ? CART_FILLED : CART_OUTLINE} className={className} />
);
