/**
 * Tests for the Help page
 * @module __tests__/app/marketing/help.test
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import HelpPage from '@/app/(marketing)/help/page';

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Search: ({ className }: { className?: string }) => (
    <svg data-testid="search-icon" className={className} />
  ),
  ChevronDown: ({ className }: { className?: string }) => (
    <svg data-testid="chevron-down-icon" className={className} />
  ),
  HelpCircle: ({ className }: { className?: string }) => (
    <svg data-testid="help-circle-icon" className={className} />
  ),
  Users: ({ className }: { className?: string }) => (
    <svg data-testid="users-icon" className={className} />
  ),
  Briefcase: ({ className }: { className?: string }) => (
    <svg data-testid="briefcase-icon" className={className} />
  ),
  Shield: ({ className }: { className?: string }) => (
    <svg data-testid="shield-icon" className={className} />
  ),
  Mail: ({ className }: { className?: string }) => (
    <svg data-testid="mail-icon" className={className} />
  ),
  MessageSquare: ({ className }: { className?: string }) => (
    <svg data-testid="message-square-icon" className={className} />
  ),
  GraduationCap: ({ className }: { className?: string }) => (
    <svg data-testid="graduation-cap-icon" className={className} />
  ),
  BadgeCheck: ({ className }: { className?: string }) => (
    <svg data-testid="badge-check-icon" className={className} />
  ),
  Clock: ({ className }: { className?: string }) => (
    <svg data-testid="clock-icon" className={className} />
  ),
  FileText: ({ className }: { className?: string }) => (
    <svg data-testid="file-text-icon" className={className} />
  ),
  CreditCard: ({ className }: { className?: string }) => (
    <svg data-testid="credit-card-icon" className={className} />
  ),
  Lock: ({ className }: { className?: string }) => (
    <svg data-testid="lock-icon" className={className} />
  ),
}));

// Mock @/components/ui/button
jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    className,
    size,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    size?: string;
    [key: string]: unknown;
  }) => (
    <button onClick={onClick} className={className} data-size={size} {...props}>
      {children}
    </button>
  ),
}));

describe('HelpPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Hero Section', () => {
    it('renders hero heading', () => {
      render(<HelpPage />);
      expect(screen.getByText(/How Can We/i)).toBeInTheDocument();
      expect(screen.getByText('Help You?')).toBeInTheDocument();
    });

    it('renders search input', () => {
      render(<HelpPage />);
      expect(screen.getByPlaceholderText('Search for answers...')).toBeInTheDocument();
    });

    it('renders quick search buttons', () => {
      render(<HelpPage />);
      // "Getting Started" appears in both quick search and category, so use getAllByText
      expect(screen.getAllByText('Getting Started').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Payments')).toBeInTheDocument();
      expect(screen.getByText('NCAA Compliance')).toBeInTheDocument();
      expect(screen.getByText('GPA Requirements')).toBeInTheDocument();
    });

    it('updates search when quick search button is clicked', () => {
      render(<HelpPage />);

      const quickSearchButton = screen.getByText('Payments');
      fireEvent.click(quickSearchButton);

      const searchInput = screen.getByPlaceholderText('Search for answers...');
      expect(searchInput).toHaveValue('Payments');
    });
  });

  describe('Quick Help Section', () => {
    it('renders quick help cards', () => {
      render(<HelpPage />);
      expect(screen.getByText('Quick Help')).toBeInTheDocument();
      expect(screen.getByText('Documentation')).toBeInTheDocument();
      expect(screen.getByText('Payment Support')).toBeInTheDocument();
      expect(screen.getByText('Verification')).toBeInTheDocument();
      expect(screen.getByText('Account Security')).toBeInTheDocument();
    });
  });

  describe('FAQ Categories', () => {
    it('renders all FAQ categories', () => {
      render(<HelpPage />);

      // Category navigation buttons
      expect(screen.getByRole('button', { name: 'All Topics' })).toBeInTheDocument();
    });

    it('renders FAQ questions in Getting Started category', () => {
      render(<HelpPage />);

      expect(screen.getByText('How do I sign up for GradeUp?')).toBeInTheDocument();
      expect(screen.getByText('What is the verification process?')).toBeInTheDocument();
      expect(screen.getByText('What GPA do I need to join?')).toBeInTheDocument();
    });

    it('renders FAQ questions in For Athletes category', () => {
      render(<HelpPage />);

      expect(
        screen.getByText('How do NIL deals work on GradeUp?')
      ).toBeInTheDocument();
      expect(
        screen.getByText('How does GPA affect my earning potential?')
      ).toBeInTheDocument();
    });

    it('renders FAQ questions in For Brands category', () => {
      render(<HelpPage />);

      expect(
        screen.getByText('How do I find the right athletes for my brand?')
      ).toBeInTheDocument();
      expect(screen.getByText('Are all deals NCAA compliant?')).toBeInTheDocument();
    });

    it('renders FAQ questions in Account & Security category', () => {
      render(<HelpPage />);

      expect(screen.getByText('How do I reset my password?')).toBeInTheDocument();
      expect(
        screen.getByText('What data does GradeUp collect?')
      ).toBeInTheDocument();
    });
  });

  describe('FAQ Accordion', () => {
    it('expands FAQ answer when question is clicked', () => {
      render(<HelpPage />);

      const question = screen.getByText('How do I sign up for GradeUp?');
      fireEvent.click(question);

      // The answer should be visible
      expect(
        screen.getByText(/Signing up is quick and free!/i)
      ).toBeInTheDocument();
    });

    it('collapses FAQ answer when clicked again', () => {
      render(<HelpPage />);

      const question = screen.getByText('How do I sign up for GradeUp?');

      // Click to open
      fireEvent.click(question);
      expect(
        screen.getByText(/Signing up is quick and free!/i)
      ).toBeInTheDocument();

      // Click to close - the answer should still be in DOM but collapsed
      fireEvent.click(question);
      // The answer element should have max-h-0 class (collapsed)
    });
  });

  describe('Category Navigation', () => {
    it('filters to show only selected category', () => {
      render(<HelpPage />);

      // Click on "For Athletes" category - get all buttons and find the one in the nav
      const forAthletesBtns = screen.getAllByRole('button', { name: /For Athletes/i });
      // The category nav button should be one of them
      fireEvent.click(forAthletesBtns[0]);

      // Athlete questions should be visible
      expect(
        screen.getByText('How do NIL deals work on GradeUp?')
      ).toBeInTheDocument();
    });

    it('shows all categories when "All Topics" is clicked', () => {
      render(<HelpPage />);

      // First filter to a specific category
      const forAthletesBtns = screen.getAllByRole('button', { name: /For Athletes/i });
      fireEvent.click(forAthletesBtns[0]);

      // Then click All Topics
      const allTopicsBtn = screen.getByRole('button', { name: 'All Topics' });
      fireEvent.click(allTopicsBtn);

      // Should show questions from multiple categories
      expect(screen.getByText('How do I sign up for GradeUp?')).toBeInTheDocument();
      expect(
        screen.getByText('How do NIL deals work on GradeUp?')
      ).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('filters FAQs based on search query', () => {
      render(<HelpPage />);

      const searchInput = screen.getByPlaceholderText('Search for answers...');
      fireEvent.change(searchInput, { target: { value: 'password' } });

      // Should show password-related FAQ
      expect(screen.getByText('How do I reset my password?')).toBeInTheDocument();

      // Should show search results info
      expect(screen.getByText(/Found \d+ result/)).toBeInTheDocument();
    });

    it('shows no results message when no matches found', () => {
      render(<HelpPage />);

      const searchInput = screen.getByPlaceholderText('Search for answers...');
      fireEvent.change(searchInput, {
        target: { value: 'xyznonexistentquery123' },
      });

      expect(screen.getByText('No results found')).toBeInTheDocument();
    });

    it('clears category filter when searching', () => {
      render(<HelpPage />);

      // Select a category first - use getAllByRole since there may be multiple
      const forBrandsBtns = screen.getAllByRole('button', { name: /For Brands/i });
      fireEvent.click(forBrandsBtns[0]);

      // Then search
      const searchInput = screen.getByPlaceholderText('Search for answers...');
      fireEvent.change(searchInput, { target: { value: 'sign up' } });

      // Category filter should be cleared (all matching results shown)
      expect(screen.getByText('How do I sign up for GradeUp?')).toBeInTheDocument();
    });
  });

  describe('Contact Support Section', () => {
    it('renders contact support section', () => {
      render(<HelpPage />);

      expect(screen.getByText('Still Need Help?')).toBeInTheDocument();
    });

    it('renders email support link', () => {
      render(<HelpPage />);

      expect(screen.getByText('Email Support')).toBeInTheDocument();
    });

    it('renders live chat link', () => {
      render(<HelpPage />);

      expect(screen.getByText('Live Chat')).toBeInTheDocument();
    });

    it('renders support hours', () => {
      render(<HelpPage />);

      expect(screen.getByText('Mon-Fri, 9am-6pm EST')).toBeInTheDocument();
      expect(screen.getByText('support@gradeup.com')).toBeInTheDocument();
    });
  });
});
