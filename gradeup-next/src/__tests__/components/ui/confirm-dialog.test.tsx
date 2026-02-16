import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfirmDialog, ConfirmProvider, useConfirm, DeleteConfirm } from '@/components/ui/confirm-dialog';

// Test component to use the hook
function TestConfirmComponent() {
  const confirm = useConfirm();

  const handleClick = async () => {
    const _result = await confirm({
      title: 'Delete item?',
      description: 'This cannot be undone.',
      variant: 'danger',
    });
    // Result can be used to verify
  };

  return <button onClick={handleClick}>Open Confirm</button>;
}

describe('ConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    title: 'Confirm Action',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dialog when open', () => {
    render(<ConfirmDialog {...defaultProps} />);

    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
  });

  it('does not render when not open', () => {
    render(<ConfirmDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<ConfirmDialog {...defaultProps} description="Are you sure?" />);

    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('renders custom button labels', () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        confirmLabel="Yes, delete"
        cancelLabel="No, keep"
      />
    );

    expect(screen.getByText('Yes, delete')).toBeInTheDocument();
    expect(screen.getByText('No, keep')).toBeInTheDocument();
  });

  it('calls onClose when cancel is clicked', () => {
    const onClose = jest.fn();
    render(<ConfirmDialog {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByText('Cancel'));

    expect(onClose).toHaveBeenCalled();
  });

  it('calls onConfirm when confirm is clicked', async () => {
    const onConfirm = jest.fn();
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalled();
    });
  });

  it('shows loading state', () => {
    render(<ConfirmDialog {...defaultProps} isLoading={true} />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('disables buttons when loading', () => {
    render(<ConfirmDialog {...defaultProps} isLoading={true} />);

    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('renders danger variant', () => {
    const { container } = render(<ConfirmDialog {...defaultProps} variant="danger" />);

    // Should have error color classes
    const iconContainer = container.querySelector('.bg-\\[var\\(--color-error\\)\\]\\/10');
    expect(iconContainer).toBeInTheDocument();
  });

  it('renders warning variant', () => {
    const { container } = render(<ConfirmDialog {...defaultProps} variant="warning" />);

    const iconContainer = container.querySelector('.bg-\\[var\\(--color-warning\\)\\]\\/10');
    expect(iconContainer).toBeInTheDocument();
  });

  it('renders info variant', () => {
    const { container } = render(<ConfirmDialog {...defaultProps} variant="info" />);

    const iconContainer = container.querySelector('.bg-\\[var\\(--color-primary\\)\\]\\/10');
    expect(iconContainer).toBeInTheDocument();
  });
});

describe('DeleteConfirm', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with item name', () => {
    render(<DeleteConfirm {...defaultProps} itemName="My Document" itemType="document" />);

    expect(screen.getByText('Delete document?')).toBeInTheDocument();
    expect(screen.getByText(/my document/i)).toBeInTheDocument();
  });

  it('renders without item name', () => {
    render(<DeleteConfirm {...defaultProps} itemType="file" />);

    expect(screen.getByText('Delete file?')).toBeInTheDocument();
    expect(screen.getByText(/delete this file/i)).toBeInTheDocument();
  });

  it('uses default item type', () => {
    render(<DeleteConfirm {...defaultProps} />);

    expect(screen.getByText('Delete item?')).toBeInTheDocument();
  });

  it('has delete button', () => {
    render(<DeleteConfirm {...defaultProps} />);

    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<DeleteConfirm {...defaultProps} isLoading={true} />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});

describe('ConfirmProvider', () => {
  it('renders children', () => {
    render(
      <ConfirmProvider>
        <div>Child content</div>
      </ConfirmProvider>
    );

    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('opens confirm dialog when confirm is called', async () => {
    render(
      <ConfirmProvider>
        <TestConfirmComponent />
      </ConfirmProvider>
    );

    fireEvent.click(screen.getByText('Open Confirm'));

    await waitFor(() => {
      expect(screen.getByText('Delete item?')).toBeInTheDocument();
    });
  });

  it('shows description in dialog', async () => {
    render(
      <ConfirmProvider>
        <TestConfirmComponent />
      </ConfirmProvider>
    );

    fireEvent.click(screen.getByText('Open Confirm'));

    await waitFor(() => {
      expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
    });
  });

  it('closes dialog when cancel is clicked', async () => {
    render(
      <ConfirmProvider>
        <TestConfirmComponent />
      </ConfirmProvider>
    );

    fireEvent.click(screen.getByText('Open Confirm'));

    await waitFor(() => {
      expect(screen.getByText('Delete item?')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(screen.queryByText('Delete item?')).not.toBeInTheDocument();
    });
  });
});

describe('useConfirm', () => {
  it('throws error when used outside provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestConfirmComponent />);
    }).toThrow('useConfirm must be used within a ConfirmProvider');

    consoleError.mockRestore();
  });
});
