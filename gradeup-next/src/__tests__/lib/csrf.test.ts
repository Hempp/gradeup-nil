/**
 * Tests for the CSRF protection module
 * @module __tests__/lib/csrf.test
 *
 * Tests cover:
 * - Token generation (unique, correct format)
 * - HMAC signing and verification
 * - Token creation and validation
 * - Path checking utilities
 * - Cookie parsing and creation
 * - Edge cases (missing, tampered, invalid tokens)
 */

import {
  CSRF_CONFIG,
  generateToken,
  signToken,
  verifySignature,
  createCsrfToken,
  validateCsrfToken,
  isExemptPath,
  requiresCsrfProtection,
  parseCookies,
  getCsrfTokenFromHeader,
  getCsrfSecretFromCookies,
  createCsrfTokenCookie,
  createCsrfSecretCookie,
} from '@/lib/csrf';

// =============================================================================
// CSRF Configuration Tests
// =============================================================================

describe('CSRF_CONFIG', () => {
  it('has expected cookie names', () => {
    expect(CSRF_CONFIG.CSRF_TOKEN_COOKIE).toBe('csrf_token');
    expect(CSRF_CONFIG.CSRF_SECRET_COOKIE).toBe('__Host-csrf_secret');
  });

  it('has expected header name', () => {
    expect(CSRF_CONFIG.CSRF_HEADER).toBe('X-CSRF-Token');
  });

  it('protects state-changing HTTP methods', () => {
    expect(CSRF_CONFIG.PROTECTED_METHODS).toContain('POST');
    expect(CSRF_CONFIG.PROTECTED_METHODS).toContain('PATCH');
    expect(CSRF_CONFIG.PROTECTED_METHODS).toContain('DELETE');
    expect(CSRF_CONFIG.PROTECTED_METHODS).toContain('PUT');
    expect(CSRF_CONFIG.PROTECTED_METHODS).not.toContain('GET');
    expect(CSRF_CONFIG.PROTECTED_METHODS).not.toContain('HEAD');
    expect(CSRF_CONFIG.PROTECTED_METHODS).not.toContain('OPTIONS');
  });

  it('has secure cookie options in production', () => {
    expect(CSRF_CONFIG.COOKIE_OPTIONS.path).toBe('/');
    expect(CSRF_CONFIG.COOKIE_OPTIONS.sameSite).toBe('strict');
    expect(CSRF_CONFIG.COOKIE_OPTIONS.maxAge).toBe(86400); // 24 hours
  });

  it('has appropriate token length', () => {
    expect(CSRF_CONFIG.TOKEN_LENGTH).toBe(32); // 32 bytes = 256 bits
  });

  it('has exempt paths for webhooks', () => {
    expect(CSRF_CONFIG.EXEMPT_PATHS).toContain('/api/webhooks/stripe');
    expect(CSRF_CONFIG.EXEMPT_PATHS).toContain('/api/webhooks/');
  });

  it('protects API paths', () => {
    expect(CSRF_CONFIG.PROTECTED_API_PATHS).toContain('/api/');
  });
});

// =============================================================================
// Token Generation Tests
// =============================================================================

describe('generateToken', () => {
  it('generates token of correct length', () => {
    const token = generateToken();
    // 32 bytes = 64 hex characters
    expect(token).toHaveLength(64);
  });

  it('generates hex string format', () => {
    const token = generateToken();
    expect(token).toMatch(/^[0-9a-f]+$/);
  });

  it('generates unique tokens on each call', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 100; i++) {
      tokens.add(generateToken());
    }
    expect(tokens.size).toBe(100);
  });

  it('respects custom length parameter', () => {
    const token16 = generateToken(16);
    expect(token16).toHaveLength(32); // 16 bytes = 32 hex chars

    const token8 = generateToken(8);
    expect(token8).toHaveLength(16); // 8 bytes = 16 hex chars
  });

  it('handles edge case of 1 byte length', () => {
    const token = generateToken(1);
    expect(token).toHaveLength(2);
    expect(token).toMatch(/^[0-9a-f]{2}$/);
  });
});

