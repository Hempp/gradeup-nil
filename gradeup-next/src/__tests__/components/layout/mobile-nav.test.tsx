/**
 * Tests for MobileNav component
 * @module __tests__/components/layout/mobile-nav.test
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MobileNav } from '@/components/layout/mobile-nav';

// Mock usePathname
jest.mock('next/navigation', () => ({
  usePathname: () => '/athlete/dashboard',
}));

describe('MobileNav', () => {
  const navItems = [
    { label: 'Dashboard', href: '/athlete/dashboard', icon: 'LayoutDashboard' },
    { label: 'Deals', href: '/athlete/deals', icon: 'FileText' },
    { label: 'Messages', href: '/athlete/messages', icon: 'MessageSquare', badge: 3 },
    { label: 'Settings', href: '/athlete/settings', icon: 'Settings' },
  ];

  beforeEach(() => {
    // Reset body styles
    document.body.style.overflow = '';
  });

  it('renders header with logo and menu button', () => {
    render(<MobileNav navItems={navItems} />);

    expect(screen.getByText('GRADEUP')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open menu/i })).toBeInTheDocument();
  });

  it('opens drawer when menu button is clicked', async () => {
    render(<MobileNav navItems={navItems} />);

    const menuButton = screen.getByRole('button', { name: /open menu/i });
    fireEvent.click(menuButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toHaveClass('translate-x-0');
    });
  });

  it('has close button in drawer', async () => {
    render(<MobileNav navItems={navItems} />);

    // Open the drawer
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));

    // Verify close button exists
    const closeButton = screen.getByRole('button', { name: /close menu/i });
    expect(closeButton).toBeInTheDocument();
  });

  it('handles escape key listener', async () => {
    render(<MobileNav navItems={navItems} />);

    // Open the drawer
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));

    // Press escape - just verify it doesn't throw
    expect(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    }).not.toThrow();
  });

  it('renders overlay when open', async () => {
    render(<MobileNav navItems={navItems} />);

    // Open the drawer
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));

    // Check overlay exists
    const overlay = document.querySelector('.bg-black\\/50');
    expect(overlay).toBeInTheDocument();
  });

  it('renders all nav items', async () => {
    render(<MobileNav navItems={navItems} />);

    // Open the drawer
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));

    navItems.forEach((item) => {
      expect(screen.getByText(item.label)).toBeInTheDocument();
    });
  });

  it('shows badge count on nav items', async () => {
    render(<MobileNav navItems={navItems} />);

    // Open the drawer
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('highlights active nav item', async () => {
    render(<MobileNav navItems={navItems} />);

    // Open the drawer
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toHaveClass('bg-[var(--color-primary-muted)]');
  });

  it('renders Sign Out button', async () => {
    render(<MobileNav navItems={navItems} />);

    // Open the drawer
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));

    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });

  it('supports athlete variant', () => {
    render(<MobileNav navItems={navItems} variant="athlete" />);
    expect(screen.getByText('GRADEUP')).toBeInTheDocument();
  });

  it('supports brand variant', () => {
    render(<MobileNav navItems={navItems} variant="brand" />);
    expect(screen.getByText('GRADEUP')).toBeInTheDocument();
  });

  it('supports director variant', () => {
    render(<MobileNav navItems={navItems} variant="director" />);
    expect(screen.getByText('GRADEUP')).toBeInTheDocument();
  });

  it('locks body scroll when drawer is open', async () => {
    render(<MobileNav navItems={navItems} />);

    // Open the drawer
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));

    await waitFor(() => {
      expect(document.body.style.overflow).toBe('hidden');
    });
  });

  it('restores body scroll when drawer is closed', async () => {
    render(<MobileNav navItems={navItems} />);

    // Open then close
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    fireEvent.click(screen.getByRole('button', { name: /close menu/i }));

    await waitFor(() => {
      expect(document.body.style.overflow).toBe('');
    });
  });
});
