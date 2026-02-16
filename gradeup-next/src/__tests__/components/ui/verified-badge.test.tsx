import { render, screen } from '@testing-library/react';
import { VerifiedBadge } from '@/components/ui/verified-badge';

describe('VerifiedBadge', () => {
  it('renders with default props', () => {
    render(<VerifiedBadge />);

    expect(screen.getByRole('img', { name: /verified/i })).toBeInTheDocument();
  });

  it('renders small size', () => {
    const { container } = render(<VerifiedBadge size="sm" />);

    expect(container.firstChild).toHaveClass('h-4', 'w-4');
  });

  it('renders medium size by default', () => {
    const { container } = render(<VerifiedBadge />);

    expect(container.firstChild).toHaveClass('h-5', 'w-5');
  });

  it('renders large size', () => {
    const { container } = render(<VerifiedBadge size="lg" />);

    expect(container.firstChild).toHaveClass('h-6', 'w-6');
  });

  it('has proper aria-label', () => {
    render(<VerifiedBadge />);

    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Verified');
  });

  it('uses custom aria-label', () => {
    render(<VerifiedBadge label="Verified Athlete" />);

    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Verified Athlete');
  });

  it('applies custom className', () => {
    const { container } = render(<VerifiedBadge className="custom-badge" />);

    expect(container.firstChild).toHaveClass('custom-badge');
  });

  it('has primary background color', () => {
    const { container } = render(<VerifiedBadge />);

    expect(container.firstChild).toHaveClass('bg-[var(--color-primary)]');
  });

  it('has rounded-full class', () => {
    const { container } = render(<VerifiedBadge />);

    expect(container.firstChild).toHaveClass('rounded-full');
  });

  it('contains svg checkmark', () => {
    const { container } = render(<VerifiedBadge />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('svg has white text color', () => {
    const { container } = render(<VerifiedBadge />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('text-white');
  });
});
