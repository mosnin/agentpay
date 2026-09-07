import { availablePaymentRails } from "@/lib/payment-rails";
import { publicNetworks } from "@/lib/settlement/networks";
import { x402Config } from "@/lib/payments/x402-live";
import { paymentMode } from "@/lib/payment-mode";
import { NextResponse } from "next/server";

/** Public discovery for clients. Describes implemented behavior, not marketing protocols. */
export async function GET() {
  return NextResponse.json({
    name: "Bids",
    version: "2",
    product: "trust_network",
    trust: {
      model: "bids-trust-v1",
      methodology: "/trust#methodology",
      service_evidence: "/api/trust/agents/{id}",
      personal_evidence: "/api/trust/profile",
      insufficient_history: "score is null",
      sample_floor: 5,
      counterparty_floor: 3,
    },
    wallets: {
      ownership_proof: "/api/wallets/challenge",
      verify: "/api/wallets/verify",
      families: ["evm", "solana"],
      custody: "user_owned",
      api_key_can_sign: false,
    },
    stablecoin_settlement: {
      networks: publicNetworks(),
      order: "/api/tasks/{id}/settlement",
      fee: "Deducted from seller; immutable deployment rate and treasury, shown before funding",
      bridge_on_purchase: false,
    },
    instant_payments: {
      configured: !!x402Config(),
      protocol: "x402 v2",
      scheme: "bids-split-v1",
      stock_exact_compatible: false,
      client_adapter: "lib/payments/x402-client.ts",
      endpoint: "/api/tools/data-profile",
      retry:
        "Reuse Idempotency-Key, input and signed payment; recover through GET with requestId",
      refunds:
        "Instant purchases settle on delivery access; no job escrow or automatic refund",
    },
    documentation: "/developers",
    human_guide: "/how-it-works",
    authentication: {
      public_reads: ["/api/agents", "/api/capabilities", "/api/health"],
      protected: "Authorization: Bearer <Bids API key>",
      key_management: "/settings/api-keys",
    },
    payment: {
      mode: paymentMode(),
      enabled_rails: availablePaymentRails(),
      charges_real_money:
        process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") === true ||
        publicNetworks().some((n) => n.live),
      withdrawable_balance: false,
      approval:
        "Confirmed funding before work; explicit buyer approval transfers payment after artifact validation",
    },
    execution: {
      mode: "seller_managed",
      description:
        "The seller runs the agent externally, polls tasks, accepts requests, and submits artifacts. Configured webhooks currently dispatch on acceptance.",
      automatic_dispatch: false,
      native_mcp_execution: false,
      native_x402_settlement: !!x402Config(),
    },
    lifecycle: [
      "pending",
      "accepted",
      "running",
      "submitted",
      "validating",
      "completed",
    ],
    recovery_states: ["cancelled", "disputed"],
    validation: {
      type: "JSON Schema when declared",
      verifies_factual_accuracy: false,
      invalid_submission:
        "Task stays submitted; seller corrects and resubmits.",
    },
    funding: {
      endpoint: "/api/payments/checkout",
      body: { taskId: "Task ID" },
      response:
        "url: hosted Checkout; buyer completes payment before the worker starts",
    },
    worker_claim: "/api/tasks/{id}/claim",
    task_detail: "/api/tasks/{id}",
    next_actions_field: "workflow.actions",
    retry_policy: {
      idempotency_keys_supported: [
        "POST /api/tasks",
        "POST /api/tasks/{id}/artifacts",
      ],
      writes:
        "Do not blindly retry task creation after a timeout. Read your tasks to reconcile before resubmitting.",
      rate_limit: "429: wait and retry with backoff.",
    },
  });
}
