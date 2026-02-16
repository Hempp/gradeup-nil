/**
 * Tests for marketing pages
 * @module __tests__/pages/marketing.test
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Simple mock for Next.js metadata export
jest.mock('next', () => ({
  Metadata: {},
}));

describe('PrivacyPage', () => {
  it('renders privacy policy content', async () => {
    const { default: PrivacyPage } = await import('@/app/(marketing)/privacy/page');
    render(<PrivacyPage />);

    expect(screen.getByRole('heading', { name: /privacy policy/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /information we collect/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /how we use your information/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /data security/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /contact us/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /privacy@gradeupnil.com/i })).toHaveAttribute('href', 'mailto:privacy@gradeupnil.com');
  });

  it('shows last updated date', async () => {
    const { default: PrivacyPage } = await import('@/app/(marketing)/privacy/page');
    render(<PrivacyPage />);

    expect(screen.getByText(/last updated/i)).toBeInTheDocument();
  });

  it('lists collected information items', async () => {
    const { default: PrivacyPage } = await import('@/app/(marketing)/privacy/page');
    render(<PrivacyPage />);

    expect(screen.getByText(/account information/i)).toBeInTheDocument();
    expect(screen.getByText(/profile information/i)).toBeInTheDocument();
    expect(screen.getByText(/transaction and payment information/i)).toBeInTheDocument();
  });
});

describe('TermsPage', () => {
  it('renders terms of service content', async () => {
    const { default: TermsPage } = await import('@/app/(marketing)/terms/page');
    render(<TermsPage />);

    expect(screen.getByRole('heading', { name: /terms of service/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /acceptance of terms/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /ncaa compliance/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /user responsibilities/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /platform fees/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /limitation of liability/i })).toBeInTheDocument();
  });

  it('shows contact information', async () => {
    const { default: TermsPage } = await import('@/app/(marketing)/terms/page');
    render(<TermsPage />);

    expect(screen.getByRole('link', { name: /legal@gradeupnil.com/i })).toHaveAttribute('href', 'mailto:legal@gradeupnil.com');
  });

  it('lists NCAA compliance requirements', async () => {
    const { default: TermsPage } = await import('@/app/(marketing)/terms/page');
    render(<TermsPage />);

    expect(screen.getByText(/only participate in NIL activities/i)).toBeInTheDocument();
    expect(screen.getByText(/not receive compensation for athletic performance/i)).toBeInTheDocument();
    expect(screen.getByText(/maintain amateur status/i)).toBeInTheDocument();
  });

  it('lists user responsibilities', async () => {
    const { default: TermsPage } = await import('@/app/(marketing)/terms/page');
    render(<TermsPage />);

    expect(screen.getByText(/provide accurate information/i)).toBeInTheDocument();
    expect(screen.getByText(/complete all verification processes/i)).toBeInTheDocument();
    expect(screen.getByText(/fulfill obligations for accepted deals/i)).toBeInTheDocument();
  });
});
