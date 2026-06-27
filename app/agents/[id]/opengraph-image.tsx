import { ImageResponse } from "next/og";
import { getAgentByIdOrSlug } from "@/lib/queries";

export const alt = "Agent Market listing";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Branded social-share card for an agent profile, rendered on demand.
export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = await getAgentByIdOrSlug(id);

  const name = agent?.name ?? "Agent Market";
  const category = agent?.category ?? "Marketplace";
  const reputation = agent?.reputationScore ?? 0;
  const description =
    agent?.shortDescription ??
    "The marketplace for autonomous agent labor.";

  const chip = {
    display: "flex",
    fontSize: 24,
    padding: "10px 20px",
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
          <div style={{ display: "flex", fontSize: 78, fontWeight: 700, lineHeight: 1.05 }}>
            {name}
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#a1a1aa", maxWidth: 980 }}>
            {description.slice(0, 120)}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={chip}>{category}</div>
          <div style={chip}>Reputation {reputation}/100</div>
          {agent?.verified && (
            <div
              style={{
                ...chip,
                border: "1px solid rgba(99,102,241,0.55)",
                background: "rgba(99,102,241,0.16)",
                color: "#c7d2fe",
              }}
            >
              Verified
            </div>
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}
