/**
 * Tests for ValidatedInput and PasswordInput components
 * @module __tests__/components/ui/validated-input.test
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ValidatedInput,
  PasswordInput,
  PasswordStrengthIndicator,
  type ValidationState,
} from '@/components/ui/validated-input';

describe('ValidatedInput', () => {
  it('renders with label', () => {
    render(<ValidatedInput label="Email" name="email" />);

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('renders with hint text', () => {
    render(<ValidatedInput hint="Enter your email address" name="email" />);

    expect(screen.getByText('Enter your email address')).toBeInTheDocument();
  });

  it('shows required indicator', () => {
    render(<ValidatedInput label="Email" name="email" required />);

    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('renders with icon', () => {
    render(<ValidatedInput icon={<span data-testid="icon">@</span>} name="email" />);

    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders different sizes', () => {
    const sizes: Array<'sm' | 'md' | 'lg'> = ['sm', 'md', 'lg'];

    sizes.forEach((size) => {
      const { unmount } = render(<ValidatedInput size={size} name="test" />);
      unmount();
    });
  });

  it('shows external error', () => {
    render(<ValidatedInput error="Invalid email format" name="email" />);

    // Error should not show until touched
    fireEvent.blur(screen.getByRole('textbox'));

    expect(screen.getByText('Invalid email format')).toBeInTheDocument();
  });

  it('runs validators on blur', async () => {
    const validator = jest.fn(() => 'Field is required');
    render(<ValidatedInput validators={[validator]} validateOn="onBlur" name="test" />);

    const input = screen.getByRole('textbox');
    fireEvent.blur(input);

    await waitFor(() => {
      expect(validator).toHaveBeenCalled();
    });

    expect(screen.getByText('Field is required')).toBeInTheDocument();
  });

  it('calls onValidationChange when validation state changes', async () => {
    const onValidationChange = jest.fn();
    const validator = jest.fn(() => null); // Valid

    render(
      <ValidatedInput
        validators={[validator]}
        validateOn="onBlur"
        onValidationChange={onValidationChange}
        name="test"
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(onValidationChange).toHaveBeenCalledWith('valid', null);
    });
  });

  it('supports disabled state', () => {
    render(<ValidatedInput disabled name="test" />);

    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('supports dark variant', () => {
    render(<ValidatedInput variant="dark" name="test" />);

    // Component should render without errors
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('debounces onChange validation', async () => {
    jest.useFakeTimers();
    const validator = jest.fn(() => null);

    render(
      <ValidatedInput
        validators={[validator]}
        validateOn="onChange"
        debounceMs={300}
        name="test"
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });

    // Validator should not be called immediately
    expect(validator).not.toHaveBeenCalled();

    // Fast-forward past debounce
    jest.advanceTimersByTime(300);

    await waitFor(() => {
      expect(validator).toHaveBeenCalled();
    });

    jest.useRealTimers();
  });
});

describe('PasswordInput', () => {
  it('renders password field', () => {
    const { container } = render(<PasswordInput name="password" />);

    const input = container.querySelector('input[type="password"]');
    expect(input).toBeInTheDocument();
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    render(<PasswordInput name="password" label="Password" />);

    const toggleButton = screen.getByRole('button', { name: /show password/i });
    expect(toggleButton).toBeInTheDocument();

    await user.click(toggleButton);

    expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument();
  });

  it('shows strength indicator when showStrength is true', () => {
    render(<PasswordInput name="password" showStrength value="Test123!" />);

    // Strength indicator should be visible when there's a value
    expect(screen.getByText(/weak|fair|good|strong/i)).toBeInTheDocument();
  });

  it('supports dark variant', () => {
    render(<PasswordInput name="password" variant="dark" />);

    // Component should render
    const input = document.querySelector('input');
    expect(input).toBeInTheDocument();
  });
});

describe('PasswordStrengthIndicator', () => {
  it('returns null when password is empty', () => {
    const { container } = render(<PasswordStrengthIndicator password="" />);

    expect(container.firstChild).toBeNull();
  });

  it('shows weak strength for simple password', () => {
    render(<PasswordStrengthIndicator password="abc" />);

    expect(screen.getByText('weak')).toBeInTheDocument();
  });

  it('shows strong strength for complex password', () => {
    render(<PasswordStrengthIndicator password="Test123!@#" />);

    expect(screen.getByText('strong')).toBeInTheDocument();
  });

  it('shows requirements checklist', () => {
    render(<PasswordStrengthIndicator password="test" showRequirements />);

    expect(screen.getByText('At least 8 characters')).toBeInTheDocument();
    expect(screen.getByText('One uppercase letter')).toBeInTheDocument();
    expect(screen.getByText('One lowercase letter')).toBeInTheDocument();
    expect(screen.getByText('One number')).toBeInTheDocument();
    expect(screen.getByText('One special character')).toBeInTheDocument();
  });

  it('hides requirements checklist when showRequirements is false', () => {
    render(<PasswordStrengthIndicator password="test" showRequirements={false} />);

    expect(screen.queryByText('At least 8 characters')).not.toBeInTheDocument();
  });

  it('supports dark variant', () => {
    render(<PasswordStrengthIndicator password="test" variant="dark" />);

    expect(screen.getByText('weak')).toBeInTheDocument();
  });
});

describe('ValidationState type', () => {
  it('supports all validation states', () => {
    const states: ValidationState[] = ['idle', 'validating', 'valid', 'invalid'];

    expect(states.length).toBe(4);
  });
});
