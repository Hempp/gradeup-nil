import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VerificationRequestModal } from '@/components/athlete/VerificationRequestModal';

// Mock the hook
jest.mock('@/lib/hooks/use-verification-requests', () => ({
  getVerificationLabel: (type: string) => {
    const labels: Record<string, string> = {
      enrollment: 'Enrollment',
      grades: 'Grades',
      sport: 'Sport Participation',
      stats: 'Athletic Stats',
      identity: 'Identity',
      ncaa_eligibility: 'NCAA Eligibility',
    };
    return labels[type] || type;
  },
}));

describe('VerificationRequestModal', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    type: 'enrollment' as const,
    onSubmit: jest.fn().mockResolvedValue({ success: true }),
    submitting: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal when open', () => {
    render(<VerificationRequestModal {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/request enrollment verification/i)).toBeInTheDocument();
  });

  it('does not render when type is null', () => {
    render(<VerificationRequestModal {...defaultProps} type={null} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows description based on verification type', () => {
    render(<VerificationRequestModal {...defaultProps} />);

    expect(screen.getByText(/athletic director will verify your current enrollment status/i)).toBeInTheDocument();
  });

  it('renders textarea for notes', () => {
    render(<VerificationRequestModal {...defaultProps} />);

    expect(screen.getByPlaceholderText(/add any notes or context/i)).toBeInTheDocument();
  });

  it('allows entering notes', () => {
    render(<VerificationRequestModal {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(/add any notes or context/i);
    fireEvent.change(textarea, { target: { value: 'Test notes' } });

    expect(textarea).toHaveValue('Test notes');
  });

  it('calls onSubmit when send button is clicked', async () => {
    const onSubmit = jest.fn().mockResolvedValue({ success: true });
    render(<VerificationRequestModal {...defaultProps} onSubmit={onSubmit} />);

    const submitButton = screen.getByRole('button', { name: /send request/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
  });

  it('shows loading state when submitting', () => {
    render(<VerificationRequestModal {...defaultProps} submitting={true} />);

    expect(screen.getByText(/sending/i)).toBeInTheDocument();
  });

  it('disables buttons when submitting', () => {
    render(<VerificationRequestModal {...defaultProps} submitting={true} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    expect(cancelButton).toBeDisabled();
  });

  it('shows success state after successful submission', async () => {
    jest.useFakeTimers();
    const onSubmit = jest.fn().mockResolvedValue({ success: true });
    render(<VerificationRequestModal {...defaultProps} onSubmit={onSubmit} />);

    const submitButton = screen.getByRole('button', { name: /send request/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/request sent/i)).toBeInTheDocument();
    });

    jest.useRealTimers();
  });

  it('shows error message on failed submission', async () => {
    const onSubmit = jest.fn().mockResolvedValue({ success: false, error: 'Something went wrong' });
    render(<VerificationRequestModal {...defaultProps} onSubmit={onSubmit} />);

    const submitButton = screen.getByRole('button', { name: /send request/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  it('calls onOpenChange when cancel is clicked', () => {
    const onOpenChange = jest.fn();
    render(<VerificationRequestModal {...defaultProps} onOpenChange={onOpenChange} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('renders different verification types correctly', () => {
    const { rerender } = render(<VerificationRequestModal {...defaultProps} type="grades" />);
    expect(screen.getByText(/request grades verification/i)).toBeInTheDocument();

    rerender(<VerificationRequestModal {...defaultProps} type="sport" />);
    expect(screen.getByText(/request sport participation verification/i)).toBeInTheDocument();
  });
});
