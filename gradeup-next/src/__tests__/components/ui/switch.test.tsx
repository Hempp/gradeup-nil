import { render, screen, fireEvent } from '@testing-library/react';
import { Switch } from '@/components/ui/switch';

describe('Switch', () => {
  const defaultProps = {
    checked: false,
    onCheckedChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders switch button', () => {
    render(<Switch {...defaultProps} aria-label="Toggle feature" />);

    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('toggles on click', () => {
    const onCheckedChange = jest.fn();
    render(<Switch {...defaultProps} onCheckedChange={onCheckedChange} aria-label="Toggle" />);

    const switchButton = screen.getByRole('switch');
    fireEvent.click(switchButton);

    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('reflects checked state', () => {
    render(<Switch {...defaultProps} checked={true} aria-label="Toggle" />);

    const switchButton = screen.getByRole('switch');
    expect(switchButton).toHaveAttribute('aria-checked', 'true');
  });

  it('reflects unchecked state', () => {
    render(<Switch {...defaultProps} checked={false} aria-label="Toggle" />);

    const switchButton = screen.getByRole('switch');
    expect(switchButton).toHaveAttribute('aria-checked', 'false');
  });

  it('toggles on Enter key', () => {
    const onCheckedChange = jest.fn();
    render(<Switch {...defaultProps} onCheckedChange={onCheckedChange} aria-label="Toggle" />);

    const switchButton = screen.getByRole('switch');
    fireEvent.keyDown(switchButton, { key: 'Enter' });

    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('toggles on Space key', () => {
    const onCheckedChange = jest.fn();
    render(<Switch {...defaultProps} onCheckedChange={onCheckedChange} aria-label="Toggle" />);

    const switchButton = screen.getByRole('switch');
    fireEvent.keyDown(switchButton, { key: ' ' });

    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Switch {...defaultProps} disabled aria-label="Toggle" />);

    const switchButton = screen.getByRole('switch');
    expect(switchButton).toBeDisabled();
  });

  it('does not toggle when disabled', () => {
    const onCheckedChange = jest.fn();
    render(<Switch {...defaultProps} onCheckedChange={onCheckedChange} disabled aria-label="Toggle" />);

    const switchButton = screen.getByRole('switch');
    fireEvent.click(switchButton);

    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it('renders with label', () => {
    render(<Switch {...defaultProps} label="Enable notifications" />);

    expect(screen.getByText('Enable notifications')).toBeInTheDocument();
  });

  it('renders with description', () => {
    render(
      <Switch
        {...defaultProps}
        label="Feature"
        description="Enable this awesome feature"
      />
    );

    expect(screen.getByText('Enable this awesome feature')).toBeInTheDocument();
  });

  it('hides label visually when showLabel is false', () => {
    render(<Switch {...defaultProps} label="Hidden label" showLabel={false} />);

    const hiddenLabel = screen.getByText('Hidden label');
    expect(hiddenLabel).toHaveClass('sr-only');
  });

  it('applies different sizes', () => {
    const { rerender } = render(<Switch {...defaultProps} size="sm" aria-label="Toggle" />);
    let switchButton = screen.getByRole('switch');
    expect(switchButton).toHaveClass('h-5', 'w-9');

    rerender(<Switch {...defaultProps} size="md" aria-label="Toggle" />);
    switchButton = screen.getByRole('switch');
    expect(switchButton).toHaveClass('h-6', 'w-11');

    rerender(<Switch {...defaultProps} size="lg" aria-label="Toggle" />);
    switchButton = screen.getByRole('switch');
    expect(switchButton).toHaveClass('h-7', 'w-14');
  });

  it('applies custom className', () => {
    render(<Switch {...defaultProps} className="custom-switch" aria-label="Toggle" />);

    const switchButton = screen.getByRole('switch');
    expect(switchButton).toHaveClass('custom-switch');
  });

  it('has proper aria-labelledby when label is provided', () => {
    render(<Switch {...defaultProps} label="My Switch" />);

    const switchButton = screen.getByRole('switch');
    expect(switchButton).toHaveAttribute('aria-labelledby');
  });

  it('has proper aria-describedby when description is provided', () => {
    render(<Switch {...defaultProps} label="Switch" description="Description" />);

    const switchButton = screen.getByRole('switch');
    expect(switchButton).toHaveAttribute('aria-describedby');
  });

  it('toggles correctly from checked to unchecked', () => {
    const onCheckedChange = jest.fn();
    render(<Switch {...defaultProps} checked={true} onCheckedChange={onCheckedChange} aria-label="Toggle" />);

    const switchButton = screen.getByRole('switch');
    fireEvent.click(switchButton);

    expect(onCheckedChange).toHaveBeenCalledWith(false);
  });
});
