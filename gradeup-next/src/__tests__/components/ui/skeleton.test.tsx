import { render, screen } from '@testing-library/react';
import {
  Skeleton,
  SkeletonAvatar,
  SkeletonText,
  SkeletonCard,
  SkeletonStats,
  SkeletonTable,
  SkeletonChart,
  SkeletonList,
  SkeletonDealCard,
  SkeletonForm,
  SkeletonProfileHeader,
} from '@/components/ui/skeleton';

describe('Skeleton', () => {
  it('renders with shimmer animation', () => {
    const { container } = render(<Skeleton />);

    expect(container.firstChild).toHaveClass('animate-shimmer');
  });

  it('applies custom className', () => {
    const { container } = render(<Skeleton className="h-10 w-full" />);

    expect(container.firstChild).toHaveClass('h-10', 'w-full');
  });

  it('passes through additional props', () => {
    render(<Skeleton data-testid="skeleton" />);

    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });
});

describe('SkeletonAvatar', () => {
  it('renders small size', () => {
    const { container } = render(<SkeletonAvatar size="sm" />);

    expect(container.firstChild).toHaveClass('h-8', 'w-8');
  });

  it('renders medium size by default', () => {
    const { container } = render(<SkeletonAvatar />);

    expect(container.firstChild).toHaveClass('h-10', 'w-10');
  });

  it('renders large size', () => {
    const { container } = render(<SkeletonAvatar size="lg" />);

    expect(container.firstChild).toHaveClass('h-12', 'w-12');
  });

  it('has rounded-full class', () => {
    const { container } = render(<SkeletonAvatar />);

    expect(container.firstChild).toHaveClass('rounded-full');
  });
});

describe('SkeletonText', () => {
  it('renders 3 lines by default', () => {
    const { container } = render(<SkeletonText />);

    const lines = container.querySelectorAll('.animate-shimmer');
    expect(lines.length).toBe(3);
  });

  it('renders custom number of lines', () => {
    const { container } = render(<SkeletonText lines={5} />);

    const lines = container.querySelectorAll('.animate-shimmer');
    expect(lines.length).toBe(5);
  });

  it('last line has reduced width', () => {
    const { container } = render(<SkeletonText lines={3} />);

    const lines = container.querySelectorAll('.animate-shimmer');
    expect(lines[2]).toHaveClass('w-3/4');
  });
});

describe('SkeletonCard', () => {
  it('renders card structure', () => {
    const { container } = render(<SkeletonCard />);

    // Should have avatar
    const avatar = container.querySelector('.rounded-full');
    expect(avatar).toBeInTheDocument();

    // Should have skeletons for content
    const skeletons = container.querySelectorAll('.animate-shimmer');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe('SkeletonStats', () => {
  it('renders 4 stats by default', () => {
    render(<SkeletonStats />);

    // Grid should have 4 stat cards
    const grids = document.querySelectorAll('.grid > div');
    expect(grids.length).toBe(4);
  });

  it('renders custom count', () => {
    render(<SkeletonStats count={6} />);

    const grids = document.querySelectorAll('.grid > div');
    expect(grids.length).toBe(6);
  });
});

describe('SkeletonTable', () => {
  it('renders 5 rows by default', () => {
    const { container } = render(<SkeletonTable />);

    // Should have header + 5 rows
    const rows = container.querySelectorAll('.border-b');
    expect(rows.length).toBeGreaterThanOrEqual(5);
  });

  it('renders custom number of rows', () => {
    const { container } = render(<SkeletonTable rows={3} />);

    // Should have header + 3 rows
    const rows = container.querySelectorAll('[class*="flex items-center gap-4 px-6 py-4"]');
    expect(rows.length).toBe(3);
  });
});

describe('SkeletonChart', () => {
  it('renders chart bars', () => {
    const { container } = render(<SkeletonChart />);

    // Should have 8 bars
    const bars = container.querySelectorAll('.flex-1.rounded-t-\\[var\\(--radius-sm\\)\\]');
    expect(bars.length).toBe(8);
  });

  it('renders header', () => {
    const { container } = render(<SkeletonChart />);

    // Should have header skeletons
    const headerSkeletons = container.querySelectorAll('.animate-shimmer');
    expect(headerSkeletons.length).toBeGreaterThan(0);
  });
});

describe('SkeletonList', () => {
  it('renders 5 items by default', () => {
    const { container } = render(<SkeletonList />);

    const items = container.querySelectorAll('.space-y-3 > div');
    expect(items.length).toBe(5);
  });

  it('renders custom number of items', () => {
    const { container } = render(<SkeletonList items={3} />);

    const items = container.querySelectorAll('.space-y-3 > div');
    expect(items.length).toBe(3);
  });
});

describe('SkeletonDealCard', () => {
  it('renders deal card structure', () => {
    const { container } = render(<SkeletonDealCard />);

    // Should have avatar
    const avatar = container.querySelector('.rounded-full');
    expect(avatar).toBeInTheDocument();

    // Should have multiple skeletons
    const skeletons = container.querySelectorAll('.animate-shimmer');
    expect(skeletons.length).toBeGreaterThan(5);
  });
});

describe('SkeletonForm', () => {
  it('renders 4 fields by default', () => {
    const { container } = render(<SkeletonForm />);

    // Each field has label + input = 2 skeletons, plus 2 buttons
    const fields = container.querySelectorAll('.space-y-6 > .space-y-2');
    expect(fields.length).toBe(4);
  });

  it('renders custom number of fields', () => {
    const { container } = render(<SkeletonForm fields={2} />);

    const fields = container.querySelectorAll('.space-y-6 > .space-y-2');
    expect(fields.length).toBe(2);
  });
});

describe('SkeletonProfileHeader', () => {
  it('renders profile header structure', () => {
    const { container } = render(<SkeletonProfileHeader />);

    // Should have cover image area
    const cover = container.querySelector('.h-32');
    expect(cover).toBeInTheDocument();

    // Should have large avatar
    const avatar = container.querySelector('.h-24.w-24');
    expect(avatar).toBeInTheDocument();
  });
});
