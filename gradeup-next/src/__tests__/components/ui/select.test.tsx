import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Select, MultiSelect, type SelectOption } from '@/components/ui/select';

describe('Select', () => {
  const mockOptions: SelectOption[] = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3', disabled: true },
  ];

  const defaultProps = {
    options: mockOptions,
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with placeholder', () => {
    render(<Select {...defaultProps} placeholder="Select an option" />);

    expect(screen.getByText('Select an option')).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(<Select {...defaultProps} label="Choose option" />);

    expect(screen.getByText('Choose option')).toBeInTheDocument();
  });

  it('shows selected value', () => {
    render(<Select {...defaultProps} value="option1" />);

    expect(screen.getByText('Option 1')).toBeInTheDocument();
  });

  it('opens dropdown on click', () => {
    render(<Select {...defaultProps} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('shows all options when open', () => {
    render(<Select {...defaultProps} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
  });

  it('calls onChange when option is selected', () => {
    const onChange = jest.fn();
    render(<Select {...defaultProps} onChange={onChange} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const options = screen.getAllByRole('option');
    fireEvent.click(options[0]);

    expect(onChange).toHaveBeenCalledWith('option1');
  });

  it('closes dropdown after selection', async () => {
    render(<Select {...defaultProps} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const options = screen.getAllByRole('option');
    fireEvent.click(options[0]);

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  it('opens on Enter key', () => {
    render(<Select {...defaultProps} />);

    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: 'Enter' });

    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('closes on Escape key', () => {
    render(<Select {...defaultProps} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);
    fireEvent.keyDown(button, { key: 'Escape' });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('navigates with arrow keys', () => {
    render(<Select {...defaultProps} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);
    fireEvent.keyDown(button, { key: 'ArrowDown' });

    // Highlighted option should change
    const options = screen.getAllByRole('option');
    expect(options[1]).toHaveClass('bg-[var(--bg-tertiary)]');
  });

  it('is disabled when disabled prop is true', () => {
    render(<Select {...defaultProps} disabled />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('shows error message', () => {
    render(<Select {...defaultProps} error="This field is required" />);

    expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
  });

  it('shows hint', () => {
    render(<Select {...defaultProps} hint="Choose wisely" />);

    expect(screen.getByText('Choose wisely')).toBeInTheDocument();
  });

  it('shows required indicator', () => {
    render(<Select {...defaultProps} label="Field" required />);

    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('shows search input when searchable', () => {
    render(<Select {...defaultProps} searchable />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('filters options when searching', () => {
    render(<Select {...defaultProps} searchable />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'Option 1' } });

    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.queryByText('Option 2')).not.toBeInTheDocument();
  });

  it('shows clear button when clearable and has value', () => {
    render(<Select {...defaultProps} value="option1" clearable />);

    expect(screen.getByRole('button', { name: /clear selection/i })).toBeInTheDocument();
  });

  it('clears value when clear button is clicked', () => {
    const onChange = jest.fn();
    render(<Select {...defaultProps} value="option1" clearable onChange={onChange} />);

    const clearButton = screen.getByRole('button', { name: /clear selection/i });
    fireEvent.click(clearButton);

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('has proper aria attributes', () => {
    render(<Select {...defaultProps} />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-haspopup', 'listbox');
    expect(button).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('MultiSelect', () => {
  const mockOptions: SelectOption[] = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  const defaultProps = {
    options: mockOptions,
    value: [] as string[],
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with placeholder', () => {
    render(<MultiSelect {...defaultProps} placeholder="Select options" />);

    expect(screen.getByText('Select options')).toBeInTheDocument();
  });

  it('shows selected values as tags', () => {
    render(<MultiSelect {...defaultProps} value={['option1', 'option2']} />);

    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });

  it('toggles selection when option is clicked', () => {
    const onChange = jest.fn();
    render(<MultiSelect {...defaultProps} onChange={onChange} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const options = screen.getAllByRole('option');
    fireEvent.click(options[0]);

    expect(onChange).toHaveBeenCalledWith(['option1']);
  });

  it('removes selection when clicking on selected option', () => {
    const onChange = jest.fn();
    render(<MultiSelect {...defaultProps} value={['option1']} onChange={onChange} />);

    const buttons = screen.getAllByRole('button');
    // First button is the dropdown trigger (the X buttons for tags come after)
    fireEvent.click(buttons[0]);

    const options = screen.getAllByRole('option');
    fireEvent.click(options[0]);

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('removes tag when X button is clicked', () => {
    const onChange = jest.fn();
    render(<MultiSelect {...defaultProps} value={['option1']} onChange={onChange} />);

    const removeButton = screen.getByRole('button', { name: /remove option 1/i });
    fireEvent.click(removeButton);

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('respects maxSelections', () => {
    render(<MultiSelect {...defaultProps} value={['option1', 'option2']} maxSelections={2} />);

    const buttons = screen.getAllByRole('button');
    // First button is the dropdown trigger
    fireEvent.click(buttons[0]);

    expect(screen.getByText(/maximum 2 selections reached/i)).toBeInTheDocument();
  });

  it('has proper aria attributes', () => {
    render(<MultiSelect {...defaultProps} />);

    const button = screen.getByRole('button', { name: /select/i });
    expect(button).toHaveAttribute('aria-haspopup', 'listbox');
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });
});
