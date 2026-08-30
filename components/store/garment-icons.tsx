import { cn } from '@/lib/utils';

/**
 * Saree and churidar icons, drawn here rather than installed.
 *
 * The rest of the site uses lucide-react, which has no saree and no churidar.
 * Neither does anything else: a search across Iconify's ~200,000 icons from
 * 150+ sets returns nothing for saree, churidar, salwar, dupatta or lehenga.
 * The only "sari" results are emoji — `noto:sari` carries twelve hardcoded
 * colours and is fill-based, so it cannot take `currentColor` for the active
 * tab and sits badly beside monoline strokes. Installing a package for one
 * mismatched glyph would weigh more and look worse than these five paths.
 *
 * Drawn on lucide's grid — 24x24, `currentColor`, round caps and joins,
 * stroke width from the caller — so they align with Home, Truck and
 * ShoppingBag in the same bar and inherit the same colour transitions.
 */

interface IconProps {
  className?: string;
  strokeWidth?: number;
}

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/**
 * A saree: the drape, with the pallu falling outside it.
 *
 * The asymmetry is the whole icon. A symmetrical flared shape reads as a
 * skirt, and a shape with sleeves reads as the T-shirt this replaced — what
 * makes a saree recognisable in silhouette is the pallu coming over one
 * shoulder and hanging clear of the body. So the drape stays plain and the
 * single loose panel does the identifying.
 *
 * Earlier attempts put pleat lines inside the drape. At 20px they closed up
 * into a smudge, so they are gone: at tab size, fewer strokes read better.
 */
export function SareeIcon({ className, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg
      {...base}
      strokeWidth={strokeWidth}
      className={cn('h-5 w-5', className)}
      aria-hidden="true"
    >
      {/* the drape, narrow at the shoulder and flaring to a curved hem */}
      <path d="M11.6 3h2.8l2.7 15.3a10 10 0 0 1-9.2 0z" />
      {/* the pallu, over the shoulder and falling outside the body */}
      <path d="M14.4 3c-3.6 1-6 3.4-7.2 7.2L6 17.6" />
    </svg>
  );
}

/**
 * A churidar: the kurta, long and narrow, with a round neck and a centre
 * placket.
 *
 * The placket and the length are what separate it from lucide's `Shirt`,
 * which is short and square and read as a tee. A kurta falls well below the
 * hip, so the body is drawn tall and narrow rather than boxy.
 */
export function ChuridarIcon({ className, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg
      {...base}
      strokeWidth={strokeWidth}
      className={cn('h-5 w-5', className)}
      aria-hidden="true"
    >
      {/* shoulders, short sleeves, and the long straight tunic */}
      <path d="M9.8 3.4 7 4.8 6.2 8.6l2.6.6V21h6.4V9.2l2.6-.6-.8-3.8-2.8-1.4" />
      {/* round neck */}
      <path d="M9.8 3.4a2.4 2.4 0 0 0 4.4 0" />
      {/* centre placket */}
      <path d="M12 6.6V21" />
    </svg>
  );
}
