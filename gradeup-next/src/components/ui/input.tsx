import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', error, icon, ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" aria-hidden="true">
            {icon}
          </div>
        )}
        <input
          type={type}
          ref={ref}
          className={cn(
            `
            w-full h-10 rounded-[var(--radius-md)]
            bg-[var(--bg-secondary)] border border-[var(--border-color)]
            px-3 text-sm text-[var(--text-primary)]
            placeholder:text-[var(--text-muted)]
            transition-colors duration-[var(--transition-fast)]
            focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]
            disabled:opacity-50 disabled:cursor-not-allowed
            `,
            icon && 'pl-10',
            error && 'border-[var(--color-error)] focus:border-[var(--color-error)] focus:ring-[var(--color-error)]',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
