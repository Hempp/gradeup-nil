/**
 * Tests for the DashboardPreview component
 * @module __tests__/components/marketing/DashboardPreview.test
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardPreview } from '@/components/marketing/DashboardPreview';

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock IntersectionObserver
class MockIntersectionObserver {
  callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }

  observe(element: Element) {
    // Delay the callback slightly to allow the observer variable to be assigned
    setTimeout(() => {
      this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
    }, 0);
  }

  unobserve() {}
  disconnect() {}
}

window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

describe('DashboardPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders with default props', async () => {
    render(<DashboardPreview />);
    await act(async () => { jest.advanceTimersByTime(10); });
    expect(screen.getByText('Athlete View')).toBeInTheDocument();
    expect(screen.getByText('Brand View')).toBeInTheDocument();
  });

  it('shows athlete view by default', async () => {
    render(<DashboardPreview />);
    await act(async () => { jest.advanceTimersByTime(10); });
    expect(screen.getByText('Jordan Davis')).toBeInTheDocument();
    expect(screen.getByText('Ohio State University - Football')).toBeInTheDocument();
  });

  it('shows brand view when defaultTab is brand', async () => {
    render(<DashboardPreview defaultTab="brand" />);
    await act(async () => { jest.advanceTimersByTime(10); });
    expect(screen.getByText('Recommended Athletes')).toBeInTheDocument();
  });

  it('switches tabs when clicked', async () => {
    render(<DashboardPreview />);
    await act(async () => { jest.advanceTimersByTime(10); });

    // Start with athlete view
    expect(screen.getByText('Jordan Davis')).toBeInTheDocument();

    // Switch to brand view
    fireEvent.click(screen.getByText('Brand View'));
    expect(screen.getByText('Recommended Athletes')).toBeInTheDocument();

    // Switch back to athlete view
    fireEvent.click(screen.getByText('Athlete View'));
    expect(screen.getByText('Jordan Davis')).toBeInTheDocument();
  });

  it('shows CTA overlay by default', async () => {
    render(<DashboardPreview />);
    await act(async () => { jest.advanceTimersByTime(10); });
    expect(screen.getByText('Sign up to access your dashboard')).toBeInTheDocument();
  });

  it('hides CTA when showCTA is false', async () => {
    render(<DashboardPreview showCTA={false} />);
    await act(async () => { jest.advanceTimersByTime(10); });
    expect(screen.queryByText('Sign up to access your dashboard')).not.toBeInTheDocument();
  });

  it('shows custom CTA text', async () => {
    render(<DashboardPreview ctaText="Get started now" />);
    await act(async () => { jest.advanceTimersByTime(10); });
    expect(screen.getByText('Get started now')).toBeInTheDocument();
  });

  it('has correct CTA link href', async () => {
    render(<DashboardPreview ctaHref="/custom-signup" />);
    await act(async () => { jest.advanceTimersByTime(10); });
    const ctaLink = screen.getByText('Sign up to access your dashboard').closest('a');
    expect(ctaLink).toHaveAttribute('href', '/custom-signup');
  });

  it('applies custom className', async () => {
    const { container } = render(<DashboardPreview className="custom-class" />);
    await act(async () => { jest.advanceTimersByTime(10); });
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('shows PREVIEW badge', async () => {
    render(<DashboardPreview />);
    await act(async () => { jest.advanceTimersByTime(10); });
    expect(screen.getByText('PREVIEW')).toBeInTheDocument();
  });

  it('displays athlete stats', async () => {
    render(<DashboardPreview />);
    await act(async () => { jest.advanceTimersByTime(10); });
    expect(screen.getByText('Total Earnings')).toBeInTheDocument();
    // 'Active Deals' appears twice - once as stat label, once as section header
    expect(screen.getAllByText('Active Deals').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Profile Views')).toBeInTheDocument();
    expect(screen.getByText('NIL Valuation')).toBeInTheDocument();
  });

  it('displays mock deals in athlete view', async () => {
    render(<DashboardPreview />);
    await act(async () => { jest.advanceTimersByTime(10); });
    expect(screen.getByText('Nike')).toBeInTheDocument();
    expect(screen.getByText('Gatorade')).toBeInTheDocument();
    expect(screen.getByText('Under Armour')).toBeInTheDocument();
  });

  it('displays brand stats when in brand view', async () => {
    render(<DashboardPreview />);
    await act(async () => { jest.advanceTimersByTime(10); });

    fireEvent.click(screen.getByText('Brand View'));

    expect(screen.getByText('Total Athletes')).toBeInTheDocument();
    expect(screen.getByText('Campaigns')).toBeInTheDocument();
    expect(screen.getByText('Avg ROI')).toBeInTheDocument();
  });

  it('displays recommended athletes in brand view', async () => {
    render(<DashboardPreview />);
    await act(async () => { jest.advanceTimersByTime(10); });

    fireEvent.click(screen.getByText('Brand View'));

    expect(screen.getByText('Marcus Johnson')).toBeInTheDocument();
    expect(screen.getByText('Sarah Williams')).toBeInTheDocument();
    expect(screen.getByText('James Chen')).toBeInTheDocument();
  });

  it('shows athlete CTA message in athlete view', async () => {
    render(<DashboardPreview />);
    await act(async () => { jest.advanceTimersByTime(10); });
    expect(screen.getByText('Your NIL Journey Starts Here')).toBeInTheDocument();
  });

  it('shows brand CTA message in brand view', async () => {
    render(<DashboardPreview />);
    await act(async () => { jest.advanceTimersByTime(10); });

    fireEvent.click(screen.getByText('Brand View'));

    expect(screen.getByText('Find Your Perfect Athletes')).toBeInTheDocument();
  });

  it('displays pending opportunities section', async () => {
    render(<DashboardPreview />);
    await act(async () => { jest.advanceTimersByTime(10); });
    expect(screen.getByText('Pending Opportunities')).toBeInTheDocument();
    expect(screen.getByText('3 New')).toBeInTheDocument();
  });

  it('displays filter options in brand view', async () => {
    render(<DashboardPreview />);
    await act(async () => { jest.advanceTimersByTime(10); });

    fireEvent.click(screen.getByText('Brand View'));

    expect(screen.getByText('GPA 3.5+')).toBeInTheDocument();
    expect(screen.getByText('Football')).toBeInTheDocument();
    expect(screen.getByText('Basketball')).toBeInTheDocument();
  });

  it('displays campaign performance in brand view', async () => {
    render(<DashboardPreview />);
    await act(async () => { jest.advanceTimersByTime(10); });

    fireEvent.click(screen.getByText('Brand View'));

    expect(screen.getByText('Campaign Performance')).toBeInTheDocument();
    expect(screen.getByText('Total Invested')).toBeInTheDocument();
    expect(screen.getByText('Estimated Value')).toBeInTheDocument();
  });
});
