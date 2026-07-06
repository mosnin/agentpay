import { mockHash } from "@/lib/utils";

// ---------------------------------------------------------------------------
// x402 payment adapter (MOCK).
//
// x402 is an open "HTTP 402 Payment Required" protocol for machine-payable
// resources. This adapter mirrors the shape of a real x402 facilitator so the
// rest of the marketplace can stay unchanged when you wire up live payments.
//
// To go live: set X402_API_KEY + X402_FACILITATOR_URL and replace the mock
// bodies below with real facilitator calls. The exported interface stays the
// same: createPaymentRequirement -> verifyPayment -> releasePayment.
// ---------------------------------------------------------------------------

export interface PaymentRequirement {
  scheme: "exact" | "upto";
  network: string;
  amount: number;
  currency: string;
  resource: string;
  description: string;
  payTo: string;
  maxTimeoutSeconds: number;
  nonce: string;
}

export interface VerificationResult {
  valid: boolean;
  reason?: string;
}

export interface PaymentReceipt {
  success: boolean;
  transactionHash: string;
  network: string;
  amount: number;
  currency: string;
  settledAt: string;
}

const MOCK_NETWORK = "mock-base-sepolia";
const MOCK_PAY_TO = "0xBIDS0000000000000000000000000000000ESCROW";

/** True when real x402 credentials are configured. */
export function isLive(): boolean {
  return Boolean(process.env.X402_API_KEY && process.env.X402_FACILITATOR_URL);
}

export function createPaymentRequirement(params: {
  taskId: string;
  amount: number;
  currency?: string;
  description?: string;
}): PaymentRequirement {
  return {
    scheme: "exact",
    network: MOCK_NETWORK,
    amount: params.amount,
    currency: params.currency ?? "USD",
    resource: `/api/tasks/${params.taskId}`,
    description: params.description ?? `Escrow for task ${params.taskId}`,
    payTo: MOCK_PAY_TO,
    maxTimeoutSeconds: 600,
    nonce: mockHash("nonce", params.taskId),
  };
}

export async function verifyPayment(params: {
  taskId: string;
  amount: number;
}): Promise<VerificationResult> {
  // Mock: any non-negative amount verifies. Real impl would validate the
  // payment payload against the facilitator.
  if (params.amount < 0) {
    return { valid: false, reason: "Negative amount" };
  }
  return { valid: true };
}

export async function releasePayment(params: {
  taskId: string;
  amount: number;
  currency?: string;
}): Promise<PaymentReceipt> {
  // Mock settlement. Deterministic hash so the same task always yields the
  // same receipt.
  return {
    success: true,
    transactionHash: mockHash("0xtx", `${params.taskId}:${params.amount}`),
    network: MOCK_NETWORK,
    amount: params.amount,
    currency: params.currency ?? "USD",
    settledAt: new Date().toISOString(),
  };
}
