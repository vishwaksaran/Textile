import { cn } from '@/lib/utils';

/**
 * A machine-readable identifier: order code, tracking number, invoice number.
 *
 * These are set in the body face, never the display serif. Playfair Display
 * is a high-contrast typeface whose numerals are drawn with hairline strokes
 * and, at small sizes, near-identical shapes — the same reason the prices had
 * to be moved off it. A code exists to be read back over the phone, typed
 * into a courier's site or checked against a parcel, so legibility beats
 * elegance every time: "1133333333333" has to survive being counted.
 *
 * `tabular-nums` fixes the digit width so a column of codes lines up and a
 * repeated digit is countable; the extra tracking separates characters that
 * would otherwise run together in a long unbroken string.
 *
 * Size and colour stay with the caller, because the same code appears as a
 * 26px hero on the confirmation page and as 12px in an admin table.
 */
export function CodeText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn('font-body-md font-semibold tabular-nums tracking-wide', className)}>
      {children}
    </span>
  );
}
