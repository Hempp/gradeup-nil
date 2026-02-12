import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/badge';

describe('Badge', () => {
  it('renders with default props', () => {
    render(<Badge>Default</Badge>);

    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('renders different variants', () => {
    const { rerender } = render(<Badge variant="default">Default</Badge>);
    expect(screen.getByText('Default')).toHaveClass('bg-[var(--bg-tertiary)]');

    rerender(<Badge variant="primary">Primary</Badge>);
    expect(screen.getByText('Primary')).toHaveClass('bg-[var(--color-primary-muted)]');

    rerender(<Badge variant="success">Success</Badge>);
    expect(screen.getByText('Success')).toHaveClass('bg-[var(--color-success-muted)]');

    rerender(<Badge variant="warning">Warning</Badge>);
    expect(screen.getByText('Warning')).toHaveClass('bg-[var(--color-warning-muted)]');

    rerender(<Badge variant="error">Error</Badge>);
    expect(screen.getByText('Error')).toHaveClass('bg-[var(--color-error-muted)]');

    rerender(<Badge variant="outline">Outline</Badge>);
    expect(screen.getByText('Outline')).toHaveClass('bg-transparent');
  });

  it('renders different sizes', () => {
    const { rerender } = render(<Badge size="sm">Small</Badge>);
    expect(screen.getByText('Small')).toHaveClass('h-5');

    rerender(<Badge size="md">Medium</Badge>);
    expect(screen.getByText('Medium')).toHaveClass('h-6');
  });

  it('defaults to md size', () => {
    render(<Badge>Default Size</Badge>);

    expect(screen.getByText('Default Size')).toHaveClass('h-6');
  });

  it('defaults to default variant', () => {
    render(<Badge>Default Variant</Badge>);

    expect(screen.getByText('Default Variant')).toHaveClass('bg-[var(--bg-tertiary)]');
  });

  it('applies custom className', () => {
    render(<Badge className="custom-class">Custom</Badge>);

    expect(screen.getByText('Custom')).toHaveClass('custom-class');
  });

  it('forwards ref correctly', () => {
    const ref = jest.fn();
    render(<Badge ref={ref}>With Ref</Badge>);

    expect(ref).toHaveBeenCalled();
  });

  it('renders as inline-flex element', () => {
    render(<Badge>Inline</Badge>);

    expect(screen.getByText('Inline')).toHaveClass('inline-flex');
  });
});
