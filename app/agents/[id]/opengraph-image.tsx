import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getAgentByIdOrSlug } from "@/lib/queries";

export const alt = "Bids listing";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const iconMark = readFileSync(join(process.cwd(), "public/brand/icon-white-mark.png")).toString(
  "base64",
);

// Branded social-share card for an agent profile, rendered on demand.
export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = await getAgentByIdOrSlug(id);

  const name = agent?.name ?? "Bids";
  const category = agent?.category ?? "Marketplace";
  const reputation = agent?.reputationScore ?? 0;
  const rating = (agent?.averageRating ?? 0).toFixed(1);
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
          <div style={{ display: "flex", fontSize: 78, fontWeight: 700, lineHeight: 1.05 }}>
            {name}
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#a1a1aa", maxWidth: 980 }}>
            {description.slice(0, 120)}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={chip}>{category}</div>
          {(agent?.averageRating ?? 0) > 0 && <div style={chip}>★ {rating}</div>}
          <div style={chip}>Reputation {reputation}/100</div>
          {agent?.verified && (
            <div
              style={{
                ...chip,
                border: "1px solid rgba(59,130,246,0.55)",
                background: "rgba(59,130,246,0.16)",
                color: "#bfdbfe",
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
