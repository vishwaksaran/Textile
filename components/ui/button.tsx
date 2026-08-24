'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded font-label-sm text-label-sm uppercase tracking-wider transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 overflow-hidden',
  {
    variants: {
      variant: {
        primary:
          'bg-deep-maroon text-primary-fixed hover:bg-secondary shadow-[0_2px_10px_-4px_rgba(74,4,4,0.5)]',
        outline:
          'border border-primary-container/70 text-deep-maroon hover:bg-primary-container/10',
        ghost: 'text-deep-maroon hover:bg-primary-container/10',
        gold: 'bg-primary-container text-deep-maroon hover:brightness-105',
        destructive: 'bg-error text-on-error hover:brightness-110',
        link: 'text-deep-maroon underline-offset-4 hover:underline normal-case tracking-normal',
      },
      size: {
        sm: 'h-9 px-4 text-[11px]',
        md: 'h-11 px-6',
        lg: 'h-14 px-8',
        icon: 'h-11 w-11 px-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Adds the sweeping gold shine used on the hero CTA. */
  shine?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, shine = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size }), shine && 'btn-shine', className)} ref={ref} {...props}>
        {children}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
