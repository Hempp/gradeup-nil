/**
 * Tests for offline page
 * @module __tests__/pages/offline.test
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import OfflinePage from '@/app/offline/page';

describe('OfflinePage', () => {
  it('renders offline message', () => {
    render(<OfflinePage />);

    expect(screen.getByRole('heading', { name: /you're offline/i })).toBeInTheDocument();
    expect(screen.getByText(/lost your internet connection/i)).toBeInTheDocument();
  });

  it('displays wifi off icon', () => {
    render(<OfflinePage />);

    // The WifiOff icon should be present (as an SVG)
    const container = document.querySelector('.h-10.w-10');
    expect(container).toBeInTheDocument();
  });

  it('has a Try Again button', () => {
    render(<OfflinePage />);

    const button = screen.getByRole('button', { name: /try again/i });
    expect(button).toBeInTheDocument();
  });

  it('button is clickable', () => {
    render(<OfflinePage />);

    const button = screen.getByRole('button', { name: /try again/i });
    // Button should be enabled and clickable
    expect(button).not.toBeDisabled();
  });

  it('shows helpful tip about checking connection', () => {
    render(<OfflinePage />);

    expect(screen.getByText(/check your wi-fi or mobile data/i)).toBeInTheDocument();
  });
});
