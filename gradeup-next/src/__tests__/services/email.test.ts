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
    process.env.EMAIL_FROM = 'Test <test@example.com>';
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
      expect(result.error).toBe('Failed to send email');
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('sends password reset email with correct content', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      const result = await sendPasswordResetEmail('user@example.com', 'https://gradeupnil.com/reset?token=abc123');

      expect(result.success).toBe(true);
    });

    it('includes reset link in email body', async () => {
      mockSend.mockImplementation((options) => {
        expect(options.to).toBe('user@example.com');
        expect(options.subject).toBe('Reset Your GradeUp NIL Password');
        expect(options.html).toContain('https://gradeupnil.com/reset?token=abc123');
        return Promise.resolve({ data: { id: 'email-123' }, error: null });
      });

      await sendPasswordResetEmail('user@example.com', 'https://gradeupnil.com/reset?token=abc123');

      expect(mockSend).toHaveBeenCalled();
    });

    it('returns error when email fails', async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: { message: 'Rate limit exceeded' },
      });

      const result = await sendPasswordResetEmail('user@example.com', 'https://gradeupnil.com/reset');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate limit exceeded');
    });
  });

  describe('sendDealNotificationEmail', () => {
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

      const result = await sendWelcomeEmail('john@example.com', 'John Doe', 'athlete');

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalled();
    });

    it('sends welcome email to brand', async () => {
      mockSend.mockImplementation((options) => {
        expect(options.html).toContain('Acme Corp');
        expect(options.html).toContain('brand');
        return Promise.resolve({ data: { id: 'email-123' }, error: null });
      });

      const result = await sendWelcomeEmail('brand@company.com', 'Acme Corp', 'brand');

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalled();
    });

    it('sends welcome email to director', async () => {
      mockSend.mockImplementation((options) => {
        expect(options.html).toContain('Coach Smith');
        expect(options.html).toContain('director');
        return Promise.resolve({ data: { id: 'email-123' }, error: null });
      });

      const result = await sendWelcomeEmail('director@university.edu', 'Coach Smith', 'director');

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalled();
    });

    it('returns error when email fails', async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: { message: 'Service unavailable' },
      });

      const result = await sendWelcomeEmail('user@example.com', 'User', 'athlete');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Service unavailable');
    });
  });
});
