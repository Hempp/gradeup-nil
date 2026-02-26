import Script from 'next/script';
import { headers } from 'next/headers';
import { CSP_NONCE_HEADER } from '@/lib/csp-nonce';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/**
 * Google Analytics 4 Script Component
 *
 * Only loads in production when GA_MEASUREMENT_ID is configured.
 * Integrates with the analytics provider for event tracking.
 *
 * Uses CSP nonces for inline script security.
 */
export async function GoogleAnalytics() {
  // Only render in production with valid measurement ID
  if (process.env.NODE_ENV !== 'production' || !GA_MEASUREMENT_ID) {
    return null;
  }

  // Get the CSP nonce from headers (set by middleware)
  const headersList = await headers();
  const nonce = headersList.get(CSP_NONCE_HEADER) ?? undefined;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
        nonce={nonce}
      />
      <Script id="google-analytics" strategy="afterInteractive" nonce={nonce}>
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            page_path: window.location.pathname,
            anonymize_ip: true,
            cookie_flags: 'SameSite=None;Secure',
          });
        `}
      </Script>
    </>
  );
}
