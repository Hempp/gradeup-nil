import { render, screen } from '@testing-library/react';
import { VerificationQueue } from '@/components/director/VerificationQueue';

// Mock the hooks
jest.mock('@/lib/hooks/use-director-verifications', () => ({
  useDirectorVerifications: jest.fn(() => ({
    requests: [],
    pendingCount: 0,
    loading: false,
    error: null,
    approve: jest.fn().mockResolvedValue({ success: true }),
    reject: jest.fn().mockResolvedValue({ success: true }),
    bulkApprove: jest.fn().mockResolvedValue({ approved: 0, failed: 0 }),
    selectedIds: [],
    toggleSelect: jest.fn(),
    selectAll: jest.fn(),
    clearSelection: jest.fn(),
  })),
}));

jest.mock('@/lib/hooks/use-verification-requests', () => ({
  getVerificationLabel: (type: string) => {
    const labels: Record<string, string> = {
      enrollment: 'Enrollment',
      grades: 'Grades',
      sport: 'Sport Participation',
      stats: 'Athletic Stats',
    };
    return labels[type] || type;
  },
}));

jest.mock('@/components/ui/toast', () => ({
  useToastActions: () => ({
    success: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

describe('VerificationQueue', () => {
  it('renders without crashing', () => {
    render(<VerificationQueue schoolId="school-123" />);
    expect(document.body.textContent).toBeTruthy();
  });

  it('shows empty state when no requests', () => {
    render(<VerificationQueue schoolId="school-123" />);

    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
  });

  it('renders the title', () => {
    render(<VerificationQueue schoolId="school-123" />);

    expect(screen.getByText('Verification Requests')).toBeInTheDocument();
  });
});
