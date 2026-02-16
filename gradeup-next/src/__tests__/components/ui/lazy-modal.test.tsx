/**
 * Tests for the LazyModal component
 * @module __tests__/components/ui/lazy-modal.test
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ModalLoadingPlaceholder } from '@/components/ui/lazy-modal';

describe('ModalLoadingPlaceholder', () => {
  it('renders loading placeholder', () => {
    render(<ModalLoadingPlaceholder />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading modal')).toBeInTheDocument();
  });

  it('has accessible loading message', () => {
    render(<ModalLoadingPlaceholder />);
    expect(screen.getByText('Loading modal content...')).toBeInTheDocument();
  });

  it('renders skeleton elements', () => {
    const { container } = render(<ModalLoadingPlaceholder />);
    // Check for skeleton elements (rounded classes used in skeleton component)
    const skeletons = container.querySelectorAll('[class*="rounded"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });
});
