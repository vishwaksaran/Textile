'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const baseField =
  'w-full bg-transparent border-0 border-b border-outline-variant rounded-none px-0 py-2 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/80 transition-colors focus:outline-none focus:ring-0 focus:border-deep-maroon disabled:opacity-50';

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(baseField, className)} {...props} />
  ),
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(baseField, 'min-h-[120px] resize-y', className)} {...props} />
));
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn(baseField, 'cursor-pointer', className)} {...props}>
    {children}
  </select>
));
Select.displayName = 'Select';

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string | null;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

/** Label + control + inline error, with the shake used on validation failure. */
export function Field({ label, htmlFor, error, hint, required, children, className }: FieldProps) {
  return (
    <div className={cn('space-y-1', error && 'animate-shake motion-reduce:animate-none', className)}>
      <label
        htmlFor={htmlFor}
        className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant"
      >
        {label}
        {required && <span className="text-error"> *</span>}
      </label>
      {children}
      {error ? (
        <p role="alert" className="font-body-md text-xs text-error">
          {error}
        </p>
      ) : hint ? (
        <p className="font-body-md text-xs text-on-surface-variant/80">{hint}</p>
      ) : null}
    </div>
  );
}
