import { cn } from '@/lib/utils';

/**
 * Inline emblem — a stylised loom shuttle inside a gold cartouche.
 * Inline SVG rather than a file so it inherits colour and never flashes.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 48"
      role="img"
      aria-hidden="true"
      className={cn('h-10 w-auto', className)}
      fill="none"
    >
      <path
        d="M20 1.5c10.2 0 18.5 8.3 18.5 18.5v8C38.5 38.2 30.2 46.5 20 46.5S1.5 38.2 1.5 28v-8C1.5 9.8 9.8 1.5 20 1.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.9"
      />
      <path
        d="M20 8.5c5.8 0 10.5 4.7 10.5 10.5S25.8 29.5 20 29.5 9.5 24.8 9.5 19 14.2 8.5 20 8.5Z"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.45"
      />
      <path d="M20 11v26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M13 19c3.5-3.2 10.5-3.2 14 0-3.5 3.2-10.5 3.2-14 0Z"
        fill="currentColor"
        opacity="0.85"
      />
      <circle cx="20" cy="19" r="1.8" fill="currentColor" />
      <path d="M15 37h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
