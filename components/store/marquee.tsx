import { cn } from '@/lib/utils';

/**
 * The scrolling notice strip beneath the banner.
 *
 * Animated in CSS, not JavaScript. A marquee driven by a scroll handler or a
 * timer repaints on the main thread for as long as the page is open, and this
 * sits directly under the LCP image — the one place on the site where a
 * per-frame cost is least affordable. A single transform keyframe runs on the
 * compositor and costs nothing after the first paint.
 *
 * The list is rendered twice and the track travels exactly half its width, so
 * the second copy arrives where the first began and the loop has no seam. The
 * duplicate is hidden from assistive technology, which would otherwise read
 * every notice twice.
 *
 * It pauses on hover and on keyboard focus, because a moving line of text is
 * unreadable to anyone who reads slowly, and stops entirely under
 * `prefers-reduced-motion` — where it becomes an ordinary scrollable strip
 * rather than disappearing, so the notices are still there to be read.
 */
export function Marquee({
  items,
  className,
}: {
  items: string[];
  className?: string;
}) {
  if (items.length === 0) return null;

  const track = (
    <ul className="flex shrink-0 items-center gap-10 pr-10" role="list">
      {items.map((item) => (
        <li
          key={item}
          className="flex shrink-0 items-center gap-10 whitespace-nowrap font-body-md text-sm text-warm-cream/90"
        >
          {item}
          <span aria-hidden="true" className="text-primary-container">
            &bull;
          </span>
        </li>
      ))}
    </ul>
  );

  return (
    <div
      className={cn(
        'group relative w-full overflow-x-auto border-y border-primary-container/25 bg-deep-maroon py-2.5 motion-safe:overflow-hidden',
        className,
      )}
      // A region rather than a live region: it is standing information, not
      // an announcement, and a live region here would interrupt a screen
      // reader every time the loop came round.
      role="region"
      aria-label="Shop notices"
      tabIndex={0}
    >
      <div className="flex w-max motion-safe:animate-marquee motion-safe:group-hover:[animation-play-state:paused] motion-safe:group-focus-within:[animation-play-state:paused]">
        {track}
        <div aria-hidden="true" className="flex">
          {track}
        </div>
      </div>
    </div>
  );
}
