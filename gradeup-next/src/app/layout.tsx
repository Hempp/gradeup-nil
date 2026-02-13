import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/context";
import { WebVitalsReporter } from "@/components/analytics/web-vitals-reporter";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "GradeUp NIL - Your GPA Is Worth Money",
    template: "%s | GradeUp NIL",
  },
  description: "The only NIL platform where grades unlock better deals. $127,450+ paid to 847 verified athletes. Higher GPA = higher value. Join free today.",
  keywords: ["NIL", "student athlete", "college sports", "NIL deals", "athlete sponsorship", "name image likeness", "GradeUp", "college athlete earnings", "NCAA NIL", "athlete brand deals", "scholar athlete"],
  authors: [{ name: "GradeUp NIL" }],
  creator: "GradeUp NIL",
  publisher: "GradeUp NIL",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://gradeup-next.vercel.app"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://gradeup-next.vercel.app",
    siteName: "GradeUp NIL",
    title: "GradeUp NIL - Your GPA Is Worth Money",
    description: "The only NIL platform where grades unlock better deals. $127,450+ paid to 847 verified athletes. Higher GPA = higher value.",
    images: [
      {
        url: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&h=630&fit=crop",
        width: 1200,
        height: 630,
        alt: "GradeUp NIL - Student Athlete Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GradeUp NIL - Your GPA Is Worth Money",
    description: "The only NIL platform where grades unlock better deals. $127,450+ paid to athletes. Join free today.",
    images: ["https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&h=630&fit=crop"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
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
