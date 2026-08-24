import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded px-2.5 py-1 font-label-sm text-label-sm uppercase tracking-widest',
  {
    variants: {
      variant: {
        default: 'bg-surface-container-highest text-on-surface-variant',
        maroon: 'bg-deep-maroon text-primary-fixed',
        gold: 'bg-primary-container text-deep-maroon',
        outline: 'border border-primary-container/60 text-deep-maroon bg-warm-cream/80',
        success: 'bg-success-container text-success',
        warning: 'bg-primary-fixed text-on-primary-fixed',
        error: 'bg-error-container text-on-error-container',
        muted: 'bg-surface-variant text-on-surface-variant',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
