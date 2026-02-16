/**
 * Tests for the lazy-dashboard-preview component
 * @module __tests__/components/marketing/lazy-dashboard-preview.test
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DashboardPreviewLoadingPlaceholder } from '@/components/marketing/lazy-dashboard-preview';

describe('DashboardPreviewLoadingPlaceholder', () => {
  it('renders with loading role', () => {
    render(<DashboardPreviewLoadingPlaceholder />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading dashboard preview')).toBeInTheDocument();
  });

  it('has accessible loading message', () => {
    render(<DashboardPreviewLoadingPlaceholder />);
    expect(screen.getByText('Loading dashboard preview...')).toBeInTheDocument();
  });

  it('renders profile skeleton', () => {
    const { container } = render(<DashboardPreviewLoadingPlaceholder />);
    // Check for round avatar skeleton
    const roundSkeleton = container.querySelector('[class*="rounded-full"]');
    expect(roundSkeleton).toBeInTheDocument();
  });

  it('renders stats grid with 4 items', () => {
    const { container } = render(<DashboardPreviewLoadingPlaceholder />);
    // Look for the grid container
    const gridContainer = container.querySelector('.grid.grid-cols-2');
    expect(gridContainer).toBeInTheDocument();
    expect(gridContainer?.children.length).toBe(4);
  });

  it('renders deals skeleton with 3 items', () => {
    const { container } = render(<DashboardPreviewLoadingPlaceholder />);
    // Look for deal items (they have rounded-lg class on the outer container)
    const dealItems = container.querySelectorAll('[class*="bg-\\[var\\(--marketing-gray-800\\)\\]"]');
    // There might be multiple elements with this class, but we should have at least 3
    expect(dealItems.length).toBeGreaterThanOrEqual(3);
  });

  it('renders tab switcher skeleton', () => {
    const { container } = render(<DashboardPreviewLoadingPlaceholder />);
    // Check for flex items in the tab switcher area
    const tabArea = container.querySelector('[class*="border-b"]');
    expect(tabArea).toBeInTheDocument();
  });
});
