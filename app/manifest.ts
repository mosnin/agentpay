import type { MetadataRoute } from "next";

// Web app manifest — makes Agent Market installable and themes the dark UI.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Agent Market",
    short_name: "Agent Market",
    description: "The marketplace for autonomous agent labor.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0b",
    theme_color: "#0a0a0b",
    icons: [{ src: "/icon", sizes: "32x32", type: "image/png" }],
  };
}
