import { render, screen } from '@testing-library/react';
import { Breadcrumb, type BreadcrumbItem } from '@/components/layout/breadcrumb';

describe('Breadcrumb', () => {
  const mockItems: BreadcrumbItem[] = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Profile', href: '/profile' },
    { label: 'Edit' },
  ];

  it('renders breadcrumb navigation', () => {
    render(<Breadcrumb items={mockItems} />);

    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument();
  });

  it('renders home icon link', () => {
    render(<Breadcrumb items={mockItems} />);

    const homeLink = screen.getByRole('link', { name: /home/i });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('renders all breadcrumb items', () => {
    render(<Breadcrumb items={mockItems} />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('renders items with links when href is provided', () => {
    render(<Breadcrumb items={mockItems} />);

    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
    expect(dashboardLink).toHaveAttribute('href', '/dashboard');

    const profileLink = screen.getByRole('link', { name: 'Profile' });
    expect(profileLink).toHaveAttribute('href', '/profile');
  });

  it('renders last item without link', () => {
    render(<Breadcrumb items={mockItems} />);

    // Last item should be a span, not a link
    const editElement = screen.getByText('Edit');
    expect(editElement.tagName).toBe('SPAN');
  });

  it('marks last item as current page', () => {
    render(<Breadcrumb items={mockItems} />);

    const editElement = screen.getByText('Edit');
    expect(editElement).toHaveAttribute('aria-current', 'page');
  });

  it('renders separators between items', () => {
    const { container } = render(<Breadcrumb items={mockItems} />);

    // ChevronRight icons act as separators
    const svgs = container.querySelectorAll('svg');
    // Should have: 1 home icon + 3 chevrons (one for each item)
    expect(svgs.length).toBe(4);
  });

  it('renders item without href as span', () => {
    const items: BreadcrumbItem[] = [
      { label: 'Category' },
      { label: 'Sub-category' },
    ];

    render(<Breadcrumb items={items} />);

    // First item without href should also be a span (since it's not the last)
    const categoryElement = screen.getByText('Category');
    expect(categoryElement.tagName).toBe('SPAN');
  });

  it('applies different styling to last item', () => {
    render(<Breadcrumb items={mockItems} />);

    const editElement = screen.getByText('Edit');
    expect(editElement).toHaveClass('font-medium');
  });

  it('applies hover styles to links', () => {
    render(<Breadcrumb items={mockItems} />);

    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
    expect(dashboardLink).toHaveClass('hover:text-primary-500');
  });

  it('applies custom className', () => {
    render(<Breadcrumb items={mockItems} className="custom-breadcrumb" />);

    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('custom-breadcrumb');
  });

  it('has flex layout', () => {
    render(<Breadcrumb items={mockItems} />);

    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('flex', 'items-center');
  });

  it('renders empty state gracefully', () => {
    render(<Breadcrumb items={[]} />);

    // Should still render navigation with home icon
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
  });

  it('renders single item correctly', () => {
    const items: BreadcrumbItem[] = [{ label: 'Dashboard' }];

    render(<Breadcrumb items={items} />);

    const dashboardElement = screen.getByText('Dashboard');
    expect(dashboardElement).toHaveAttribute('aria-current', 'page');
  });
});
