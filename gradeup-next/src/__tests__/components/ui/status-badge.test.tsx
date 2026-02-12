import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/components/ui/status-badge';
import type { DealStatus } from '@/types';

describe('StatusBadge', () => {
  const allStatuses: DealStatus[] = [
    'draft',
    'pending',
    'negotiating',
    'accepted',
    'active',
    'completed',
    'cancelled',
    'expired',
    'rejected',
    'paused',
  ];

  it.each(allStatuses)('renders %s status correctly', (status) => {
    render(<StatusBadge status={status} />);

    // Each status should render with proper label
    const expectedLabels: Record<DealStatus, string> = {
      draft: 'Draft',
      pending: 'Pending',
      negotiating: 'Negotiating',
      accepted: 'Accepted',
      active: 'Active',
      completed: 'Completed',
      cancelled: 'Cancelled',
      expired: 'Expired',
      rejected: 'Rejected',
      paused: 'Paused',
    };

    expect(screen.getByText(expectedLabels[status])).toBeInTheDocument();
  });

  it('renders pending status with warning styling', () => {
    render(<StatusBadge status="pending" />);

    const badge = screen.getByText('Pending').closest('span');
    expect(badge).toHaveClass('bg-[var(--warning-100)]');
    expect(badge).toHaveClass('text-[var(--warning-600)]');
  });

  it('renders active status with success styling', () => {
    render(<StatusBadge status="active" />);

    const badge = screen.getByText('Active').closest('span');
    expect(badge).toHaveClass('bg-[var(--success-100)]');
    expect(badge).toHaveClass('text-[var(--success-600)]');
  });

  it('renders rejected status with error styling', () => {
    render(<StatusBadge status="rejected" />);

    const badge = screen.getByText('Rejected').closest('span');
    expect(badge).toHaveClass('bg-[var(--error-100)]');
    expect(badge).toHaveClass('text-[var(--error-600)]');
  });

  it('renders completed status with info styling', () => {
    render(<StatusBadge status="completed" />);

    const badge = screen.getByText('Completed').closest('span');
    expect(badge).toHaveClass('bg-[var(--info-100)]');
    expect(badge).toHaveClass('text-[var(--info-600)]');
  });

  it('renders different sizes', () => {
    const { rerender } = render(<StatusBadge status="active" size="sm" />);
    expect(screen.getByText('Active').closest('span')).toHaveClass('px-2.5', 'py-0.5');

    rerender(<StatusBadge status="active" size="md" />);
    expect(screen.getByText('Active').closest('span')).toHaveClass('px-3', 'py-1');
  });

  it('defaults to md size', () => {
    render(<StatusBadge status="active" />);

    expect(screen.getByText('Active').closest('span')).toHaveClass('px-3', 'py-1');
  });

  it('renders status dot with aria-hidden', () => {
    render(<StatusBadge status="active" />);

    const badge = screen.getByText('Active').closest('span');
    const dot = badge?.querySelector('span[aria-hidden="true"]');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass('w-1.5', 'h-1.5', 'rounded-full');
  });

  it('applies custom className', () => {
    render(<StatusBadge status="active" className="custom-badge" />);

    expect(screen.getByText('Active').closest('span')).toHaveClass('custom-badge');
  });

  it('forwards ref correctly', () => {
    const ref = jest.fn();
    render(<StatusBadge status="active" ref={ref} />);

    expect(ref).toHaveBeenCalled();
  });

  it('renders as inline-flex element', () => {
    render(<StatusBadge status="active" />);

    expect(screen.getByText('Active').closest('span')).toHaveClass('inline-flex');
  });

  it('has rounded-full styling', () => {
    render(<StatusBadge status="active" />);

    expect(screen.getByText('Active').closest('span')).toHaveClass('rounded-full');
  });
});
