/**
 * Tests for filter components in filters/index.tsx
 * @module __tests__/components/filters/filters-index.test
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MultiSelectDropdown, RangeSlider } from '@/components/filters/index';

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
