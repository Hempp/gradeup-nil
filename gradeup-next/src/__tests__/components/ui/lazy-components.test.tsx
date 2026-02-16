/**
 * Tests for lazy-loaded components and loading placeholders
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
  it('renders loading placeholder', () => {
    render(<CardLoadingPlaceholder />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading content')).toBeInTheDocument();
  });

  it('has screen reader text', () => {
    render(<CardLoadingPlaceholder />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders skeleton elements', () => {
    const { container } = render(<CardLoadingPlaceholder />);

    // Should have skeleton elements
    const skeletons = container.querySelectorAll('[aria-hidden="true"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe('TableLoadingPlaceholder', () => {
  it('renders loading placeholder', () => {
    render(<TableLoadingPlaceholder />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading table')).toBeInTheDocument();
  });

  it('has screen reader text', () => {
    render(<TableLoadingPlaceholder />);

    expect(screen.getByText('Loading table data...')).toBeInTheDocument();
  });

  it('renders multiple skeleton rows', () => {
    const { container } = render(<TableLoadingPlaceholder />);

    // Should have skeleton elements for multiple rows
    const skeletons = container.querySelectorAll('[aria-hidden="true"]');
    expect(skeletons.length).toBeGreaterThan(5);
  });
});

describe('FilterPanelLoadingPlaceholder', () => {
  it('renders loading placeholder', () => {
    render(<FilterPanelLoadingPlaceholder />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading filters')).toBeInTheDocument();
  });

  it('has screen reader text', () => {
    render(<FilterPanelLoadingPlaceholder />);

    expect(screen.getByText('Loading filter options...')).toBeInTheDocument();
  });

  it('renders skeleton elements', () => {
    const { container } = render(<FilterPanelLoadingPlaceholder />);

    const skeletons = container.querySelectorAll('[aria-hidden="true"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
