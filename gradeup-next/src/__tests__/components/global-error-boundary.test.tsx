/**
 * Tests for GlobalError component
 * @module __tests__/components/global-error-boundary.test
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock Sentry
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}));

import * as Sentry from '@sentry/nextjs';
import GlobalError from '@/components/global-error-boundary';

describe('GlobalError', () => {
  const mockReset = jest.fn();
  const mockError = new Error('Test error');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders error message', () => {
    render(<GlobalError error={mockError} reset={mockReset} />);

    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();
    expect(screen.getByText(/apologize for the inconvenience/i)).toBeInTheDocument();
  });

  it('renders Try Again button', () => {
    render(<GlobalError error={mockError} reset={mockReset} />);

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('renders Go Home button', () => {
    render(<GlobalError error={mockError} reset={mockReset} />);

    expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument();
  });

  it('calls reset when Try Again is clicked', () => {
    render(<GlobalError error={mockError} reset={mockReset} />);

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(mockReset).toHaveBeenCalled();
  });

  it('reports error to Sentry', () => {
    render(<GlobalError error={mockError} reset={mockReset} />);

    expect(Sentry.captureException).toHaveBeenCalledWith(mockError);
  });

  it('shows error digest when available', () => {
    const errorWithDigest = Object.assign(new Error('Test'), { digest: 'error-123' });
    render(<GlobalError error={errorWithDigest} reset={mockReset} />);

    expect(screen.getByText(/error id: error-123/i)).toBeInTheDocument();
  });

  it('does not show error digest when not available', () => {
    render(<GlobalError error={mockError} reset={mockReset} />);

    expect(screen.queryByText(/error id:/i)).not.toBeInTheDocument();
  });
});
