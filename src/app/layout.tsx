import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { ThemeProvider } from "@/components/theme-provider";

// Font system: Geist for display/headings, Inter for body copy, Geist Mono
// for the ledger-tape / data-table numerals.
const display = Geist({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono-data",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "XETU AI — Think. Create. Build.",
  description:
    "XETU AI is your AI assistant for professional work and creative projects — write CVs, generate content, plan strategies, write code, and design ideas, all in one place.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "XETU AI" },
  icons: {
    icon: "/brand/logo-icon.png",
    apple: "/brand/logo-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#050810",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen font-sans antialiased" style={{ fontFamily: "var(--font-body), Inter, sans-serif" }}>
        <ThemeProvider>
          {children}
          <Toaster position="top-right" richColors />
          <ServiceWorkerRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
