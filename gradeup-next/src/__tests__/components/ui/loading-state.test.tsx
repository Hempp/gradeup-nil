import { render, screen } from '@testing-library/react';
import { LoadingState } from '@/components/ui/loading-state';

describe('LoadingState', () => {
  it('renders with default message', () => {
    render(<LoadingState />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<LoadingState message="Fetching data..." />);

    expect(screen.getByText('Fetching data...')).toBeInTheDocument();
  });

  it('renders spinner element', () => {
    render(<LoadingState />);

    // Spinner is inside the component with aria-hidden
    const spinner = document.querySelector('[aria-hidden="true"]');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('animate-spin');
  });

  it('has proper accessibility attributes', () => {
    render(<LoadingState />);

    const container = screen.getByRole('status');
    expect(container).toHaveAttribute('aria-live', 'polite');
    expect(container).toHaveAttribute('aria-busy', 'true');
  });

  describe('sizes', () => {
    it('renders small size', () => {
      render(<LoadingState size="sm" />);

      const spinner = document.querySelector('[aria-hidden="true"]');
      expect(spinner).toHaveClass('h-6', 'w-6');

      const container = screen.getByRole('status');
      expect(container).toHaveClass('min-h-[200px]');
    });

    it('renders medium size (default)', () => {
      render(<LoadingState />);

      const spinner = document.querySelector('[aria-hidden="true"]');
      expect(spinner).toHaveClass('h-8', 'w-8');

      const container = screen.getByRole('status');
      expect(container).toHaveClass('min-h-[400px]');
    });

    it('renders large size', () => {
      render(<LoadingState size="lg" />);

      const spinner = document.querySelector('[aria-hidden="true"]');
      expect(spinner).toHaveClass('h-12', 'w-12');

      const container = screen.getByRole('status');
      expect(container).toHaveClass('min-h-[500px]');
    });
  });

  it('applies custom className', () => {
    render(<LoadingState className="custom-loading-class" />);

    expect(screen.getByRole('status')).toHaveClass('custom-loading-class');
  });

  it('forwards ref correctly', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<LoadingState ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('renders text with appropriate size class', () => {
    const { rerender } = render(<LoadingState size="sm" />);
    expect(screen.getByText('Loading...')).toHaveClass('text-sm');

    rerender(<LoadingState size="md" />);
    expect(screen.getByText('Loading...')).toHaveClass('text-base');

    rerender(<LoadingState size="lg" />);
    expect(screen.getByText('Loading...')).toHaveClass('text-lg');
  });

  it('centers content', () => {
    render(<LoadingState />);

    const container = screen.getByRole('status');
    expect(container).toHaveClass('flex', 'items-center', 'justify-center');
  });

  it('spinner has border styling', () => {
    render(<LoadingState />);

    const spinner = document.querySelector('[aria-hidden="true"]');
    expect(spinner).toHaveClass('border-b-2', 'rounded-full');
  });
});
