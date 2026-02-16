import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MultiSelectDropdown } from '@/components/filters/multi-select-dropdown';

describe('MultiSelectDropdown', () => {
  const mockOptions = ['Basketball', 'Football', 'Soccer', 'Tennis'];

  const defaultProps = {
    label: 'Sports',
    options: mockOptions,
    selected: [] as string[],
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with label', () => {
    render(<MultiSelectDropdown {...defaultProps} />);

    expect(screen.getByText('Sports')).toBeInTheDocument();
  });

  it('renders dropdown button', () => {
    render(<MultiSelectDropdown {...defaultProps} />);

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('shows placeholder when nothing selected', () => {
    render(<MultiSelectDropdown {...defaultProps} />);

    expect(screen.getByText('Select...')).toBeInTheDocument();
  });

  it('shows custom placeholder', () => {
    render(<MultiSelectDropdown {...defaultProps} placeholder="Choose sports" />);

    expect(screen.getByText('Choose sports')).toBeInTheDocument();
  });

  it('shows selected count when items are selected', () => {
    render(<MultiSelectDropdown {...defaultProps} selected={['Basketball', 'Football']} />);

    expect(screen.getByText('2 selected')).toBeInTheDocument();
  });

  it('opens dropdown on click', () => {
    render(<MultiSelectDropdown {...defaultProps} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('shows all options when open', () => {
    render(<MultiSelectDropdown {...defaultProps} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.getByText('Basketball')).toBeInTheDocument();
    expect(screen.getByText('Football')).toBeInTheDocument();
    expect(screen.getByText('Soccer')).toBeInTheDocument();
    expect(screen.getByText('Tennis')).toBeInTheDocument();
  });

  it('closes dropdown when clicking button again', () => {
    render(<MultiSelectDropdown {...defaultProps} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);
    fireEvent.click(button);

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('calls onChange when option is selected', () => {
    const onChange = jest.fn();
    render(<MultiSelectDropdown {...defaultProps} onChange={onChange} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const options = screen.getAllByRole('option');
    fireEvent.click(options[0]);

    expect(onChange).toHaveBeenCalled();
  });

  it('toggles selection when clicking on selected option', () => {
    const onChange = jest.fn();
    render(
      <MultiSelectDropdown
        {...defaultProps}
        selected={['Basketball']}
        onChange={onChange}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const options = screen.getAllByRole('option');
    fireEvent.click(options[0]);

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('opens on Enter key', () => {
    render(<MultiSelectDropdown {...defaultProps} />);

    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: 'Enter' });

    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('opens on Space key', () => {
    render(<MultiSelectDropdown {...defaultProps} />);

    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: ' ' });

    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('closes on Escape key', () => {
    render(<MultiSelectDropdown {...defaultProps} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);
    fireEvent.keyDown(button, { key: 'Escape' });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes when clicking outside', async () => {
    render(
      <div>
        <MultiSelectDropdown {...defaultProps} />
        <div data-testid="outside">Outside</div>
      </div>
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside'));

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  it('is disabled when disabled prop is true', () => {
    render(<MultiSelectDropdown {...defaultProps} disabled={true} />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('does not open when disabled', () => {
    render(<MultiSelectDropdown {...defaultProps} disabled={true} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('has proper aria-haspopup attribute', () => {
    render(<MultiSelectDropdown {...defaultProps} />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-haspopup', 'listbox');
  });

  it('has proper aria-expanded attribute', () => {
    render(<MultiSelectDropdown {...defaultProps} />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('uses custom aria-label when provided', () => {
    render(<MultiSelectDropdown {...defaultProps} ariaLabel="Select your sports" />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Select your sports');
  });

  it('listbox has aria-multiselectable', () => {
    render(<MultiSelectDropdown {...defaultProps} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.getByRole('listbox')).toHaveAttribute('aria-multiselectable', 'true');
  });

  it('supports object options', () => {
    const objectOptions = [
      { value: 'bball', label: 'Basketball' },
      { value: 'fball', label: 'Football' },
    ];

    render(
      <MultiSelectDropdown {...defaultProps} options={objectOptions} />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.getByText('Basketball')).toBeInTheDocument();
    expect(screen.getByText('Football')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <MultiSelectDropdown {...defaultProps} className="custom-dropdown" />
    );

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('custom-dropdown');
  });

  it('marks selected options with aria-selected', () => {
    render(
      <MultiSelectDropdown {...defaultProps} selected={['Basketball']} />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const options = screen.getAllByRole('option');
    const basketballOption = options.find(opt => opt.textContent?.includes('Basketball'));
    expect(basketballOption).toHaveAttribute('aria-selected', 'true');
  });

  it('toggles option on Enter key in listbox', () => {
    const onChange = jest.fn();
    render(<MultiSelectDropdown {...defaultProps} onChange={onChange} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const options = screen.getAllByRole('option');
    fireEvent.keyDown(options[0], { key: 'Enter' });

    expect(onChange).toHaveBeenCalled();
  });

  it('toggles option on Space key in listbox', () => {
    const onChange = jest.fn();
    render(<MultiSelectDropdown {...defaultProps} onChange={onChange} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const options = screen.getAllByRole('option');
    fireEvent.keyDown(options[0], { key: ' ' });

    expect(onChange).toHaveBeenCalled();
  });
});
