import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        // v2.2: outline-variant border (cooler, calmer than zinc-200), p-3
        // (spec §7), focus jumps to primary container blue for brand cue.
        'flex h-10 w-full rounded-kt-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm ring-offset-background transition-colors duration-fast ease-brand file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-on-surface-variant/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export { Input };
