/**
 * Tests for ErrorBoundary and error components
 * @module __tests__/components/ui/error-boundary.test
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary, ErrorFallback, InlineError, PageError } from '@/components/ui/error-boundary';

// Component that throws an error for testing
function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>No error</div>;
}

describe('ErrorBoundary', () => {
  // Suppress console.error for error boundary tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders error fallback when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom error UI</div>}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = jest.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalled();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it('provides retry button when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Verify retry button is present
    const retryButton = screen.getByRole('button', { name: /try again/i });
    expect(retryButton).toBeInTheDocument();
  });
});

describe('ErrorFallback', () => {
  it('renders with default message when no error', () => {
    render(<ErrorFallback />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
  });

  it('renders error message', () => {
    const error = new Error('Custom error message');
    render(<ErrorFallback error={error} />);

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('renders retry button when resetError provided', () => {
    const resetError = jest.fn();
    render(<ErrorFallback resetError={resetError} />);

    const button = screen.getByRole('button', { name: /try again/i });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(resetError).toHaveBeenCalled();
  });

  it('does not render retry button when resetError not provided', () => {
    render(<ErrorFallback />);

    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });
});

describe('InlineError', () => {
  it('renders error message', () => {
    render(<InlineError message="Inline error message" />);

    expect(screen.getByText('Inline error message')).toBeInTheDocument();
  });

  it('renders retry button when provided', () => {
    const retry = jest.fn();
    render(<InlineError message="Error" retry={retry} />);

    const button = screen.getByRole('button', { name: /retry/i });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(retry).toHaveBeenCalled();
  });

  it('does not render retry button when not provided', () => {
    render(<InlineError message="Error" />);

    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });
});

describe('PageError', () => {
  it('renders with default title and message', () => {
    render(<PageError />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/We're sorry, but something unexpected happened/)).toBeInTheDocument();
  });

  it('renders custom title and message', () => {
    render(<PageError title="Page Not Found" message="The page you requested does not exist." />);

    expect(screen.getByText('Page Not Found')).toBeInTheDocument();
    expect(screen.getByText('The page you requested does not exist.')).toBeInTheDocument();
  });

  it('renders retry button when provided', () => {
    const retry = jest.fn();
    render(<PageError retry={retry} />);

    const button = screen.getByRole('button', { name: /try again/i });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(retry).toHaveBeenCalled();
  });

  it('renders homepage button', () => {
    render(<PageError />);

    expect(screen.getByRole('button', { name: /go to homepage/i })).toBeInTheDocument();
  });

  it('renders support link', () => {
    render(<PageError />);

    const supportLink = screen.getByRole('link', { name: /contact support/i });
    expect(supportLink).toBeInTheDocument();
    expect(supportLink).toHaveAttribute('href', '/support');
  });
});
