/**
 * Tests for filter components in filters/index.tsx
 * @module __tests__/components/filters/filters-index.test
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MultiSelectDropdown, RangeSlider, FilterPanel, type FilterTag } from '@/components/filters/index';

describe('MultiSelectDropdown', () => {
  const defaultProps = {
    label: 'Sports',
    options: ['Football', 'Basketball', 'Baseball', 'Soccer'],
    selected: [] as string[],
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders label', () => {
    render(<MultiSelectDropdown {...defaultProps} />);
    expect(screen.getByText('Sports')).toBeInTheDocument();
  });

  it('shows placeholder when nothing selected', () => {
    render(<MultiSelectDropdown {...defaultProps} placeholder="Select sports..." />);
    expect(screen.getByText('Select sports...')).toBeInTheDocument();
  });

  it('shows selected count', () => {
    render(<MultiSelectDropdown {...defaultProps} selected={['Football', 'Basketball']} />);
    expect(screen.getByText('2 selected')).toBeInTheDocument();
  });

  it('opens dropdown when clicked', () => {
    render(<MultiSelectDropdown {...defaultProps} />);

    fireEvent.click(screen.getByRole('button'));

    defaultProps.options.forEach((option) => {
      expect(screen.getByText(option)).toBeInTheDocument();
    });
  });

  it('toggles option selection', () => {
    render(<MultiSelectDropdown {...defaultProps} />);

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByLabelText('Football'));

    expect(defaultProps.onChange).toHaveBeenCalledWith(['Football']);
  });

  it('removes option when already selected', () => {
    render(<MultiSelectDropdown {...defaultProps} selected={['Football', 'Basketball']} />);

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByLabelText('Football'));

    expect(defaultProps.onChange).toHaveBeenCalledWith(['Basketball']);
  });
});

describe('RangeSlider', () => {
  const defaultProps = {
    label: 'Min GPA',
    min: 0,
    max: 4,
    step: 0.1,
    value: 2.5,
    onChange: jest.fn(),
    formatValue: (v: number) => v.toFixed(1),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders label', () => {
    render(<RangeSlider {...defaultProps} />);
    expect(screen.getByText('Min GPA')).toBeInTheDocument();
  });

  it('shows formatted value', () => {
    render(<RangeSlider {...defaultProps} />);
    expect(screen.getByText('2.5')).toBeInTheDocument();
  });

  it('calls onChange when slider moves', () => {
    render(<RangeSlider {...defaultProps} />);

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '3.0' } });

    expect(defaultProps.onChange).toHaveBeenCalledWith(3.0);
  });

  it('has correct aria attributes', () => {
    render(<RangeSlider {...defaultProps} />);

    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '4');
    expect(slider).toHaveAttribute('aria-valuenow', '2.5');
    expect(slider).toHaveAttribute('aria-valuetext', '2.5');
  });
});

describe('MultiSelectDropdown - additional tests', () => {
  const props = {
    label: 'Test Label',
    options: ['Option1', 'Option2', 'Option3'],
    selected: [] as string[],
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('closes dropdown when overlay is clicked', () => {
    render(<MultiSelectDropdown {...props} />);

    // Open dropdown
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Option1')).toBeInTheDocument();

    // Click overlay to close
    const overlay = document.querySelector('.fixed.inset-0');
    if (overlay) {
      fireEvent.click(overlay);
    }

    // Dropdown should be closed
    expect(screen.queryByText('Option1')).not.toBeInTheDocument();
  });

  it('shows checkboxes as checked for pre-selected options', () => {
    render(<MultiSelectDropdown {...props} selected={['Option1', 'Option2']} />);

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByLabelText('Option1')).toBeChecked();
    expect(screen.getByLabelText('Option2')).toBeChecked();
    expect(screen.getByLabelText('Option3')).not.toBeChecked();
  });

  it('rotates chevron icon when opened', () => {
    render(<MultiSelectDropdown {...props} />);

    const button = screen.getByRole('button');
    const svg = button.querySelector('svg');

    expect(svg).not.toHaveClass('rotate-180');

    fireEvent.click(button);

    expect(svg).toHaveClass('rotate-180');
  });
});

describe('FilterPanel from filter-panel.tsx', () => {
  const defaultProps = {
    children: <div data-testid="filter-controls">Filter content here</div>,
    hasActiveFilters: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the filters header with default title', () => {
    render(<FilterPanel {...defaultProps} />);
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('renders with custom title', () => {
    render(<FilterPanel {...defaultProps} title="Search Filters" />);
    expect(screen.getByText('Search Filters')).toBeInTheDocument();
  });

  it('shows active filter count badge', () => {
    render(<FilterPanel {...defaultProps} activeFilterCount={5} />);
    expect(screen.getByText('5 active')).toBeInTheDocument();
  });

  it('does not show count badge when count is 0', () => {
    render(<FilterPanel {...defaultProps} activeFilterCount={0} />);
    expect(screen.queryByText('0 active')).not.toBeInTheDocument();
  });

  it('starts collapsed by default', () => {
    render(<FilterPanel {...defaultProps} />);
    const expandableButton = screen.getByRole('button', { name: /filter options/i });
    expect(expandableButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('starts expanded when defaultExpanded is true', () => {
    render(<FilterPanel {...defaultProps} defaultExpanded={true} />);
    const expandableButton = screen.getByRole('button', { name: /filter options/i });
    expect(expandableButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('toggles expansion when header is clicked', () => {
    render(<FilterPanel {...defaultProps} />);
    const headerButton = screen.getByRole('button', { name: /filter options/i });

    // Initially collapsed
    expect(headerButton).toHaveAttribute('aria-expanded', 'false');

    // Click to expand
    fireEvent.click(headerButton);
    expect(headerButton).toHaveAttribute('aria-expanded', 'true');

    // Click to collapse
    fireEvent.click(headerButton);
    expect(headerButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggles with keyboard Enter key', () => {
    render(<FilterPanel {...defaultProps} />);
    const headerButton = screen.getByRole('button', { name: /filter options/i });

    fireEvent.keyDown(headerButton, { key: 'Enter' });
    expect(headerButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('toggles with keyboard Space key', () => {
    render(<FilterPanel {...defaultProps} />);
    const headerButton = screen.getByRole('button', { name: /filter options/i });

    fireEvent.keyDown(headerButton, { key: ' ' });
    expect(headerButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows clear button when hasActiveFilters is true and onClearAll is provided', () => {
    const onClearAll = jest.fn();
    render(<FilterPanel {...defaultProps} hasActiveFilters={true} onClearAll={onClearAll} />);
    expect(screen.getByRole('button', { name: /clear all filters/i })).toBeInTheDocument();
  });

  it('hides clear button when hasActiveFilters is false', () => {
    const onClearAll = jest.fn();
    render(<FilterPanel {...defaultProps} hasActiveFilters={false} onClearAll={onClearAll} />);
    expect(screen.queryByRole('button', { name: /clear all filters/i })).not.toBeInTheDocument();
  });

  it('calls onClearAll when clear button is clicked', () => {
    const onClearAll = jest.fn();
    render(<FilterPanel {...defaultProps} hasActiveFilters={true} onClearAll={onClearAll} />);

    fireEvent.click(screen.getByRole('button', { name: /clear all filters/i }));
    expect(onClearAll).toHaveBeenCalled();
  });

  it('displays filter tags when hasActiveFilters is true', () => {
    const filterTags: FilterTag[] = [
      { id: '1', label: 'Football', onRemove: jest.fn() },
      { id: '2', label: 'Basketball', onRemove: jest.fn() },
    ];

    render(<FilterPanel {...defaultProps} hasActiveFilters={true} filterTags={filterTags} />);

    // Tags should be displayed with text
    expect(screen.getByText('Football')).toBeInTheDocument();
    expect(screen.getByText('Basketball')).toBeInTheDocument();
    // Active filters list should exist
    expect(screen.getByRole('list', { name: /active filters/i })).toBeInTheDocument();
  });

  it('calls onRemove when tag is clicked', () => {
    const onRemove = jest.fn();
    const filterTags: FilterTag[] = [
      { id: '1', label: 'Football', onRemove },
    ];

    render(<FilterPanel {...defaultProps} hasActiveFilters={true} filterTags={filterTags} />);

    // Find the tag button by finding the text and clicking its parent button
    const footballText = screen.getByText('Football');
    const tagButton = footballText.closest('button');
    expect(tagButton).toBeInTheDocument();
    if (tagButton) {
      fireEvent.click(tagButton);
      expect(onRemove).toHaveBeenCalled();
    }
  });

  it('does not render tags section when hasActiveFilters is false', () => {
    const filterTags: FilterTag[] = [
      { id: '1', label: 'Football', onRemove: jest.fn() },
    ];

    render(<FilterPanel {...defaultProps} hasActiveFilters={false} filterTags={filterTags} />);

    expect(screen.queryByRole('list', { name: /active filters/i })).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<FilterPanel {...defaultProps} className="my-custom-class" />);
    // The Card component should have the custom class
    const card = screen.getByRole('button', { name: /filter options/i }).closest('.my-custom-class');
    expect(card).toBeInTheDocument();
  });

  it('uses custom ariaLabel', () => {
    render(<FilterPanel {...defaultProps} ariaLabel="Custom filter panel" />);
    expect(screen.getByRole('button', { name: /custom filter panel/i })).toBeInTheDocument();
  });
});
