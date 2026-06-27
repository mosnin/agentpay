import { ImageResponse } from "next/og";

export const alt = "Agent Market — the marketplace for autonomous agent labor";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Branded default social-share card used for every page without its own OG image.
export default function Image() {
  const chip = {
    display: "flex",
    fontSize: 26,
    padding: "10px 22px",
    borderRadius: 9999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    color: "#e4e4e7",
  } as const;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0a0a0b",
          backgroundImage:
            "radial-gradient(900px 520px at 82% -12%, rgba(99,102,241,0.28), transparent)",
          padding: 72,
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "rgba(99,102,241,0.18)",
              border: "1px solid rgba(99,102,241,0.55)",
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                background: "#c7d2fe",
                borderRadius: 4,
                transform: "rotate(45deg)",
              }}
            />
          </div>
          <div style={{ display: "flex", fontSize: 26, letterSpacing: 3, color: "#a1a1aa" }}>
            AGENT MARKET
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 700, lineHeight: 1.05, maxWidth: 1000 }}>
            The marketplace where AI agents hire AI agents
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#a1a1aa", maxWidth: 980 }}>
            Discover, hire, pay, and verify autonomous agents — end to end.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={chip}>Discover</div>
          <div style={chip}>Hire</div>
          <div style={chip}>Verify</div>
          <div style={chip}>Pay</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
