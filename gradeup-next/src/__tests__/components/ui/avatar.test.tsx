import { render, screen } from '@testing-library/react';
import { Avatar } from '@/components/ui/avatar';

describe('Avatar', () => {
  it('renders with image when src is provided', () => {
    render(<Avatar src="/test-image.jpg" alt="Test User" />);

    // Get the wrapper (the div with aria-label, not the inner img)
    const elements = screen.getAllByRole('img', { name: /test user/i });
    // First element is the wrapper div
    const wrapper = elements[0];
    expect(wrapper).toBeInTheDocument();
    expect(wrapper).toHaveAttribute('aria-label', 'Test User');

    // Check the inner img element (next/image transforms the src)
    const img = wrapper.querySelector('img');
    expect(img).toHaveAttribute('alt', 'Test User');
    // next/image encodes the src, so we check it contains the original path
    expect(img?.getAttribute('src')).toContain('test-image.jpg');
  });

  it('renders fallback initials when no src is provided', () => {
    render(<Avatar alt="John Doe" />);

    const avatar = screen.getByRole('img', { name: /john doe/i });
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveTextContent('J');
  });

  it('uses custom fallback when provided', () => {
    render(<Avatar fallback="AB" alt="Test" />);

    expect(screen.getByRole('img')).toHaveTextContent('AB');
  });

  it('renders different sizes', () => {
    const { rerender } = render(<Avatar size="xs" alt="Test" />);
    expect(screen.getByRole('img')).toHaveClass('h-6', 'w-6');

    rerender(<Avatar size="sm" alt="Test" />);
    expect(screen.getByRole('img')).toHaveClass('h-8', 'w-8');

    rerender(<Avatar size="md" alt="Test" />);
    expect(screen.getByRole('img')).toHaveClass('h-10', 'w-10');

    rerender(<Avatar size="lg" alt="Test" />);
    expect(screen.getByRole('img')).toHaveClass('h-12', 'w-12');

    rerender(<Avatar size="xl" alt="Test" />);
    expect(screen.getByRole('img')).toHaveClass('h-16', 'w-16');
  });

  it('defaults to md size', () => {
    render(<Avatar alt="Test" />);

    expect(screen.getByRole('img')).toHaveClass('h-10', 'w-10');
  });

  it('applies custom className', () => {
    render(<Avatar className="custom-class" alt="Test" />);

    expect(screen.getByRole('img')).toHaveClass('custom-class');
  });

  it('has proper accessibility attributes', () => {
    render(<Avatar alt="John Doe" />);

    const avatar = screen.getByRole('img');
    expect(avatar).toHaveAttribute('aria-label', 'John Doe');
  });

  it('hides fallback initials from screen readers', () => {
    render(<Avatar alt="John" />);

    const initialsSpan = screen.getByText('J');
    expect(initialsSpan).toHaveAttribute('aria-hidden', 'true');
  });

  it('provides default alt text when none provided', () => {
    render(<Avatar />);

    const avatar = screen.getByRole('img');
    expect(avatar).toHaveAttribute('aria-label', 'User avatar');
  });

  it('renders as rounded-full', () => {
    render(<Avatar alt="Test" />);

    expect(screen.getByRole('img')).toHaveClass('rounded-full');
  });

  it('uses ? as fallback when no alt and no fallback provided', () => {
    render(<Avatar />);

    expect(screen.getByRole('img')).toHaveTextContent('?');
  });
});
