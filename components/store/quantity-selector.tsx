'use client';

import { Minus, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuantitySelectorProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max: number;
  size?: 'sm' | 'md';
  /** With min 0, the last decrement removes the row — show that plainly. */
  removeAtMin?: boolean;
  label?: string;
  className?: string;
}

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max,
  size = 'md',
  removeAtMin = false,
  label = 'Quantity',
  className,
}: QuantitySelectorProps) {
  const dim = size === 'sm' ? 'h-8 w-8' : 'h-11 w-11';
  const willRemove = removeAtMin && value <= min + 1;

  return (
    <div
      className={cn(
        'inline-flex items-center rounded border border-outline-variant bg-surface-container-lowest',
        className,
      )}
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label={willRemove ? 'Remove from cart' : 'Decrease quantity'}
        className={cn(
          dim,
          'flex items-center justify-center text-deep-maroon transition-colors hover:bg-primary-container/10 disabled:opacity-30',
        )}
      >
        {willRemove ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
      </button>
      <span
        aria-live="polite"
        className={cn(
          'min-w-8 text-center font-body-md tabular-nums text-on-surface',
          size === 'sm' ? 'text-sm' : 'text-body-md',
        )}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="Increase quantity"
        className={cn(
          dim,
          'flex items-center justify-center text-deep-maroon transition-colors hover:bg-primary-container/10 disabled:opacity-30',
        )}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
