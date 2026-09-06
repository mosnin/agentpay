import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { resolveApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { ensureTaskFunded } from "@/lib/payments";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await resolveApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id }, include: { sellerAgent: true } });
  if (!task || (user.role !== "admin" && task.sellerAgent?.ownerId !== user.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try { await ensureTaskFunded(id); } catch { return NextResponse.json({ error: "Confirmed funding required" }, { status: 409 }); }
  const token = randomUUID(), until = new Date(Date.now() + 120000);
  const claim = await prisma.task.updateMany({ where: { id, status: { in: ["accepted", "running", "submitted"] }, OR: [{ workerLeaseUntil: null }, { workerLeaseUntil: { lt: new Date() } }] }, data: { status: "running", workerLeaseToken: token, workerLeaseUntil: until } });
  if (!claim.count) return NextResponse.json({ error: "Accept the task first, or wait for the current worker lease to expire." }, { status: 409 });
  return NextResponse.json({ token, expires_at: until.toISOString(), task: await prisma.task.findUnique({ where: { id }, include: { contract: true } }) });
}
