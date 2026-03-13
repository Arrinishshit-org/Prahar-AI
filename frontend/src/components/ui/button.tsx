import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-all duration-200 border border-white/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-br from-primary-700 to-primary text-white hover:from-primary-600 hover:to-primary-800 active:scale-95 shadow-[8px_8px_16px_rgba(12,33,59,0.34),-6px_-6px_12px_rgba(74,121,161,0.26)]',
        accent:
          'bg-gradient-to-br from-accent-700 to-accent text-white hover:from-accent hover:to-terra active:scale-95 shadow-[8px_8px_16px_rgba(161,92,25,0.3),-6px_-6px_12px_rgba(247,206,145,0.42)]',
        success:
          'bg-gradient-to-br from-success to-emerald-600 text-white hover:brightness-105 active:scale-95 shadow-[8px_8px_16px_rgba(24,122,66,0.26),-6px_-6px_12px_rgba(194,244,217,0.45)]',
        outline:
          'border border-white/70 text-primary bg-gradient-to-br from-[#f5ebd8] to-[#eddfc8] hover:border-accent/50 active:scale-95 shadow-[7px_7px_14px_rgba(164,138,97,0.2),-6px_-6px_12px_rgba(255,255,255,0.72)]',
        ghost:
          'text-primary bg-gradient-to-br from-[#f3e8d3] to-[#eddec4] hover:text-primary-800 active:scale-95 shadow-[6px_6px_12px_rgba(164,138,97,0.16),-5px_-5px_10px_rgba(255,255,255,0.64)]',
        link: 'text-accent underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-5 py-2 text-sm',
        sm: 'h-8 px-4 py-1.5 text-xs',
        lg: 'h-12 px-6 py-3 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
