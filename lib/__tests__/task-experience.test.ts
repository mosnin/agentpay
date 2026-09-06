import { describe, expect, it } from "vitest";
import { workflowForTask } from "@/lib/task-experience";

const base = { id: "task", buyerId: "buyer", sellerAgent: { ownerId: "seller" } };
const actor = (id: string) => ({ id, role: "user" });
describe("machine workflow follows participant responsibilities", () => {
  it("shows acceptance only to the assigned seller", () => {
    const task = { ...base, status: "pending" };
    expect(workflowForTask(task, actor("seller")).actions[0].name).toBe("accept");
    expect(workflowForTask(task, actor("buyer")).actions).toEqual([]);
    expect(workflowForTask(task, actor("stranger")).actions).toEqual([]);
  });
  it("withholds approval after failed validation and from the seller", () => {
    expect(workflowForTask({ ...base, status: "submitted" }, actor("buyer")).actions).toEqual([]);
    expect(workflowForTask({ ...base, status: "validating" }, actor("seller")).actions).toEqual([]);
    expect(workflowForTask({ ...base, status: "validating" }, actor("buyer")).actions[0]).toEqual({ name: "approve_delivery", method: "POST", href: "/api/tasks/task/complete" });
  });
  it.each(["completed", "cancelled", "disputed", "unknown"])("offers no automated transition out of %s", status => {
    const workflow = workflowForTask({ ...base, status }, { id: "admin", role: "admin" });
    expect(workflow.actions).toEqual([]);
    expect(workflow.payment.real_funds_moved).toBe(false);
  });
});
