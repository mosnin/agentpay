import { paymentMode, paymentDisclosure } from "./payment-mode";
/** Shared human/machine description. Authorization remains in server actions. */
export function taskExperience(status: string, payment?: { provider: string; status: string; operation?: string | null } | null) {
  if (status === "pending" && payment?.provider === "stripe" && payment.status === "pending") return { title: "Fund your agreement", actor: "buyer", description: "Complete Stripe Checkout, then wait for payment confirmation. The seller can accept and start work after funding is confirmed." };
  const stages: Record<string, { title: string; actor: string | null; description: string }> = {
    draft: { title: "Finish the agreement", actor: "buyer", description: "Choose an agent, describe the deliverable, and agree a budget before requesting work." },
    pending: { title: "Waiting for the seller", actor: "seller", description: "The request is saved. The seller must accept it; listing an agent does not start a remote worker." },
    accepted: { title: "Accepted · ready for delivery", actor: "seller", description: "The seller can start work and submit a deliverable through Bids or its API. Work runs in the seller’s own environment." },
    running: { title: "Work is with the seller", actor: "seller", description: "The seller has marked this task as running. Review the delivered artifact when it arrives; this status is not a live execution log." },
    submitted: { title: "The deliverable needs attention", actor: "seller", description: "Read the validation feedback and submit a corrected artifact. The buyer cannot approve until the required checks pass." },
    validating: { title: "Ready for buyer review", actor: "buyer", description: "Review the actual deliverable against your brief. Schema checks verify structure, not factual accuracy or usefulness. Approval closes the task." },
    completed: { title: "Delivery approved", actor: null, description: "The task is complete. Keep the artifact and receipt, and leave a review. See the payment receipt for the confirmed settlement status." },
    cancelled: { title: "Task cancelled", actor: null, description: "This request is closed. Check the payment receipt for refund status." },
    disputed: { title: "Waiting for dispute review", actor: "admin", description: "An administrator must review the dispute before work can continue. Keep the brief and delivery evidence available." },
  };
  return stages[status] ?? { title: "Status unavailable", actor: null, description: "Reload the task or contact support before taking another action." };
}

export const PAYMENT_DISCLOSURE = paymentDisclosure();

export function workflowForTask(task: { id: string; status: string; buyerId: string; sellerAgent: { ownerId: string } | null; payment?: { provider: string; status: string; operation?: string | null; livemode?: boolean } | null }, user: { id: string; role: string }) {
  const admin = user.role === "admin";
  const buyer = admin || task.buyerId === user.id;
  const seller = admin || task.sellerAgent?.ownerId === user.id;
  const funded = (task.payment?.status === "escrowed" && !task.payment.operation) || (paymentMode() === "demo" && !task.payment);
  const actions: { name: string; method: "POST"; href: string }[] = [];
  if (seller && funded && task.status === "pending") actions.push({ name: "accept", method: "POST", href: `/api/tasks/${task.id}/accept` });
  if (seller && funded && ["accepted", "running", "submitted"].includes(task.status)) actions.push({ name: "submit_artifact", method: "POST", href: `/api/tasks/${task.id}/artifacts` });
  if (buyer && task.status === "validating") actions.push({ name: "approve_delivery", method: "POST", href: `/api/tasks/${task.id}/complete` });
  if (buyer && task.payment?.provider === "stripe" && task.payment.status === "pending" && task.status === "pending") actions.push({ name: "fund_task", method: "POST", href: `/api/payments/checkout` });
  return { ...taskExperience(task.status, task.payment), actions, payment: { mode: task.payment?.provider === "stripe" ? "stripe" : paymentMode() === "demo" ? "simulation" : "disabled", real_funds_moved: Boolean(task.payment?.livemode && ["escrowed", "released", "refunded"].includes(task.payment.status)), status: task.payment?.status, funding_body: { taskId: task.id } }, execution: "seller_managed" };
}
