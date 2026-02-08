/**
 * Security Utilities Tests
 * Tests for src/utils/security.js
 *
 * The security module uses an IIFE pattern that attaches to window.
 * We preprocess the script to make it test-compatible (remove import.meta).
 */

import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import vm from 'vm';

// Load and execute the security script before tests
beforeAll(() => {
  // Mock crypto if needed
  if (!global.crypto) {
    global.crypto = {
      getRandomValues: (array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
        return array;
      },
    };
  }

  // Read the security script
  let scriptContent = readFileSync('./src/utils/security.js', 'utf-8');

  // Replace the import.meta check with a test-safe version that returns false
  // This makes DEMO_MODE default to false (secure default) in tests
  scriptContent = scriptContent.replace(
    /if \(typeof import\.meta !== 'undefined' && import\.meta\.env\) \{[\s\S]*?return import\.meta\.env\.VITE_DEMO_MODE === 'true';[\s\S]*?\}/,
    '/* import.meta check disabled for tests */'
  );

  // Execute in global context using vm module (safe script execution)
  vm.runInThisContext(scriptContent);
});

describe('Email Validation', () => {
  it('accepts valid email addresses', () => {
    expect(window.isValidEmail('user@example.com')).toBe(true);
    expect(window.isValidEmail('athlete@university.edu')).toBe(true);
    expect(window.isValidEmail('user+tag@domain.co.uk')).toBe(true);
  });

  it('rejects invalid email addresses', () => {
    expect(window.isValidEmail('invalid')).toBe(false);
    expect(window.isValidEmail('user@')).toBe(false);
    expect(window.isValidEmail('@domain.com')).toBe(false);
    expect(window.isValidEmail('')).toBe(false);
    expect(window.isValidEmail(null)).toBe(false);
    expect(window.isValidEmail(undefined)).toBe(false);
  });

  it('enforces maximum email length (254 chars)', () => {
    const longEmail = 'a'.repeat(250) + '@test.com';
    expect(window.isValidEmail(longEmail)).toBe(false);
  });
});

