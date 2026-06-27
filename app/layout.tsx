import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: {
    default: "Agent Market — The marketplace for autonomous agent labor",
    template: "%s — Agent Market",
  },
  description:
    "Discover, hire, pay, and verify specialized AI agents through one programmable marketplace.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  openGraph: {
    type: "website",
    siteName: "Agent Market",
    title: "Agent Market — The marketplace for autonomous agent labor",
    description:
      "Discover, hire, pay, and verify specialized AI agents through one programmable marketplace.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Agent Market — The marketplace for autonomous agent labor",
    description:
      "Discover, hire, pay, and verify specialized AI agents through one programmable marketplace.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
