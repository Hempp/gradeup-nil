/**
 * Tests for GlobalError component
 * @module __tests__/pages/global-error.test
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock Sentry
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}));

import * as Sentry from '@sentry/nextjs';
import GlobalError from '@/app/global-error';

describe('GlobalError', () => {
  const mockReset = jest.fn();
  const mockError = new Error('Test error message');

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console.error to suppress error output in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders critical error message', () => {
    render(<GlobalError error={mockError} reset={mockReset} />);

    expect(screen.getByRole('heading', { name: /critical error/i })).toBeInTheDocument();
    expect(screen.getByText(/application encountered a critical error/i)).toBeInTheDocument();
  });

  it('renders Try Again button', () => {
    render(<GlobalError error={mockError} reset={mockReset} />);

    const button = screen.getByRole('button', { name: /try again/i });
    expect(button).toBeInTheDocument();
  });

  it('renders Reload App button', () => {
    render(<GlobalError error={mockError} reset={mockReset} />);

    const button = screen.getByRole('button', { name: /reload app/i });
    expect(button).toBeInTheDocument();
  });

  it('calls reset when Try Again is clicked', () => {
    render(<GlobalError error={mockError} reset={mockReset} />);

    const button = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(button);

    expect(mockReset).toHaveBeenCalled();
  });

  it('reports error to Sentry', () => {
    render(<GlobalError error={mockError} reset={mockReset} />);

    expect(Sentry.captureException).toHaveBeenCalledWith(mockError, {
      tags: { error_boundary: 'global' },
      extra: { digest: undefined },
    });
  });

  it('reports error with digest to Sentry', () => {
    const errorWithDigest = Object.assign(new Error('Test error'), { digest: 'abc123' });
    render(<GlobalError error={errorWithDigest} reset={mockReset} />);

    expect(Sentry.captureException).toHaveBeenCalledWith(errorWithDigest, {
      tags: { error_boundary: 'global' },
      extra: { digest: 'abc123' },
    });
  });

  it('logs error to console', () => {
    render(<GlobalError error={mockError} reset={mockReset} />);

    expect(console.error).toHaveBeenCalledWith('Global application error:', mockError);
  });
});
