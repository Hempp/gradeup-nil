import { Suspense } from "react";
import Script from "next/script";
import { Geist, Geist_Mono, Bebas_Neue, DM_Sans, Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider, ToastGlobalHandler } from "@/components/ui/toast";
import { KeyboardShortcutsProvider } from "@/components/ui/keyboard-shortcuts";
import { AuthProvider, ThemeProvider } from "@/context";
import { WebVitalsReporter } from "@/components/analytics/web-vitals-reporter";
import { NavigationProgressBar } from "@/components/ui/navigation-progress";
import { GoogleAnalytics } from "@/components/providers/google-analytics";
import { AnalyticsProvider } from "@/components/providers/analytics-provider";
import { ServiceWorkerProvider } from "@/components/providers/service-worker-provider";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import { metadata } from "./metadata";

// ═══════════════════════════════════════════════════════════════════════════
// OPTIMIZED FONT LOADING
// Using next/font/google for automatic font optimization and zero layout shift
// ═══════════════════════════════════════════════════════════════════════════

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// Display font for headings and hero text
const bebasNeue = Bebas_Neue({
  variable: "--font-bebas-neue",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

// Body font for readable text
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export { metadata };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "GradeUp NIL",
    url: "https://gradeup-next.vercel.app",
    logo: "https://gradeup-next.vercel.app/logo.svg",
    parentOrganization: { "@type": "Organization", name: "StatStaq" },
    description:
      "GradeUp is the verified-GPA scholar-athlete layer of StatStaq's NIL agency.",
    makesOffer: {
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: "Done-for-you NIL representation for scholar-athletes",
        provider: { "@type": "Organization", name: "StatStaq" },
        serviceType:
          "Content production, brand valuation, deal sourcing, contract negotiation",
      },
    },
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to external image domains for faster loading */}
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://upload.wikimedia.org" />
        <link rel="dns-prefetch" href="https://upload.wikimedia.org" />
        <GoogleAnalytics />
        <Script id="org-jsonld" type="application/ld+json" strategy="afterInteractive">
          {JSON.stringify(orgJsonLd)}
        </Script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${bebasNeue.variable} ${dmSans.variable} ${inter.variable} antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider>
          <ThemeProvider>
            <ToastProvider>
              <KeyboardShortcutsProvider>
                <ServiceWorkerProvider>
                  <ServiceWorkerRegistration />
                  <Suspense fallback={null}>
                    <AnalyticsProvider>
                      <ToastGlobalHandler />
                      <NavigationProgressBar />
                      {children}
                    </AnalyticsProvider>
                  </Suspense>
                </ServiceWorkerProvider>
              </KeyboardShortcutsProvider>
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
        <WebVitalsReporter
          trackWebVitals
          trackLongTasks
          enableDevLogs={process.env.NODE_ENV === 'development'}
        />
      </body>
    </html>
  );
}
