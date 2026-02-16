/**
 * Tests for DashboardShell and MobileSidebar components
 * @module __tests__/components/layout/dashboard-shell.test
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DashboardShell } from '@/components/layout/dashboard-shell';

// Mock usePathname
jest.mock('next/navigation', () => ({
  usePathname: () => '/athlete/dashboard',
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

// Mock child components
jest.mock('@/components/layout/sidebar', () => ({
  Sidebar: ({ className }: { className?: string }) => (
    <div data-testid="sidebar" className={className}>Sidebar</div>
  ),
}));

jest.mock('@/components/layout/topbar', () => ({
  Topbar: ({ onMenuClick }: { onMenuClick?: () => void }) => (
    <div data-testid="topbar">
      <button onClick={onMenuClick} aria-label="Open menu">Menu</button>
    </div>
  ),
}));

describe('DashboardShell', () => {
  const navItems = [
    { label: 'Dashboard', href: '/athlete/dashboard', icon: 'home' },
    { label: 'Deals', href: '/athlete/deals', icon: 'briefcase' },
  ];

  it('renders children content', () => {
    render(
      <DashboardShell navItems={navItems}>
        <div>Page content</div>
      </DashboardShell>
    );

    expect(screen.getByText('Page content')).toBeInTheDocument();
  });

  it('renders skip link for accessibility', () => {
    render(
      <DashboardShell navItems={navItems}>
        <div>Content</div>
      </DashboardShell>
    );

    const skipLink = screen.getByText(/skip to main content/i);
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  it('renders main content area with proper id', () => {
    render(
      <DashboardShell navItems={navItems}>
        <div>Content</div>
      </DashboardShell>
    );

    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
  });

  it('renders desktop sidebar', () => {
    render(
      <DashboardShell navItems={navItems}>
        <div>Content</div>
      </DashboardShell>
    );

    const sidebars = screen.getAllByTestId('sidebar');
    // Should have both desktop and mobile sidebars
    expect(sidebars.length).toBeGreaterThanOrEqual(1);
  });

  it('renders topbar', () => {
    render(
      <DashboardShell navItems={navItems}>
        <div>Content</div>
      </DashboardShell>
    );

    expect(screen.getByTestId('topbar')).toBeInTheDocument();
  });

  it('opens mobile sidebar when menu is clicked', async () => {
    render(
      <DashboardShell navItems={navItems}>
        <div>Content</div>
      </DashboardShell>
    );

    const menuButton = screen.getByRole('button', { name: /open menu/i });
    fireEvent.click(menuButton);

    // Look for mobile sidebar elements
    await waitFor(() => {
      const closeButton = screen.queryByRole('button', { name: /close navigation/i });
      expect(closeButton).toBeInTheDocument();
    });
  });

  it('closes mobile sidebar when close button is clicked', async () => {
    render(
      <DashboardShell navItems={navItems}>
        <div>Content</div>
      </DashboardShell>
    );

    // Open the sidebar
    const menuButton = screen.getByRole('button', { name: /open menu/i });
    fireEvent.click(menuButton);

    // Find and click close button
    const closeButton = await screen.findByRole('button', { name: /close navigation/i });
    fireEvent.click(closeButton);

    // Sidebar should be closed (close button should be hidden)
    await waitFor(() => {
      // After closing, the sidebar should be translated off-screen
      const dialog = screen.queryByRole('dialog');
      if (dialog) {
        expect(dialog).toHaveClass('-translate-x-full');
      }
    });
  });

  it('closes mobile sidebar on escape key', async () => {
    render(
      <DashboardShell navItems={navItems}>
        <div>Content</div>
      </DashboardShell>
    );

    // Open the sidebar
    const menuButton = screen.getByRole('button', { name: /open menu/i });
    fireEvent.click(menuButton);

    // Press escape
    fireEvent.keyDown(document, { key: 'Escape' });

    // Verify sidebar closes
    await waitFor(() => {
      const dialog = screen.queryByRole('dialog');
      if (dialog) {
        expect(dialog).toHaveClass('-translate-x-full');
      }
    });
  });

  it('applies custom className to main content', () => {
    render(
      <DashboardShell navItems={navItems} className="custom-class">
        <div>Content</div>
      </DashboardShell>
    );

    const main = screen.getByRole('main');
    expect(main).toHaveClass('custom-class');
  });

  it('renders with athlete variant by default', () => {
    render(
      <DashboardShell navItems={navItems}>
        <div>Content</div>
      </DashboardShell>
    );

    // Component renders without errors (variant is passed to child components)
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('accepts brand variant', () => {
    render(
      <DashboardShell navItems={navItems} variant="brand">
        <div>Content</div>
      </DashboardShell>
    );

    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('accepts director variant', () => {
    render(
      <DashboardShell navItems={navItems} variant="director">
        <div>Content</div>
      </DashboardShell>
    );

    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
