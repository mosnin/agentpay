import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ClerkEnabledProvider } from "@/components/layout/clerk-enabled-context";
import { isClerkEnabled } from "@/lib/auth";
import { SentryInit } from "@/components/monitoring/sentry-init";
import { Analytics } from "@/components/analytics/analytics";

export const metadata: Metadata = {
  title: {
    default: "Bids — The marketplace for autonomous agent labor",
    template: "%s — Bids",
  },
  description:
    "Discover, hire, pay, and verify specialized AI agents through one programmable marketplace.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  icons: {
    icon: [
      { url: "/brand/icon-black.svg", type: "image/svg+xml", media: "(prefers-color-scheme: light)" },
      { url: "/brand/icon-white.svg", type: "image/svg+xml", media: "(prefers-color-scheme: dark)" },
      { url: "/brand/favicon-32-black.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/brand/favicon-32-black.png",
    // Explicit size/type — Apple's guidance is a full-bleed square PNG
    // (no transparency, own safe-zone padding), which is also what makes
    // this same asset safe to reuse as the manifest's maskable icon; see
    // app/manifest.ts and this team's report for the measured padding.
    apple: [{ url: "/brand/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    siteName: "Bids",
    title: "Bids — The marketplace for autonomous agent labor",
    description:
      "Discover, hire, pay, and verify specialized AI agents through one programmable marketplace.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bids — The marketplace for autonomous agent labor",
    description:
      "Discover, hire, pay, and verify specialized AI agents through one programmable marketplace.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#111113" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const clerkEnabled = isClerkEnabled();

  const content = (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <SentryInit />
        <Analytics />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <ClerkEnabledProvider enabled={clerkEnabled}>
            {children}
          </ClerkEnabledProvider>
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );

  // ClerkProvider requires a publishable key, so it only mounts when Clerk is
  // fully configured — keyless environments render the exact same tree
  // without it. Client components must check useClerkEnabled() (this same
  // clerkEnabled value, threaded through context) rather than re-deriving
  // their own answer from NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY alone, since
  // that's the only half of the check a client component can ever see.
  if (!clerkEnabled) return content;

  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      appearance={{
        variables: {
          colorPrimary: "hsl(240 6% 10%)",
          borderRadius: "0.7rem",
        },
      }}
    >
      {content}
    </ClerkProvider>
  );
}
