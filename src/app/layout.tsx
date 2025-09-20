import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { ThemeProvider } from "@/contexts/theme-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "linear.gratis | Free Linear Client Feedback Forms | Open Source Alternative to SteelSync & Lindie",
  description: "Collect client feedback directly in Linear with linear.gratis. Free forever, open source alternative to SteelSync ($29/month) and Lindie ($0-99/month). No subscriptions, no limits, no email chaos.",
  keywords: [
    "Linear feedback forms",
    "Linear client feedback",
    "SteelSync alternative",
    "Lindie alternative",
    "free Linear integration",
    "open source Linear",
    "Linear feedback collection",
    "Linear customer requests",
    "Linear issue forms"
  ],
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' }
    ],
    apple: '/apple-touch-icon.png',
    other: [
      { rel: 'android-chrome-192x192', url: '/android-chrome-192x192.png' },
      { rel: 'android-chrome-512x512', url: '/android-chrome-512x512.png' }
    ]
  },
  openGraph: {
    title: "linear.gratis - Free Linear Client Feedback Forms",
    description: "Stop paying for basic Linear feedback collection. Free, open source alternative to SteelSync and Lindie.",
    type: "website",
    url: "https://linear.gratis",
    siteName: "linear.gratis",
    images: [
      {
        url: "https://linear.gratis/og-image.png",
        width: 1200,
        height: 630,
        alt: "linear.gratis - Free Linear Client Feedback Forms"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "linear.gratis - Free Linear Client Feedback Forms",
    description: "Free, open source Linear feedback collection. No subscriptions, no limits.",
    images: ["https://linear.gratis/og-image.png"],
    creator: "@curiousgeorgios"
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
  verification: {
    google: "google-site-verification-code",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.getItem('linear-integration-theme') === 'dark' || (!('linear-integration-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark')
                } else {
                  document.documentElement.classList.remove('dark')
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          defaultTheme="system"
          storageKey="linear-integration-theme"
        >
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
