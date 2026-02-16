import { render } from '@testing-library/react';
import { VerificationStatusCard } from '@/components/athlete/VerificationStatusCard';

// Mock the hooks
jest.mock('@/lib/hooks/use-verification-requests', () => ({
  useVerificationRequests: jest.fn(() => ({
    status: {
      enrollment_verified: true,
      sport_verified: false,
      grades_verified: true,
      identity_verified: false,
      stats_verified: false,
      pending_requests: [],
    },
    loading: false,
    canRequestVerification: jest.fn(() => true),
    submitRequest: jest.fn().mockResolvedValue({ success: true }),
  })),
}));

describe('VerificationStatusCard', () => {
  it('renders without crashing', () => {
    render(<VerificationStatusCard athleteId="test-athlete-1" />);
    expect(document.body.textContent).toBeTruthy();
  });
});
