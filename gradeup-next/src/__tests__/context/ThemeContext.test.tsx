/**
 * Tests for ThemeContext and ThemeProvider
 * @module __tests__/context/ThemeContext.test
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock matchMedia
const matchMediaMock = jest.fn();
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: matchMediaMock,
});

// Test component that uses the theme context
function ThemeConsumer() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved-theme">{resolvedTheme}</span>
      <button data-testid="set-light" onClick={() => setTheme('light')}>
        Light
      </button>
      <button data-testid="set-dark" onClick={() => setTheme('dark')}>
        Dark
      </button>
      <button data-testid="set-system" onClick={() => setTheme('system')}>
        System
      </button>
    </div>
  );
}

describe('ThemeContext', () => {
  let matchMediaListeners: ((e: { matches: boolean }) => void)[] = [];

  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    matchMediaListeners = [];

    // Reset matchMedia mock
    matchMediaMock.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: jest.fn((event, listener) => {
        if (event === 'change') {
          matchMediaListeners.push(listener);
        }
      }),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  });

  it('provides default theme as system', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('system');
  });

  it('loads saved theme from localStorage', async () => {
    localStorageMock.getItem.mockReturnValue('dark');

    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );
    });

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  });

  it('changes theme when setTheme is called', async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('set-dark'));
    });

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('gradeup-theme', 'dark');
  });

  it('saves theme to localStorage', async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('set-light'));
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith('gradeup-theme', 'light');
  });

  it('has resolvedTheme value', async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );
    });

    // resolvedTheme should be either 'light' or 'dark'
    const resolved = screen.getByTestId('resolved-theme');
    expect(['light', 'dark']).toContain(resolved.textContent);
  });

  it('throws error when useTheme is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<ThemeConsumer />);
    }).toThrow('useTheme must be used within a ThemeProvider');

    consoleSpy.mockRestore();
  });

  it('ignores invalid saved theme values', async () => {
    localStorageMock.getItem.mockReturnValue('invalid-theme');

    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );
    });

    // Should fall back to system
    expect(screen.getByTestId('theme')).toHaveTextContent('system');
  });

  it('allows switching between all themes', async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );
    });

    // Start at system
    expect(screen.getByTestId('theme')).toHaveTextContent('system');

    // Switch to dark
    await act(async () => {
      fireEvent.click(screen.getByTestId('set-dark'));
    });
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');

    // Switch to light
    await act(async () => {
      fireEvent.click(screen.getByTestId('set-light'));
    });
    expect(screen.getByTestId('theme')).toHaveTextContent('light');

    // Switch back to system
    await act(async () => {
      fireEvent.click(screen.getByTestId('set-system'));
    });
    expect(screen.getByTestId('theme')).toHaveTextContent('system');
  });
});
