/**
 * GradeUp NIL - Email Notification Service
 * Provider-agnostic email service supporting Resend and SendGrid
 */

import { Resend } from 'resend';
import type {
  EmailOptions,
  EmailResult,
  EmailProvider,
  IEmailService,
  WelcomeEmailData,
  DealOfferEmailData,
  DealAcceptedEmailData,
  DealCompletedEmailData,
  PaymentReceivedEmailData,
  VerificationApprovedEmailData,
  VerificationRejectedEmailData,
  PasswordResetEmailData,
  NewMessageEmailData,
} from '@/types/email';

// Re-export types for convenience
export type { EmailOptions, EmailResult };

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const EMAIL_CONFIG = {
  fromAddress: process.env.EMAIL_FROM_ADDRESS || 'noreply@gradeupnil.com',
  fromName: process.env.EMAIL_FROM_NAME || 'GradeUp NIL',
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://gradeupnil.com',
};

function getFromAddress(): string {
  return `${EMAIL_CONFIG.fromName} <${EMAIL_CONFIG.fromAddress}>`;
}

function getProvider(): EmailProvider {
  if (process.env.RESEND_API_KEY) return 'resend';
  if (process.env.SENDGRID_API_KEY) return 'sendgrid';
  return 'resend'; // Default to resend
}

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER CLIENTS
// ═══════════════════════════════════════════════════════════════════════════

// Lazy initialization for Resend
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

// SendGrid dynamic import to avoid issues when not installed
async function sendWithSendGrid(options: EmailOptions): Promise<EmailResult> {
  try {
    // Dynamic import for SendGrid - use require to avoid TypeScript module errors
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sgMail = require('@sendgrid/mail') as { setApiKey: (key: string) => void; send: (msg: Record<string, unknown>) => Promise<[{ headers: Record<string, string> }]> };
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

    const msg = {
      to: options.to,
      from: getFromAddress(),
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
      cc: options.cc,
      bcc: options.bcc,
    };

    const [response] = await sgMail.send(msg);
    return {
      success: true,
      data: { id: response.headers['x-message-id'] || 'sendgrid-' + Date.now() },
    };
  } catch (error) {
    // Handle SendGrid not being installed
    if (error instanceof Error && error.message.includes('Cannot find module')) {
      console.error('[Email] SendGrid package not installed. Run: npm install @sendgrid/mail');
      return { success: false, error: 'SendGrid package not installed' };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email via SendGrid',
    };
  }
}

