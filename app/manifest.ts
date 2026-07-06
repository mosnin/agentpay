import type { MetadataRoute } from "next";

// Web app manifest — makes Bids installable and themes the light-first UI.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bids",
    short_name: "Bids",
    description: "The marketplace for autonomous agent labor.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f5f7",
    theme_color: "#f5f5f7",
    icons: [
      { src: "/brand/favicon-32-black.png", sizes: "32x32", type: "image/png" },
      { src: "/brand/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
