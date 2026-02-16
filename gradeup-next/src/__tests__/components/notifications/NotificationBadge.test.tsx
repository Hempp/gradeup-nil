import { render, screen } from '@testing-library/react';
import { NotificationBadge } from '@/components/notifications/NotificationBadge';

describe('NotificationBadge', () => {
  it('renders count', () => {
    render(<NotificationBadge count={5} />);

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('returns null when count is 0', () => {
    const { container } = render(<NotificationBadge count={0} />);

    expect(container.firstChild).toBeNull();
  });

  it('returns null when count is negative', () => {
    const { container } = render(<NotificationBadge count={-1} />);

    expect(container.firstChild).toBeNull();
  });

  it('shows 99+ when count exceeds maxCount', () => {
    render(<NotificationBadge count={150} />);

    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('respects custom maxCount', () => {
    render(<NotificationBadge count={15} maxCount={10} />);

    expect(screen.getByText('10+')).toBeInTheDocument();
  });

  it('shows exact count when at maxCount', () => {
    render(<NotificationBadge count={99} maxCount={99} />);

    expect(screen.getByText('99')).toBeInTheDocument();
  });

  it('has proper aria-label for single notification', () => {
    render(<NotificationBadge count={1} />);

    expect(screen.getByLabelText('1 unread notification')).toBeInTheDocument();
  });

  it('has proper aria-label for multiple notifications', () => {
    render(<NotificationBadge count={5} />);

    expect(screen.getByLabelText('5 unread notifications')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<NotificationBadge count={3} className="custom-badge" />);

    // Find the badge element
    const badge = container.querySelector('.custom-badge');
    expect(badge).toBeInTheDocument();
  });
});
