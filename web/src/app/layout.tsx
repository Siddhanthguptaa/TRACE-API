import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://trace.ai"),
  title: "TRACE | The Stripe Radar for the Agent Economy",
  description:
    "Enterprise-grade trust scoring and sybil resistance for autonomous agents. Graph-aware Bayesian anomaly detection in under 50ms.",
  openGraph: {
    title: "TRACE | The Stripe Radar for the Agent Economy",
    description:
      "Enterprise-grade trust scoring and sybil resistance for autonomous agents.",
    url: "https://trace.ai",
    siteName: "TRACE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TRACE | Trust Layer for the Agent Economy",
    description:
      "Graph-aware Bayesian anomaly detection for A2A networks. Blocks Sybil swarms in under 50ms.",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} antialiased`}
    >
      <body className="min-h-screen flex flex-col bg-surface-base text-text-primary">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
