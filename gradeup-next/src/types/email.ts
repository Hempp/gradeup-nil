/**
 * Email Types for GradeUp NIL Platform
 * Defines types for email templates, providers, and sending options
 */

// ═══════════════════════════════════════════════════════════════════════════
// EMAIL PROVIDERS
// ═══════════════════════════════════════════════════════════════════════════

export type EmailProvider = 'resend' | 'sendgrid';

export interface EmailProviderConfig {
  provider: EmailProvider;
  apiKey: string;
  fromAddress: string;
  fromName: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// EMAIL SENDING OPTIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: EmailAttachment[];
  tags?: EmailTag[];
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

export interface EmailTag {
  name: string;
  value: string;
}

export interface EmailResult {
  success: boolean;
  data?: { id: string };
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// EMAIL TEMPLATE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type EmailTemplateType =
  | 'welcome'
  | 'deal_offer'
  | 'deal_accepted'
  | 'deal_completed'
  | 'payment_received'
  | 'verification_approved'
  | 'verification_rejected'
  | 'password_reset'
  | 'new_message';

// ─── Welcome Email ───
export interface WelcomeEmailData {
  recipientName: string;
  recipientEmail: string;
  role: 'athlete' | 'brand' | 'director';
  loginUrl: string;
}

// ─── Deal Offer Email ───
export interface DealOfferEmailData {
  recipientName: string;
  recipientEmail: string;
  dealTitle: string;
  brandName: string;
  brandLogo?: string;
  compensationAmount: number;
  compensationType: string;
  dealDescription?: string;
  expiresAt?: string;
  viewDealUrl: string;
}

// ─── Deal Accepted Email ───
export interface DealAcceptedEmailData {
  recipientName: string;
  recipientEmail: string;
  dealTitle: string;
  otherPartyName: string; // Athlete name for brand, Brand name for athlete
  compensationAmount: number;
  nextSteps?: string;
  viewDealUrl: string;
}

// ─── Deal Completed Email ───
export interface DealCompletedEmailData {
  recipientName: string;
  recipientEmail: string;
  dealTitle: string;
  brandName: string;
  athleteName: string;
  compensationAmount: number;
  completedAt: string;
  viewDealUrl: string;
}

// ─── Payment Received Email ───
export interface PaymentReceivedEmailData {
  recipientName: string;
  recipientEmail: string;
  amount: number;
  dealTitle: string;
  brandName: string;
  paymentMethod?: string;
  transactionId?: string;
  viewEarningsUrl: string;
}

// ─── Verification Approved Email ───
export interface VerificationApprovedEmailData {
  recipientName: string;
  recipientEmail: string;
  verificationType: 'enrollment' | 'sport' | 'grades' | 'identity';
  verifiedAt: string;
  profileUrl: string;
}

// ─── Verification Rejected Email ───
export interface VerificationRejectedEmailData {
  recipientName: string;
  recipientEmail: string;
  verificationType: 'enrollment' | 'sport' | 'grades' | 'identity';
  rejectionReason?: string;
  resubmitUrl: string;
}

// ─── Password Reset Email ───
export interface PasswordResetEmailData {
  recipientName: string;
  recipientEmail: string;
  resetLink: string;
  expiresInMinutes: number;
}

// ─── New Message Email ───
export interface NewMessageEmailData {
  recipientName: string;
  recipientEmail: string;
  senderName: string;
  messagePreview: string;
  conversationUrl: string;
}

// ─── Union Type for All Email Data ───
export type EmailTemplateData =
  | { type: 'welcome'; data: WelcomeEmailData }
  | { type: 'deal_offer'; data: DealOfferEmailData }
  | { type: 'deal_accepted'; data: DealAcceptedEmailData }
  | { type: 'deal_completed'; data: DealCompletedEmailData }
  | { type: 'payment_received'; data: PaymentReceivedEmailData }
  | { type: 'verification_approved'; data: VerificationApprovedEmailData }
  | { type: 'verification_rejected'; data: VerificationRejectedEmailData }
  | { type: 'password_reset'; data: PasswordResetEmailData }
  | { type: 'new_message'; data: NewMessageEmailData };

// ═══════════════════════════════════════════════════════════════════════════
// EMAIL SERVICE INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

export interface IEmailService {
  sendEmail(options: EmailOptions): Promise<EmailResult>;
  sendWelcomeEmail(data: WelcomeEmailData): Promise<EmailResult>;
  sendDealOfferEmail(data: DealOfferEmailData): Promise<EmailResult>;
  sendDealAcceptedEmail(data: DealAcceptedEmailData): Promise<EmailResult>;
  sendDealCompletedEmail(data: DealCompletedEmailData): Promise<EmailResult>;
  sendPaymentReceivedEmail(data: PaymentReceivedEmailData): Promise<EmailResult>;
  sendVerificationApprovedEmail(data: VerificationApprovedEmailData): Promise<EmailResult>;
  sendVerificationRejectedEmail(data: VerificationRejectedEmailData): Promise<EmailResult>;
  sendPasswordResetEmail(data: PasswordResetEmailData): Promise<EmailResult>;
  sendNewMessageEmail(data: NewMessageEmailData): Promise<EmailResult>;
}
