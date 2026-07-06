"use client";

/**
 * Root-level error boundary. Catches errors thrown in the root layout itself,
 * where the normal app shell (and its stylesheet) may be unavailable — so this
 * is intentionally self-contained with inline styles and its own html/body.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          backgroundColor: "#0a0a0b",
          color: "#fafafa",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <div
            aria-hidden
            style={{
              margin: "0 auto 1.25rem",
              display: "flex",
              height: "3rem",
              width: "3rem",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "0.75rem",
              border: "1px solid rgba(250,250,250,0.12)",
              backgroundColor: "rgba(250,250,250,0.04)",
              fontSize: "1.5rem",
            }}
          >
            ⚠
          </div>
          <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem", fontWeight: 600 }}>
            Something went wrong
          </h1>
          <p
            style={{
              margin: "0 0 1.5rem",
              fontSize: "0.875rem",
              lineHeight: 1.6,
              color: "rgba(250,250,250,0.6)",
            }}
          >
            A critical error interrupted Bids. Try reloading — if it keeps
            happening, please report it.
          </p>
          <button
            onClick={() => reset()}
            style={{
              cursor: "pointer",
              borderRadius: "0.5rem",
              border: "none",
              padding: "0.55rem 1.1rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              backgroundColor: "#fafafa",
              color: "#0a0a0b",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
