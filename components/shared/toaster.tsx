'use client';

import { Toaster as SonnerToaster } from 'sonner';

/** Bottom-right slide-in toasts, themed to the store palette. */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      closeButton
      duration={4000}
      toastOptions={{
        classNames: {
          toast:
            'bg-warm-cream border border-primary-container/40 text-on-surface shadow-[0_12px_32px_-12px_rgba(74,4,4,0.3)] rounded-lg',
          title: 'font-body-md text-body-md text-deep-maroon font-semibold',
          description: 'font-body-md text-sm text-on-surface-variant',
          actionButton: 'bg-deep-maroon text-primary-fixed',
          cancelButton: 'bg-surface-variant text-on-surface-variant',
          error: 'border-error/40',
          success: 'border-success/40',
        },
      }}
    />
  );
}
