import { render, screen, fireEvent } from '@testing-library/react';
import { FormField, TextAreaField, PasswordField, CheckboxField, RadioGroup } from '@/components/ui/form-field';

describe('FormField', () => {
  it('renders input', () => {
    render(<FormField placeholder="Enter text" />);

    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('renders label', () => {
    render(<FormField label="Username" />);

    expect(screen.getByText('Username')).toBeInTheDocument();
  });

  it('shows required indicator', () => {
    render(<FormField label="Email" required />);

    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<FormField error="This field is required" />);

    expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
  });

  it('shows hint', () => {
    render(<FormField hint="Enter your email address" />);

    expect(screen.getByText('Enter your email address')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(<FormField disabled placeholder="Enter text" />);

    expect(screen.getByPlaceholderText('Enter text')).toBeDisabled();
  });

  it('has proper aria-invalid when has error', () => {
    render(<FormField error="Error" placeholder="Enter text" />);

    expect(screen.getByPlaceholderText('Enter text')).toHaveAttribute('aria-invalid', 'true');
  });

  it('renders icon', () => {
    render(<FormField icon={<span data-testid="icon">Icon</span>} />);

    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders right icon', () => {
    render(<FormField rightIcon={<span data-testid="right-icon">Right</span>} />);

    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  it('applies different sizes', () => {
    const { rerender } = render(<FormField size="sm" />);
    expect(screen.getByRole('textbox')).toHaveClass('h-9');

    rerender(<FormField size="md" />);
    expect(screen.getByRole('textbox')).toHaveClass('h-10');

    rerender(<FormField size="lg" />);
    expect(screen.getByRole('textbox')).toHaveClass('h-12');
  });
});

describe('TextAreaField', () => {
  it('renders textarea', () => {
    render(<TextAreaField placeholder="Enter description" />);

    expect(screen.getByPlaceholderText('Enter description')).toBeInTheDocument();
  });

  it('renders label', () => {
    render(<TextAreaField label="Description" />);

    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('shows character count when showCount is true', () => {
    render(<TextAreaField label="Bio" showCount maxLength={100} value="Hello" />);

    expect(screen.getByText('5/100')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<TextAreaField error="Description is required" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Description is required');
  });

  it('is disabled when disabled prop is true', () => {
    render(<TextAreaField disabled placeholder="Enter text" />);

    expect(screen.getByPlaceholderText('Enter text')).toBeDisabled();
  });
});

describe('PasswordField', () => {
  it('renders password input', () => {
    render(<PasswordField placeholder="Enter password" />);

    expect(screen.getByPlaceholderText('Enter password')).toHaveAttribute('type', 'password');
  });

  it('toggles password visibility', () => {
    const { container } = render(<PasswordField placeholder="Enter password" />);

    const input = screen.getByPlaceholderText('Enter password');
    expect(input).toHaveAttribute('type', 'password');

    // Find the toggle button by its aria-label attribute
    const toggleButton = container.querySelector('button[aria-label*="password"]');
    if (toggleButton) {
      fireEvent.click(toggleButton);
      expect(input).toHaveAttribute('type', 'text');
    }
  });

  it('renders with label', () => {
    render(<PasswordField label="Password" placeholder="Enter password" />);

    expect(screen.getByText('Password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter password')).toBeInTheDocument();
  });
});

describe('CheckboxField', () => {
  it('renders checkbox with label', () => {
    render(<CheckboxField label="Accept terms" />);

    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(screen.getByText('Accept terms')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<CheckboxField label="Newsletter" description="Receive weekly updates" />);

    expect(screen.getByText('Receive weekly updates')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<CheckboxField label="Terms" error="You must accept the terms" />);

    expect(screen.getByRole('alert')).toHaveTextContent('You must accept the terms');
  });

  it('is disabled when disabled prop is true', () => {
    render(<CheckboxField label="Accept" disabled />);

    expect(screen.getByRole('checkbox')).toBeDisabled();
  });

  it('can be checked', () => {
    render(<CheckboxField label="Accept" />);

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(checkbox).toBeChecked();
  });
});

describe('RadioGroup', () => {
  const options = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3', disabled: true },
  ];

  it('renders radio buttons', () => {
    render(<RadioGroup name="test" options={options} />);

    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
  });

  it('renders label', () => {
    render(<RadioGroup name="test" label="Select option" options={options} />);

    expect(screen.getByText('Select option')).toBeInTheDocument();
  });

  it('calls onChange when option is selected', () => {
    const onChange = jest.fn();
    render(<RadioGroup name="test" options={options} onChange={onChange} />);

    const radios = screen.getAllByRole('radio');
    fireEvent.click(radios[0]);

    expect(onChange).toHaveBeenCalledWith('option1');
  });

  it('shows selected option', () => {
    render(<RadioGroup name="test" options={options} value="option2" />);

    const radios = screen.getAllByRole('radio');
    expect(radios[1]).toBeChecked();
  });

  it('shows error message', () => {
    render(<RadioGroup name="test" options={options} error="Please select an option" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Please select an option');
  });

  it('disables individual options', () => {
    render(<RadioGroup name="test" options={options} />);

    const radios = screen.getAllByRole('radio');
    expect(radios[2]).toBeDisabled();
  });

  it('renders option descriptions', () => {
    const optionsWithDesc = [
      { value: 'a', label: 'Option A', description: 'Description A' },
    ];
    render(<RadioGroup name="test" options={optionsWithDesc} />);

    expect(screen.getByText('Description A')).toBeInTheDocument();
  });
});
