import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Props for the Card component
 */
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Visual style variant of the card
   * - 'default': Standard card with solid background and border
   * - 'glass': Glassmorphism effect with backdrop blur
   * - 'glow': Card with glowing border using primary color
   * @default 'default'
   */
  variant?: 'default' | 'glass' | 'glow';
  /**
   * Enable hover effects (lift, shadow, background change)
   * @default false
   */
  hover?: boolean;
}

/**
 * A container component for grouping related content
 *
 * Provides consistent styling for card-based layouts with multiple
 * visual variants. Can be composed with CardHeader, CardTitle,
 * CardDescription, CardContent, and CardFooter for structured content.
 *
 * @example
 * // Basic card with hover effect
 * <Card hover>
 *   <CardHeader>
 *     <CardTitle>Deal Details</CardTitle>
 *     <CardDescription>Partnership with Nike</CardDescription>
 *   </CardHeader>
 *   <CardContent>
 *     <p>Deal content here...</p>
 *   </CardContent>
 *   <CardFooter>
 *     <Button>Accept</Button>
 *   </CardFooter>
 * </Card>
 *
 * // Glass variant for overlay content
 * <Card variant="glass">...</Card>
 */
const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', hover = false, children, ...props }, ref) => {
    const baseStyles = `
      rounded-[var(--radius-lg)] p-6
      transition-all duration-[var(--transition-normal)]
    `;

    const variants = {
      default: `
        bg-[var(--bg-card)] border border-[var(--border-color)]
        ${hover ? 'hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-color-hover)] hover:-translate-y-1 hover:shadow-lg' : ''}
      `,
      glass: `
        glass-card
        ${hover ? 'hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1' : ''}
      `,
      glow: `
        bg-[var(--bg-card)] border border-[var(--color-primary)]
        shadow-[0_0_20px_var(--color-primary-glow)]
        ${hover ? 'hover:shadow-[0_0_30px_var(--color-primary-glow)] hover:-translate-y-1' : ''}
      `,
    };

    return (
      <div
        ref={ref}
        className={cn(baseStyles, variants[variant], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

/**
 * Header section of a Card, typically contains CardTitle and CardDescription
 */
const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col gap-1.5 pb-4', className)}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

/**
 * Title element for Card, renders as h3 with appropriate styling
 */
const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-lg font-semibold text-[var(--text-primary)]', className)}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

/**
 * Description/subtitle element for Card with muted text styling
 */
const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-[var(--text-muted)]', className)}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

/**
 * Main content area of a Card
 */
const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

/**
 * Footer section of a Card, typically contains action buttons
 * Includes top border separator and flex layout for actions
 */
const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center gap-4 pt-4 border-t border-[var(--border-color)]', className)}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
