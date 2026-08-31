'use client';

import * as React from 'react';
import Image from 'next/image';
import { AlignCenter, AlignLeft, AlignRight, Move } from 'lucide-react';

export interface TextPlacement {
  text_x: number;
  text_y: number;
  text_align: 'left' | 'center' | 'right';
  show_text: boolean;
}

/**
 * Drag the banner copy to where it belongs on the picture.
 *
 * A number field for "text X: 62%" is a guess dressed as a setting — nobody
 * can tell from it whether the headline has landed on a face or in the gap
 * beside one. Dragging it on the actual image, at the actual aspect ratio,
 * with the actual gradient over the top, answers the only question being
 * asked: does this read?
 *
 * Positions are percentages of the frame, so the placement survives the jump
 * from a 390px phone to a 2560px desktop. Pointer events rather than mouse
 * events, so it works by touch — which is where a shop owner is most likely
 * to be editing this.
 */
export function HeroTextPlacer({
  imageUrl,
  eyebrow,
  title,
  body,
  ctaLabel,
  value,
  onChange,
}: {
  imageUrl: string;
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  value: TextPlacement;
  onChange: (next: TextPlacement) => void;
}) {
  const frameRef = React.useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = React.useState(false);

  const place = React.useCallback(
    (clientX: number, clientY: number) => {
      const rect = frameRef.current?.getBoundingClientRect();
      if (!rect) return;
      // Clamped to 5–95 so the block can never be dragged off its own frame.
      const x = Math.min(Math.max(((clientX - rect.left) / rect.width) * 100, 5), 95);
      const y = Math.min(Math.max(((clientY - rect.top) / rect.height) * 100, 5), 95);
      onChange({ ...value, text_x: Math.round(x), text_y: Math.round(y) });
    },
    [onChange, value],
  );

  if (!imageUrl) {
    return (
      <p className="rounded border border-dashed border-outline-variant px-4 py-6 text-center font-body-md text-sm text-on-surface-variant">
        Add an image first, then you can position the text on it.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
          <Move className="h-3.5 w-3.5" strokeWidth={1.75} />
          Drag the text where you want it
        </p>

        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={value.show_text}
              onChange={(e) => onChange({ ...value, show_text: e.target.checked })}
              className="h-4 w-4 rounded-none border-outline-variant text-deep-maroon focus:ring-primary-container"
            />
            <span className="font-body-md text-sm text-on-surface">Show text</span>
          </label>

          <div className="flex rounded border border-outline-variant/60">
            {([
              ['left', AlignLeft],
              ['center', AlignCenter],
              ['right', AlignRight],
            ] as const).map(([align, Icon]) => (
              <button
                key={align}
                type="button"
                aria-label={`Align ${align}`}
                aria-pressed={value.text_align === align}
                onClick={() => onChange({ ...value, text_align: align })}
                className={`p-2 transition-colors ${
                  value.text_align === align
                    ? 'bg-primary-container/25 text-deep-maroon'
                    : 'text-on-surface-variant hover:text-deep-maroon'
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        ref={frameRef}
        className="relative aspect-[21/9] w-full select-none overflow-hidden rounded-lg bg-surface-variant"
        onPointerMove={(e) => dragging && place(e.clientX, e.clientY)}
        onPointerUp={() => setDragging(false)}
        onPointerLeave={() => setDragging(false)}
      >
        <Image src={imageUrl} alt="" fill sizes="800px" className="object-cover" />
        {/* The same wash the live banner uses, so what is judged here is what
            ships rather than a brighter version of it. */}
        <div className="absolute inset-0 bg-black/35" aria-hidden="true" />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.40) 32%, rgba(0,0,0,0.40) 68%, rgba(0,0,0,0.12) 100%)',
          }}
        />

        {value.show_text && (
          <div
            role="button"
            tabIndex={0}
            aria-label="Drag to move the banner text. Arrow keys nudge it."
            onPointerDown={(e) => {
              e.preventDefault();
              setDragging(true);
              place(e.clientX, e.clientY);
            }}
            // Keyboard nudging, because a drag handle nobody can reach by
            // keyboard is a setting only some people can change.
            onKeyDown={(e) => {
              const step = e.shiftKey ? 5 : 1;
              const moves: Record<string, [number, number]> = {
                ArrowLeft: [-step, 0],
                ArrowRight: [step, 0],
                ArrowUp: [0, -step],
                ArrowDown: [0, step],
              };
              const delta = moves[e.key];
              if (!delta) return;
              e.preventDefault();
              onChange({
                ...value,
                text_x: Math.min(Math.max(value.text_x + delta[0], 5), 95),
                text_y: Math.min(Math.max(value.text_y + delta[1], 5), 95),
              });
            }}
            style={{
              left: `${value.text_x}%`,
              top: `${value.text_y}%`,
              transform: 'translate(-50%, -50%)',
              textAlign: value.text_align,
              alignItems:
                value.text_align === 'left'
                  ? 'flex-start'
                  : value.text_align === 'right'
                    ? 'flex-end'
                    : 'center',
            }}
            className={`absolute flex w-[70%] cursor-grab flex-col rounded px-3 py-2 ring-1 ring-white/25 ring-offset-0 transition-shadow active:cursor-grabbing ${
              dragging ? 'ring-2 ring-primary-container' : 'hover:ring-white/50'
            }`}
          >
            {eyebrow && (
              <p className="mb-1 font-label-sm text-[9px] uppercase tracking-[0.2em] text-primary-fixed drop-shadow">
                {eyebrow}
              </p>
            )}
            <p className="font-display-lg text-[22px] leading-tight text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]">
              {title || 'Your headline'}
            </p>
            {body && (
              <p className="mt-1 line-clamp-2 font-body-md text-[10px] text-white/90 drop-shadow">
                {body}
              </p>
            )}
            {ctaLabel && (
              <span className="mt-2 inline-block rounded bg-deep-maroon px-3 py-1.5 font-label-sm text-[9px] uppercase tracking-wider text-primary-container">
                {ctaLabel}
              </span>
            )}
          </div>
        )}
      </div>

      <p className="font-body-md text-xs text-on-surface-variant">
        {value.show_text ? (
          <>
            Position {value.text_x}% across, {value.text_y}% down. Click the block and use the
            arrow keys to nudge, or Shift with an arrow to move further. If your image already
            has words on it, untick <strong>Show text</strong> and nothing is printed over it.
          </>
        ) : (
          <>
            No text will be printed on this slide — the image carries it. The button link
            still works if you have set one.
          </>
        )}
      </p>
    </div>
  );
}
