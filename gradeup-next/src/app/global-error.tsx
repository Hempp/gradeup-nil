'use client';

import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('Global application error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{
        margin: 0,
        padding: 0,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0a0a',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#ffffff'
      }}>
        <div style={{
          maxWidth: '400px',
          padding: '2rem',
          textAlign: 'center'
        }}>
          {/* Error Icon */}
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem'
          }}>
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <path d="M12 9v4"/>
              <path d="M12 17h.01"/>
            </svg>
          </div>

          <h1 style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            marginBottom: '0.5rem'
          }}>
            Critical Error
          </h1>

          <p style={{
            color: '#9ca3af',
            marginBottom: '1.5rem',
            lineHeight: 1.5
          }}>
            The application encountered a critical error and needs to be restarted.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              onClick={reset}
              style={{
                padding: '0.625rem 1rem',
                backgroundColor: 'transparent',
                border: '1px solid #374151',
                borderRadius: '0.5rem',
                color: '#ffffff',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                padding: '0.625rem 1rem',
                backgroundColor: '#00f0ff',
                border: 'none',
                borderRadius: '0.5rem',
                color: '#0a0a0a',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 600
              }}
            >
              Reload App
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
