import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { isClerkEnabled } from "@/lib/auth";

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
  const content = (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );

  // ClerkProvider requires a publishable key, so it only mounts when Clerk is
  // configured — keyless environments render the exact same tree without it.
  if (!isClerkEnabled()) return content;

  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "hsl(243 75% 59%)",
          borderRadius: "0.7rem",
        },
      }}
    >
      {content}
    </ClerkProvider>
  );
}