// =============================================================================
// HMAC Signing Tests
// =============================================================================

describe('signToken', () => {
  it('generates signature of correct format', async () => {
    const signature = await signToken('test-message', 'test-secret');
    // SHA-256 produces 32 bytes = 64 hex characters
    expect(signature).toHaveLength(64);
    expect(signature).toMatch(/^[0-9a-f]+$/);
  });

  it('produces consistent signatures for same input', async () => {
    const sig1 = await signToken('message', 'secret');
    const sig2 = await signToken('message', 'secret');
    expect(sig1).toBe(sig2);
  });

  it('produces different signatures for different messages', async () => {
    const sig1 = await signToken('message1', 'secret');
    const sig2 = await signToken('message2', 'secret');
    expect(sig1).not.toBe(sig2);
  });

  it('produces different signatures for different secrets', async () => {
    const sig1 = await signToken('message', 'secret1');
    const sig2 = await signToken('message', 'secret2');
    expect(sig1).not.toBe(sig2);
  });

  it('handles empty message', async () => {
    const signature = await signToken('', 'secret');
    expect(signature).toHaveLength(64);
    expect(signature).toMatch(/^[0-9a-f]+$/);
  });

  it('handles special characters in message', async () => {
    const signature = await signToken('msg-with-special!@#$%', 'secret');
    expect(signature).toHaveLength(64);
  });

  it('handles unicode in message', async () => {
    const signature = await signToken('测试消息', 'secret');
    expect(signature).toHaveLength(64);
  });
});

// =============================================================================
// Signature Verification Tests
// =============================================================================

describe('verifySignature', () => {
  it('returns true for valid signature', async () => {
    const message = 'test-message';
    const secret = 'test-secret';
    const signature = await signToken(message, secret);

    const isValid = await verifySignature(message, signature, secret);
    expect(isValid).toBe(true);
  });

  it('returns false for invalid signature', async () => {
    const isValid = await verifySignature(
      'message',
      'invalid-signature-that-is-64-chars-long-abcdef1234567890abcdef',
      'secret'
    );
    expect(isValid).toBe(false);
  });

  it('returns false for tampered message', async () => {
    const secret = 'secret';
    const signature = await signToken('original', secret);

    const isValid = await verifySignature('tampered', signature, secret);
    expect(isValid).toBe(false);
  });

  it('returns false for wrong secret', async () => {
    const signature = await signToken('message', 'secret1');

    const isValid = await verifySignature('message', signature, 'secret2');
    expect(isValid).toBe(false);
  });

  it('returns false for signature of different length', async () => {
    const isValid = await verifySignature('message', 'short', 'secret');
    expect(isValid).toBe(false);
  });

  it('uses constant-time comparison (timing attack resistance)', async () => {
    const secret = 'secret';
    const message = 'message';
    const correctSignature = await signToken(message, secret);

    // Create two wrong signatures - one differs early, one differs late
    const wrongEarly = 'a' + correctSignature.slice(1);
    const wrongLate = correctSignature.slice(0, -1) + 'a';

    // Both should return false (functional test - timing is verified by code review)
    const resultEarly = await verifySignature(message, wrongEarly, secret);
    const resultLate = await verifySignature(message, wrongLate, secret);

    expect(resultEarly).toBe(false);
    expect(resultLate).toBe(false);
  });
});

// =============================================================================
// CSRF Token Creation Tests
// =============================================================================

