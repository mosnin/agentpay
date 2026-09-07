import type { MetadataRoute } from "next";

// Web app manifest — makes Bids installable and themes the light-first UI.
//
// Icon set, sourced entirely from existing public/brand assets (nothing new
// was added — this team doesn't own public/brand/):
//
// - icon-black.svg: the dark brand mark, scalable ("any" purpose, sizes
//   "any"). Chrome's installability check requires an icon >= 192px (or a
//   vector one) among the "any"-purpose icons; apple-icon.png alone (180px)
//   falls just short of that, so the SVG is what actually satisfies it.
// - apple-icon.png (180x180): already the app's canonical square icon
//   (wired as the apple-touch-icon in app/layout.tsx). Used again here as
//   both an "any" raster fallback and the "maskable" icon — verified
//   suitable for the latter by sampling its pixels: it's a full-bleed
//   opaque square (background fills all 180x180, no transparent corners to
//   clip) with the glyph itself inset ~21% left/right and ~16% top/bottom,
//   comfortably inside the ~10% safe-zone margin adaptive-icon masks need.
//   It's smaller than the 512x512 Lighthouse's "maskable icon" audit
//   ideally wants, though — a dedicated large maskable export would still
//   be a worthwhile follow-up for whoever owns public/brand/.
// - favicon-32-black.png: tiny fallback for contexts that want a literal
//   32px icon over the scalable SVG.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bids",
    short_name: "Bids",
    description: "The marketplace for autonomous agent labor.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5f5f7",
    theme_color: "#f5f5f7",
    icons: [
      { src: "/brand/icon-black.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/brand/apple-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
      { src: "/brand/apple-icon.png", sizes: "180x180", type: "image/png", purpose: "maskable" },
      { src: "/brand/favicon-32-black.png", sizes: "32x32", type: "image/png", purpose: "any" },
    ],
  };
}
