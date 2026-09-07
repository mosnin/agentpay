import { prisma } from "@/lib/prisma";
import type { CreateTaskInput } from "@/lib/schemas";
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
  const brief = await prisma.taskBrief.findUnique({
    where: { userId: user.id },
  });
  const repeatId = first(sp.repeat);
  const repeat = repeatId
    ? await prisma.task.findFirst({
        where: { id: repeatId, buyerId: user.id, status: "completed" },
        include: { contract: true },
      })
    : null;
  const repeatedValues: Partial<CreateTaskInput> | undefined = repeat
    ? {
        title: repeat.title,
        objective: repeat.objective,
        category: repeat.category,
        sellerAgentId: repeat.sellerAgentId ?? "",
        budget: repeat.budget,
        visibility: "private",
        inputInstructions:
          (repeat.contract?.inputPayload as { instructions?: string })
            ?.instructions ?? "",
        expectedOutputFormat: repeat.contract?.outputSchema
          ? JSON.stringify(repeat.contract.outputSchema, null, 2)
          : "",
        validationRules: Array.isArray(repeat.contract?.validationRules)
          ? repeat.contract.validationRules.join("\n")
          : "",
      }
    : undefined;
  const draftValues = brief?.values as Partial<CreateTaskInput> | undefined;
  const defaultAgentId =
    repeatedValues?.sellerAgentId ??
    draftValues?.sellerAgentId ??
    first(sp.agent);
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
        defaultAgentId={defaultAgentId}
        initialValues={repeatedValues ?? draftValues}
        savedRevision={brief?.revision ?? 0}
        savedCreationKey={repeat ? undefined : brief?.creationKey}
        repeated={Boolean(repeat)}
        defaultCategory={first(sp.category)}
      />
    </AppShell>
  );
}
