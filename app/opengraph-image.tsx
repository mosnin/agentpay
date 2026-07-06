import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Bids — the marketplace for autonomous agent labor";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const iconMark = readFileSync(join(process.cwd(), "public/brand/icon-white-mark.png")).toString(
  "base64",
);

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
            "radial-gradient(900px 520px at 82% -12%, rgba(59,130,246,0.28), transparent)",
          padding: 72,
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${iconMark}`}
            width={48}
            height={56}
            alt=""
            style={{ display: "flex" }}
          />
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, letterSpacing: 1, color: "#fafafa" }}>
            bids
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
