import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VerificationQueue } from '@/components/director/VerificationQueue';
import type { VerificationRequestWithAthlete } from '@/lib/hooks/use-director-verifications';

// Mock functions
const mockApprove = jest.fn().mockResolvedValue({ success: true });
const mockReject = jest.fn().mockResolvedValue({ success: true });
const mockBulkApprove = jest.fn().mockResolvedValue({ approved: 2, failed: 0 });
const mockToggleSelect = jest.fn();
const mockSelectAll = jest.fn();
const mockClearSelection = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();

// Default mock hook return value
const defaultMockHook = {
  requests: [],
  pendingCount: 0,
  loading: false,
  error: null,
  approve: mockApprove,
  reject: mockReject,
  bulkApprove: mockBulkApprove,
  selectedIds: [] as string[],
  toggleSelect: mockToggleSelect,
  selectAll: mockSelectAll,
  clearSelection: mockClearSelection,
};

// Import mock to manipulate it
const mockUseDirectorVerifications = jest.fn(() => defaultMockHook);

jest.mock('@/lib/hooks/use-director-verifications', () => ({
  useDirectorVerifications: () => mockUseDirectorVerifications(),
}));

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

jest.mock('@/components/ui/toast', () => ({
  useToastActions: () => ({
    success: mockToastSuccess,
    error: mockToastError,
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

// Test data
const createMockRequest = (overrides?: Partial<VerificationRequestWithAthlete>): VerificationRequestWithAthlete => ({
  id: 'req-1',
  athlete_id: 'athlete-1',
  type: 'enrollment',
  status: 'pending',
  submitted_at: new Date().toISOString(),
  notes: null,
  athlete: {
    id: 'athlete-1',
    first_name: 'John',
    last_name: 'Doe',
    gpa: 3.8,
    avatar_url: null,
    sport: { id: 'sport-1', name: 'Basketball' },
  },
  ...overrides,
});

describe('VerificationQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDirectorVerifications.mockReturnValue(defaultMockHook);
  });

  describe('rendering states', () => {
    it('renders without crashing', () => {
      render(<VerificationQueue schoolId="school-123" />);
      expect(document.body.textContent).toBeTruthy();
    });

    it('shows loading state', () => {
      mockUseDirectorVerifications.mockReturnValue({
        ...defaultMockHook,
        loading: true,
      });

      render(<VerificationQueue schoolId="school-123" />);

      // Loader should be visible
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('shows error state', () => {
      mockUseDirectorVerifications.mockReturnValue({
        ...defaultMockHook,
        error: new Error('Failed to load'),
      });

      render(<VerificationQueue schoolId="school-123" />);

      expect(screen.getByText(/failed to load verification requests/i)).toBeInTheDocument();
    });

    it('shows empty state when no requests', () => {
      render(<VerificationQueue schoolId="school-123" />);

      expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
      expect(screen.getByText(/no pending verification requests/i)).toBeInTheDocument();
    });

    it('renders the title', () => {
      render(<VerificationQueue schoolId="school-123" />);

      expect(screen.getByText('Verification Requests')).toBeInTheDocument();
    });

    it('shows pending count badge when there are requests', () => {
      mockUseDirectorVerifications.mockReturnValue({
        ...defaultMockHook,
        requests: [createMockRequest()],
        pendingCount: 3,
      });

      render(<VerificationQueue schoolId="school-123" />);

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<VerificationQueue schoolId="school-123" className="custom-class" />);

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('request cards', () => {
    it('renders request card with athlete info', () => {
      const request = createMockRequest();
      mockUseDirectorVerifications.mockReturnValue({
        ...defaultMockHook,
        requests: [request],
        pendingCount: 1,
      });

      render(<VerificationQueue schoolId="school-123" />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Basketball')).toBeInTheDocument();
      expect(screen.getByText('GPA: 3.80')).toBeInTheDocument();
    });

    it('renders verification type badge', () => {
      const request = createMockRequest({ type: 'grades' });
      mockUseDirectorVerifications.mockReturnValue({
        ...defaultMockHook,
        requests: [request],
        pendingCount: 1,
      });

      render(<VerificationQueue schoolId="school-123" />);

      expect(screen.getByText('Grades')).toBeInTheDocument();
    });

    it('displays notes when provided', () => {
      const request = createMockRequest({ notes: 'Please verify my enrollment' });
      mockUseDirectorVerifications.mockReturnValue({
        ...defaultMockHook,
        requests: [request],
        pendingCount: 1,
      });

      render(<VerificationQueue schoolId="school-123" />);

      // Notes are rendered with quotes around them
      expect(screen.getByText(/please verify my enrollment/i)).toBeInTheDocument();
    });

    it('shows approve and reject buttons', () => {
      mockUseDirectorVerifications.mockReturnValue({
        ...defaultMockHook,
        requests: [createMockRequest()],
        pendingCount: 1,
      });

      render(<VerificationQueue schoolId="school-123" />);

      expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
    });

    it('shows checkbox for selection', () => {
      mockUseDirectorVerifications.mockReturnValue({
        ...defaultMockHook,
        requests: [createMockRequest()],
        pendingCount: 1,
      });

      render(<VerificationQueue schoolId="school-123" />);

      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });
  });

  describe('approve action', () => {
    it('calls approve when approve button clicked', async () => {
      const user = userEvent.setup();
      const request = createMockRequest();
      mockUseDirectorVerifications.mockReturnValue({
        ...defaultMockHook,
        requests: [request],
        pendingCount: 1,
      });

      render(<VerificationQueue schoolId="school-123" />);

      await user.click(screen.getByRole('button', { name: /approve/i }));

      await waitFor(() => {
        expect(mockApprove).toHaveBeenCalledWith(request.id, request.athlete_id, request.type);
      });
    });

    it('shows success toast on successful approval', async () => {
      const user = userEvent.setup();
      const request = createMockRequest();
      mockUseDirectorVerifications.mockReturnValue({
        ...defaultMockHook,
        requests: [request],
        pendingCount: 1,
      });

      render(<VerificationQueue schoolId="school-123" />);

      await user.click(screen.getByRole('button', { name: /approve/i }));

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalled();
      });
    });

    it('shows error toast on failed approval', async () => {
      mockApprove.mockResolvedValueOnce({ success: false, error: 'Approval failed' });
      const user = userEvent.setup();
      const request = createMockRequest();
      mockUseDirectorVerifications.mockReturnValue({
        ...defaultMockHook,
        requests: [request],
        pendingCount: 1,
      });

      render(<VerificationQueue schoolId="school-123" />);

      await user.click(screen.getByRole('button', { name: /approve/i }));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalled();
      });
    });
  });

  describe('reject action', () => {
    it('opens reject modal when reject clicked', async () => {
      const user = userEvent.setup();
      mockUseDirectorVerifications.mockReturnValue({
        ...defaultMockHook,
        requests: [createMockRequest()],
        pendingCount: 1,
      });

      render(<VerificationQueue schoolId="school-123" />);

      await user.click(screen.getByRole('button', { name: /^reject$/i }));

      // Modal should show the textarea for reason
      expect(screen.getByPlaceholderText(/enter the reason/i)).toBeInTheDocument();
    });

    it('allows entering rejection reason', async () => {
      const user = userEvent.setup();
      mockUseDirectorVerifications.mockReturnValue({
        ...defaultMockHook,
        requests: [createMockRequest()],
        pendingCount: 1,
      });

      render(<VerificationQueue schoolId="school-123" />);

      await user.click(screen.getByRole('button', { name: /^reject$/i }));

      const textarea = screen.getByPlaceholderText(/enter the reason/i);
      // Use fireEvent.change for reliable value setting
      fireEvent.change(textarea, { target: { value: 'Invalid documentation' } });

      expect(textarea).toHaveValue('Invalid documentation');
    });

    it('calls reject with reason when confirmed', async () => {
      const user = userEvent.setup();
      const request = createMockRequest();
      mockUseDirectorVerifications.mockReturnValue({
        ...defaultMockHook,
        requests: [request],
        pendingCount: 1,
      });

      render(<VerificationQueue schoolId="school-123" />);

      await user.click(screen.getByRole('button', { name: /^reject$/i }));

      const textarea = screen.getByPlaceholderText(/enter the reason/i);
      fireEvent.change(textarea, { target: { value: 'Invalid documentation' } });

      // Find and click the reject button in the modal
      const rejectButtons = screen.getAllByRole('button', { name: /reject verification/i });
      await user.click(rejectButtons[rejectButtons.length - 1]);

      await waitFor(() => {
        expect(mockReject).toHaveBeenCalledWith(request.id, request.athlete_id, request.type, 'Invalid documentation');
      });
    });

    it('closes modal on cancel', async () => {
      const user = userEvent.setup();
      mockUseDirectorVerifications.mockReturnValue({
        ...defaultMockHook,
        requests: [createMockRequest()],
        pendingCount: 1,
      });

      render(<VerificationQueue schoolId="school-123" />);

      await user.click(screen.getByRole('button', { name: /^reject$/i }));

      // Modal should be open with textarea visible
      expect(screen.getByPlaceholderText(/enter the reason/i)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.queryByPlaceholderText(/enter the reason/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('selection', () => {
    it('toggles selection when checkbox clicked', async () => {
      const user = userEvent.setup();
      mockUseDirectorVerifications.mockReturnValue({
        ...defaultMockHook,
        requests: [createMockRequest()],
        pendingCount: 1,
      });

      render(<VerificationQueue schoolId="school-123" />);

      await user.click(screen.getByRole('checkbox'));

      expect(mockToggleSelect).toHaveBeenCalledWith('req-1');
    });

    it('shows select all button when requests exist', () => {
      mockUseDirectorVerifications.mockReturnValue({
        ...defaultMockHook,
        requests: [createMockRequest()],
        pendingCount: 1,
      });

      render(<VerificationQueue schoolId="school-123" />);

      expect(screen.getByRole('button', { name: /select all/i })).toBeInTheDocument();
    });

    it('calls selectAll when select all clicked', async () => {
      const user = userEvent.setup();
      mockUseDirectorVerifications.mockReturnValue({
        ...defaultMockHook,
        requests: [createMockRequest()],
        pendingCount: 1,
      });

      render(<VerificationQueue schoolId="school-123" />);

      await user.click(screen.getByRole('button', { name: /select all/i }));

      expect(mockSelectAll).toHaveBeenCalled();
    });
  });

  describe('bulk actions', () => {
    it('shows bulk action buttons when items selected', () => {
      mockUseDirectorVerifications.mockReturnValue({
        ...defaultMockHook,
        requests: [createMockRequest()],
        pendingCount: 1,
        selectedIds: ['req-1'],
      });

      render(<VerificationQueue schoolId="school-123" />);

      expect(screen.getByText('1 selected')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /approve selected/i })).toBeInTheDocument();
    });

    it('calls clearSelection when clear clicked', async () => {
      const user = userEvent.setup();
      mockUseDirectorVerifications.mockReturnValue({
        ...defaultMockHook,
        requests: [createMockRequest()],
        pendingCount: 1,
        selectedIds: ['req-1'],
      });

      render(<VerificationQueue schoolId="school-123" />);

      await user.click(screen.getByRole('button', { name: /clear/i }));

      expect(mockClearSelection).toHaveBeenCalled();
    });

    it('calls bulkApprove when approve selected clicked', async () => {
      const user = userEvent.setup();
      mockUseDirectorVerifications.mockReturnValue({
        ...defaultMockHook,
        requests: [createMockRequest(), createMockRequest({ id: 'req-2', athlete_id: 'athlete-2' })],
        pendingCount: 2,
        selectedIds: ['req-1', 'req-2'],
      });

      render(<VerificationQueue schoolId="school-123" />);

      await user.click(screen.getByRole('button', { name: /approve selected/i }));

      await waitFor(() => {
        expect(mockBulkApprove).toHaveBeenCalledWith(['req-1', 'req-2']);
      });
    });

    it('shows success toast after bulk approval', async () => {
      const user = userEvent.setup();
      mockUseDirectorVerifications.mockReturnValue({
        ...defaultMockHook,
        requests: [createMockRequest()],
        pendingCount: 1,
        selectedIds: ['req-1'],
      });

      render(<VerificationQueue schoolId="school-123" />);

      await user.click(screen.getByRole('button', { name: /approve selected/i }));

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('verification types', () => {
    it.each([
      ['enrollment', 'Enrollment'],
      ['grades', 'Grades'],
      ['sport', 'Sport Participation'],
      ['stats', 'Athletic Stats'],
    ])('renders %s type correctly', (type, label) => {
      mockUseDirectorVerifications.mockReturnValue({
        ...defaultMockHook,
        requests: [createMockRequest({ type: type as 'enrollment' | 'grades' | 'sport' | 'stats' })],
        pendingCount: 1,
      });

      render(<VerificationQueue schoolId="school-123" />);

      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });
});
