/**
 * Tests for MarketingEmptyState component
 * @module __tests__/components/marketing/empty-state.test
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MarketingEmptyState } from '@/components/marketing/EmptyState';

describe('MarketingEmptyState', () => {
  it('renders no-results variant by default', () => {
    render(<MarketingEmptyState />);

    expect(screen.getByRole('heading', { name: /no matching opportunities/i })).toBeInTheDocument();
    expect(screen.getByText(/couldn't find opportunities matching your search/i)).toBeInTheDocument();
  });

  it('renders no-opportunities variant', () => {
    render(<MarketingEmptyState variant="no-opportunities" />);

    expect(screen.getByRole('heading', { name: /no opportunities available/i })).toBeInTheDocument();
    expect(screen.getByText(/new opportunities are added regularly/i)).toBeInTheDocument();
  });

  it('renders error variant', () => {
    render(<MarketingEmptyState variant="error" />);

    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();
    expect(screen.getByText(/had trouble loading opportunities/i)).toBeInTheDocument();
  });

  it('renders loading-failed variant', () => {
    render(<MarketingEmptyState variant="loading-failed" />);

    expect(screen.getByRole('heading', { name: /failed to load/i })).toBeInTheDocument();
    expect(screen.getByText(/couldn't load the opportunities/i)).toBeInTheDocument();
  });

  it('uses custom title and description', () => {
    render(
      <MarketingEmptyState
        title="Custom Title"
        description="Custom description text"
      />
    );

    expect(screen.getByRole('heading', { name: /custom title/i })).toBeInTheDocument();
    expect(screen.getByText(/custom description text/i)).toBeInTheDocument();
  });

  it('includes search query in description', () => {
    render(<MarketingEmptyState searchQuery="basketball" />);

    expect(screen.getByText(/no opportunities found for "basketball"/i)).toBeInTheDocument();
  });

  it('renders Clear Filters button when onClearFilters provided', () => {
    const onClearFilters = jest.fn();
    render(<MarketingEmptyState onClearFilters={onClearFilters} />);

    const button = screen.getByRole('button', { name: /clear filters/i });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(onClearFilters).toHaveBeenCalled();
  });

  it('renders Try Again button when onRetry provided', () => {
    const onRetry = jest.fn();
    render(<MarketingEmptyState onRetry={onRetry} />);

    const button = screen.getByRole('button', { name: /try again/i });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(onRetry).toHaveBeenCalled();
  });

  it('renders signup CTA by default', () => {
    render(<MarketingEmptyState />);

    expect(screen.getByRole('link', { name: /get notified of new deals/i })).toBeInTheDocument();
  });

  it('hides signup CTA when showSignupCTA is false', () => {
    render(<MarketingEmptyState showSignupCTA={false} />);

    expect(screen.queryByRole('link', { name: /get notified of new deals/i })).not.toBeInTheDocument();
  });

  it('shows tips for no-results variant', () => {
    render(<MarketingEmptyState variant="no-results" />);

    expect(screen.getByText(/tips for finding opportunities/i)).toBeInTheDocument();
    expect(screen.getByText(/try broader search terms/i)).toBeInTheDocument();
  });

  it('does not show tips for other variants', () => {
    render(<MarketingEmptyState variant="error" />);

    expect(screen.queryByText(/tips for finding opportunities/i)).not.toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<MarketingEmptyState />);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('applies custom className', () => {
    render(<MarketingEmptyState className="custom-class" />);

    const status = screen.getByRole('status');
    expect(status).toHaveClass('custom-class');
  });
});
