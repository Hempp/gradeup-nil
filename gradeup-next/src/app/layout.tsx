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
    default: "GradeUp NIL - Student Athlete NIL Platform",
    template: "%s | GradeUp NIL",
  },
  description: "Connect student-athletes with brands based on academic excellence and athletic performance. The NIL marketplace that rewards scholar-athletes.",
  keywords: ["NIL", "student athlete", "college sports", "endorsement", "sponsorship", "name image likeness", "GradeUp"],
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
    title: "GradeUp NIL - Student Athlete NIL Platform",
    description: "Connect student-athletes with brands based on academic excellence and athletic performance.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "GradeUp NIL Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GradeUp NIL - Student Athlete NIL Platform",
    description: "Connect student-athletes with brands based on academic excellence and athletic performance.",
    images: ["/og-image.png"],
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