describe('createCsrfToken', () => {
  it('returns token, signedToken, and secret', async () => {
    const result = await createCsrfToken();

    expect(result).toHaveProperty('token');
    expect(result).toHaveProperty('signedToken');
    expect(result).toHaveProperty('secret');
  });

  it('generates token of correct length', async () => {
    const { token } = await createCsrfToken();
    expect(token).toHaveLength(64); // 32 bytes in hex
  });

  it('generates secret of correct length', async () => {
    const { secret } = await createCsrfToken();
    expect(secret).toHaveLength(64); // 32 bytes in hex
  });

  it('creates signedToken in format "token.signature"', async () => {
    const { signedToken } = await createCsrfToken();
    const parts = signedToken.split('.');

    expect(parts).toHaveLength(2);
    expect(parts[0]).toHaveLength(64); // token
    expect(parts[1]).toHaveLength(64); // signature
  });

  it('signedToken starts with the token value', async () => {
    const { token, signedToken } = await createCsrfToken();
    expect(signedToken.startsWith(token)).toBe(true);
  });

  it('generates unique tokens on each call', async () => {
    const results = await Promise.all([
      createCsrfToken(),
      createCsrfToken(),
      createCsrfToken(),
    ]);

    const tokens = new Set(results.map((r) => r.token));
    expect(tokens.size).toBe(3);
  });

  it('generates unique secrets on each call', async () => {
    const results = await Promise.all([
      createCsrfToken(),
      createCsrfToken(),
      createCsrfToken(),
    ]);

    const secrets = new Set(results.map((r) => r.secret));
    expect(secrets.size).toBe(3);
  });

  it('creates valid signed token that can be verified', async () => {
    const { signedToken, secret } = await createCsrfToken();
    const result = await validateCsrfToken(signedToken, secret);

    expect(result.valid).toBe(true);
  });
});

// =============================================================================
// CSRF Token Validation Tests
// =============================================================================

