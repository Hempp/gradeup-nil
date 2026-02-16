import { render, screen, fireEvent } from '@testing-library/react';
import { RangeSlider } from '@/components/filters/range-slider';

describe('RangeSlider', () => {
  const defaultProps = {
    label: 'GPA',
    min: 0,
    max: 4,
    step: 0.1,
    value: 3.0,
    onChange: jest.fn(),
    formatValue: (v: number) => v.toFixed(1),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with label', () => {
    render(<RangeSlider {...defaultProps} />);

    expect(screen.getByLabelText('GPA')).toBeInTheDocument();
  });

  it('renders range input', () => {
    render(<RangeSlider {...defaultProps} />);

    expect(screen.getByRole('slider')).toBeInTheDocument();
  });

  it('displays formatted value', () => {
    render(<RangeSlider {...defaultProps} />);

    expect(screen.getByText('3.0')).toBeInTheDocument();
  });

  it('has correct min/max attributes', () => {
    render(<RangeSlider {...defaultProps} />);

    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '4');
  });

  it('has correct step attribute', () => {
    render(<RangeSlider {...defaultProps} />);

    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('step', '0.1');
  });

  it('has correct value', () => {
    render(<RangeSlider {...defaultProps} />);

    const slider = screen.getByRole('slider');
    expect(slider).toHaveValue('3');
  });

  it('calls onChange when value changes', () => {
    const onChange = jest.fn();
    render(<RangeSlider {...defaultProps} onChange={onChange} />);

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '3.5' } });

    expect(onChange).toHaveBeenCalledWith(3.5);
  });

  it('is disabled when disabled prop is true', () => {
    render(<RangeSlider {...defaultProps} disabled={true} />);

    const slider = screen.getByRole('slider');
    expect(slider).toBeDisabled();
  });

  it('has proper ARIA attributes', () => {
    render(<RangeSlider {...defaultProps} />);

    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '4');
    expect(slider).toHaveAttribute('aria-valuenow', '3');
    expect(slider).toHaveAttribute('aria-valuetext', '3.0');
  });

  it('uses custom aria-label when provided', () => {
    render(<RangeSlider {...defaultProps} ariaLabel="Select minimum GPA" />);

    expect(screen.getByRole('slider')).toHaveAttribute('aria-label', 'Select minimum GPA');
  });

  it('uses label as aria-label by default', () => {
    render(<RangeSlider {...defaultProps} />);

    expect(screen.getByRole('slider')).toHaveAttribute('aria-label', 'GPA');
  });

  it('shows min/max labels when showMinMax is true', () => {
    render(<RangeSlider {...defaultProps} showMinMax={true} />);

    expect(screen.getByText('0.0')).toBeInTheDocument();
    expect(screen.getByText('4.0')).toBeInTheDocument();
  });

  it('does not show min/max labels by default', () => {
    render(<RangeSlider {...defaultProps} />);

    // Only the current value should be shown
    const formattedValues = screen.getAllByText(/\d\.\d/);
    expect(formattedValues.length).toBe(1);
  });

  it('applies custom className', () => {
    const { container } = render(<RangeSlider {...defaultProps} className="custom-slider" />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('custom-slider');
  });

  it('has live region for value updates', () => {
    render(<RangeSlider {...defaultProps} />);

    const valueDisplay = screen.getByText('3.0');
    expect(valueDisplay).toHaveAttribute('aria-live', 'polite');
  });

  it('updates displayed value when value prop changes', () => {
    const { rerender } = render(<RangeSlider {...defaultProps} value={2.5} />);
    expect(screen.getByText('2.5')).toBeInTheDocument();

    rerender(<RangeSlider {...defaultProps} value={3.5} />);
    expect(screen.getByText('3.5')).toBeInTheDocument();
  });

  it('uses custom formatValue function', () => {
    const formatValue = (v: number) => `${v}%`;
    render(<RangeSlider {...defaultProps} formatValue={formatValue} value={50} />);

    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('applies disabled styling when disabled', () => {
    render(<RangeSlider {...defaultProps} disabled={true} />);

    const slider = screen.getByRole('slider');
    expect(slider).toHaveClass('opacity-50', 'cursor-not-allowed');
  });
});
