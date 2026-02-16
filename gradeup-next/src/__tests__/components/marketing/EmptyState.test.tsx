/**
 * Tests for the MarketingEmptyState component
 * @module __tests__/components/marketing/EmptyState.test
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MarketingEmptyState } from '@/components/marketing/EmptyState';

describe('MarketingEmptyState', () => {
  describe('default variant (no-results)', () => {
    it('renders with default no-results content', () => {
      render(<MarketingEmptyState />);

      expect(screen.getByText('No matching opportunities')).toBeInTheDocument();
      expect(screen.getByText(/couldn't find opportunities matching your search/i)).toBeInTheDocument();
    });

    it('shows tips for finding opportunities', () => {
      render(<MarketingEmptyState />);

      expect(screen.getByText(/tips for finding opportunities/i)).toBeInTheDocument();
      expect(screen.getByText(/try broader search terms/i)).toBeInTheDocument();
    });
  });

  describe('no-opportunities variant', () => {
    it('renders no-opportunities content', () => {
      render(<MarketingEmptyState variant="no-opportunities" />);

      expect(screen.getByText('No opportunities available')).toBeInTheDocument();
      expect(screen.getByText(/new opportunities are added regularly/i)).toBeInTheDocument();
    });

    it('does not show tips for no-opportunities variant', () => {
      render(<MarketingEmptyState variant="no-opportunities" />);

      expect(screen.queryByText(/tips for finding opportunities/i)).not.toBeInTheDocument();
    });
  });

  describe('error variant', () => {
    it('renders error content', () => {
      render(<MarketingEmptyState variant="error" />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/trouble loading opportunities/i)).toBeInTheDocument();
    });
  });

  describe('loading-failed variant', () => {
    it('renders loading-failed content', () => {
      render(<MarketingEmptyState variant="loading-failed" />);

      expect(screen.getByText('Failed to load')).toBeInTheDocument();
      expect(screen.getByText(/couldn't load the opportunities/i)).toBeInTheDocument();
    });
  });

  describe('custom content', () => {
    it('renders custom title', () => {
      render(<MarketingEmptyState title="Custom Title" />);

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('renders custom description', () => {
      render(<MarketingEmptyState description="Custom description text" />);

      expect(screen.getByText('Custom description text')).toBeInTheDocument();
    });

    it('renders custom title and description together', () => {
      render(
        <MarketingEmptyState
          title="Custom Title"
          description="Custom description"
        />
      );

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
      expect(screen.getByText('Custom description')).toBeInTheDocument();
    });
  });

  describe('search query', () => {
    it('includes search query in description', () => {
      render(<MarketingEmptyState searchQuery="basketball" />);

      expect(screen.getByText(/basketball/i)).toBeInTheDocument();
    });
  });

  describe('clear filters button', () => {
    it('shows clear filters button when onClearFilters is provided', () => {
      const mockClearFilters = jest.fn();
      render(<MarketingEmptyState onClearFilters={mockClearFilters} />);

      expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
    });

    it('calls onClearFilters when button clicked', async () => {
      const user = userEvent.setup();
      const mockClearFilters = jest.fn();
      render(<MarketingEmptyState onClearFilters={mockClearFilters} />);

      await user.click(screen.getByRole('button', { name: /clear filters/i }));

      expect(mockClearFilters).toHaveBeenCalled();
    });

    it('does not show clear filters button when onClearFilters is not provided', () => {
      render(<MarketingEmptyState />);

      expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();
    });
  });

  describe('retry button', () => {
    it('shows retry button for error variant', () => {
      const mockRetry = jest.fn();
      render(<MarketingEmptyState variant="error" onRetry={mockRetry} />);

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('shows retry button for loading-failed variant', () => {
      const mockRetry = jest.fn();
      render(<MarketingEmptyState variant="loading-failed" onRetry={mockRetry} />);

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('calls onRetry when button clicked', async () => {
      const user = userEvent.setup();
      const mockRetry = jest.fn();
      render(<MarketingEmptyState variant="error" onRetry={mockRetry} />);

      await user.click(screen.getByRole('button', { name: /try again/i }));

      expect(mockRetry).toHaveBeenCalled();
    });
  });

  describe('signup CTA', () => {
    it('shows signup CTA by default (showSignupCTA defaults to true)', () => {
      render(<MarketingEmptyState />);

      expect(screen.getByText(/get notified of new deals/i)).toBeInTheDocument();
    });

    it('does not show signup CTA when showSignupCTA is false', () => {
      render(<MarketingEmptyState showSignupCTA={false} />);

      expect(screen.queryByText(/get notified of new deals/i)).not.toBeInTheDocument();
    });
  });

  describe('className prop', () => {
    it('applies custom className', () => {
      const { container } = render(<MarketingEmptyState className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('accessibility', () => {
    it('has status role for screen readers', () => {
      render(<MarketingEmptyState />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('has aria-live polite for accessibility', () => {
      render(<MarketingEmptyState />);

      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-live', 'polite');
    });
  });
});
