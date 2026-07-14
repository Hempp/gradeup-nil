import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "GradeUp — Verified scholar-athlete NIL, part of StatStaq",
    template: "%s | GradeUp NIL",
  },
  description: "GradeUp is the scholar-athlete layer of StatStaq. Keep your GPA up (verified) and StatStaq runs your NIL — producing your content, valuing your brand, sourcing your deals, negotiating your contracts. GradeUp is how you qualify.",
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
    title: "GradeUp — Verified scholar-athlete NIL, part of StatStaq",
    description: "GradeUp is the scholar-athlete layer of StatStaq. Keep your GPA up (verified) and StatStaq runs your NIL — producing your content, valuing your brand, sourcing your deals, negotiating your contracts. GradeUp is how you qualify.",
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
    title: "GradeUp — Verified scholar-athlete NIL, part of StatStaq",
    description: "GradeUp is the scholar-athlete layer of StatStaq. Keep your GPA up and StatStaq runs your NIL — content, valuation, deals, contracts.",
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
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
    shortcut: "/favicon.svg",
    apple: "/logo-icon.svg",
  },
  manifest: "/manifest.json",
};
