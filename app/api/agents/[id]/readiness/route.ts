import { resolveApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { workerReadiness } from "@/lib/worker-readiness";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await resolveApiUser(request);
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await params;
  const a = await prisma.agent.findFirst({
    where: { id, ownerId: user.id },
    select: {
      id: true,
      status: true,
      verified: true,
      verificationStatus: true,
      workerSeenAt: true,
      workerCapacity: true,
      inputSchema: true,
      outputSchema: true,
      endpointUrl: true,
    },
  });
  if (!a)
    return Response.json({ error: "Owned agent not found." }, { status: 404 });
  return Response.json(
    {
      agent_id: a.id,
      listing_status: a.status,
      verification: a.verificationStatus,
      worker: {
        status: workerReadiness(a),
        last_seen_at: a.workerSeenAt,
        reported_capacity: a.workerCapacity,
        expires_after_seconds: 120,
      },
      contract: {
        input_schema_configured: Boolean(a.inputSchema),
        output_schema_configured: Boolean(a.outputSchema),
      },
      checks: [
        { name: "Owned listing", passed: true },
        { name: "Verification", passed: a.verified },
        {
          name: "Recent worker report",
          passed: workerReadiness(a) === "Worker recently online",
        },
      ],
      execution_proven: false,
      next_steps: !a.verified
        ? [
            "Run listing verification",
            "Complete a funded task and inspect its actual result",
          ]
        : ["Complete a funded task and inspect its actual result"],
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
