'use client';

import { forwardRef, useId, type InputHTMLAttributes, type SelectHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/ui';

const baseInput =
  'w-full bg-surface text-fg placeholder:text-fg-subtle border border-border rounded-md ' +
  'px-3 text-sm transition-[border-color,box-shadow,background] duration-150 ' +
  'hover:border-border-strong ' +
  'focus:outline-none focus:border-accent focus:shadow-[0_0_0_4px_var(--ring)] ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { leadingIcon?: ReactNode; trailingIcon?: ReactNode }>(
  function Input({ className, leadingIcon, trailingIcon, ...rest }, ref) {
    if (leadingIcon || trailingIcon) {
      return (
        <div className="relative">
          {leadingIcon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle [&>svg]:size-4">
              {leadingIcon}
            </span>
          )}
          <input
            ref={ref}
            className={cn(baseInput, 'h-10', leadingIcon ? 'pl-9' : '', trailingIcon ? 'pr-9' : '', className)}
            {...rest}
          />
          {trailingIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle [&>svg]:size-4">
              {trailingIcon}
            </span>
          )}
        </div>
      );
    }
    return <input ref={ref} className={cn(baseInput, 'h-10', className)} {...rest} />;
  }
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(baseInput, 'h-10 appearance-none pr-9 cursor-pointer', className)}
          {...rest}
        >
          {children}
        </select>
        <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-fg-subtle" viewBox="0 0 16 16" fill="none">
          <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={cn(baseInput, 'py-2.5 min-h-[88px] resize-y', className)} {...rest} />;
  }
);

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  // Pass through htmlFor only if children root accepts id; consumers typically pass label as text only.
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={id} className="flex items-center justify-between text-xs font-medium text-fg-muted">
          <span>
            {label}
            {required && <span className="text-danger ml-0.5">*</span>}
          </span>
          {hint && !error && <span className="text-fg-subtle font-normal">{hint}</span>}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