async function sendWithResend(options: EmailOptions): Promise<EmailResult> {
  try {
    const client = getResendClient();
    const { data, error } = await client.emails.send({
      from: getFromAddress(),
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
      cc: options.cc,
      bcc: options.bcc,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data ? { id: data.id } : undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to send email via Resend',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CORE EMAIL SENDING FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Send an email using the configured provider
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const provider = getProvider();

  // Check for API keys
  if (provider === 'resend' && !process.env.RESEND_API_KEY) {
    console.warn('[Email] No RESEND_API_KEY configured, skipping email');
    return { success: false, error: 'Email not configured' };
  }
  if (provider === 'sendgrid' && !process.env.SENDGRID_API_KEY) {
    console.warn('[Email] No SENDGRID_API_KEY configured, skipping email');
    return { success: false, error: 'Email not configured' };
  }

  // Send via configured provider
  if (provider === 'sendgrid') {
    return sendWithSendGrid(options);
  }
  return sendWithResend(options);
}

// ═══════════════════════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

const BRAND_COLOR = '#00F0FF';
const BRAND_DARK = '#0A0A0A';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#A0A0A0';

function getEmailWrapper(content: string, previewText?: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>GradeUp NIL</title>
  ${previewText ? `<!--[if !mso]><!--><span style="display:none;visibility:hidden;font-size:0;line-height:0;max-height:0;max-width:0;opacity:0;overflow:hidden;">${previewText}</span><!--<![endif]-->` : ''}
</head>
<body style="margin:0;padding:0;background-color:${BRAND_DARK};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="background-color:${BRAND_DARK};">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="max-width:600px;background-color:#1A1A1A;border-radius:12px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 40px;text-align:center;background:linear-gradient(135deg, ${BRAND_COLOR}22 0%, transparent 100%);">
              <h1 style="margin:0;font-size:28px;font-weight:700;color:${BRAND_COLOR};letter-spacing:2px;">GRADEUP NIL</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:40px;color:${TEXT_PRIMARY};">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background-color:#111;text-align:center;">
              <p style="margin:0 0 12px;font-size:12px;color:${TEXT_SECONDARY};">
                GradeUp NIL - Connecting Scholar-Athletes with Opportunities
              </p>
              <p style="margin:0;font-size:11px;color:${TEXT_SECONDARY};">
                <a href="${EMAIL_CONFIG.baseUrl}/unsubscribe" style="color:${TEXT_SECONDARY};text-decoration:underline;">Unsubscribe</a> |
                <a href="${EMAIL_CONFIG.baseUrl}/privacy" style="color:${TEXT_SECONDARY};text-decoration:underline;">Privacy Policy</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function getButton(text: string, url: string): string {
  return `
<a href="${url}" style="display:inline-block;padding:14px 32px;background:${BRAND_COLOR};color:${BRAND_DARK};text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;text-transform:uppercase;letter-spacing:1px;">
  ${text}
</a>`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPE-SAFE EMAIL SENDING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Send welcome email to new users
 */
export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<EmailResult> {
  const roleMessages = {
    athlete: 'Start showcasing your academic and athletic achievements to connect with brands.',
    brand: 'Discover and partner with verified scholar-athletes who represent your brand values.',
    director: 'Manage your athletes, verify credentials, and oversee NIL activities for your program.',
  };

  const roleNextSteps = {
    athlete: 'Complete your profile, add your highlight videos, and get verified.',
    brand: 'Set up your company profile and browse our verified athletes.',
    director: 'Review pending verifications and manage your team roster.',
  };

  const content = `
<h2 style="margin:0 0 24px;font-size:24px;color:${TEXT_PRIMARY};">
  Welcome to GradeUp NIL, ${data.recipientName}!
</h2>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${TEXT_SECONDARY};">
  Your account has been created as a <strong style="color:${TEXT_PRIMARY};">${data.role}</strong>.
</p>
<p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:${TEXT_SECONDARY};">
  ${roleMessages[data.role]}
</p>
<div style="background:#222;border-radius:8px;padding:20px;margin:0 0 24px;">
  <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:${BRAND_COLOR};">NEXT STEPS</p>
  <p style="margin:0;font-size:14px;color:${TEXT_SECONDARY};">
    ${roleNextSteps[data.role]}
  </p>
</div>
<div style="text-align:center;margin:32px 0;">
  ${getButton('Get Started', data.loginUrl)}
</div>
`;

  return sendEmail({
    to: data.recipientEmail,
    subject: 'Welcome to GradeUp NIL!',
    html: getEmailWrapper(content, `Welcome to GradeUp NIL, ${data.recipientName}!`),
  });
}

/**
 * Send deal offer notification to athlete
 */
export async function sendDealOfferEmail(data: DealOfferEmailData): Promise<EmailResult> {
  const content = `
<h2 style="margin:0 0 24px;font-size:24px;color:${TEXT_PRIMARY};">
  New Deal Opportunity!
</h2>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${TEXT_SECONDARY};">
  Hey ${data.recipientName}, you have a new deal offer from <strong style="color:${TEXT_PRIMARY};">${data.brandName}</strong>.
</p>
<div style="background:#222;border-radius:8px;padding:24px;margin:0 0 24px;">
  <h3 style="margin:0 0 16px;font-size:18px;color:${TEXT_PRIMARY};">${data.dealTitle}</h3>
  ${data.dealDescription ? `<p style="margin:0 0 16px;font-size:14px;color:${TEXT_SECONDARY};">${data.dealDescription}</p>` : ''}
  <div style="display:flex;gap:24px;">
    <div>
      <p style="margin:0 0 4px;font-size:12px;color:${TEXT_SECONDARY};text-transform:uppercase;">Compensation</p>
      <p style="margin:0;font-size:20px;font-weight:700;color:${BRAND_COLOR};">${formatCurrency(data.compensationAmount)}</p>
    </div>
    <div>
      <p style="margin:0 0 4px;font-size:12px;color:${TEXT_SECONDARY};text-transform:uppercase;">Type</p>
      <p style="margin:0;font-size:14px;color:${TEXT_PRIMARY};">${data.compensationType}</p>
    </div>
  </div>
  ${data.expiresAt ? `<p style="margin:16px 0 0;font-size:12px;color:${TEXT_SECONDARY};">Expires: ${data.expiresAt}</p>` : ''}
</div>
<div style="text-align:center;margin:32px 0;">
  ${getButton('View Deal', data.viewDealUrl)}
</div>
`;

  return sendEmail({
    to: data.recipientEmail,
    subject: `New Deal Opportunity from ${data.brandName}`,
    html: getEmailWrapper(content, `${data.brandName} wants to work with you!`),
  });
}

/**
 * Send deal accepted notification
 */
export async function sendDealAcceptedEmail(data: DealAcceptedEmailData): Promise<EmailResult> {
  const content = `
<h2 style="margin:0 0 24px;font-size:24px;color:${TEXT_PRIMARY};">
  Deal Accepted!
</h2>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${TEXT_SECONDARY};">
  Great news, ${data.recipientName}! Your deal "<strong style="color:${TEXT_PRIMARY};">${data.dealTitle}</strong>" has been accepted by ${data.otherPartyName}.
</p>
<div style="background:#222;border-radius:8px;padding:24px;margin:0 0 24px;">
  <div style="text-align:center;">
    <p style="margin:0 0 8px;font-size:14px;color:${TEXT_SECONDARY};">Deal Value</p>
    <p style="margin:0;font-size:32px;font-weight:700;color:${BRAND_COLOR};">${formatCurrency(data.compensationAmount)}</p>
  </div>
</div>
${data.nextSteps ? `
<div style="background:#222;border-radius:8px;padding:20px;margin:0 0 24px;">
  <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:${BRAND_COLOR};">NEXT STEPS</p>
  <p style="margin:0;font-size:14px;color:${TEXT_SECONDARY};">${data.nextSteps}</p>
</div>
` : ''}
<div style="text-align:center;margin:32px 0;">
  ${getButton('View Deal Details', data.viewDealUrl)}
</div>
`;

  return sendEmail({
    to: data.recipientEmail,
    subject: `Your deal "${data.dealTitle}" has been accepted!`,
    html: getEmailWrapper(content, `Deal accepted by ${data.otherPartyName}`),
  });
}

/**
 * Send deal completed notification
 */
export async function sendDealCompletedEmail(data: DealCompletedEmailData): Promise<EmailResult> {
  const content = `
<h2 style="margin:0 0 24px;font-size:24px;color:${TEXT_PRIMARY};">
  Deal Completed!
</h2>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${TEXT_SECONDARY};">
  Congratulations, ${data.recipientName}! The deal "<strong style="color:${TEXT_PRIMARY};">${data.dealTitle}</strong>" has been successfully completed.
</p>
<div style="background:#222;border-radius:8px;padding:24px;margin:0 0 24px;">
  <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
    <tr>
      <td style="padding:8px 0;">
        <span style="color:${TEXT_SECONDARY};font-size:14px;">Brand</span>
      </td>
      <td style="padding:8px 0;text-align:right;">
        <span style="color:${TEXT_PRIMARY};font-size:14px;font-weight:600;">${data.brandName}</span>
      </td>
    </tr>
    <tr>
      <td style="padding:8px 0;">
        <span style="color:${TEXT_SECONDARY};font-size:14px;">Athlete</span>
      </td>
      <td style="padding:8px 0;text-align:right;">
        <span style="color:${TEXT_PRIMARY};font-size:14px;font-weight:600;">${data.athleteName}</span>
      </td>
    </tr>
    <tr>
      <td style="padding:8px 0;">
        <span style="color:${TEXT_SECONDARY};font-size:14px;">Amount</span>
      </td>
      <td style="padding:8px 0;text-align:right;">
        <span style="color:${BRAND_COLOR};font-size:18px;font-weight:700;">${formatCurrency(data.compensationAmount)}</span>
      </td>
    </tr>
    <tr>
      <td style="padding:8px 0;">
        <span style="color:${TEXT_SECONDARY};font-size:14px;">Completed</span>
      </td>
      <td style="padding:8px 0;text-align:right;">
        <span style="color:${TEXT_PRIMARY};font-size:14px;">${data.completedAt}</span>
      </td>
    </tr>
  </table>
</div>
<div style="text-align:center;margin:32px 0;">
  ${getButton('View Deal Summary', data.viewDealUrl)}
</div>
`;

  return sendEmail({
    to: data.recipientEmail,
    subject: `Deal "${data.dealTitle}" completed - Payment incoming!`,
    html: getEmailWrapper(content, `Deal completed! ${formatCurrency(data.compensationAmount)}`),
  });
}

/**
 * Send payment received notification to athlete
 */
export async function sendPaymentReceivedEmail(data: PaymentReceivedEmailData): Promise<EmailResult> {
  const content = `
<h2 style="margin:0 0 24px;font-size:24px;color:${TEXT_PRIMARY};">
  Payment Received!
</h2>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${TEXT_SECONDARY};">
  Hey ${data.recipientName}, you've received a payment for your deal with ${data.brandName}.
</p>
<div style="background:linear-gradient(135deg, #00F0FF22 0%, #00FF8822 100%);border-radius:12px;padding:32px;margin:0 0 24px;text-align:center;">
  <p style="margin:0 0 8px;font-size:14px;color:${TEXT_SECONDARY};text-transform:uppercase;">Amount Received</p>
  <p style="margin:0;font-size:40px;font-weight:700;color:${BRAND_COLOR};">${formatCurrency(data.amount)}</p>
</div>
<div style="background:#222;border-radius:8px;padding:20px;margin:0 0 24px;">
  <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
    <tr>
      <td style="padding:6px 0;">
        <span style="color:${TEXT_SECONDARY};font-size:14px;">Deal</span>
      </td>
      <td style="padding:6px 0;text-align:right;">
        <span style="color:${TEXT_PRIMARY};font-size:14px;">${data.dealTitle}</span>
      </td>
    </tr>
    <tr>
      <td style="padding:6px 0;">
        <span style="color:${TEXT_SECONDARY};font-size:14px;">Brand</span>
      </td>
      <td style="padding:6px 0;text-align:right;">
        <span style="color:${TEXT_PRIMARY};font-size:14px;">${data.brandName}</span>
      </td>
    </tr>
    ${data.paymentMethod ? `
    <tr>
      <td style="padding:6px 0;">
        <span style="color:${TEXT_SECONDARY};font-size:14px;">Payment Method</span>
      </td>
      <td style="padding:6px 0;text-align:right;">
        <span style="color:${TEXT_PRIMARY};font-size:14px;">${data.paymentMethod}</span>
      </td>
    </tr>
    ` : ''}
    ${data.transactionId ? `
    <tr>
      <td style="padding:6px 0;">
        <span style="color:${TEXT_SECONDARY};font-size:14px;">Transaction ID</span>
      </td>
      <td style="padding:6px 0;text-align:right;">
        <span style="color:${TEXT_PRIMARY};font-size:12px;font-family:monospace;">${data.transactionId}</span>
      </td>
    </tr>
    ` : ''}
  </table>
</div>
<div style="text-align:center;margin:32px 0;">
  ${getButton('View Earnings', data.viewEarningsUrl)}
</div>
`;

  return sendEmail({
    to: data.recipientEmail,
    subject: `Payment Received: ${formatCurrency(data.amount)}`,
    html: getEmailWrapper(content, `You received ${formatCurrency(data.amount)} from ${data.brandName}`),
  });
}

/**
 * Send verification approved notification
 */
export async function sendVerificationApprovedEmail(data: VerificationApprovedEmailData): Promise<EmailResult> {
  const verificationLabels = {
    enrollment: 'School Enrollment',
    sport: 'Sport Participation',
    grades: 'Academic Records (GPA)',
    identity: 'Identity',
  };

  const content = `
<h2 style="margin:0 0 24px;font-size:24px;color:${TEXT_PRIMARY};">
  Verification Approved!
</h2>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${TEXT_SECONDARY};">
  Great news, ${data.recipientName}! Your <strong style="color:${BRAND_COLOR};">${verificationLabels[data.verificationType]}</strong> verification has been approved.
</p>
<div style="background:#222;border-radius:8px;padding:24px;margin:0 0 24px;text-align:center;">
  <div style="width:64px;height:64px;background:${BRAND_COLOR}22;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
    <span style="font-size:32px;">✓</span>
  </div>
  <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:${TEXT_PRIMARY};">${verificationLabels[data.verificationType]}</p>
  <p style="margin:0;font-size:14px;color:${TEXT_SECONDARY};">Verified on ${data.verifiedAt}</p>
</div>
<p style="margin:0 0 24px;font-size:14px;color:${TEXT_SECONDARY};">
  Verified athletes are more trusted by brands and have better deal opportunities. Keep your profile up to date!
</p>
<div style="text-align:center;margin:32px 0;">
  ${getButton('View Profile', data.profileUrl)}
</div>
`;

  return sendEmail({
    to: data.recipientEmail,
    subject: `${verificationLabels[data.verificationType]} Verification Approved`,
    html: getEmailWrapper(content, `Your ${verificationLabels[data.verificationType]} has been verified`),
  });
}

/**
 * Send verification rejected notification
 */
export async function sendVerificationRejectedEmail(data: VerificationRejectedEmailData): Promise<EmailResult> {
  const verificationLabels = {
    enrollment: 'School Enrollment',
    sport: 'Sport Participation',
    grades: 'Academic Records (GPA)',
    identity: 'Identity',
  };

  const content = `
<h2 style="margin:0 0 24px;font-size:24px;color:${TEXT_PRIMARY};">
  Verification Update
</h2>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${TEXT_SECONDARY};">
  Hi ${data.recipientName}, unfortunately your <strong style="color:${TEXT_PRIMARY};">${verificationLabels[data.verificationType]}</strong> verification request was not approved.
</p>
${data.rejectionReason ? `
<div style="background:#DA2B5722;border-left:4px solid #DA2B57;padding:16px 20px;margin:0 0 24px;">
  <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#DA2B57;text-transform:uppercase;">Reason</p>
  <p style="margin:0;font-size:14px;color:${TEXT_PRIMARY};">${data.rejectionReason}</p>
</div>
` : ''}
<p style="margin:0 0 24px;font-size:14px;color:${TEXT_SECONDARY};">
  Don't worry - you can resubmit your verification with updated documents or information.
</p>
<div style="text-align:center;margin:32px 0;">
  ${getButton('Resubmit Verification', data.resubmitUrl)}
</div>
`;

  return sendEmail({
    to: data.recipientEmail,
    subject: `Action Required: ${verificationLabels[data.verificationType]} Verification`,
    html: getEmailWrapper(content, `Your verification needs attention`),
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(data: PasswordResetEmailData): Promise<EmailResult> {
  const content = `
<h2 style="margin:0 0 24px;font-size:24px;color:${TEXT_PRIMARY};">
  Reset Your Password
</h2>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${TEXT_SECONDARY};">
  Hi ${data.recipientName}, we received a request to reset your password. Click the button below to create a new password.
</p>
<div style="text-align:center;margin:32px 0;">
  ${getButton('Reset Password', data.resetLink)}
</div>
<div style="background:#222;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
  <p style="margin:0;font-size:14px;color:${TEXT_SECONDARY};">
    This link will expire in <strong style="color:${TEXT_PRIMARY};">${data.expiresInMinutes} minutes</strong>.
  </p>
</div>
<p style="margin:0;font-size:14px;color:${TEXT_SECONDARY};">
  If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
</p>
`;

  return sendEmail({
    to: data.recipientEmail,
    subject: 'Reset Your GradeUp NIL Password',
    html: getEmailWrapper(content, 'Reset your password'),
  });
}

/**
 * Send new message notification
 */
export async function sendNewMessageEmail(data: NewMessageEmailData): Promise<EmailResult> {
  const content = `
<h2 style="margin:0 0 24px;font-size:24px;color:${TEXT_PRIMARY};">
  New Message
</h2>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${TEXT_SECONDARY};">
  Hey ${data.recipientName}, you have a new message from <strong style="color:${TEXT_PRIMARY};">${data.senderName}</strong>.
</p>
<div style="background:#222;border-radius:8px;padding:20px;margin:0 0 24px;border-left:4px solid ${BRAND_COLOR};">
  <p style="margin:0;font-size:14px;color:${TEXT_PRIMARY};font-style:italic;">
    "${data.messagePreview.length > 150 ? data.messagePreview.substring(0, 150) + '...' : data.messagePreview}"
  </p>
</div>
<div style="text-align:center;margin:32px 0;">
  ${getButton('Reply Now', data.conversationUrl)}
</div>
`;

  return sendEmail({
    to: data.recipientEmail,
    subject: `New message from ${data.senderName}`,
    html: getEmailWrapper(content, `${data.senderName}: ${data.messagePreview.substring(0, 50)}...`),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// LEGACY COMPATIBILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @deprecated Use sendPasswordResetEmail with PasswordResetEmailData instead
 */
export async function sendPasswordResetEmailLegacy(email: string, resetLink: string): Promise<EmailResult> {
  return sendPasswordResetEmail({
    recipientName: 'User',
    recipientEmail: email,
    resetLink,
    expiresInMinutes: 60,
  });
}

/**
 * @deprecated Use sendDealOfferEmail, sendDealAcceptedEmail, or sendDealCompletedEmail instead
 */
export async function sendDealNotificationEmail(
  email: string,
  dealTitle: string,
  brandName: string,
  action: 'new' | 'accepted' | 'completed'
): Promise<EmailResult> {
  const baseUrl = EMAIL_CONFIG.baseUrl;

  if (action === 'new') {
    return sendDealOfferEmail({
      recipientName: 'Athlete',
      recipientEmail: email,
      dealTitle,
      brandName,
      compensationAmount: 0,
      compensationType: 'TBD',
      viewDealUrl: `${baseUrl}/dashboard/deals`,
    });
  }

  if (action === 'accepted') {
    return sendDealAcceptedEmail({
      recipientName: 'User',
      recipientEmail: email,
      dealTitle,
      otherPartyName: brandName,
      compensationAmount: 0,
      viewDealUrl: `${baseUrl}/dashboard/deals`,
    });
  }

  return sendDealCompletedEmail({
    recipientName: 'User',
    recipientEmail: email,
    dealTitle,
    brandName,
    athleteName: 'Athlete',
    compensationAmount: 0,
    completedAt: new Date().toLocaleDateString(),
    viewDealUrl: `${baseUrl}/dashboard/deals`,
  });
}

/**
 * @deprecated Use sendWelcomeEmail with WelcomeEmailData instead
 */
export async function sendWelcomeEmailLegacy(
  email: string,
  name: string,
  role: 'athlete' | 'brand' | 'director'
): Promise<EmailResult> {
  return sendWelcomeEmail({
    recipientName: name,
    recipientEmail: email,
    role,
    loginUrl: `${EMAIL_CONFIG.baseUrl}/login`,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// EMAIL SERVICE CLASS (Optional Object-Oriented Interface)
// ═══════════════════════════════════════════════════════════════════════════

export class EmailService implements IEmailService {
  sendEmail = sendEmail;
  sendWelcomeEmail = sendWelcomeEmail;
  sendDealOfferEmail = sendDealOfferEmail;
  sendDealAcceptedEmail = sendDealAcceptedEmail;
  sendDealCompletedEmail = sendDealCompletedEmail;
  sendPaymentReceivedEmail = sendPaymentReceivedEmail;
  sendVerificationApprovedEmail = sendVerificationApprovedEmail;
  sendVerificationRejectedEmail = sendVerificationRejectedEmail;
  sendPasswordResetEmail = sendPasswordResetEmail;
  sendNewMessageEmail = sendNewMessageEmail;
}

// Export a singleton instance
export const emailService = new EmailService();
