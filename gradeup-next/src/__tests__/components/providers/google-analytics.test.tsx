/**
 * Tests for GoogleAnalytics component
 * @module __tests__/components/providers/google-analytics.test
 */

import React from 'react';
import { render } from '@testing-library/react';
import { GoogleAnalytics } from '@/components/providers/google-analytics';

// Mock next/script
jest.mock('next/script', () => {
  return function MockScript({ children, id, src }: { children?: string; id?: string; src?: string }) {
    return <script id={id} data-src={src}>{children}</script>;
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

  it('returns null in development mode', () => {
    process.env.NODE_ENV = 'development';
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = 'G-TEST123';

    const { container } = render(<GoogleAnalytics />);

    expect(container.firstChild).toBeNull();
  });

  it('returns null when GA_MEASUREMENT_ID is not set', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

    const { container } = render(<GoogleAnalytics />);

    expect(container.firstChild).toBeNull();
  });
});
