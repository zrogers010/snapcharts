import type { Metadata } from "next";
import Script from "next/script";
import { getGoogleAnalyticsId, getSiteUrl } from "@/lib/site";
import "./globals.css";

const siteUrl = getSiteUrl();
const googleAnalyticsId = getGoogleAnalyticsId();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "SnapCharts — Market Charts & News",
  description:
    "SnapCharts is a fast stock and market dashboard for charting, live-delayed data, and market discovery.",
  keywords: [
    "snapcharts",
    "stock charts",
    "market pulse",
    "market news",
    "futures",
    "crypto",
    "finance dashboard",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "SnapCharts — Market Charts & News",
    description:
      "Monitor stocks, crypto, and futures with live-delayed quotes and one fast dashboard.",
    siteName: "SnapCharts",
    url: "/",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SnapCharts - Market Charts & News",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SnapCharts — Market Charts & News",
    description:
      "Monitor markets, explore charts, and stay on top of headlines with SnapCharts.",
    images: ["/og-image.png"],
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
        {googleAnalyticsId ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${googleAnalyticsId}');
              `}
            </Script>
          </>
        ) : null}
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
