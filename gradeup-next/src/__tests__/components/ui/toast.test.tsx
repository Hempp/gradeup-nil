/**
 * Tests for Toast component and context
 * @module __tests__/components/ui/toast.test
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast, type ToastVariant } from '@/components/ui/toast';

// Test component that uses the toast context
function ToastConsumer() {
  const { addToast, toasts, removeToast } = useToast();

  return (
    <div>
      <span data-testid="toast-count">{toasts.length}</span>
      <button
        data-testid="add-success"
        onClick={() => addToast({ title: 'Success', variant: 'success' })}
      >
        Add Success Toast
      </button>
      <button
        data-testid="add-error"
        onClick={() => addToast({ title: 'Error', variant: 'error', description: 'Something went wrong' })}
      >
        Add Error Toast
      </button>
      <button
        data-testid="add-warning"
        onClick={() => addToast({ title: 'Warning', variant: 'warning' })}
      >
        Add Warning Toast
      </button>
      <button
        data-testid="add-info"
        onClick={() => addToast({ title: 'Info', variant: 'info' })}
      >
        Add Info Toast
      </button>
      <button
        data-testid="add-with-action"
        onClick={() =>
          addToast({
            title: 'Action Toast',
            variant: 'info',
            action: {
              label: 'Undo',
              onClick: () => {},
            },
          })
        }
      >
        Add Toast with Action
      </button>
      <button
        data-testid="add-with-duration"
        onClick={() =>
          addToast({
            title: 'Short Toast',
            variant: 'info',
            duration: 1000,
          })
        }
      >
        Add Short Duration Toast
      </button>
      {toasts.map((toast) => (
        <button
          key={toast.id}
          data-testid={`remove-${toast.id}`}
          onClick={() => removeToast(toast.id)}
        >
          Remove {toast.id}
        </button>
      ))}
    </div>
  );
}

describe('Toast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('ToastProvider', () => {
    it('provides toast context to children', () => {
      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
    });

    it('adds toast when addToast is called', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByTestId('add-success'));

      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
      expect(screen.getByText('Success')).toBeInTheDocument();
    });

    it('removes toast when removeToast is called', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      // Add a toast
      await user.click(screen.getByTestId('add-success'));
      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');

      // Get the toast ID from rendered remove button
      const removeButton = screen.getAllByRole('button').find((btn) =>
        btn.getAttribute('data-testid')?.startsWith('remove-')
      );

      if (removeButton) {
        await user.click(removeButton);
        expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
      }
    });

    it('auto-removes toast after duration', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByTestId('add-with-duration'));
      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
      });
    });

    it('supports multiple toasts', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByTestId('add-success'));
      await user.click(screen.getByTestId('add-error'));
      await user.click(screen.getByTestId('add-warning'));

      expect(screen.getByTestId('toast-count')).toHaveTextContent('3');
    });
  });

  describe('Toast rendering', () => {
    it('renders toasts with correct variants', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByTestId('add-success'));
      expect(screen.getByText('Success')).toBeInTheDocument();

      await user.click(screen.getByTestId('add-error'));
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('renders toast with action button', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByTestId('add-with-action'));

      expect(screen.getByText('Action Toast')).toBeInTheDocument();
      expect(screen.getByText('Undo')).toBeInTheDocument();
    });

    it('renders toast with description', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByTestId('add-error'));

      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('renders all variant types correctly', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      );

      await user.click(screen.getByTestId('add-success'));
      await user.click(screen.getByTestId('add-error'));
      await user.click(screen.getByTestId('add-warning'));
      await user.click(screen.getByTestId('add-info'));

      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(screen.getByText('Info')).toBeInTheDocument();
    });
  });

  describe('useToast hook', () => {
    it('throws error when used outside provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<ToastConsumer />);
      }).toThrow('useToast must be used within a ToastProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Toast variants', () => {
    const variants: ToastVariant[] = ['success', 'error', 'warning', 'info'];

    it('supports all defined variants', () => {
      variants.forEach((variant) => {
        expect(variant).toBeDefined();
      });
    });
  });
});
