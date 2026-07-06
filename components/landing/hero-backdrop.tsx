"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { DotGridSpotlight } from "@/components/dot-grid-spotlight";

/**
 * The hero's dot grid, alive: dots brighten under the cursor. Colors are
 * chosen per theme (neutral base, faint indigo under the light) and the
 * whole field fades out toward the fold via the shared grid mask.
 */
export function HeroBackdrop() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const isDark = mounted ? resolvedTheme === "dark" : true;

  return (
    <div className="pointer-events-none absolute inset-0 bg-grid-fade" aria-hidden>
      {mounted && (
        <DotGridSpotlight
          key={isDark ? "dark" : "light"}
          spacing={22}
          baseRadius={1}
          activeRadius={1.8}
          interactionRadius={170}
          dotColor={isDark ? "rgba(255,255,255,0.06)" : "rgba(30,30,60,0.12)"}
          activeDotColor={
            isDark ? "rgba(165,160,255,0.65)" : "rgba(79,70,229,0.55)"
          }
        />
      )}
    </div>
  );
}