describe('validateCsrfToken', () => {
  it('validates correct token and secret', async () => {
    const { signedToken, secret } = await createCsrfToken();
    const result = await validateCsrfToken(signedToken, secret);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.token).toBeDefined();
  });

  it('returns token value on successful validation', async () => {
    const { token, signedToken, secret } = await createCsrfToken();
    const result = await validateCsrfToken(signedToken, secret);

    expect(result.token).toBe(token);
  });

  describe('missing token handling', () => {
    it('returns error for empty signedToken', async () => {
      const { secret } = await createCsrfToken();
      const result = await validateCsrfToken('', secret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing CSRF token or secret');
    });

    it('returns error for null signedToken', async () => {
      const { secret } = await createCsrfToken();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await validateCsrfToken(null as any, secret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing CSRF token or secret');
    });

    it('returns error for undefined signedToken', async () => {
      const { secret } = await createCsrfToken();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await validateCsrfToken(undefined as any, secret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing CSRF token or secret');
    });
  });

  describe('missing secret handling', () => {
    it('returns error for empty secret', async () => {
      const { signedToken } = await createCsrfToken();
      const result = await validateCsrfToken(signedToken, '');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing CSRF token or secret');
    });

    it('returns error for null secret', async () => {
      const { signedToken } = await createCsrfToken();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await validateCsrfToken(signedToken, null as any);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing CSRF token or secret');
    });

    it('returns error for undefined secret', async () => {
      const { signedToken } = await createCsrfToken();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await validateCsrfToken(signedToken, undefined as any);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing CSRF token or secret');
    });
  });

  describe('invalid format handling', () => {
    it('returns error for token without dot separator', async () => {
      const { secret } = await createCsrfToken();
      const result = await validateCsrfToken('tokenwithoutseparator', secret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid CSRF token format');
    });

    it('returns error for token with multiple dots', async () => {
      const { secret } = await createCsrfToken();
      const result = await validateCsrfToken('token.signature.extra', secret);

      expect(result.valid).toBe(false);
      // Token has more than 2 parts when split by '.', so it's invalid format
      expect(result.error).toBe('Invalid CSRF token format');
    });

    it('returns error for token with empty parts', async () => {
      const { secret } = await createCsrfToken();

      const result1 = await validateCsrfToken('.signature', secret);
      expect(result1.valid).toBe(false);
      expect(result1.error).toBe('Invalid CSRF token format');

      const result2 = await validateCsrfToken('token.', secret);
      expect(result2.valid).toBe(false);
      expect(result2.error).toBe('Invalid CSRF token format');
    });

    it('returns error for just a dot', async () => {
      const { secret } = await createCsrfToken();
      const result = await validateCsrfToken('.', secret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid CSRF token format');
    });
  });

  describe('tampered token handling', () => {
    it('returns error for tampered token portion', async () => {
      const { signedToken, secret } = await createCsrfToken();
      const [, signature] = signedToken.split('.');
      const tamperedToken = 'tampered' + generateToken().slice(8) + '.' + signature;

      const result = await validateCsrfToken(tamperedToken, secret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid CSRF token signature');
    });

    it('returns error for tampered signature portion', async () => {
      const { signedToken, secret } = await createCsrfToken();
      const [token] = signedToken.split('.');
      const tamperedSignedToken = token + '.' + generateToken();

      const result = await validateCsrfToken(tamperedSignedToken, secret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid CSRF token signature');
    });

    it('returns error for wrong secret', async () => {
      const { signedToken } = await createCsrfToken();
      const wrongSecret = generateToken();

      const result = await validateCsrfToken(signedToken, wrongSecret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid CSRF token signature');
    });

    it('returns error when using different session secret', async () => {
      const token1 = await createCsrfToken();
      const token2 = await createCsrfToken();

      // Try to validate token1 with token2's secret
      const result = await validateCsrfToken(token1.signedToken, token2.secret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid CSRF token signature');
    });
  });
});

// =============================================================================
// Path Checking Utility Tests
// =============================================================================

describe('isExemptPath', () => {
  it('returns true for exact exempt path match', () => {
    expect(isExemptPath('/api/webhooks/stripe')).toBe(true);
    expect(isExemptPath('/api/webhooks/')).toBe(true);
  });

  it('returns true for paths that start with exempt paths', () => {
    expect(isExemptPath('/api/webhooks/stripe/events')).toBe(true);
    expect(isExemptPath('/api/webhooks/some-service')).toBe(true);
  });

  it('returns false for non-exempt API paths', () => {
    expect(isExemptPath('/api/deals')).toBe(false);
    expect(isExemptPath('/api/users')).toBe(false);
    expect(isExemptPath('/api/athletes')).toBe(false);
  });

  it('returns false for non-API paths', () => {
    expect(isExemptPath('/dashboard')).toBe(false);
    expect(isExemptPath('/athlete/profile')).toBe(false);
    expect(isExemptPath('/')).toBe(false);
  });

  it('returns false for similar but non-matching paths', () => {
    expect(isExemptPath('/api/webhook')).toBe(false); // singular
    expect(isExemptPath('/api-webhooks')).toBe(false); // hyphen instead of slash
  });
});

describe('requiresCsrfProtection', () => {
  describe('HTTP method filtering', () => {
    it('returns true for POST to protected API paths', () => {
      expect(requiresCsrfProtection('POST', '/api/deals')).toBe(true);
      expect(requiresCsrfProtection('post', '/api/users')).toBe(true); // lowercase
    });

    it('returns true for PUT to protected API paths', () => {
      expect(requiresCsrfProtection('PUT', '/api/deals/123')).toBe(true);
    });

    it('returns true for PATCH to protected API paths', () => {
      expect(requiresCsrfProtection('PATCH', '/api/athletes/profile')).toBe(true);
    });

    it('returns true for DELETE to protected API paths', () => {
      expect(requiresCsrfProtection('DELETE', '/api/notifications/456')).toBe(true);
    });

    it('returns false for GET requests', () => {
      expect(requiresCsrfProtection('GET', '/api/deals')).toBe(false);
      expect(requiresCsrfProtection('get', '/api/users')).toBe(false);
    });

    it('returns false for HEAD requests', () => {
      expect(requiresCsrfProtection('HEAD', '/api/health')).toBe(false);
    });

    it('returns false for OPTIONS requests', () => {
      expect(requiresCsrfProtection('OPTIONS', '/api/deals')).toBe(false);
    });
  });

  describe('path filtering', () => {
    it('returns false for exempt webhook paths', () => {
      expect(requiresCsrfProtection('POST', '/api/webhooks/stripe')).toBe(false);
      expect(requiresCsrfProtection('POST', '/api/webhooks/')).toBe(false);
      expect(requiresCsrfProtection('POST', '/api/webhooks/custom')).toBe(false);
    });

    it('returns false for non-API paths', () => {
      expect(requiresCsrfProtection('POST', '/login')).toBe(false);
      expect(requiresCsrfProtection('POST', '/signup')).toBe(false);
      expect(requiresCsrfProtection('POST', '/athlete/dashboard')).toBe(false);
    });

    it('returns true for nested API paths', () => {
      expect(requiresCsrfProtection('POST', '/api/v1/deals')).toBe(true);
      expect(requiresCsrfProtection('POST', '/api/athlete/profile/update')).toBe(true);
    });
  });

  describe('combined filtering', () => {
    it('applies all filters correctly', () => {
      // Protected: POST to non-exempt API path
      expect(requiresCsrfProtection('POST', '/api/deals')).toBe(true);

      // Not protected: GET to non-exempt API path
      expect(requiresCsrfProtection('GET', '/api/deals')).toBe(false);

      // Not protected: POST to exempt path
      expect(requiresCsrfProtection('POST', '/api/webhooks/stripe')).toBe(false);

      // Not protected: POST to non-API path
      expect(requiresCsrfProtection('POST', '/dashboard')).toBe(false);
    });
  });
});

// =============================================================================
// Cookie Utility Tests
// =============================================================================

describe('parseCookies', () => {
  it('parses single cookie', () => {
    const cookies = parseCookies('csrf_token=abc123');
    expect(cookies).toEqual({ csrf_token: 'abc123' });
  });

  it('parses multiple cookies', () => {
    const cookies = parseCookies('csrf_token=abc123; session=xyz789');
    expect(cookies).toEqual({
      csrf_token: 'abc123',
      session: 'xyz789',
    });
  });

  it('handles cookies with = in value', () => {
    const cookies = parseCookies('data=key=value');
    expect(cookies.data).toBe('key=value');
  });

  it('handles whitespace correctly', () => {
    const cookies = parseCookies('  csrf_token=abc123  ;  session=xyz789  ');
    expect(cookies).toEqual({
      csrf_token: 'abc123',
      session: 'xyz789',
    });
  });

  it('returns empty object for null', () => {
    const cookies = parseCookies(null);
    expect(cookies).toEqual({});
  });

  it('returns empty object for empty string', () => {
    const cookies = parseCookies('');
    expect(cookies).toEqual({});
  });

  it('handles cookies with empty values', () => {
    const cookies = parseCookies('empty=');
    expect(cookies).toEqual({ empty: '' });
  });

  it('handles __Host- prefix cookies', () => {
    const cookies = parseCookies('__Host-csrf_secret=secretvalue');
    expect(cookies['__Host-csrf_secret']).toBe('secretvalue');
  });

  it('parses signed token cookie with dot', () => {
    const signedToken = 'token123.signature456';
    const cookies = parseCookies(`csrf_token=${signedToken}`);
    expect(cookies.csrf_token).toBe(signedToken);
  });
});

describe('getCsrfTokenFromHeader', () => {
  it('returns token from X-CSRF-Token header', () => {
    const headers = new Headers();
    headers.set('X-CSRF-Token', 'my-token-value');

    const token = getCsrfTokenFromHeader(headers);
    expect(token).toBe('my-token-value');
  });

  it('returns null when header is missing', () => {
    const headers = new Headers();

    const token = getCsrfTokenFromHeader(headers);
    expect(token).toBeNull();
  });

  it('handles header case insensitively', () => {
    const headers = new Headers();
    headers.set('x-csrf-token', 'my-token-value'); // lowercase

    const token = getCsrfTokenFromHeader(headers);
    expect(token).toBe('my-token-value');
  });

  it('returns signed token with dot separator', () => {
    const headers = new Headers();
    const signedToken = 'token.signature';
    headers.set('X-CSRF-Token', signedToken);

    const token = getCsrfTokenFromHeader(headers);
    expect(token).toBe(signedToken);
  });
});

describe('getCsrfSecretFromCookies', () => {
  it('returns secret from __Host-csrf_secret cookie', () => {
    const cookieHeader = '__Host-csrf_secret=mysecret';
    const secret = getCsrfSecretFromCookies(cookieHeader);
    expect(secret).toBe('mysecret');
  });

  it('returns secret when multiple cookies present', () => {
    const cookieHeader = 'other=value; __Host-csrf_secret=mysecret; another=data';
    const secret = getCsrfSecretFromCookies(cookieHeader);
    expect(secret).toBe('mysecret');
  });

  it('returns null when cookie is missing', () => {
    const cookieHeader = 'other_cookie=value';
    const secret = getCsrfSecretFromCookies(cookieHeader);
    expect(secret).toBeNull();
  });

  it('returns null for null input', () => {
    const secret = getCsrfSecretFromCookies(null);
    expect(secret).toBeNull();
  });

  it('returns null for empty string', () => {
    const secret = getCsrfSecretFromCookies('');
    expect(secret).toBeNull();
  });
});

// =============================================================================
// Cookie Creation Tests
// =============================================================================

describe('createCsrfTokenCookie', () => {
  it('creates cookie with correct name and value', () => {
    const cookie = createCsrfTokenCookie('my-signed-token');
    expect(cookie).toContain('csrf_token=my-signed-token');
  });

  it('includes Path=/', () => {
    const cookie = createCsrfTokenCookie('token');
    expect(cookie).toContain('Path=/');
  });

  it('includes SameSite=strict', () => {
    const cookie = createCsrfTokenCookie('token');
    expect(cookie).toContain('SameSite=strict');
  });

  it('includes Max-Age of 24 hours', () => {
    const cookie = createCsrfTokenCookie('token');
    expect(cookie).toContain('Max-Age=86400');
  });

  it('does NOT include HttpOnly (token must be readable by JS)', () => {
    const cookie = createCsrfTokenCookie('token');
    expect(cookie).not.toContain('HttpOnly');
  });

  it('preserves signed token format with dot', () => {
    const signedToken = 'token.signature';
    const cookie = createCsrfTokenCookie(signedToken);
    expect(cookie).toContain(`csrf_token=${signedToken}`);
  });
});

describe('createCsrfSecretCookie', () => {
  it('creates cookie with correct name and value', () => {
    const cookie = createCsrfSecretCookie('my-secret');
    expect(cookie).toContain('__Host-csrf_secret=my-secret');
  });

  it('includes Path=/', () => {
    const cookie = createCsrfSecretCookie('secret');
    expect(cookie).toContain('Path=/');
  });

  it('includes SameSite=strict', () => {
    const cookie = createCsrfSecretCookie('secret');
    expect(cookie).toContain('SameSite=strict');
  });

  it('includes Max-Age of 24 hours', () => {
    const cookie = createCsrfSecretCookie('secret');
    expect(cookie).toContain('Max-Age=86400');
  });

  it('includes HttpOnly flag', () => {
    const cookie = createCsrfSecretCookie('secret');
    expect(cookie).toContain('HttpOnly');
  });
});

// =============================================================================
// Integration Tests - Full Token Lifecycle
// =============================================================================

describe('CSRF Token Lifecycle', () => {
  it('complete token generation and validation flow', async () => {
    // Step 1: Generate token (what middleware does on GET)
    const { signedToken, secret } = await createCsrfToken();

    // Step 2: Extract token from cookie (what client does)
    const tokenCookie = createCsrfTokenCookie(signedToken);
    expect(tokenCookie).toContain(signedToken);

    // Step 3: Create secret cookie (what middleware does)
    const secretCookie = createCsrfSecretCookie(secret);
    expect(secretCookie).toContain(secret);
    expect(secretCookie).toContain('HttpOnly');

    // Step 4: Parse cookies (simulating server receiving request)
    const cookies = parseCookies(`csrf_token=${signedToken}; __Host-csrf_secret=${secret}`);
    expect(cookies.csrf_token).toBe(signedToken);
    expect(cookies['__Host-csrf_secret']).toBe(secret);

    // Step 5: Validate token
    const extractedToken = cookies.csrf_token;
    const extractedSecret = cookies['__Host-csrf_secret'];
    const result = await validateCsrfToken(extractedToken, extractedSecret);

    expect(result.valid).toBe(true);
  });

  it('detects token/secret mismatch between sessions', async () => {
    // Session 1
    const session1 = await createCsrfToken();

    // Session 2 (different user/time)
    const session2 = await createCsrfToken();

    // Try to validate session1's token with session2's secret (CSRF attack simulation)
    const result = await validateCsrfToken(session1.signedToken, session2.secret);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid CSRF token signature');
  });

  it('validates path protection for API mutation', async () => {
    // Generate tokens
    const { signedToken, secret } = await createCsrfToken();

    // Check that POST to /api/deals requires protection
    expect(requiresCsrfProtection('POST', '/api/deals')).toBe(true);

    // Validate the token
    const result = await validateCsrfToken(signedToken, secret);
    expect(result.valid).toBe(true);
  });

  it('allows webhook without CSRF', () => {
    // Webhooks from external services don't have CSRF tokens
    expect(requiresCsrfProtection('POST', '/api/webhooks/stripe')).toBe(false);
  });
});

// =============================================================================
// Security Tests
// =============================================================================

describe('Security Properties', () => {
  it('tokens have sufficient entropy (256 bits)', () => {
    // 32 bytes = 256 bits of entropy
    const token = generateToken(32);
    expect(token).toHaveLength(64); // 64 hex chars = 32 bytes
  });

  it('signature prevents token forgery', async () => {
    const { signedToken, secret } = await createCsrfToken();
    const [token] = signedToken.split('.');

    // Attacker tries to forge a token with their own value
    const forgedToken = 'a'.repeat(64);
    const forgedSignedToken = `${forgedToken}.${generateToken(32)}`;

    const result = await validateCsrfToken(forgedSignedToken, secret);
    expect(result.valid).toBe(false);

    // Original still works
    const validResult = await validateCsrfToken(signedToken, secret);
    expect(validResult.valid).toBe(true);
  });

  it('secret cookie has HttpOnly flag (XSS protection)', () => {
    const cookie = createCsrfSecretCookie('secret');
    expect(cookie).toContain('HttpOnly');
  });

  it('cookies have SameSite=strict (CSRF protection)', () => {
    const tokenCookie = createCsrfTokenCookie('token');
    const secretCookie = createCsrfSecretCookie('secret');

    expect(tokenCookie).toContain('SameSite=strict');
    expect(secretCookie).toContain('SameSite=strict');
  });

  it('uses __Host- prefix for secret cookie (cookie prefix protection)', () => {
    expect(CSRF_CONFIG.CSRF_SECRET_COOKIE).toMatch(/^__Host-/);
  });

  it('protects all state-changing HTTP methods', () => {
    const dangerousMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

    for (const method of dangerousMethods) {
      expect(requiresCsrfProtection(method, '/api/data')).toBe(true);
    }
  });

  it('does not protect safe HTTP methods', () => {
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];

    for (const method of safeMethods) {
      expect(requiresCsrfProtection(method, '/api/data')).toBe(false);
    }
  });
});
