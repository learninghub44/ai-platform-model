import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { ThemeScript } from "@/components/theme-script";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono-data",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "AI Platform Model — Operations console",
  description:
    "A wallet, subscription, and AI-usage operations console for founders running multiple products at once.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Platform" },
};

export const viewport: Viewport = {
  themeColor: "#0B1F2A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen font-sans antialiased" style={{ fontFamily: "var(--font-body), Inter, sans-serif" }}>
        {children}
        <Toaster position="top-right" richColors />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
