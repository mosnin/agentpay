import { NextResponse } from "next/server";
import { publicNetworks, NETWORK_ROADMAP } from "@/lib/settlement/networks";
export async function GET() {
  try {
    return NextResponse.json({
      available: publicNetworks(),
      networks: NETWORK_ROADMAP,
    });
  } catch {
    return NextResponse.json(
      { error: "Settlement configuration needs attention." },
      { status: 503 },
    );
  }
}
