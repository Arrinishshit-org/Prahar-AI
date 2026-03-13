import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-xl border border-white/80 bg-[linear-gradient(145deg,#efe2c8,#f8efdf)] px-3 py-2 text-sm ring-offset-parchment file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted shadow-[inset_2px_2px_4px_rgba(173,145,105,0.24),inset_-2px_-2px_4px_rgba(255,255,255,0.88)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