describe('Password Validation', () => {
  it('requires minimum 8 characters', () => {
    const result = window.validatePassword('Short1');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must be at least 8 characters');
  });

  it('requires at least one lowercase letter', () => {
    const result = window.validatePassword('UPPERCASE123');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one lowercase letter');
  });

  it('requires at least one uppercase letter', () => {
    const result = window.validatePassword('lowercase123');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one uppercase letter');
  });

  it('requires at least one number', () => {
    const result = window.validatePassword('NoNumbersHere');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one number');
  });

  it('accepts valid passwords', () => {
    const result = window.validatePassword('SecurePass123');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('calculates password strength', () => {
    expect(window.validatePassword('weak').strength).toBe('weak');
    expect(window.validatePassword('Medium12').strength).toBe('medium');
    expect(window.validatePassword('Strong123!@#').strength).toBe('strong');
  });
});

describe('Rate Limiting', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('allows first login attempt', () => {
    const result = window.recordLoginAttempt('user@test.com', false);
    expect(result.limited).toBe(false);
    expect(result.attempts).toBe(1);
    expect(result.remainingAttempts).toBe(4);
  });

  it('tracks multiple failed attempts', () => {
    window.recordLoginAttempt('user@test.com', false);
    window.recordLoginAttempt('user@test.com', false);
    const result = window.recordLoginAttempt('user@test.com', false);
    expect(result.attempts).toBe(3);
    expect(result.remainingAttempts).toBe(2);
  });

  it('locks account after 5 failed attempts', () => {
    for (let i = 0; i < 5; i++) {
      window.recordLoginAttempt('user@test.com', false);
    }
    const status = window.checkRateLimit('user@test.com');
    expect(typeof status).toBe('number');
    expect(status).toBeGreaterThan(0);
  });

  it('clears attempts on successful login', () => {
    window.recordLoginAttempt('user@test.com', false);
    window.recordLoginAttempt('user@test.com', false);
    const result = window.recordLoginAttempt('user@test.com', true);
    expect(result.limited).toBe(false);
    expect(result.attempts).toBe(0);
  });

  it('returns false when not rate limited', () => {
    expect(window.checkRateLimit('newuser@test.com')).toBe(false);
  });
});

describe('String Sanitization (XSS Prevention)', () => {
  it('escapes HTML tags', () => {
    const malicious = '<script>alert("xss")</script>';
    const result = window.sanitizeString(malicious);
    expect(result).toContain('&lt;script');
    expect(result).toContain('&gt;');
    expect(result).not.toContain('<script');
  });

  it('preserves normal text', () => {
    const text = 'Marcus Johnson is a great athlete!';
    expect(window.sanitizeString(text)).toBe(text);
  });

  it('handles empty/null input', () => {
    expect(window.sanitizeString('')).toBe('');
    expect(window.sanitizeString(null)).toBe('');
    expect(window.sanitizeString(undefined)).toBe('');
  });
});

describe('Object Sanitization', () => {
  it('sanitizes nested object values', () => {
    const obj = {
      name: '<script>alert(1)</script>',
      bio: 'Normal text',
      nested: {
        html: '<img src=x>'
      }
    };
    const result = window.sanitizeObject(obj);
    expect(result.name).toContain('&lt;script');
    expect(result.bio).toBe('Normal text');
    expect(result.nested.html).toContain('&lt;img');
  });

  it('preserves non-string values', () => {
    const obj = {
      count: 42,
      active: true,
      data: null
    };
    const result = window.sanitizeObject(obj);
    expect(result.count).toBe(42);
    expect(result.active).toBe(true);
    expect(result.data).toBe(null);
  });
});

describe('CSRF Token Management', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('generates tokens of correct length', () => {
    const token = window.generateCSRFToken();
    expect(token).toBeTruthy();
    expect(token.length).toBe(64); // 32 bytes as hex
  });

  it('stores token in sessionStorage', () => {
    const token = window.generateCSRFToken();
    expect(sessionStorage.getItem('gradeup_csrf')).toBe(token);
  });

  it('validates correct token', () => {
    const token = window.generateCSRFToken();
    expect(window.validateCSRFToken(token)).toBe(true);
  });

  it('rejects incorrect token', () => {
    window.generateCSRFToken();
    expect(window.validateCSRFToken('wrong-token')).toBe(false);
  });

  it('rejects when no token stored', () => {
    // Returns null or false when no token stored - both are falsy rejection
    expect(window.validateCSRFToken('any-token')).toBeFalsy();
  });
});

describe('Authentication Checks', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when not authenticated', () => {
    expect(window.checkAuth()).toBe(null);
  });

  it('returns user data when authenticated', () => {
    const userData = {
      email: 'test@example.com',
      signupDate: new Date().toISOString(),
      type: 'athlete'
    };
    localStorage.setItem('gradeup_user', JSON.stringify(userData));

    const result = window.checkAuth();
    expect(result).not.toBe(null);
    expect(result.email).toBe('test@example.com');
  });

  it('returns null for invalid user data', () => {
    localStorage.setItem('gradeup_user', 'invalid-json');
    expect(window.checkAuth()).toBe(null);
  });
});

describe('Demo Mode Security', () => {
  it('DEMO_MODE defaults to false for security', () => {
    // Without explicit config, DEMO_MODE should be false
    // This test verifies the security default
    expect(window.DEMO_MODE).toBe(false);
  });

  it('demo users have isDemo flag', () => {
    // Temporarily enable demo mode for testing
    const originalDemoMode = window.DEMO_MODE;
    window.DEMO_MODE = true;

    const user = window.requireAuthOrDemo('athlete');
    expect(user.isDemo).toBe(true);

    window.DEMO_MODE = originalDemoMode;
  });

  it('demo credentials use @example.invalid domain', () => {
    const originalDemoMode = window.DEMO_MODE;
    window.DEMO_MODE = true;

    const athlete = window.requireAuthOrDemo('athlete');
    const brand = window.requireAuthOrDemo('brand');
    const director = window.requireAuthOrDemo('director');

    // All demo emails should be clearly fake
    expect(athlete.email).toContain('@example.invalid');
    expect(brand.email).toContain('@example.invalid');
    expect(director.email).toContain('@example.invalid');

    window.DEMO_MODE = originalDemoMode;
  });
});
