/**
 * Tests for the keyboard shortcuts components and hooks
 * @module __tests__/components/ui/keyboard-shortcuts.test
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
    expect(screen.getByText('\u2318')).toBeInTheDocument(); // ⌘
    expect(screen.getByText('/')).toBeInTheDocument();
  });

  it('renders escape key correctly', () => {
    render(<KeyCombo keys="Escape" />);
    expect(screen.getByText('Esc')).toBeInTheDocument();
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
});

describe('KeyboardShortcutsProvider', () => {
  it('provides context to children', () => {
    const TestConsumer = () => {
      const { isDialogOpen, enabled } = useKeyboardShortcuts();
      return (
        <div>
          <span data-testid="dialog-open">{String(isDialogOpen)}</span>
          <span data-testid="enabled">{String(enabled)}</span>
        </div>
      );
    };

    render(
      <KeyboardShortcutsProvider>
        <TestConsumer />
      </KeyboardShortcutsProvider>
    );

    expect(screen.getByTestId('dialog-open')).toHaveTextContent('false');
    expect(screen.getByTestId('enabled')).toHaveTextContent('true');
  });

  it('opens and closes dialog', () => {
    const TestConsumer = () => {
      const { isDialogOpen, openDialog, closeDialog } = useKeyboardShortcuts();
      return (
        <div>
          <span data-testid="dialog-open">{String(isDialogOpen)}</span>
          <button onClick={openDialog} data-testid="open-btn">Open</button>
          <button onClick={closeDialog} data-testid="close-btn">Close</button>
        </div>
      );
    };

    render(
      <KeyboardShortcutsProvider>
        <TestConsumer />
      </KeyboardShortcutsProvider>
    );

    fireEvent.click(screen.getByTestId('open-btn'));
    expect(screen.getByTestId('dialog-open')).toHaveTextContent('true');

    fireEvent.click(screen.getByTestId('close-btn'));
    expect(screen.getByTestId('dialog-open')).toHaveTextContent('false');
  });
});

describe('useKeyboardShortcuts', () => {
  it('throws error when used outside provider', () => {
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
    expect(result.current.enabled).toBeDefined();
  });
});
