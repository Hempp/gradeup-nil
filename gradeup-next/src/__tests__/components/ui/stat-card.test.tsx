import { render, screen } from '@testing-library/react';
import { StatCard } from '@/components/ui/stat-card';

describe('StatCard', () => {
  const defaultProps = {
    title: 'Total Revenue',
    value: '$12,345',
  };

  it('renders title', () => {
    render(<StatCard {...defaultProps} />);

    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
  });

  it('renders value', () => {
    render(<StatCard {...defaultProps} />);

    expect(screen.getByText('$12,345')).toBeInTheDocument();
  });

  it('renders numeric value', () => {
    render(<StatCard {...defaultProps} value={42} />);

    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(
      <StatCard
        {...defaultProps}
        icon={<span data-testid="custom-icon">Icon</span>}
      />
    );

    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('renders positive trend', () => {
    render(<StatCard {...defaultProps} trend={12} trendDirection="up" />);

    expect(screen.getByText('12%')).toBeInTheDocument();
  });

  it('renders negative trend', () => {
    render(<StatCard {...defaultProps} trend={8} trendDirection="down" />);

    expect(screen.getByText('8%')).toBeInTheDocument();
  });

  it('applies success color for positive trend', () => {
    const { container } = render(<StatCard {...defaultProps} trend={12} trendDirection="up" />);

    const trendElement = container.querySelector('.text-\\[var\\(--color-success\\)\\]');
    expect(trendElement).toBeInTheDocument();
  });

  it('applies error color for negative trend', () => {
    const { container } = render(<StatCard {...defaultProps} trend={8} trendDirection="down" />);

    const trendElement = container.querySelector('.text-\\[var\\(--color-error\\)\\]');
    expect(trendElement).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<StatCard {...defaultProps} subtitle="Compared to last month" />);

    expect(screen.getByText('Compared to last month')).toBeInTheDocument();
  });

  it('renders subtitle as ReactNode', () => {
    render(
      <StatCard
        {...defaultProps}
        subtitle={<span data-testid="custom-subtitle">Custom subtitle</span>}
      />
    );

    expect(screen.getByTestId('custom-subtitle')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<StatCard {...defaultProps} className="custom-stat-card" />);

    expect(container.firstChild).toHaveClass('custom-stat-card');
  });

  it('does not render trend when not provided', () => {
    render(<StatCard {...defaultProps} />);

    expect(screen.queryByText('%')).not.toBeInTheDocument();
  });

  it('does not render icon container when icon not provided', () => {
    const { container } = render(<StatCard {...defaultProps} />);

    // Icon container should not exist
    const iconContainer = container.querySelector('.h-10.w-10');
    expect(iconContainer).not.toBeInTheDocument();
  });

  it('defaults trend direction to up', () => {
    const { container } = render(<StatCard {...defaultProps} trend={10} />);

    const trendElement = container.querySelector('.text-\\[var\\(--color-success\\)\\]');
    expect(trendElement).toBeInTheDocument();
  });

  it('handles absolute value of negative trend', () => {
    render(<StatCard {...defaultProps} trend={-5} trendDirection="down" />);

    expect(screen.getByText('5%')).toBeInTheDocument();
  });
});
