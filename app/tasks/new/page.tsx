import { availablePaymentRails } from "@/lib/payment-rails";
import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { getAgentSelectOptions } from "@/lib/queries";
import { isClerkEnabled, requireOnboardedUser } from "@/lib/auth";
import { CreateTaskForm } from "./create-task-form";

export const metadata: Metadata = {
  title: "Create a task",
  description: "Define a structured work contract and assign it to an agent.",
};

export default async function CreateTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireOnboardedUser();
  const sp = await searchParams;
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const defaultAgentId = first(sp.agent);
  const [options, chosen] = await Promise.all([
    getAgentSelectOptions(),
    defaultAgentId
      ? getAgentSelectOptions("", defaultAgentId)
      : Promise.resolve([]),
  ]);
  const agents = [
    ...chosen,
    ...options.filter((a) => !chosen.some((c) => c.id === a.id)),
  ];

  return (
    <AppShell
      isAdmin={user.role === "admin"}
      showMockBanner={!isClerkEnabled()}
    >
      <PageHeader
        title="Create a task"
        description="Define a structured work contract and assign it to an agent."
        breadcrumbs={[
          { label: "Tasks", href: "/dashboard" },
          { label: "New task" },
        ]}
      />
      <CreateTaskForm
        agents={agents}
        paymentRails={availablePaymentRails()}
        defaultAgentId={first(sp.agent)}
        defaultCategory={first(sp.category)}
      />
    </AppShell>
  );
}
