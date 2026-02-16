import { render, screen, fireEvent } from '@testing-library/react';
import { FilterBar, Filter } from '@/components/ui/filter-bar';

describe('FilterBar', () => {
  const mockFilters: Filter[] = [
    {
      id: 'sport',
      label: 'Sport',
      value: '',
      options: [
        { value: 'basketball', label: 'Basketball' },
        { value: 'football', label: 'Football' },
        { value: 'soccer', label: 'Soccer' },
      ],
      onChange: jest.fn(),
    },
    {
      id: 'status',
      label: 'Status',
      value: '',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
      onChange: jest.fn(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default props', () => {
    render(<FilterBar />);

    // Should render without crashing even with no filters
    expect(document.querySelector('.flex')).toBeInTheDocument();
  });

  it('renders search input when onSearchChange is provided', () => {
    const handleSearch = jest.fn();
    render(<FilterBar onSearchChange={handleSearch} searchPlaceholder="Search athletes..." />);

    const searchInput = screen.getByPlaceholderText('Search athletes...');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('type', 'text');
  });

  it('calls onSearchChange when search value changes', () => {
    const handleSearch = jest.fn();
    render(<FilterBar onSearchChange={handleSearch} />);

    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'John' } });

    expect(handleSearch).toHaveBeenCalledWith('John');
  });

  it('displays current search value', () => {
    render(
      <FilterBar
        searchValue="test query"
        onSearchChange={jest.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search...') as HTMLInputElement;
    expect(searchInput.value).toBe('test query');
  });

  it('renders filter dropdowns on desktop (hidden on mobile)', () => {
    render(<FilterBar filters={mockFilters} />);

    // Filter selects are hidden on mobile (md:block class)
    const sportSelect = screen.getByLabelText('Sport');
    const statusSelect = screen.getByLabelText('Status');

    expect(sportSelect).toBeInTheDocument();
    expect(statusSelect).toBeInTheDocument();
  });

  it('renders filter options', () => {
    render(<FilterBar filters={mockFilters} />);

    // Check that options are rendered
    expect(screen.getByText('Basketball')).toBeInTheDocument();
    expect(screen.getByText('Football')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('calls filter onChange when selection changes', () => {
    const sportOnChange = jest.fn();
    const filters: Filter[] = [
      {
        id: 'sport',
        label: 'Sport',
        value: '',
        options: [
          { value: 'basketball', label: 'Basketball' },
          { value: 'football', label: 'Football' },
        ],
        onChange: sportOnChange,
      },
    ];

    render(<FilterBar filters={filters} />);

    const select = screen.getByLabelText('Sport');
    fireEvent.change(select, { target: { value: 'basketball' } });

    expect(sportOnChange).toHaveBeenCalledWith('basketball');
  });

  it('displays current filter value', () => {
    const filters: Filter[] = [
      {
        id: 'sport',
        label: 'Sport',
        value: 'football',
        options: [
          { value: 'basketball', label: 'Basketball' },
          { value: 'football', label: 'Football' },
        ],
        onChange: jest.fn(),
      },
    ];

    render(<FilterBar filters={filters} />);

    const select = screen.getByLabelText('Sport') as HTMLSelectElement;
    expect(select.value).toBe('football');
  });

  it('renders mobile filter toggle button when mobileCollapsible is true', () => {
    render(<FilterBar filters={mockFilters} mobileCollapsible={true} />);

    // Mobile toggle button has md:hidden class
    const mobileButton = screen.getByRole('button', { name: /filters/i });
    expect(mobileButton).toBeInTheDocument();
    expect(mobileButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows active filter count badge', () => {
    const filters: Filter[] = [
      {
        id: 'sport',
        label: 'Sport',
        value: 'basketball',
        options: [{ value: 'basketball', label: 'Basketball' }],
        onChange: jest.fn(),
      },
      {
        id: 'status',
        label: 'Status',
        value: 'active',
        options: [{ value: 'active', label: 'Active' }],
        onChange: jest.fn(),
      },
    ];

    render(<FilterBar filters={filters} mobileCollapsible={true} />);

    // Should show count of 2 active filters
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('opens mobile drawer when toggle button is clicked', () => {
    render(<FilterBar filters={mockFilters} mobileCollapsible={true} />);

    const mobileButton = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(mobileButton);

    // Mobile drawer should now be visible
    const drawer = screen.getByRole('dialog', { name: /filter options/i });
    expect(drawer).toBeInTheDocument();
  });

  it('closes mobile drawer when close button is clicked', () => {
    render(<FilterBar filters={mockFilters} mobileCollapsible={true} />);

    // Open the drawer
    const mobileButton = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(mobileButton);

    // Close the drawer
    const closeButton = screen.getByRole('button', { name: /close filters/i });
    fireEvent.click(closeButton);

    // Drawer should be closed
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('clears all filters when Clear All is clicked in mobile drawer', () => {
    const sportOnChange = jest.fn();
    const statusOnChange = jest.fn();
    const filters: Filter[] = [
      {
        id: 'sport',
        label: 'Sport',
        value: 'basketball',
        options: [{ value: 'basketball', label: 'Basketball' }],
        onChange: sportOnChange,
      },
      {
        id: 'status',
        label: 'Status',
        value: 'active',
        options: [{ value: 'active', label: 'Active' }],
        onChange: statusOnChange,
      },
    ];

    render(<FilterBar filters={filters} mobileCollapsible={true} />);

    // Open the drawer
    const mobileButton = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(mobileButton);

    // Click Clear All
    const clearButton = screen.getByRole('button', { name: /clear all/i });
    fireEvent.click(clearButton);

    expect(sportOnChange).toHaveBeenCalledWith('');
    expect(statusOnChange).toHaveBeenCalledWith('');
  });

  it('applies custom className', () => {
    const { container } = render(<FilterBar className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('forwards ref correctly', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<FilterBar ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('uses custom mobile filter label', () => {
    render(
      <FilterBar
        filters={mockFilters}
        mobileCollapsible={true}
        mobileFilterLabel="Filter Athletes"
      />
    );

    expect(screen.getByText('Filter Athletes')).toBeInTheDocument();
  });

  it('hides mobile toggle when mobileCollapsible is false', () => {
    render(<FilterBar filters={mockFilters} mobileCollapsible={false} />);

    expect(screen.queryByRole('button', { name: /filters/i })).not.toBeInTheDocument();
  });

  it('search input has proper accessibility attributes', () => {
    render(<FilterBar onSearchChange={jest.fn()} searchPlaceholder="Search..." />);

    const searchInput = screen.getByPlaceholderText('Search...');
    expect(searchInput).toHaveAttribute('aria-label', 'Search...');
  });
});
