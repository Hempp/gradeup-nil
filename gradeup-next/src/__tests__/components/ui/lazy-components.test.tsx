/**
 * Tests for the lazy-components loading placeholders
 * @module __tests__/components/ui/lazy-components.test
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  CardLoadingPlaceholder,
  TableLoadingPlaceholder,
  FilterPanelLoadingPlaceholder,
} from '@/components/ui/lazy-components';

describe('CardLoadingPlaceholder', () => {
  it('renders with loading role', () => {
    render(<CardLoadingPlaceholder />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading content')).toBeInTheDocument();
  });

  it('has accessible loading message', () => {
    render(<CardLoadingPlaceholder />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders skeleton elements', () => {
    const { container } = render(<CardLoadingPlaceholder />);
    // Check for multiple aria-hidden elements (skeletons have aria-hidden)
    const skeletons = container.querySelectorAll('[aria-hidden="true"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });
});

describe('TableLoadingPlaceholder', () => {
  it('renders with loading role', () => {
    render(<TableLoadingPlaceholder />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading table')).toBeInTheDocument();
  });

  it('has accessible loading message', () => {
    render(<TableLoadingPlaceholder />);
    expect(screen.getByText('Loading table data...')).toBeInTheDocument();
  });

  it('renders multiple rows of skeletons', () => {
    const { container } = render(<TableLoadingPlaceholder />);
    // Should render 5 rows of skeletons
    const rows = container.querySelectorAll('.flex.gap-4');
    expect(rows.length).toBe(5);
  });
});

describe('FilterPanelLoadingPlaceholder', () => {
  it('renders with loading role', () => {
    render(<FilterPanelLoadingPlaceholder />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading filters')).toBeInTheDocument();
  });

  it('has accessible loading message', () => {
    render(<FilterPanelLoadingPlaceholder />);
    expect(screen.getByText('Loading filter options...')).toBeInTheDocument();
  });

  it('renders skeleton elements', () => {
    const { container } = render(<FilterPanelLoadingPlaceholder />);
    // Check for multiple aria-hidden elements (skeletons have aria-hidden)
    const skeletons = container.querySelectorAll('[aria-hidden="true"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });
});
