/**
 * Tests for GoogleAnalytics component
 * @module __tests__/components/providers/google-analytics.test
 *
 * Note: GoogleAnalytics is an async server component that uses headers().
 * We need to mock next/headers and test the component synchronously.
 */

import React from 'react';
import { render } from '@testing-library/react';

// Mock next/headers
jest.mock('next/headers', () => ({
  headers: jest.fn(() => Promise.resolve({
    get: jest.fn(() => 'test-nonce-value'),
  })),
}));

// Mock next/script
jest.mock('next/script', () => {
  return function MockScript({ children, id, src, nonce }: { children?: string; id?: string; src?: string; nonce?: string }) {
    return <script id={id} data-src={src} data-nonce={nonce}>{children}</script>;
  };
});

describe('GoogleAnalytics', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns null in development mode', async () => {
    (process.env as { NODE_ENV: string }).NODE_ENV = 'development';
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = 'G-TEST123';

    // Re-import to get fresh module with updated env
    const { GoogleAnalytics } = await import('@/components/providers/google-analytics');
    const result = await GoogleAnalytics();

    expect(result).toBeNull();
  });

  it('returns null when GA_MEASUREMENT_ID is not set', async () => {
    (process.env as { NODE_ENV: string }).NODE_ENV = 'production';
    delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

    // Re-import to get fresh module with updated env
    const { GoogleAnalytics } = await import('@/components/providers/google-analytics');
    const result = await GoogleAnalytics();

    expect(result).toBeNull();
  });

  it('renders scripts with nonce in production when GA_MEASUREMENT_ID is set', async () => {
    (process.env as { NODE_ENV: string }).NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = 'G-TEST123';

    // Re-import to get fresh module with updated env
    const { GoogleAnalytics } = await import('@/components/providers/google-analytics');
    const result = await GoogleAnalytics();

    // Should return JSX, not null
    expect(result).not.toBeNull();

    // Render the result to check it contains the expected scripts
    const { container } = render(result as React.ReactElement);
    const scripts = container.querySelectorAll('script');

    expect(scripts.length).toBe(2);
    expect(scripts[0].getAttribute('data-nonce')).toBe('test-nonce-value');
    expect(scripts[1].getAttribute('data-nonce')).toBe('test-nonce-value');
  });
});
