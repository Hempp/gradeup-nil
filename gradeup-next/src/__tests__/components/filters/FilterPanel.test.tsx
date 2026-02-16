import { render, screen, fireEvent } from '@testing-library/react';
import { FilterPanel, type FilterTag } from '@/components/filters/filter-panel';

describe('FilterPanel', () => {
  const mockFilterTags: FilterTag[] = [
    { id: 'sport-basketball', label: 'Basketball', onRemove: jest.fn() },
    { id: 'sport-football', label: 'Football', onRemove: jest.fn() },
  ];

  const defaultProps = {
    hasActiveFilters: false,
    children: <div data-testid="filter-content">Filter controls</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders filter panel', () => {
    render(<FilterPanel {...defaultProps} />);

    expect(screen.getByRole('button', { name: /filter options/i })).toBeInTheDocument();
  });

  it('renders default title', () => {
    render(<FilterPanel {...defaultProps} />);

    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('renders custom title', () => {
    render(<FilterPanel {...defaultProps} title="Search Filters" />);

    expect(screen.getByText('Search Filters')).toBeInTheDocument();
  });

  it('starts collapsed by default', () => {
    render(<FilterPanel {...defaultProps} />);

    const headerButton = screen.getByRole('button', { name: /filter options/i });
    expect(headerButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('starts expanded when defaultExpanded is true', () => {
    render(<FilterPanel {...defaultProps} defaultExpanded={true} />);

    const headerButton = screen.getByRole('button', { name: /filter options/i });
    expect(headerButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('expands when header is clicked', () => {
    render(<FilterPanel {...defaultProps} />);

    const headerButton = screen.getByRole('button', { name: /filter options/i });
    fireEvent.click(headerButton);

    expect(headerButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('collapses when header is clicked again', () => {
    render(<FilterPanel {...defaultProps} defaultExpanded={true} />);

    const headerButton = screen.getByRole('button', { name: /filter options/i });
    fireEvent.click(headerButton);

    expect(headerButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('expands on Enter key', () => {
    render(<FilterPanel {...defaultProps} />);

    const headerButton = screen.getByRole('button', { name: /filter options/i });
    fireEvent.keyDown(headerButton, { key: 'Enter' });

    expect(headerButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('expands on Space key', () => {
    render(<FilterPanel {...defaultProps} />);

    const headerButton = screen.getByRole('button', { name: /filter options/i });
    fireEvent.keyDown(headerButton, { key: ' ' });

    expect(headerButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows active filter count badge', () => {
    render(<FilterPanel {...defaultProps} hasActiveFilters={true} activeFilterCount={3} />);

    expect(screen.getByText('3 active')).toBeInTheDocument();
  });

  it('does not show badge when no active filters', () => {
    render(<FilterPanel {...defaultProps} activeFilterCount={0} />);

    expect(screen.queryByText(/active/)).not.toBeInTheDocument();
  });

  it('renders filter tags', () => {
    render(
      <FilterPanel {...defaultProps} hasActiveFilters={true} filterTags={mockFilterTags} />
    );

    expect(screen.getByText('Basketball')).toBeInTheDocument();
    expect(screen.getByText('Football')).toBeInTheDocument();
  });

  it('calls onRemove when filter tag is clicked', () => {
    const onRemove = jest.fn();
    const tags = [{ id: 'tag-1', label: 'Test Tag', onRemove }];

    render(<FilterPanel {...defaultProps} hasActiveFilters={true} filterTags={tags} />);

    // Filter tags are rendered as buttons with the tag label and X icon
    const tagButton = screen.getByRole('listitem');
    fireEvent.click(tagButton);

    expect(onRemove).toHaveBeenCalled();
  });

  it('shows clear button when there are active filters', () => {
    render(
      <FilterPanel
        {...defaultProps}
        hasActiveFilters={true}
        onClearAll={jest.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /clear all filters/i })).toBeInTheDocument();
  });

  it('does not show clear button when showClearButton is false', () => {
    render(
      <FilterPanel
        {...defaultProps}
        hasActiveFilters={true}
        onClearAll={jest.fn()}
        showClearButton={false}
      />
    );

    expect(screen.queryByRole('button', { name: /clear all filters/i })).not.toBeInTheDocument();
  });

  it('calls onClearAll when clear button is clicked', () => {
    const onClearAll = jest.fn();
    render(
      <FilterPanel {...defaultProps} hasActiveFilters={true} onClearAll={onClearAll} />
    );

    const clearButton = screen.getByRole('button', { name: /clear all filters/i });
    fireEvent.click(clearButton);

    expect(onClearAll).toHaveBeenCalled();
  });

  it('does not expand when clear button is clicked', () => {
    const onClearAll = jest.fn();
    render(
      <FilterPanel {...defaultProps} hasActiveFilters={true} onClearAll={onClearAll} />
    );

    const clearButton = screen.getByRole('button', { name: /clear all filters/i });
    fireEvent.click(clearButton);

    // Verify onClearAll was called but panel state is managed by aria-expanded
    expect(onClearAll).toHaveBeenCalled();
    const headerButton = screen.getByRole('button', { name: /filter options/i });
    expect(headerButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('has proper aria-expanded attribute', () => {
    render(<FilterPanel {...defaultProps} />);

    const headerButton = screen.getByRole('button', { name: /filter options/i });
    expect(headerButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(headerButton);
    expect(headerButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('has proper aria-controls attribute', () => {
    render(<FilterPanel {...defaultProps} />);

    const headerButton = screen.getByRole('button', { name: /filter options/i });
    const ariaControls = headerButton.getAttribute('aria-controls');

    expect(ariaControls).toBeTruthy();
    expect(document.getElementById(ariaControls!)).toBeInTheDocument();
  });

  it('renders filter tags list with proper role', () => {
    render(
      <FilterPanel {...defaultProps} hasActiveFilters={true} filterTags={mockFilterTags} />
    );

    expect(screen.getByRole('list', { name: /active filters/i })).toBeInTheDocument();
  });

  it('renders custom header icon', () => {
    render(
      <FilterPanel
        {...defaultProps}
        headerIcon={<span data-testid="custom-icon">Custom</span>}
      />
    );

    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('uses custom aria-label', () => {
    render(<FilterPanel {...defaultProps} ariaLabel="Custom filter options" />);

    expect(screen.getByRole('button', { name: /custom filter options/i })).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<FilterPanel {...defaultProps} className="custom-filter" />);

    // Card component should have the custom class
    const card = container.firstChild;
    expect(card).toHaveClass('custom-filter');
  });

  it('renders children content', () => {
    render(
      <FilterPanel {...defaultProps} defaultExpanded={true}>
        <input data-testid="filter-input" placeholder="Search..." />
      </FilterPanel>
    );

    expect(screen.getByTestId('filter-input')).toBeInTheDocument();
  });
});
