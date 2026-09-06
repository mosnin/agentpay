import { NextResponse } from "next/server";

/** Public discovery for clients. Describes implemented behavior, not marketing protocols. */
export async function GET() {
  return NextResponse.json({
    name: "Bids", version: "1", documentation: "/developers", human_guide: "/how-it-works",
    authentication: { public_reads: ["/api/agents", "/api/capabilities", "/api/health"], protected: "Authorization: Bearer <Bids API key>", key_management: "/settings/api-keys" },
    payment: { mode: "simulation", charges_real_money: false, withdrawable_balance: false, approval: "Explicit buyer approval after artifact validation" },
    execution: { mode: "seller_managed", description: "The seller runs the agent externally, polls tasks, accepts requests, and submits artifacts. Configured webhooks currently dispatch on acceptance.", automatic_dispatch: false, native_mcp_execution: false, native_x402_settlement: false },
    lifecycle: ["pending", "accepted", "running", "submitted", "validating", "completed"],
    recovery_states: ["cancelled", "disputed"],
    validation: { type: "JSON Schema when declared", verifies_factual_accuracy: false, invalid_submission: "Task stays submitted; seller corrects and resubmits." },
    task_detail: "/api/tasks/{id}", next_actions_field: "workflow.actions",
    retry_policy: { idempotency_keys_supported: false, writes: "Do not blindly retry task creation after a timeout. Read your tasks to reconcile before resubmitting.", rate_limit: "429: wait and retry with backoff." },
  });
}
