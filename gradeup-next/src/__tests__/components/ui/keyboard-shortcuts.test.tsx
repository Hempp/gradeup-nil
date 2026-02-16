/**
 * Tests for the keyboard shortcuts components and hooks
 * @module __tests__/components/ui/keyboard-shortcuts.test
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import {
  KeyboardShortcutsProvider,
  useKeyboardShortcuts,
  KeyCombo,
  KeyboardShortcutsDialog,
  type Shortcut,
} from '@/components/ui/keyboard-shortcuts';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  usePathname: () => '/',
}));

describe('KeyCombo', () => {
  it('renders single key', () => {
    render(<KeyCombo keys="?" />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('renders modifier combinations', () => {
    render(<KeyCombo keys="Cmd+/" />);
    // Should show command symbol and /
    expect(screen.getByText('\u2318')).toBeInTheDocument(); // ⌘
    expect(screen.getByText('/')).toBeInTheDocument();
  });

  it('renders key sequences', () => {
    render(<KeyCombo keys="g h" />);
    expect(screen.getByText('G')).toBeInTheDocument();
    expect(screen.getByText('H')).toBeInTheDocument();
    expect(screen.getByText('then')).toBeInTheDocument();
  });

  it('renders escape key correctly', () => {
    render(<KeyCombo keys="Escape" />);
    expect(screen.getByText('Esc')).toBeInTheDocument();
  });

  it('renders shift modifier', () => {
    render(<KeyCombo keys="Shift+K" />);
    expect(screen.getByText('\u21E7')).toBeInTheDocument(); // ⇧
    expect(screen.getByText('K')).toBeInTheDocument();
  });

  it('renders alt modifier', () => {
    render(<KeyCombo keys="Alt+A" />);
    expect(screen.getByText('\u2325')).toBeInTheDocument(); // ⌥
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('renders ctrl modifier', () => {
    render(<KeyCombo keys="Ctrl+C" />);
    expect(screen.getByText('\u2303')).toBeInTheDocument(); // ⌃
    expect(screen.getByText('C')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<KeyCombo keys="?" className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('KeyboardShortcutsDialog', () => {
  const mockShortcuts: Shortcut[] = [
    {
      id: 'nav-1',
      label: 'Go home',
      keys: 'g h',
      category: 'navigation',
      handler: jest.fn(),
    },
    {
      id: 'search-1',
      label: 'Search',
      keys: '/',
      category: 'search',
      handler: jest.fn(),
    },
    {
      id: 'help-1',
      label: 'Show help',
      keys: '?',
      category: 'dialogs',
      handler: jest.fn(),
    },
  ];

  it('renders when open', () => {
    render(
      <KeyboardShortcutsDialog
        isOpen={true}
        onClose={jest.fn()}
        shortcuts={mockShortcuts}
      />
    );

    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <KeyboardShortcutsDialog
        isOpen={false}
        onClose={jest.fn()}
        shortcuts={mockShortcuts}
      />
    );

    expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
  });

  it('groups shortcuts by category', () => {
    render(
      <KeyboardShortcutsDialog
        isOpen={true}
        onClose={jest.fn()}
        shortcuts={mockShortcuts}
      />
    );

    expect(screen.getByText('Navigation')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Dialogs')).toBeInTheDocument();
  });

  it('displays shortcut labels', () => {
    render(
      <KeyboardShortcutsDialog
        isOpen={true}
        onClose={jest.fn()}
        shortcuts={mockShortcuts}
      />
    );

    expect(screen.getByText('Go home')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Show help')).toBeInTheDocument();
  });

  it('shows empty state when no shortcuts', () => {
    render(
      <KeyboardShortcutsDialog
        isOpen={true}
        onClose={jest.fn()}
        shortcuts={[]}
      />
    );

    expect(screen.getByText('No keyboard shortcuts available on this page.')).toBeInTheDocument();
  });

  it('filters out disabled shortcuts', () => {
    const shortcutsWithDisabled: Shortcut[] = [
      {
        id: 'active',
        label: 'Active shortcut',
        keys: 'a',
        category: 'general',
        handler: jest.fn(),
        enabled: true,
      },
      {
        id: 'disabled',
        label: 'Disabled shortcut',
        keys: 'b',
        category: 'general',
        handler: jest.fn(),
        enabled: false,
      },
    ];

    render(
      <KeyboardShortcutsDialog
        isOpen={true}
        onClose={jest.fn()}
        shortcuts={shortcutsWithDisabled}
      />
    );

    expect(screen.getByText('Active shortcut')).toBeInTheDocument();
    expect(screen.queryByText('Disabled shortcut')).not.toBeInTheDocument();
  });

  it('shows shortcut description when provided', () => {
    const shortcutsWithDescription: Shortcut[] = [
      {
        id: 'desc-1',
        label: 'Test shortcut',
        description: 'This is a helpful description',
        keys: 't',
        category: 'general',
        handler: jest.fn(),
      },
    ];

    render(
      <KeyboardShortcutsDialog
        isOpen={true}
        onClose={jest.fn()}
        shortcuts={shortcutsWithDescription}
      />
    );

    expect(screen.getByText('This is a helpful description')).toBeInTheDocument();
  });
});

describe('KeyboardShortcutsProvider', () => {
  const TestConsumer = () => {
    const { isDialogOpen, openDialog, closeDialog, enabled } = useKeyboardShortcuts();
    return (
      <div>
        <span data-testid="dialog-open">{String(isDialogOpen)}</span>
        <span data-testid="enabled">{String(enabled)}</span>
        <button onClick={openDialog} data-testid="open-btn">Open</button>
        <button onClick={closeDialog} data-testid="close-btn">Close</button>
      </div>
    );
  };

  it('provides context to children', () => {
    render(
      <KeyboardShortcutsProvider>
        <TestConsumer />
      </KeyboardShortcutsProvider>
    );

    expect(screen.getByTestId('dialog-open')).toHaveTextContent('false');
    expect(screen.getByTestId('enabled')).toHaveTextContent('true');
  });

  it('opens dialog', async () => {
    render(
      <KeyboardShortcutsProvider>
        <TestConsumer />
      </KeyboardShortcutsProvider>
    );

    fireEvent.click(screen.getByTestId('open-btn'));

    expect(screen.getByTestId('dialog-open')).toHaveTextContent('true');
  });

  it('closes dialog', async () => {
    render(
      <KeyboardShortcutsProvider>
        <TestConsumer />
      </KeyboardShortcutsProvider>
    );

    // Open then close
    fireEvent.click(screen.getByTestId('open-btn'));
    fireEvent.click(screen.getByTestId('close-btn'));

    expect(screen.getByTestId('dialog-open')).toHaveTextContent('false');
  });

  it('toggles dialog', () => {
    const TestConsumerWithToggle = () => {
      const { isDialogOpen, toggleDialog } = useKeyboardShortcuts();
      return (
        <div>
          <span data-testid="dialog-open">{String(isDialogOpen)}</span>
          <button onClick={toggleDialog} data-testid="toggle-btn">Toggle</button>
        </div>
      );
    };

    render(
      <KeyboardShortcutsProvider>
        <TestConsumerWithToggle />
      </KeyboardShortcutsProvider>
    );

    fireEvent.click(screen.getByTestId('toggle-btn'));
    expect(screen.getByTestId('dialog-open')).toHaveTextContent('true');

    fireEvent.click(screen.getByTestId('toggle-btn'));
    expect(screen.getByTestId('dialog-open')).toHaveTextContent('false');
  });

  it('registers and unregisters shortcuts', () => {
    const TestConsumerWithRegister = () => {
      const { registerShortcut, unregisterShortcut, getShortcuts } = useKeyboardShortcuts();
      const shortcuts = getShortcuts();

      return (
        <div>
          <span data-testid="count">{shortcuts.length}</span>
          <button
            onClick={() =>
              registerShortcut({
                id: 'custom-1',
                label: 'Custom',
                keys: 'c',
                category: 'general',
                handler: jest.fn(),
              })
            }
            data-testid="register-btn"
          >
            Register
          </button>
          <button
            onClick={() => unregisterShortcut('custom-1')}
            data-testid="unregister-btn"
          >
            Unregister
          </button>
        </div>
      );
    };

    render(
      <KeyboardShortcutsProvider>
        <TestConsumerWithRegister />
      </KeyboardShortcutsProvider>
    );

    const initialCount = parseInt(screen.getByTestId('count').textContent || '0');

    fireEvent.click(screen.getByTestId('register-btn'));
    expect(parseInt(screen.getByTestId('count').textContent || '0')).toBe(initialCount + 1);

    fireEvent.click(screen.getByTestId('unregister-btn'));
    expect(parseInt(screen.getByTestId('count').textContent || '0')).toBe(initialCount);
  });

  it('enables and disables shortcuts', () => {
    const TestConsumerWithEnable = () => {
      const { enabled, setEnabled } = useKeyboardShortcuts();
      return (
        <div>
          <span data-testid="enabled">{String(enabled)}</span>
          <button onClick={() => setEnabled(false)} data-testid="disable-btn">Disable</button>
          <button onClick={() => setEnabled(true)} data-testid="enable-btn">Enable</button>
        </div>
      );
    };

    render(
      <KeyboardShortcutsProvider>
        <TestConsumerWithEnable />
      </KeyboardShortcutsProvider>
    );

    expect(screen.getByTestId('enabled')).toHaveTextContent('true');

    fireEvent.click(screen.getByTestId('disable-btn'));
    expect(screen.getByTestId('enabled')).toHaveTextContent('false');

    fireEvent.click(screen.getByTestId('enable-btn'));
    expect(screen.getByTestId('enabled')).toHaveTextContent('true');
  });
});

describe('useKeyboardShortcuts', () => {
  it('throws error when used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => {
      renderHook(() => useKeyboardShortcuts());
    }).toThrow('useKeyboardShortcuts must be used within a KeyboardShortcutsProvider');

    console.error = originalError;
  });

  it('returns all context methods', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <KeyboardShortcutsProvider>{children}</KeyboardShortcutsProvider>
    );

    const { result } = renderHook(() => useKeyboardShortcuts(), { wrapper });

    expect(result.current.isDialogOpen).toBeDefined();
    expect(result.current.openDialog).toBeDefined();
    expect(result.current.closeDialog).toBeDefined();
    expect(result.current.toggleDialog).toBeDefined();
    expect(result.current.registerShortcut).toBeDefined();
    expect(result.current.unregisterShortcut).toBeDefined();
    expect(result.current.getShortcuts).toBeDefined();
    expect(result.current.enabled).toBeDefined();
    expect(result.current.setEnabled).toBeDefined();
  });
});

describe('keyboard event handling', () => {
  it('opens help dialog with ? key', async () => {
    render(
      <KeyboardShortcutsProvider>
        <div data-testid="container">Content</div>
      </KeyboardShortcutsProvider>
    );

    fireEvent.keyDown(document, { key: '?' });

    await waitFor(() => {
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    });
  });

  it('does not trigger shortcuts when typing in input', () => {
    render(
      <KeyboardShortcutsProvider>
        <input type="text" data-testid="input" />
      </KeyboardShortcutsProvider>
    );

    const input = screen.getByTestId('input');
    input.focus();

    fireEvent.keyDown(input, { key: '?' });

    // Dialog should not open
    expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
  });
});
