import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Branded favicon — a CSS-drawn diamond (rotated square) in the indigo brand
// tint on near-black, so the tab matches the app and needs no glyph font.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #111114, #0a0a0b)",
          borderRadius: 7,
        }}
      >
        <div
          style={{
            width: 14,
            height: 14,
            background: "#a5b4fc",
            borderRadius: 3,
            transform: "rotate(45deg)",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
