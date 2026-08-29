import Image from 'next/image';
import { STORE } from '@/lib/config';
import { cn } from '@/lib/utils';

/**
 * The brand emblem, from public/logo.png.
 *
 * Sized by height so it lines up with the wordmark beside it; width follows
 * the artwork's own proportions. `priority` because it sits in the header and
 * would otherwise pop in after first paint.
 */
export function LogoMark({
  className,
  /**
   * Renders the mark in white, for the footer and anywhere else it sits on
   * deep maroon — the artwork is maroon on a light field, so it would
   * otherwise disappear into the background.
   */
  invert = false,
  /**
   * Off by default. Only the header copy is above the fold; marking every
   * instance high-priority made the footer logo compete with the hero image
   * for bandwidth during the initial load, which is exactly what priority is
   * meant to prevent.
   */
  priority = false,
}: {
  className?: string;
  invert?: boolean;
  priority?: boolean;
}) {
  return (
    <Image
      src="/logo.png"
      alt={`${STORE.name} emblem`}
      width={512}
      height={512}
      priority={priority}
      className={cn(
        'h-10 w-auto object-contain',
        invert && 'brightness-0 invert',
        className,
      )}
    />
  );
}
