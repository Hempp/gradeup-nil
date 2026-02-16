/**
 * Tests for the Breadcrumb component
 * @module __tests__/components/layout/breadcrumb.test
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Breadcrumb, type BreadcrumbItem } from '@/components/layout/breadcrumb';

describe('Breadcrumb', () => {
  describe('rendering', () => {
    it('renders home link', () => {
      render(<Breadcrumb items={[]} />);

      expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
    });

    it('renders navigation landmark', () => {
      render(<Breadcrumb items={[]} />);

      expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument();
    });

    it('renders single item as text (last item)', () => {
      const items: BreadcrumbItem[] = [{ label: 'Dashboard' }];
      render(<Breadcrumb items={items} />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      // Single item is the last item, so it's not a link
      expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
    });

    it('renders multiple items', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Settings', href: '/settings' },
        { label: 'Profile' },
      ];
      render(<Breadcrumb items={items} />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });
  });

  describe('links', () => {
    it('renders non-last items with href as links', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Current Page' },
      ];
      render(<Breadcrumb items={items} />);

      const link = screen.getByRole('link', { name: 'Dashboard' });
      expect(link).toHaveAttribute('href', '/dashboard');
    });

    it('renders last item without link even if href provided', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Current Page', href: '/current' },
      ];
      render(<Breadcrumb items={items} />);

      // Current Page is last, so it should be text, not link
      expect(screen.queryByRole('link', { name: 'Current Page' })).not.toBeInTheDocument();
      expect(screen.getByText('Current Page')).toBeInTheDocument();
    });

    it('renders item without href as text', () => {
      const items: BreadcrumbItem[] = [
        { label: 'First', href: '/first' },
        { label: 'No Link' },
        { label: 'Last' },
      ];
      render(<Breadcrumb items={items} />);

      // First is not last and has href, so it's a link
      expect(screen.getByRole('link', { name: 'First' })).toBeInTheDocument();
      // No Link has no href, so it's text
      expect(screen.queryByRole('link', { name: 'No Link' })).not.toBeInTheDocument();
      // Last is last, so it's text
      expect(screen.queryByRole('link', { name: 'Last' })).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('marks last item with aria-current="page"', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Current' },
      ];
      render(<Breadcrumb items={items} />);

      const currentItem = screen.getByText('Current');
      expect(currentItem).toHaveAttribute('aria-current', 'page');
    });

    it('does not mark non-last items with aria-current', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Current' },
      ];
      render(<Breadcrumb items={items} />);

      const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
      expect(dashboardLink).not.toHaveAttribute('aria-current');
    });

    it('home link has accessible name', () => {
      render(<Breadcrumb items={[]} />);

      const homeLink = screen.getByRole('link', { name: /home/i });
      expect(homeLink).toHaveAttribute('href', '/');
    });
  });

  describe('className', () => {
    it('applies custom className', () => {
      const { container } = render(<Breadcrumb items={[]} className="custom-class" />);

      expect(container.querySelector('nav')).toHaveClass('custom-class');
    });
  });
});
