/**
 * Tests for the email service
 * @module __tests__/services/email.test
 */

// Mock Resend before importing the module
const mockSend = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: mockSend,
    },
  })),
}));

import {
  sendEmail,
  sendPasswordResetEmail,
  sendDealNotificationEmail,
  sendWelcomeEmail,
  sendWelcomeEmailLegacy,
  sendPasswordResetEmailLegacy,
  sendDealOfferEmail,
  sendDealAcceptedEmail,
  sendDealCompletedEmail,
  sendPaymentReceivedEmail,
  sendVerificationApprovedEmail,
  sendVerificationRejectedEmail,
  sendNewMessageEmail,
  type EmailOptions,
} from '@/lib/services/email';

describe('email service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset module to ensure fresh Resend client instance
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.RESEND_API_KEY = 'test-api-key';
    process.env.EMAIL_FROM_ADDRESS = 'test@example.com';
    process.env.EMAIL_FROM_NAME = 'Test';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('sendEmail', () => {
    it('sends email successfully', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      const options: EmailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<h1>Hello</h1>',
      };

      const result = await sendEmail(options);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 'email-123' });
    });

    it('sends email with text fallback', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      const options: EmailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<h1>Hello</h1>',
        text: 'Hello',
      };

      const result = await sendEmail(options);

      expect(result.success).toBe(true);
    });

    it('sends email to multiple recipients', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      const options: EmailOptions = {
        to: ['user1@example.com', 'user2@example.com'],
        subject: 'Test Subject',
        html: '<h1>Hello</h1>',
      };

      const result = await sendEmail(options);

      expect(result.success).toBe(true);
    });

    it('returns error when RESEND_API_KEY is not configured', async () => {
      delete process.env.RESEND_API_KEY;

      const options: EmailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<h1>Hello</h1>',
      };

      const result = await sendEmail(options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email not configured');
    });

    it('returns error when Resend API returns error', async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: { message: 'Invalid API key' },
      });

      const options: EmailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<h1>Hello</h1>',
      };

      const result = await sendEmail(options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid API key');
    });

    it('handles thrown errors', async () => {
      mockSend.mockRejectedValue(new Error('Network error'));

      const options: EmailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<h1>Hello</h1>',
      };

      const result = await sendEmail(options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('handles non-Error thrown values', async () => {
      mockSend.mockRejectedValue('Unknown error');

      const options: EmailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<h1>Hello</h1>',
      };

      const result = await sendEmail(options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to send email via Resend');
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('sends password reset email with correct content', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      const result = await sendPasswordResetEmail({
        recipientName: 'John Doe',
        recipientEmail: 'user@example.com',
        resetLink: 'https://gradeupnil.com/reset?token=abc123',
        expiresInMinutes: 60,
      });

      expect(result.success).toBe(true);
    });

    it('includes reset link in email body', async () => {
      mockSend.mockImplementation((options) => {
        expect(options.to).toBe('user@example.com');
        expect(options.subject).toBe('Reset Your GradeUp NIL Password');
        expect(options.html).toContain('https://gradeupnil.com/reset?token=abc123');
        return Promise.resolve({ data: { id: 'email-123' }, error: null });
      });

      await sendPasswordResetEmail({
        recipientName: 'John Doe',
        recipientEmail: 'user@example.com',
        resetLink: 'https://gradeupnil.com/reset?token=abc123',
        expiresInMinutes: 60,
      });

      expect(mockSend).toHaveBeenCalled();
    });

    it('returns error when email fails', async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: { message: 'Rate limit exceeded' },
      });

      const result = await sendPasswordResetEmail({
        recipientName: 'John Doe',
        recipientEmail: 'user@example.com',
        resetLink: 'https://gradeupnil.com/reset',
        expiresInMinutes: 60,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate limit exceeded');
    });
  });

  describe('sendPasswordResetEmailLegacy', () => {
    it('sends password reset email using legacy API', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      const result = await sendPasswordResetEmailLegacy(
        'user@example.com',
        'https://gradeupnil.com/reset?token=abc123'
      );

      expect(result.success).toBe(true);
    });
  });

  describe('sendDealNotificationEmail (legacy)', () => {
    it('sends new deal notification email', async () => {
      mockSend.mockImplementation((options) => {
        expect(options.subject).toBe('New Deal Opportunity from Nike');
        return Promise.resolve({ data: { id: 'email-123' }, error: null });
      });

      const result = await sendDealNotificationEmail('athlete@example.com', 'Sponsorship Deal', 'Nike', 'new');

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalled();
    });

    it('sends deal accepted notification email', async () => {
      mockSend.mockImplementation((options) => {
        expect(options.subject).toBe('Your deal "Sponsorship Deal" has been accepted!');
        return Promise.resolve({ data: { id: 'email-123' }, error: null });
      });

      const result = await sendDealNotificationEmail('brand@example.com', 'Sponsorship Deal', 'Nike', 'accepted');

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalled();
    });

    it('sends deal completed notification email', async () => {
      mockSend.mockImplementation((options) => {
        expect(options.subject).toBe('Deal "Sponsorship Deal" completed - Payment incoming!');
        return Promise.resolve({ data: { id: 'email-123' }, error: null });
      });

      const result = await sendDealNotificationEmail('athlete@example.com', 'Sponsorship Deal', 'Nike', 'completed');

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalled();
    });

    it('returns error when email fails', async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: { message: 'Invalid recipient' },
      });

      const result = await sendDealNotificationEmail('invalid@example.com', 'Deal', 'Brand', 'new');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid recipient');
    });
  });

  describe('sendWelcomeEmail', () => {
    it('sends welcome email to athlete', async () => {
      mockSend.mockImplementation((options) => {
        expect(options.subject).toBe('Welcome to GradeUp NIL!');
        expect(options.html).toContain('John Doe');
        expect(options.html).toContain('athlete');
        return Promise.resolve({ data: { id: 'email-123' }, error: null });
      });

      const result = await sendWelcomeEmail({
        recipientName: 'John Doe',
        recipientEmail: 'john@example.com',
        role: 'athlete',
        loginUrl: 'https://gradeupnil.com/login',
      });

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalled();
    });

    it('sends welcome email to brand', async () => {
      mockSend.mockImplementation((options) => {
        expect(options.html).toContain('Acme Corp');
        expect(options.html).toContain('brand');
        return Promise.resolve({ data: { id: 'email-123' }, error: null });
      });

      const result = await sendWelcomeEmail({
        recipientName: 'Acme Corp',
        recipientEmail: 'brand@company.com',
        role: 'brand',
        loginUrl: 'https://gradeupnil.com/login',
      });

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalled();
    });

    it('sends welcome email to director', async () => {
      mockSend.mockImplementation((options) => {
        expect(options.html).toContain('Coach Smith');
        expect(options.html).toContain('director');
        return Promise.resolve({ data: { id: 'email-123' }, error: null });
      });

      const result = await sendWelcomeEmail({
        recipientName: 'Coach Smith',
        recipientEmail: 'director@university.edu',
        role: 'director',
        loginUrl: 'https://gradeupnil.com/login',
      });

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalled();
    });

    it('returns error when email fails', async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: { message: 'Service unavailable' },
      });

      const result = await sendWelcomeEmail({
        recipientName: 'User',
        recipientEmail: 'user@example.com',
        role: 'athlete',
        loginUrl: 'https://gradeupnil.com/login',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Service unavailable');
    });
  });

  describe('sendWelcomeEmailLegacy', () => {
    it('sends welcome email using legacy API', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      const result = await sendWelcomeEmailLegacy('john@example.com', 'John Doe', 'athlete');

      expect(result.success).toBe(true);
    });
  });

  describe('sendDealOfferEmail', () => {
    it('sends deal offer email with correct content', async () => {
      mockSend.mockImplementation((options) => {
        expect(options.subject).toBe('New Deal Opportunity from Nike');
        expect(options.html).toContain('Sponsorship Deal');
        expect(options.html).toContain('$5,000.00');
        return Promise.resolve({ data: { id: 'email-123' }, error: null });
      });

      const result = await sendDealOfferEmail({
        recipientName: 'John Doe',
        recipientEmail: 'john@example.com',
        dealTitle: 'Sponsorship Deal',
        brandName: 'Nike',
        compensationAmount: 5000,
        compensationType: 'Fixed',
        viewDealUrl: 'https://gradeupnil.com/deals/123',
      });

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('sendDealAcceptedEmail', () => {
    it('sends deal accepted email', async () => {
      mockSend.mockImplementation((options) => {
        expect(options.subject).toBe('Your deal "Sponsorship Deal" has been accepted!');
        expect(options.html).toContain('Nike');
        return Promise.resolve({ data: { id: 'email-123' }, error: null });
      });

      const result = await sendDealAcceptedEmail({
        recipientName: 'John Doe',
        recipientEmail: 'john@example.com',
        dealTitle: 'Sponsorship Deal',
        otherPartyName: 'Nike',
        compensationAmount: 5000,
        viewDealUrl: 'https://gradeupnil.com/deals/123',
      });

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('sendDealCompletedEmail', () => {
    it('sends deal completed email', async () => {
      mockSend.mockImplementation((options) => {
        expect(options.subject).toBe('Deal "Sponsorship Deal" completed - Payment incoming!');
        return Promise.resolve({ data: { id: 'email-123' }, error: null });
      });

      const result = await sendDealCompletedEmail({
        recipientName: 'John Doe',
        recipientEmail: 'john@example.com',
        dealTitle: 'Sponsorship Deal',
        brandName: 'Nike',
        athleteName: 'John Doe',
        compensationAmount: 5000,
        completedAt: '2024-01-15',
        viewDealUrl: 'https://gradeupnil.com/deals/123',
      });

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('sendPaymentReceivedEmail', () => {
    it('sends payment received email', async () => {
      mockSend.mockImplementation((options) => {
        expect(options.subject).toBe('Payment Received: $5,000.00');
        expect(options.html).toContain('$5,000.00');
        expect(options.html).toContain('Nike');
        return Promise.resolve({ data: { id: 'email-123' }, error: null });
      });

      const result = await sendPaymentReceivedEmail({
        recipientName: 'John Doe',
        recipientEmail: 'john@example.com',
        amount: 5000,
        dealTitle: 'Sponsorship Deal',
        brandName: 'Nike',
        viewEarningsUrl: 'https://gradeupnil.com/earnings',
      });

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalled();
    });

    it('includes transaction ID when provided', async () => {
      mockSend.mockImplementation((options) => {
        expect(options.html).toContain('txn_12345');
        return Promise.resolve({ data: { id: 'email-123' }, error: null });
      });

      await sendPaymentReceivedEmail({
        recipientName: 'John Doe',
        recipientEmail: 'john@example.com',
        amount: 5000,
        dealTitle: 'Sponsorship Deal',
        brandName: 'Nike',
        transactionId: 'txn_12345',
        viewEarningsUrl: 'https://gradeupnil.com/earnings',
      });

      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('sendVerificationApprovedEmail', () => {
    it('sends verification approved email', async () => {
      mockSend.mockImplementation((options) => {
        expect(options.subject).toBe('School Enrollment Verification Approved');
        expect(options.html).toContain('School Enrollment');
        return Promise.resolve({ data: { id: 'email-123' }, error: null });
      });

      const result = await sendVerificationApprovedEmail({
        recipientName: 'John Doe',
        recipientEmail: 'john@example.com',
        verificationType: 'enrollment',
        verifiedAt: '2024-01-15',
        profileUrl: 'https://gradeupnil.com/profile',
      });

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('sendVerificationRejectedEmail', () => {
    it('sends verification rejected email', async () => {
      mockSend.mockImplementation((options) => {
        expect(options.subject).toBe('Action Required: Academic Records (GPA) Verification');
        expect(options.html).toContain('Academic Records (GPA)');
        return Promise.resolve({ data: { id: 'email-123' }, error: null });
      });

      const result = await sendVerificationRejectedEmail({
        recipientName: 'John Doe',
        recipientEmail: 'john@example.com',
        verificationType: 'grades',
        resubmitUrl: 'https://gradeupnil.com/verify',
      });

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalled();
    });

    it('includes rejection reason when provided', async () => {
      mockSend.mockImplementation((options) => {
        expect(options.html).toContain('Document was illegible');
        return Promise.resolve({ data: { id: 'email-123' }, error: null });
      });

      await sendVerificationRejectedEmail({
        recipientName: 'John Doe',
        recipientEmail: 'john@example.com',
        verificationType: 'grades',
        rejectionReason: 'Document was illegible',
        resubmitUrl: 'https://gradeupnil.com/verify',
      });

      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('sendNewMessageEmail', () => {
    it('sends new message email', async () => {
      mockSend.mockImplementation((options) => {
        expect(options.subject).toBe('New message from Nike Brand Manager');
        expect(options.html).toContain('Hey, we loved your profile');
        return Promise.resolve({ data: { id: 'email-123' }, error: null });
      });

      const result = await sendNewMessageEmail({
        recipientName: 'John Doe',
        recipientEmail: 'john@example.com',
        senderName: 'Nike Brand Manager',
        messagePreview: 'Hey, we loved your profile and wanted to discuss...',
        conversationUrl: 'https://gradeupnil.com/messages/123',
      });

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalled();
    });
  });
});
