/**
 * Tests for FormInput, FormSelect, and FormCheckbox components
 * @module __tests__/components/ui/form-input.test
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FormInput, FormSelect, FormCheckbox } from '@/components/ui/form-input';

describe('FormInput', () => {
  it('renders with label', () => {
    render(
      <FormInput
        id="email"
        name="email"
        label="Email Address"
        value=""
        onChange={() => {}}
      />
    );

    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
  });

  it('renders with placeholder', () => {
    render(
      <FormInput
        id="email"
        name="email"
        label="Email"
        placeholder="Enter email"
        value=""
        onChange={() => {}}
      />
    );

    expect(screen.getByPlaceholderText('Enter email')).toBeInTheDocument();
  });

  it('calls onChange when value changes', () => {
    const handleChange = jest.fn();

    render(
      <FormInput
        id="name"
        name="name"
        label="Name"
        value=""
        onChange={handleChange}
      />
    );

    const input = screen.getByLabelText('Name');
    fireEvent.change(input, { target: { value: 'John' } });

    expect(handleChange).toHaveBeenCalled();
  });

  it('calls onBlur when input loses focus', () => {
    const handleBlur = jest.fn();

    render(
      <FormInput
        id="name"
        name="name"
        label="Name"
        value=""
        onChange={() => {}}
        onBlur={handleBlur}
      />
    );

    const input = screen.getByLabelText('Name');
    fireEvent.blur(input);

    expect(handleBlur).toHaveBeenCalled();
  });

  it('shows error when touched and has error', () => {
    render(
      <FormInput
        id="email"
        name="email"
        label="Email"
        value=""
        onChange={() => {}}
        touched={true}
        error="Email is required"
      />
    );

    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('does not show error when not touched', () => {
    render(
      <FormInput
        id="email"
        name="email"
        label="Email"
        value=""
        onChange={() => {}}
        touched={false}
        error="Email is required"
      />
    );

    expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
  });

  it('shows optional indicator', () => {
    render(
      <FormInput
        id="phone"
        name="phone"
        label="Phone"
        value=""
        onChange={() => {}}
        optional={true}
      />
    );

    expect(screen.getByText('(Optional)')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <FormInput
        id="email"
        name="email"
        label="Email"
        value=""
        onChange={() => {}}
        disabled={true}
      />
    );

    expect(screen.getByLabelText('Email')).toBeDisabled();
  });

  it('sets correct input type', () => {
    const { container } = render(
      <FormInput
        id="password"
        name="password"
        label="Password"
        type="password"
        value=""
        onChange={() => {}}
      />
    );

    const input = container.querySelector('input[type="password"]');
    expect(input).toBeInTheDocument();
  });

  it('sets autocomplete attribute', () => {
    render(
      <FormInput
        id="email"
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        value=""
        onChange={() => {}}
      />
    );

    expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'email');
  });

  it('sets aria-invalid when has error', () => {
    render(
      <FormInput
        id="email"
        name="email"
        label="Email"
        value=""
        onChange={() => {}}
        touched={true}
        error="Invalid email"
      />
    );

    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('sets aria-describedby for error', () => {
    render(
      <FormInput
        id="email"
        name="email"
        label="Email"
        value=""
        onChange={() => {}}
        touched={true}
        error="Invalid email"
      />
    );

    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-describedby', 'email-error');
  });
});

describe('FormSelect', () => {
  const options = ['Option 1', 'Option 2', 'Option 3'];

  it('renders with label', () => {
    render(
      <FormSelect
        id="category"
        name="category"
        label="Category"
        value=""
        onChange={() => {}}
        options={options}
      />
    );

    expect(screen.getByLabelText('Category')).toBeInTheDocument();
  });

  it('renders string options', () => {
    render(
      <FormSelect
        id="category"
        name="category"
        label="Category"
        value=""
        onChange={() => {}}
        options={options}
      />
    );

    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
  });

  it('renders object options', () => {
    const objectOptions = [
      { value: 'opt1', label: 'First Option' },
      { value: 'opt2', label: 'Second Option' },
    ];

    render(
      <FormSelect
        id="category"
        name="category"
        label="Category"
        value=""
        onChange={() => {}}
        options={objectOptions}
      />
    );

    expect(screen.getByText('First Option')).toBeInTheDocument();
    expect(screen.getByText('Second Option')).toBeInTheDocument();
  });

  it('renders placeholder option', () => {
    render(
      <FormSelect
        id="category"
        name="category"
        label="Category"
        value=""
        onChange={() => {}}
        options={options}
        placeholder="Choose a category"
      />
    );

    expect(screen.getByText('Choose a category')).toBeInTheDocument();
  });

  it('calls onChange when selection changes', () => {
    const handleChange = jest.fn();

    render(
      <FormSelect
        id="category"
        name="category"
        label="Category"
        value=""
        onChange={handleChange}
        options={options}
      />
    );

    const select = screen.getByLabelText('Category');
    fireEvent.change(select, { target: { value: 'Option 1' } });

    expect(handleChange).toHaveBeenCalled();
  });

  it('shows error when touched and has error', () => {
    render(
      <FormSelect
        id="category"
        name="category"
        label="Category"
        value=""
        onChange={() => {}}
        options={options}
        touched={true}
        error="Category is required"
      />
    );

    expect(screen.getByText('Category is required')).toBeInTheDocument();
  });

  it('shows optional indicator', () => {
    render(
      <FormSelect
        id="category"
        name="category"
        label="Category"
        value=""
        onChange={() => {}}
        options={options}
        optional={true}
      />
    );

    expect(screen.getByText('(Optional)')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <FormSelect
        id="category"
        name="category"
        label="Category"
        value=""
        onChange={() => {}}
        options={options}
        disabled={true}
      />
    );

    expect(screen.getByLabelText('Category')).toBeDisabled();
  });
});

describe('FormCheckbox', () => {
  it('renders with label', () => {
    render(
      <FormCheckbox
        id="agree"
        name="agree"
        checked={false}
        onChange={() => {}}
      >
        I agree to the terms
      </FormCheckbox>
    );

    expect(screen.getByText('I agree to the terms')).toBeInTheDocument();
  });

  it('is checked when checked prop is true', () => {
    render(
      <FormCheckbox
        id="agree"
        name="agree"
        checked={true}
        onChange={() => {}}
      >
        I agree
      </FormCheckbox>
    );

    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('is not checked when checked prop is false', () => {
    render(
      <FormCheckbox
        id="agree"
        name="agree"
        checked={false}
        onChange={() => {}}
      >
        I agree
      </FormCheckbox>
    );

    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('calls onChange when clicked', () => {
    const handleChange = jest.fn();

    render(
      <FormCheckbox
        id="agree"
        name="agree"
        checked={false}
        onChange={handleChange}
      >
        I agree
      </FormCheckbox>
    );

    fireEvent.click(screen.getByRole('checkbox'));

    expect(handleChange).toHaveBeenCalled();
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <FormCheckbox
        id="agree"
        name="agree"
        checked={false}
        onChange={() => {}}
        disabled={true}
      >
        I agree
      </FormCheckbox>
    );

    expect(screen.getByRole('checkbox')).toBeDisabled();
  });

  it('sets aria-required attribute', () => {
    render(
      <FormCheckbox
        id="agree"
        name="agree"
        checked={false}
        onChange={() => {}}
        required={true}
      >
        I agree
      </FormCheckbox>
    );

    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-required', 'true');
  });

  it('renders children with links', () => {
    render(
      <FormCheckbox
        id="agree"
        name="agree"
        checked={false}
        onChange={() => {}}
      >
        I agree to the <a href="/terms">Terms of Service</a>
      </FormCheckbox>
    );

    expect(screen.getByRole('link', { name: 'Terms of Service' })).toBeInTheDocument();
  });
});
