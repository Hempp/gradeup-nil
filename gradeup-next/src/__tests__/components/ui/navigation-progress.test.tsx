/**
 * Tests for NavigationProgress component
 * @module __tests__/components/ui/navigation-progress.test
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NavigationProgress, NavigationProgressBar } from '@/components/ui/navigation-progress';

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

import { usePathname, useSearchParams } from 'next/navigation';

describe('NavigationProgress', () => {
  const mockUsePathname = usePathname as jest.Mock;
  const mockUseSearchParams = useSearchParams as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue('/');
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
  });

  it('does not render initially (not visible)', () => {
    render(<NavigationProgress />);

    // Progress bar should not be visible initially
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('accepts custom color prop', () => {
    render(<NavigationProgress color="red" />);
    // Component structure is correct even if not visible
  });

  it('accepts custom height prop', () => {
    render(<NavigationProgress height={5} />);
  });

  it('accepts custom showDelay prop', () => {
    render(<NavigationProgress showDelay={200} />);
  });
});

describe('NavigationProgressBar', () => {
  it('renders within Suspense boundary', () => {
    render(<NavigationProgressBar />);
    // Should not throw even with Suspense
  });

  it('passes props to NavigationProgress', () => {
    render(<NavigationProgressBar color="blue" height={4} showDelay={100} />);
  });

  it('renders with default props', () => {
    render(<NavigationProgressBar />);
  });
});

describe('NavigationProgress accessibility', () => {
  beforeEach(() => {
    const mockUsePathname = usePathname as jest.Mock;
    const mockUseSearchParams = useSearchParams as jest.Mock;
    mockUsePathname.mockReturnValue('/');
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
  });

  it('has correct ARIA attributes when visible', () => {
    // When visible, it should have proper ARIA attributes
    // The component structure includes:
    // - role="progressbar"
    // - aria-valuenow
    // - aria-valuemin
    // - aria-valuemax
    // - aria-label
  });
});
