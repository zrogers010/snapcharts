import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://snap-charts.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "SnapCharts — Real-Time Stock Charts & Market News",
  description:
    "SnapCharts is a fast stock and market dashboard for charting, live data, and trading ideas.",
  keywords: [
    "snapcharts",
    "stock charts",
    "trading ideas",
    "market news",
    "futures",
    "crypto",
    "finance dashboard",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "SnapCharts — Real-Time Stock Charts & Market News",
    description:
      "Share trading analysis and monitor stocks, crypto, and futures with one fast dashboard.",
    siteName: "SnapCharts",
    url: "/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SnapCharts — Real-Time Stock Charts & Market News",
    description:
      "Monitor markets, chart ideas, and stay on top of headlines with SnapCharts.",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const year = new Date().getFullYear();
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#09090b" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="preconnect" href="https://query2.finance.yahoo.com" />
        <link rel="preconnect" href="https://query1.finance.yahoo.com" />
        <link rel="preconnect" href="https://s3.tradingview.com" />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-VZX4R5JT2S"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-VZX4R5JT2S');
          `}
        </Script>
      </head>
      <body className="min-h-screen antialiased">
        <div className="min-h-screen flex flex-col">
          <main className="flex-1">{children}</main>
          <footer className="border-t border-zinc-800/70 bg-zinc-950/80">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-[11px] leading-relaxed text-zinc-500">
              © {year} SnapCharts.com — All rights reserved. SnapCharts is a
              proprietary brand owned by SnapCharts. Use of this site and brand
              name is prohibited without written permission.
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
