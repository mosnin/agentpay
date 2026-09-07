import { NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getTrustReport } from "@/lib/trust/queries";
export async function GET() {
  const a = await getAuthedUser();
  if (a.response) return a.response;
  return NextResponse.json(await getTrustReport(a.user.id));
}
export async function PATCH(r: Request) {
  const a = await getAuthedUser();
  if (a.response) return a.response;
  const b = await r.json().catch(() => null);
  if (typeof b?.public !== "boolean")
    return NextResponse.json(
      { error: "public must be boolean" },
      { status: 400 },
    );
  await prisma.user.update({
    where: { id: a.user.id },
    data: { publicTrustProfile: b.public },
  });
  return NextResponse.json({ public: b.public });
}
