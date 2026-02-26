/**
 * Error Handler Utility Tests
 * Tests for src/utils/error-handler.js
 *
 * The error-handler module uses an IIFE pattern that attaches to window.
 * We test error classification, logging, user notification, and error wrapping.
 */

import { describe, it, expect, beforeEach, beforeAll, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import vm from 'vm';

// Store original handlers
let originalOnerror;
let originalOnunhandledrejection;

// Load and execute the error-handler script before tests
beforeAll(() => {
  // Save original handlers
  originalOnerror = window.onerror;
  originalOnunhandledrejection = window.onunhandledrejection;

  // Mock showToast if not available
  if (!window.showToast) {
    window.showToast = vi.fn();
  }

  // Read the error handler script
  let scriptContent = readFileSync('./src/utils/error-handler.js', 'utf-8');

  // Replace import.meta check for test environment
  scriptContent = scriptContent.replace(
    /import\.meta\?\.env\?\.DEV/g,
    'false'
  );

  // Execute in global context
  vm.runInThisContext(scriptContent);
});

// Clean up before and after each test
beforeEach(() => {
  document.body.textContent = '';
  localStorage.clear();
  sessionStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================================================
// GradeUpErrors.classify Tests (Error Classification)
// ============================================================================
describe('GradeUpErrors.classify', () => {
  describe('network errors', () => {
    it('classifies TypeError with fetch as network error', () => {
      const error = new TypeError('Failed to fetch');
      expect(window.GradeUpErrors.classify(error)).toBe('network');
    });

    it('classifies errors mentioning "network" as network error', () => {
      const error = new Error('network request failed');
      expect(window.GradeUpErrors.classify(error)).toBe('network');
    });

    it('classifies errors mentioning "offline" as network error', () => {
      const error = new Error('Browser is offline');
      expect(window.GradeUpErrors.classify(error)).toBe('network');
    });
  });

  describe('auth errors', () => {
    it('classifies 401 status as auth error', () => {
      const error = { status: 401, message: 'Unauthorized' };
      expect(window.GradeUpErrors.classify(error)).toBe('auth');
    });

    it('classifies 403 status as auth error', () => {
      const error = { status: 403, message: 'Forbidden' };
      expect(window.GradeUpErrors.classify(error)).toBe('auth');
    });

    it('classifies errors mentioning "auth" as auth error', () => {
      const error = new Error('auth session expired');
      expect(window.GradeUpErrors.classify(error)).toBe('auth');
    });

    it('classifies errors mentioning "token" as auth error', () => {
      const error = new Error('token invalid');
      expect(window.GradeUpErrors.classify(error)).toBe('auth');
    });
  });

  describe('validation errors', () => {
    it('classifies 400 status as validation error', () => {
      const error = { status: 400, message: 'Bad Request' };
      expect(window.GradeUpErrors.classify(error)).toBe('validation');
    });

    it('classifies 422 status as validation error', () => {
      const error = { status: 422, message: 'Unprocessable Entity' };
      expect(window.GradeUpErrors.classify(error)).toBe('validation');
    });
  });

  describe('server errors', () => {
    it('classifies 500 status as server error', () => {
      const error = { status: 500, message: 'Internal Server Error' };
      expect(window.GradeUpErrors.classify(error)).toBe('server');
    });

    it('classifies 502 status as server error', () => {
      const error = { status: 502, message: 'Bad Gateway' };
      expect(window.GradeUpErrors.classify(error)).toBe('server');
    });

    it('classifies 503 status as server error', () => {
      const error = { status: 503, message: 'Service Unavailable' };
      expect(window.GradeUpErrors.classify(error)).toBe('server');
    });

    it('classifies 504 status as server error', () => {
      const error = { status: 504, message: 'Gateway Timeout' };
      expect(window.GradeUpErrors.classify(error)).toBe('server');
    });
  });

  describe('client errors', () => {
    it('classifies generic JavaScript errors as client error', () => {
      const error = new Error('Something went wrong');
      expect(window.GradeUpErrors.classify(error)).toBe('client');
    });

    it('classifies ReferenceError as client error', () => {
      const error = new ReferenceError('variable is not defined');
      expect(window.GradeUpErrors.classify(error)).toBe('client');
    });

    it('classifies SyntaxError as client error', () => {
      // Note: SyntaxError message containing "token" gets classified as auth
      // because the classifier checks for "token" keyword
      const error = new SyntaxError('Unexpected end of input');
      expect(window.GradeUpErrors.classify(error)).toBe('client');
    });
  });

  describe('unknown errors', () => {
    it('classifies null as unknown error', () => {
      expect(window.GradeUpErrors.classify(null)).toBe('unknown');
    });

    it('classifies undefined as unknown error', () => {
      expect(window.GradeUpErrors.classify(undefined)).toBe('unknown');
    });
  });
});

// ============================================================================
// GradeUpErrors.types Tests
// ============================================================================
describe('GradeUpErrors.types', () => {
  it('has NETWORK type', () => {
    expect(window.GradeUpErrors.types.NETWORK).toBe('network');
  });

  it('has AUTH type', () => {
    expect(window.GradeUpErrors.types.AUTH).toBe('auth');
  });

  it('has VALIDATION type', () => {
    expect(window.GradeUpErrors.types.VALIDATION).toBe('validation');
  });

  it('has SERVER type', () => {
    expect(window.GradeUpErrors.types.SERVER).toBe('server');
  });

  it('has CLIENT type', () => {
    expect(window.GradeUpErrors.types.CLIENT).toBe('client');
  });

  it('has UNKNOWN type', () => {
    expect(window.GradeUpErrors.types.UNKNOWN).toBe('unknown');
  });
});

// ============================================================================
// GradeUpErrors.messages Tests
// ============================================================================
describe('GradeUpErrors.messages', () => {
  it('has user-friendly network error message', () => {
    const message = window.GradeUpErrors.messages.network;
    expect(message).toContain('internet');
  });

  it('has user-friendly auth error message', () => {
    const message = window.GradeUpErrors.messages.auth;
    expect(message).toContain('session');
    expect(message).toContain('log in');
  });

  it('has user-friendly validation error message', () => {
    const message = window.GradeUpErrors.messages.validation;
    expect(message).toContain('input');
  });

  it('has user-friendly server error message', () => {
    const message = window.GradeUpErrors.messages.server;
    expect(message).toContain('went wrong');
  });

  it('has user-friendly client error message', () => {
    const message = window.GradeUpErrors.messages.client;
    expect(message).toContain('unexpected');
  });

  it('has user-friendly unknown error message', () => {
    const message = window.GradeUpErrors.messages.unknown;
    expect(message).toContain('error');
  });
});

// ============================================================================
// handleError Tests
// ============================================================================
describe('handleError', () => {
  beforeEach(() => {
    vi.spyOn(window, 'showToast').mockImplementation(() => {});
  });

  describe('basic functionality', () => {
    it('is defined as a global function', () => {
      expect(typeof window.handleError).toBe('function');
    });

    it('handles Error objects', () => {
      const error = new Error('Test error');
      expect(() => window.handleError(error)).not.toThrow();
    });

    it('handles plain objects', () => {
      const error = { message: 'Test error', status: 500 };
      expect(() => window.handleError(error)).not.toThrow();
    });

    it('handles strings', () => {
      expect(() => window.handleError('Test error string')).not.toThrow();
    });
  });

  describe('toast notifications', () => {
    it('shows toast for non-silent errors', () => {
      const error = new Error('Test error');
      window.handleError(error, { silent: false });

      expect(window.showToast).toHaveBeenCalled();
    });

    it('does not show toast for silent errors', () => {
      const error = new Error('Test error');
      window.handleError(error, { silent: true });

      expect(window.showToast).not.toHaveBeenCalled();
    });

    it('shows custom message when provided', () => {
      const error = new Error('Test error');
      window.handleError(error, { customMessage: 'Custom error message' });

      expect(window.showToast).toHaveBeenCalledWith('Custom error message', 'error');
    });

    it('shows appropriate message for network errors', () => {
      const error = new TypeError('Failed to fetch');
      window.handleError(error);

      expect(window.showToast).toHaveBeenCalledWith(
        expect.stringContaining('internet'),
        'error'
      );
    });

    it('shows appropriate message for auth errors', () => {
      const error = { status: 401, message: 'Unauthorized' };
      window.handleError(error);

      expect(window.showToast).toHaveBeenCalledWith(
        expect.stringContaining('session'),
        'error'
      );
    });
  });

  describe('auth error handling', () => {
    it('clears user data from localStorage on auth error', () => {
      vi.useFakeTimers();
      localStorage.setItem('gradeup_user', JSON.stringify({ email: 'test@test.com' }));

      const error = { status: 401, message: 'Unauthorized' };
      window.handleError(error);

      expect(localStorage.getItem('gradeup_user')).toBe(null);
      vi.useRealTimers();
    });

    it('saves redirect URL on auth error', () => {
      vi.useFakeTimers();
      const error = { status: 401, message: 'Unauthorized' };
      window.handleError(error);

      expect(sessionStorage.getItem('gradeup_redirect')).toBe(window.location.href);
      vi.useRealTimers();
    });
  });
});

// ============================================================================
// getErrorLog Tests
// ============================================================================
describe('getErrorLog', () => {
  it('is defined as a global function', () => {
    expect(typeof window.getErrorLog).toBe('function');
  });

  it('returns an array', () => {
    const log = window.getErrorLog();
    expect(Array.isArray(log)).toBe(true);
  });

  it('returns a copy of the log (not a reference)', () => {
    const log1 = window.getErrorLog();
    const log2 = window.getErrorLog();
    expect(log1).not.toBe(log2);
  });

  it('logs errors when handleError is called', () => {
    const initialLength = window.getErrorLog().length;
    window.handleError(new Error('Test error'), { silent: true });
    const newLength = window.getErrorLog().length;

    expect(newLength).toBeGreaterThan(initialLength);
  });

  it('log entries have required fields', () => {
    window.handleError(new Error('Test error'), { silent: true });
    const log = window.getErrorLog();
    const entry = log[log.length - 1];

    expect(entry).toHaveProperty('timestamp');
    expect(entry).toHaveProperty('type');
    expect(entry).toHaveProperty('message');
    expect(entry).toHaveProperty('context');
  });

  it('log entries include timestamp in ISO format', () => {
    window.handleError(new Error('Test error'), { silent: true });
    const log = window.getErrorLog();
    const entry = log[log.length - 1];

    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('log entries include error type', () => {
    window.handleError({ status: 500 }, { silent: true });
    const log = window.getErrorLog();
    const entry = log[log.length - 1];

    expect(entry.type).toBe('server');
  });

  it('log entries include context with URL', () => {
    window.handleError(new Error('Test'), { silent: true });
    const log = window.getErrorLog();
    const entry = log[log.length - 1];

    expect(entry.context).toHaveProperty('url');
  });

  it('log entries include context with userAgent', () => {
    window.handleError(new Error('Test'), { silent: true });
    const log = window.getErrorLog();
    const entry = log[log.length - 1];

    expect(entry.context).toHaveProperty('userAgent');
  });

  it('log entries include custom context', () => {
    window.handleError(new Error('Test'), {
      silent: true,
      context: { component: 'TestComponent', action: 'click' }
    });
    const log = window.getErrorLog();
    const entry = log[log.length - 1];

    expect(entry.context.component).toBe('TestComponent');
    expect(entry.context.action).toBe('click');
  });
});

// ============================================================================
// withErrorHandling Tests
// ============================================================================
describe('withErrorHandling', () => {
  beforeEach(() => {
    vi.spyOn(window, 'showToast').mockImplementation(() => {});
  });

  it('is defined as a global function', () => {
    expect(typeof window.withErrorHandling).toBe('function');
  });

  it('returns a function', () => {
    const wrapped = window.withErrorHandling(() => {});
    expect(typeof wrapped).toBe('function');
  });

  it('wrapped function returns same result on success', async () => {
    const fn = async () => 42;
    const wrapped = window.withErrorHandling(fn);

    const result = await wrapped();
    expect(result).toBe(42);
  });

  it('wrapped function passes arguments correctly', async () => {
    const fn = async (a, b) => a + b;
    const wrapped = window.withErrorHandling(fn);

    const result = await wrapped(10, 20);
    expect(result).toBe(30);
  });

  it('wrapped function calls handleError on failure', async () => {
    const error = new Error('Test failure');
    const fn = async () => { throw error; };
    const wrapped = window.withErrorHandling(fn);

    await expect(wrapped()).rejects.toThrow('Test failure');
    expect(window.showToast).toHaveBeenCalled();
  });

  it('wrapped function re-throws the error', async () => {
    const error = new Error('Test failure');
    const fn = async () => { throw error; };
    const wrapped = window.withErrorHandling(fn);

    await expect(wrapped()).rejects.toThrow(error);
  });

  it('passes options to handleError', async () => {
    const error = new Error('Test failure');
    const fn = async () => { throw error; };
    const wrapped = window.withErrorHandling(fn, { silent: true });

    await expect(wrapped()).rejects.toThrow('Test failure');
    expect(window.showToast).not.toHaveBeenCalled();
  });

  it('preserves this context', async () => {
    const obj = {
      value: 100,
      async getValue() {
        return this.value;
      }
    };

    obj.getValue = window.withErrorHandling(obj.getValue);
    const result = await obj.getValue();

    expect(result).toBe(100);
  });
});

// ============================================================================
// Global Error Handlers Tests
// ============================================================================
describe('Global Error Handlers', () => {
  beforeEach(() => {
    vi.spyOn(window, 'showToast').mockImplementation(() => {});
  });

  describe('window.onerror', () => {
    it('is set as a global error handler', () => {
      expect(typeof window.onerror).toBe('function');
    });

    it('logs errors to error log', () => {
      const initialLength = window.getErrorLog().length;

      window.onerror('Test error', 'test.js', 10, 5, new Error('Test error'));

      const newLength = window.getErrorLog().length;
      expect(newLength).toBeGreaterThan(initialLength);
    });

    it('includes source information in context', () => {
      window.onerror('Test error', 'test.js', 10, 5, new Error('Test error'));

      const log = window.getErrorLog();
      const entry = log[log.length - 1];

      expect(entry.context.source).toBe('test.js');
      expect(entry.context.lineno).toBe(10);
      expect(entry.context.colno).toBe(5);
    });

    it('returns false to not suppress default handling', () => {
      const result = window.onerror('Test', 'test.js', 1, 1, new Error('Test'));
      expect(result).toBe(false);
    });

    it('creates error from message when no error object provided', () => {
      window.onerror('Just a message', 'test.js', 1, 1, null);

      const log = window.getErrorLog();
      const entry = log[log.length - 1];

      expect(entry.message).toBe('Just a message');
    });
  });

  describe('window.onunhandledrejection', () => {
    it('is set as a global rejection handler', () => {
      expect(typeof window.onunhandledrejection).toBe('function');
    });

    it('logs promise rejections', () => {
      const initialLength = window.getErrorLog().length;

      window.onunhandledrejection({ reason: new Error('Promise failed') });

      const newLength = window.getErrorLog().length;
      expect(newLength).toBeGreaterThan(initialLength);
    });

    it('includes unhandledrejection type in context', () => {
      window.onunhandledrejection({ reason: new Error('Promise failed') });

      const log = window.getErrorLog();
      const entry = log[log.length - 1];

      expect(entry.context.type).toBe('unhandledrejection');
    });

    it('handles rejection without reason', () => {
      window.onunhandledrejection({ reason: null });

      const log = window.getErrorLog();
      const entry = log[log.length - 1];

      expect(entry.message).toContain('Unhandled Promise rejection');
    });
  });
});

// ============================================================================
// Error Log Size Limit Tests
// ============================================================================
describe('Error Log Size Limit', () => {
  it('limits error log to prevent memory issues', () => {
    // Generate many errors
    for (let i = 0; i < 150; i++) {
      window.handleError(new Error(`Error ${i}`), { silent: true });
    }

    const log = window.getErrorLog();
    expect(log.length).toBeLessThanOrEqual(100);
  });

  it('removes oldest entries when limit exceeded', () => {
    // Clear existing log by generating fresh errors
    for (let i = 0; i < 100; i++) {
      window.handleError(new Error(`Initial ${i}`), { silent: true });
    }

    // Add one more
    window.handleError(new Error('Latest error'), { silent: true });

    const log = window.getErrorLog();
    const lastEntry = log[log.length - 1];

    expect(lastEntry.message).toBe('Latest error');
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================
describe('Edge Cases', () => {
  beforeEach(() => {
    vi.spyOn(window, 'showToast').mockImplementation(() => {});
  });

  it('handles circular reference in error object', () => {
    const error = { message: 'Test' };
    error.self = error; // Circular reference

    expect(() => window.handleError(error, { silent: true })).not.toThrow();
  });

  it('handles very long error messages', () => {
    const longMessage = 'A'.repeat(10000);
    const error = new Error(longMessage);

    expect(() => window.handleError(error, { silent: true })).not.toThrow();
  });

  it('handles error with special characters in message', () => {
    const error = new Error('Error: <script>alert("xss")</script>');
    expect(() => window.handleError(error, { silent: true })).not.toThrow();
  });

  it('handles empty Error object', () => {
    const error = new Error();
    expect(() => window.handleError(error, { silent: true })).not.toThrow();
  });

  it('handles error with undefined message', () => {
    const error = { status: 500 };
    expect(() => window.handleError(error, { silent: true })).not.toThrow();
  });

  it('handles multiple rapid errors', () => {
    for (let i = 0; i < 50; i++) {
      window.handleError(new Error(`Rapid error ${i}`), { silent: true });
    }

    const log = window.getErrorLog();
    expect(log.length).toBeGreaterThanOrEqual(50);
  });
});

// ============================================================================
// Error Classification Priority Tests
// ============================================================================
describe('Error Classification Priority', () => {
  describe('network detection takes priority', () => {
    it('TypeError with fetch is network even if message has other keywords', () => {
      const error = new TypeError('Failed to fetch auth token');
      expect(window.GradeUpErrors.classify(error)).toBe('network');
    });
  });

  describe('message keywords can override status codes', () => {
    // Note: The classifier checks message keywords before status codes
    // This is intentional - "network" in message = network error
    it('network in message overrides 401 status', () => {
      const error = { status: 401, message: 'network timeout' };
      expect(window.GradeUpErrors.classify(error)).toBe('network');
    });

    it('auth in message overrides 500 status', () => {
      const error = { status: 500, message: 'auth service failed' };
      expect(window.GradeUpErrors.classify(error)).toBe('auth');
    });

    it('status code used when no matching keywords', () => {
      const error = { status: 500, message: 'database connection failed' };
      expect(window.GradeUpErrors.classify(error)).toBe('server');
    });
  });
});

// ============================================================================
// Fallback Toast Implementation Tests
// ============================================================================
describe('Fallback Toast Implementation', () => {
  beforeEach(() => {
    // Remove the mock showToast to test fallback
    delete window.showToast;
  });

  afterEach(() => {
    // Restore mock
    window.showToast = vi.fn();
  });

  it('creates toast element when showToast is not available', () => {
    window.handleError(new Error('Test'));

    const toast = document.querySelector('.error-toast');
    expect(toast).not.toBe(null);
  });

  it('fallback toast has correct role for accessibility', () => {
    window.handleError(new Error('Test'));

    const toast = document.querySelector('.error-toast');
    expect(toast.getAttribute('role')).toBe('alert');
  });

  it('fallback toast has aria-live attribute', () => {
    window.handleError(new Error('Test'));

    const toast = document.querySelector('.error-toast');
    expect(toast.getAttribute('aria-live')).toBe('assertive');
  });

  it('fallback toast is positioned fixed at bottom center', () => {
    window.handleError(new Error('Test'));

    const toast = document.querySelector('.error-toast');
    expect(toast.style.position).toBe('fixed');
    expect(toast.style.bottom).toBe('2rem');
  });

  it('fallback toast uses correct color for error type', () => {
    window.handleError(new Error('Test'));

    const toast = document.querySelector('.error-toast');
    expect(toast.style.background).toContain('#DA2B57');
  });

  it('removes existing toast when new one is created', () => {
    window.handleError(new Error('First'));
    window.handleError(new Error('Second'));

    const toasts = document.querySelectorAll('.error-toast');
    expect(toasts.length).toBe(1);
  });

  it('fallback toast auto-removes after timeout', () => {
    vi.useFakeTimers();
    window.handleError(new Error('Test'));

    expect(document.querySelector('.error-toast')).not.toBe(null);

    vi.advanceTimersByTime(5500); // 5000 + animation

    expect(document.querySelector('.error-toast')).toBe(null);
    vi.useRealTimers();
  });

  it('adds animation keyframes style element', () => {
    window.handleError(new Error('Test'));

    const styleEl = document.getElementById('error-toast-styles');
    expect(styleEl).not.toBe(null);
  });
});
