/**
 * Tests for the ServiceWorkerProvider component
 * @module __tests__/components/providers/ServiceWorkerProvider.test
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { ServiceWorkerProvider, useServiceWorker } from '@/components/providers/service-worker-provider';

// Mock service worker registration
const mockRegistration = {
  update: jest.fn().mockResolvedValue(undefined),
  active: { state: 'activated' },
  installing: null,
  waiting: null,
  scope: '/',
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

// Store original navigator
const originalNavigator = global.navigator;

// Mock navigator.serviceWorker
const mockServiceWorker = {
  register: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  controller: null,
  ready: Promise.resolve(mockRegistration),
};

describe('ServiceWorkerProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset mocks
    mockServiceWorker.register.mockReset();
    mockServiceWorker.register.mockResolvedValue(mockRegistration);

    // Mock navigator
    Object.defineProperty(global, 'navigator', {
      value: {
        ...originalNavigator,
        serviceWorker: mockServiceWorker,
        onLine: true,
      },
      writable: true,
      configurable: true,
    });

    // Mock window events
    global.addEventListener = jest.fn();
    global.removeEventListener = jest.fn();
    window.addEventListener = jest.fn();
    window.removeEventListener = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it('renders children', () => {
    render(
      <ServiceWorkerProvider>
        <div data-testid="child">Child Content</div>
      </ServiceWorkerProvider>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('provides service worker context', () => {
    function TestConsumer() {
      const context = useServiceWorker();
      return (
        <div>
          <span data-testid="supported">{String(context.isSupported)}</span>
          <span data-testid="online">{String(context.isOnline)}</span>
        </div>
      );
    }

    render(
      <ServiceWorkerProvider>
        <TestConsumer />
      </ServiceWorkerProvider>
    );

    expect(screen.getByTestId('supported')).toHaveTextContent('true');
    expect(screen.getByTestId('online')).toHaveTextContent('true');
  });

  it('registers service worker on mount', async () => {
    render(
      <ServiceWorkerProvider>
        <div>Content</div>
      </ServiceWorkerProvider>
    );

    await waitFor(() => {
      expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js');
    });
  });

  it('sets up online/offline event listeners', () => {
    render(
      <ServiceWorkerProvider>
        <div>Content</div>
      </ServiceWorkerProvider>
    );

    expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  it('handles online state changes', () => {
    function TestConsumer() {
      const { isOnline } = useServiceWorker();
      return <span data-testid="status">{isOnline ? 'online' : 'offline'}</span>;
    }

    render(
      <ServiceWorkerProvider>
        <TestConsumer />
      </ServiceWorkerProvider>
    );

    expect(screen.getByTestId('status')).toHaveTextContent('online');
  });

  it('updates registration state after successful registration', async () => {
    function TestConsumer() {
      const { isRegistered } = useServiceWorker();
      return <span data-testid="registered">{String(isRegistered)}</span>;
    }

    render(
      <ServiceWorkerProvider>
        <TestConsumer />
      </ServiceWorkerProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('registered')).toHaveTextContent('true');
    });
  });

  it('provides update function', async () => {
    function TestConsumer() {
      const { update } = useServiceWorker();
      return (
        <button
          data-testid="update-btn"
          onClick={async () => {
            await update();
          }}
        >
          Update
        </button>
      );
    }

    render(
      <ServiceWorkerProvider>
        <TestConsumer />
      </ServiceWorkerProvider>
    );

    await waitFor(() => {
      expect(mockServiceWorker.register).toHaveBeenCalled();
    });
  });

  it('handles service worker registration failure', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockServiceWorker.register.mockRejectedValueOnce(new Error('Registration failed'));

    function TestConsumer() {
      const { isRegistered } = useServiceWorker();
      return <span data-testid="registered">{String(isRegistered)}</span>;
    }

    render(
      <ServiceWorkerProvider>
        <TestConsumer />
      </ServiceWorkerProvider>
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Service worker registration failed:',
        expect.any(Error)
      );
    });

    expect(screen.getByTestId('registered')).toHaveTextContent('false');

    consoleSpy.mockRestore();
  });

  it('removes event listeners on unmount', () => {
    const { unmount } = render(
      <ServiceWorkerProvider>
        <div>Content</div>
      </ServiceWorkerProvider>
    );

    unmount();

    expect(window.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
  });
});

describe('useServiceWorker hook', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ServiceWorkerProvider>{children}</ServiceWorkerProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockServiceWorker.register.mockResolvedValue(mockRegistration);

    Object.defineProperty(global, 'navigator', {
      value: {
        ...originalNavigator,
        serviceWorker: mockServiceWorker,
        onLine: true,
      },
      writable: true,
      configurable: true,
    });

    window.addEventListener = jest.fn();
    window.removeEventListener = jest.fn();
  });

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it('returns context values', () => {
    const { result } = renderHook(() => useServiceWorker(), { wrapper });

    expect(result.current).toHaveProperty('isSupported');
    expect(result.current).toHaveProperty('isRegistered');
    expect(result.current).toHaveProperty('isOnline');
    expect(result.current).toHaveProperty('registration');
    expect(result.current).toHaveProperty('update');
  });

  it('update function does nothing without registration', async () => {
    // Don't register service worker
    mockServiceWorker.register.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useServiceWorker(), { wrapper });

    // Call update before registration completes
    await act(async () => {
      await result.current.update();
    });

    // Should not throw
    expect(mockRegistration.update).not.toHaveBeenCalled();
  });

  it('update function calls registration.update when available', async () => {
    const { result } = renderHook(() => useServiceWorker(), { wrapper });

    // Wait for registration
    await waitFor(() => {
      expect(result.current.isRegistered).toBe(true);
    });

    // Call update
    await act(async () => {
      await result.current.update();
    });

    expect(mockRegistration.update).toHaveBeenCalled();
  });
});

describe('ServiceWorkerProvider default context', () => {
  it('provides default context values when hook used directly', () => {
    // Test the default context values
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ServiceWorkerProvider>{children}</ServiceWorkerProvider>
    );

    const { result } = renderHook(() => useServiceWorker(), { wrapper });

    expect(typeof result.current.isSupported).toBe('boolean');
    expect(typeof result.current.isOnline).toBe('boolean');
    expect(typeof result.current.update).toBe('function');
  });
});
