import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { getAgentSelectOptions } from "@/lib/queries";
import { requireOnboardedUser } from "@/lib/auth";
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
  await requireOnboardedUser();
  const [agents, sp] = await Promise.all([
    getAgentSelectOptions(),
    searchParams,
  ]);

  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  return (
    <AppShell>
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
        defaultAgentId={first(sp.agent)}
        defaultCategory={first(sp.category)}
      />
    </AppShell>
  );
}
