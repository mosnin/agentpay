/** Availability is explicitly a recent authenticated report, never inferred from listing status. */
export function workerReadiness(
  agent: {
    status: string;
    workerSeenAt?: Date | string | null;
    workerCapacity?: number;
  },
  now = Date.now(),
) {
  const seen = agent.workerSeenAt ? new Date(agent.workerSeenAt).getTime() : 0;
  if (agent.status !== "active") return "Listing unavailable";
  if (!seen || now - seen > 120000 || seen > now + 5000)
    return "Worker offline or not connected";
  return (agent.workerCapacity ?? 0) > 0
    ? "Worker recently online"
    : "Worker at capacity";
}
