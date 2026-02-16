import { render, screen, fireEvent } from '@testing-library/react';
import {
  ErrorState,
  NetworkError,
  ServerError,
  DataLoadError,
  PermissionError,
  GenericError,
} from '@/components/ui/error-state';
import { AlertCircle } from 'lucide-react';

describe('ErrorState', () => {
  it('renders with default generic error type', () => {
    render(<ErrorState />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/unexpected error occurred/i)).toBeInTheDocument();
  });

  it('renders with custom title', () => {
    render(<ErrorState title="Custom Error Title" />);

    expect(screen.getByText('Custom Error Title')).toBeInTheDocument();
  });

  it('renders with custom description', () => {
    render(<ErrorState description="Custom error description." />);

    expect(screen.getByText('Custom error description.')).toBeInTheDocument();
  });

  it('renders with custom icon', () => {
    render(<ErrorState icon={AlertCircle} />);

    // Icon is rendered inside a container - lucide-react icons are SVGs
    // The component renders Icon with aria-hidden="true" directly on the svg
    const icon = document.querySelector('svg[aria-hidden="true"]');
    expect(icon).toBeInTheDocument();
  });

  it('renders retry button when onRetry is provided', () => {
    const handleRetry = jest.fn();
    render(<ErrorState onRetry={handleRetry} />);

    const button = screen.getByRole('button', { name: /try again/i });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('does not render retry button when onRetry is not provided', () => {
    render(<ErrorState />);

    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('renders custom retry label', () => {
    render(<ErrorState onRetry={jest.fn()} retryLabel="Retry Now" />);

    expect(screen.getByRole('button', { name: /retry now/i })).toBeInTheDocument();
  });

  it('shows retrying state', () => {
    render(<ErrorState onRetry={jest.fn()} isRetrying={true} />);

    const button = screen.getByRole('button', { name: /retrying/i });
    expect(button).toBeDisabled();
    expect(screen.getByText('Retrying...')).toBeInTheDocument();
  });

  it('renders additional action button', () => {
    const handleAction = jest.fn();
    render(
      <ErrorState
        action={{
          label: 'Go Home',
          onClick: handleAction,
        }}
      />
    );

    const button = screen.getByRole('button', { name: /go home/i });
    fireEvent.click(button);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it('has proper accessibility attributes', () => {
    render(<ErrorState />);

    const container = screen.getByRole('alert');
    expect(container).toHaveAttribute('aria-live', 'assertive');
  });

  it('applies custom className', () => {
    render(<ErrorState className="custom-error-class" />);

    expect(screen.getByRole('alert')).toHaveClass('custom-error-class');
  });

  it('forwards ref correctly', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<ErrorState ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  describe('error types', () => {
    it('renders network error type', () => {
      render(<ErrorState errorType="network" />);

      expect(screen.getByText('Connection error')).toBeInTheDocument();
      expect(screen.getByText(/check your internet/i)).toBeInTheDocument();
    });

    it('renders server error type', () => {
      render(<ErrorState errorType="server" />);

      expect(screen.getByText('Server error')).toBeInTheDocument();
      expect(screen.getByText(/servers are having trouble/i)).toBeInTheDocument();
    });

    it('renders permission error type', () => {
      render(<ErrorState errorType="permission" />);

      expect(screen.getByText('Access denied')).toBeInTheDocument();
      expect(screen.getByText(/do not have permission/i)).toBeInTheDocument();
    });

    it('renders data error type', () => {
      render(<ErrorState errorType="data" />);

      expect(screen.getByText('Failed to load data')).toBeInTheDocument();
      expect(screen.getByText(/could not load/i)).toBeInTheDocument();
    });
  });
});

describe('NetworkError', () => {
  it('renders network error content', () => {
    render(<NetworkError />);

    expect(screen.getByText('Connection error')).toBeInTheDocument();
  });

  it('renders retry button when onRetry provided', () => {
    const handleRetry = jest.fn();
    render(<NetworkError onRetry={handleRetry} />);

    const button = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(button);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('shows retrying state', () => {
    render(<NetworkError onRetry={jest.fn()} isRetrying={true} />);

    expect(screen.getByText('Retrying...')).toBeInTheDocument();
  });
});

describe('ServerError', () => {
  it('renders server error content', () => {
    render(<ServerError />);

    expect(screen.getByText('Server error')).toBeInTheDocument();
  });

  it('renders retry button when onRetry provided', () => {
    const handleRetry = jest.fn();
    render(<ServerError onRetry={handleRetry} />);

    const button = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(button);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});

describe('DataLoadError', () => {
  it('renders data load error content', () => {
    render(<DataLoadError />);

    expect(screen.getByText('Failed to load data')).toBeInTheDocument();
  });

  it('renders with custom resource name', () => {
    render(<DataLoadError resourceName="athletes" />);

    expect(screen.getByText(/could not load your athletes/i)).toBeInTheDocument();
  });

  it('renders retry button when onRetry provided', () => {
    const handleRetry = jest.fn();
    render(<DataLoadError onRetry={handleRetry} />);

    const button = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(button);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});

describe('PermissionError', () => {
  it('renders permission error content', () => {
    render(<PermissionError />);

    expect(screen.getByText('Access denied')).toBeInTheDocument();
  });

  it('renders action button when provided', () => {
    const handleAction = jest.fn();
    render(
      <PermissionError
        action={{
          label: 'Request Access',
          onClick: handleAction,
        }}
      />
    );

    const button = screen.getByRole('button', { name: /request access/i });
    fireEvent.click(button);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });
});

describe('GenericError', () => {
  it('renders generic error content', () => {
    render(<GenericError />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders with custom title', () => {
    render(<GenericError title="Oops!" />);

    expect(screen.getByText('Oops!')).toBeInTheDocument();
  });

  it('renders with custom description', () => {
    render(<GenericError description="Please try again later." />);

    expect(screen.getByText('Please try again later.')).toBeInTheDocument();
  });

  it('renders retry button when onRetry provided', () => {
    const handleRetry = jest.fn();
    render(<GenericError onRetry={handleRetry} />);

    const button = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(button);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});
