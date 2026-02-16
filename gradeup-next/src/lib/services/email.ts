import { Resend } from 'resend';

// Lazy initialization to allow proper mocking in tests
let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] No RESEND_API_KEY configured, skipping email');
    return { success: false, error: 'Email not configured' };
  }

  try {
    const client = getResendClient();
    const { data, error } = await client.emails.send({
      from: process.env.EMAIL_FROM || 'GradeUp NIL <noreply@gradeupnil.com>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to send email' };
  }
}

// Transactional email templates
export async function sendPasswordResetEmail(email: string, resetLink: string) {
  return sendEmail({
    to: email,
    subject: 'Reset Your GradeUp NIL Password',
    html: `
      <h1>Password Reset Request</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: #00F0FF; color: #000; text-decoration: none; border-radius: 6px;">Reset Password</a>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });
}

export async function sendDealNotificationEmail(email: string, dealTitle: string, brandName: string, action: 'new' | 'accepted' | 'completed') {
  const subjects = {
    new: `New Deal Opportunity from ${brandName}`,
    accepted: `Your deal "${dealTitle}" has been accepted!`,
    completed: `Deal "${dealTitle}" completed - Payment incoming!`,
  };

  return sendEmail({
    to: email,
    subject: subjects[action],
    html: `<h1>${subjects[action]}</h1><p>Log in to GradeUp NIL to view details.</p>`,
  });
}

export async function sendWelcomeEmail(email: string, name: string, role: 'athlete' | 'brand' | 'director') {
  return sendEmail({
    to: email,
    subject: 'Welcome to GradeUp NIL!',
    html: `
      <h1>Welcome to GradeUp NIL, ${name}!</h1>
      <p>Your account has been created as a ${role}.</p>
      <p>Get started by completing your profile.</p>
    `,
  });
}
