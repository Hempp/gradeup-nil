import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '@/components/ui/input';

describe('Input', () => {
  it('renders with default type text', () => {
    render(<Input />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'text');
  });

  it('renders with specified type', () => {
    render(<Input type="email" />);

    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');
  });

  it('handles password type', () => {
    render(<Input type="password" data-testid="password" />);

    // Password inputs don't have textbox role
    expect(screen.getByTestId('password')).toHaveAttribute('type', 'password');
  });

  it('renders with placeholder', () => {
    render(<Input placeholder="Enter your name" />);

    expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
  });

  it('handles value changes', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();
    render(<Input onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'Hello');

    expect(handleChange).toHaveBeenCalled();
    expect(input).toHaveValue('Hello');
  });

  it('can be disabled', () => {
    render(<Input disabled />);

    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('applies disabled styles', () => {
    render(<Input disabled />);

    expect(screen.getByRole('textbox')).toHaveClass('disabled:opacity-50');
  });

  it('shows error state', () => {
    render(<Input error />);

    expect(screen.getByRole('textbox')).toHaveClass('border-[var(--color-error)]');
  });

  it('renders with icon', () => {
    const TestIcon = () => <svg data-testid="test-icon" />;
    render(<Input icon={<TestIcon />} />);

    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('applies padding for icon', () => {
    const TestIcon = () => <svg data-testid="test-icon" />;
    render(<Input icon={<TestIcon />} />);

    expect(screen.getByRole('textbox')).toHaveClass('pl-10');
  });

  it('applies custom className', () => {
    render(<Input className="custom-input" />);

    expect(screen.getByRole('textbox')).toHaveClass('custom-input');
  });

  it('forwards ref correctly', () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<Input ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('supports focus and blur events', () => {
    const handleFocus = jest.fn();
    const handleBlur = jest.fn();
    render(<Input onFocus={handleFocus} onBlur={handleBlur} />);

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    expect(handleFocus).toHaveBeenCalledTimes(1);

    fireEvent.blur(input);
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });

  it('supports name and id attributes', () => {
    render(<Input name="email" id="email-input" />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('name', 'email');
    expect(input).toHaveAttribute('id', 'email-input');
  });

  it('supports required attribute', () => {
    render(<Input required />);

    expect(screen.getByRole('textbox')).toBeRequired();
  });

  it('supports maxLength attribute', () => {
    render(<Input maxLength={10} />);

    expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '10');
  });
});
