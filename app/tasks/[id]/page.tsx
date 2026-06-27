import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Bot,
  Compass,
  FileWarning,
  Hash,
  ListChecks,
  Package,
  Receipt,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  User as UserIcon,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TaskStatusBadge } from "@/components/shared/task-status-badge";
import { PaymentStatusBadge } from "@/components/shared/payment-status-badge";
import { DisputeStatusBadge } from "@/components/shared/status-badge";
import { CopyButton } from "@/components/shared/copy-button";
import { DeadlineBadge } from "@/components/shared/deadline-badge";
import { ReviewCard } from "@/components/shared/review-card";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { TaskContractPreview } from "@/components/tasks/task-contract-preview";
import { TaskTimeline } from "@/components/tasks/task-timeline";
import { ArtifactCard } from "@/components/tasks/artifact-card";
import { TaskActions } from "@/components/tasks/task-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { getTaskById } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { PAYMENT_MODES } from "@/lib/constants";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const task = await getTaskById(id);
  if (!task) return { title: "Task not found · Agent Market" };
  return {
    title: `${task.title} · Agent Market`,
    description: task.objective.slice(0, 150),
  };
}

function SectionCard({
  title,
  description,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [task, currentUser] = await Promise.all([
    getTaskById(id),
    getCurrentUser(),
  ]);

  if (!task) notFound();

  const agent = task.sellerAgent;
  const contract = task.contract;
  const payment = task.payment;
  const openDisputes = task.disputes.filter((d) => d.status === "open");
  const hasReviewed = currentUser
    ? task.reviews.some((r) => r.userId === currentUser.id)
    : false;

  const paymentModeLabel =
    PAYMENT_MODES.find(
      (m) => m.value === (payment?.mode ?? contract?.paymentMode),
    )?.label ?? "—";

  const hasValidationRules =
    contract?.validationRules != null &&
    !(
      Array.isArray(contract.validationRules) &&
      contract.validationRules.length === 0
    );

  // Surface deadline urgency only while the task is still live — once it's
  // completed/cancelled/disputed the countdown is just noise.
  const isActive = !["completed", "cancelled", "disputed"].includes(task.status);

  return (
    <AppShell>
      <PageHeader
        title={task.title}
        breadcrumbs={[
          { label: "Tasks", href: "/tasks" },
          { label: task.title },
        ]}
      >
        <TaskStatusBadge status={task.status} />
      </PageHeader>

      {/* Meta row */}
      <div className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <UserIcon className="h-4 w-4" />
          Buyer
          <span className="font-medium text-foreground">
            {task.buyer.name ?? task.buyer.email}
          </span>
        </span>

        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Bot className="h-4 w-4" />
          Agent
          {agent ? (
            <Link
              href={`/agents/${agent.slug}`}
              className="inline-flex items-center gap-1 font-medium text-foreground transition-colors hover:text-primary"
            >
              {agent.name}
              {agent.verified && <VerifiedBadge />}
            </Link>
          ) : (
            <span className="font-medium text-foreground">Unassigned</span>
          )}
        </span>

        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Receipt className="h-4 w-4" />
          Budget
          <span className="font-medium text-foreground">
            {formatCurrency(task.budget, task.currency)}
          </span>
        </span>

        <PaymentStatusBadge status={payment?.status ?? "pending"} />

        <span className="ml-auto text-xs text-muted-foreground">
          Created {formatDate(task.createdAt)}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Objective" icon={Target}>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {task.objective}
            </p>
            {task.deadline && (
              <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted-foreground">
                <span>
                  Deadline:{" "}
                  <span className="text-foreground">
                    {formatDateTime(task.deadline)}
                  </span>
                </span>
                {isActive && <DeadlineBadge deadline={task.deadline} />}
              </div>
            )}
          </SectionCard>

          {contract ? (
            <SectionCard
              title="Contract"
              description="The machine-readable agreement this task is executed against."
              icon={Sparkles}
            >
              <TaskContractPreview
                contract={{
                  title: task.title,
                  inputPayload: contract.inputPayload ?? undefined,
                  outputSchema: contract.outputSchema ?? undefined,
                  validationRules: hasValidationRules
                    ? contract.validationRules
                    : undefined,
                  successCriteria: contract.successCriteria,
                  paymentMode: contract.paymentMode,
                  contractHash: contract.contractHash,
                }}
              />
            </SectionCard>
          ) : (
            <SectionCard title="Contract" icon={Sparkles}>
              <EmptyState
                icon={FileWarning}
                title="No contract attached"
                description="This task does not have a structured contract yet."
              />
            </SectionCard>
          )}

          <SectionCard
            title="Timeline"
            description="Lifecycle from acceptance to release."
            icon={ListChecks}
          >
            <TaskTimeline status={task.status} />
          </SectionCard>

          <SectionCard
            title="Artifacts"
            description="Work products delivered for this task."
            icon={Package}
            action={
              task.artifacts.length > 0 ? (
                <span className="text-xs text-muted-foreground">
                  {task.artifacts.length} submitted
                </span>
              ) : undefined
            }
          >
            {task.artifacts.length > 0 ? (
              <div className="space-y-4">
                {task.artifacts.map((artifact) => (
                  <ArtifactCard key={artifact.id} artifact={artifact} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Package}
                title="No artifacts yet"
                description="The agent has not submitted any work products. Once the task is accepted, an artifact can be submitted for validation."
              />
            )}
          </SectionCard>

          {openDisputes.length > 0 && (
            <SectionCard
              title="Disputes"
              description="Open issues paused for review."
              icon={FileWarning}
            >
              <div className="space-y-3">
                {openDisputes.map((dispute) => (
                  <div
                    key={dispute.id}
                    className="rounded-xl border border-red-500/30 bg-red-500/[0.06] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-xs text-muted-foreground">
                        Opened by{" "}
                        <span className="text-foreground">
                          {dispute.openedBy.name ?? dispute.openedBy.email}
                        </span>{" "}
                        · {formatDateTime(dispute.createdAt)}
                      </div>
                      <DisputeStatusBadge status={dispute.status} />
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                      {dispute.reason}
                    </p>
                    {dispute.resolution && (
                      <p className="mt-2 rounded-md border border-border/60 bg-muted/20 p-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          Resolution:
                        </span>{" "}
                        {dispute.resolution}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          <SectionCard
            title="Reviews"
            description="Buyer feedback on the delivered work."
            icon={Star}
          >
            {task.reviews.length > 0 ? (
              <div className="space-y-3">
                {task.reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Star}
                title="No reviews yet"
                description="A review can be left once the task is completed."
              />
            )}
          </SectionCard>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          <Card className="lg:sticky lg:top-20">
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
              <CardDescription>
                Advance this task through its lifecycle.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TaskActions
                task={{
                  id: task.id,
                  status: task.status,
                  hasReviewed,
                }}
              />
            </CardContent>
          </Card>

          {task.status === "completed" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-primary" />
                  What&apos;s next
                </CardTitle>
                <CardDescription>
                  This task is complete — keep the momentum going.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {agent && (
                  <Button asChild className="w-full justify-start">
                    <Link
                      href={`/tasks/new?agent=${agent.id}&category=${encodeURIComponent(agent.category)}`}
                    >
                      <Bot className="h-4 w-4" />
                      Hire {agent.name} again
                    </Link>
                  </Button>
                )}
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/marketplace">
                    <Compass className="h-4 w-4" />
                    Browse the marketplace
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Receipt className="h-4 w-4 text-primary" />
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Amount">
                {formatCurrency(
                  payment?.amount ?? task.budget,
                  payment?.currency ?? task.currency,
                )}
              </Row>
              <Row label="Status">
                <PaymentStatusBadge status={payment?.status ?? "pending"} />
              </Row>
              <Row label="Mode">
                <span className="text-foreground">{paymentModeLabel}</span>
              </Row>
              <Row label="Provider">
                <span className="font-mono text-xs text-muted-foreground">
                  {payment?.provider ?? "—"}
                </span>
              </Row>
              {payment?.transactionHash && (
                <>
                  <Separator className="bg-border/60" />
                  <div className="space-y-1.5">
                    <div className="text-xs text-muted-foreground">
                      Transaction
                    </div>
                    <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/20 px-2.5 py-1.5">
                      <span className="truncate font-mono text-xs text-foreground/90">
                        {payment.transactionHash}
                      </span>
                      <CopyButton value={payment.transactionHash} />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {contract?.contractHash && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Hash className="h-4 w-4 text-primary" />
                  Contract hash
                </CardTitle>
                <CardDescription>
                  Deterministic fingerprint of the agreed contract.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/20 px-2.5 py-1.5">
                  <span className="truncate font-mono text-xs text-foreground/90">
                    {contract.contractHash}
                  </span>
                  <CopyButton value={contract.contractHash} />
                </div>
              </CardContent>
            </Card>
          )}

          {agent && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Assigned agent
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row label="Name">
                  <Link
                    href={`/agents/${agent.slug}`}
                    className="font-medium text-foreground hover:text-primary"
                  >
                    {agent.name}
                  </Link>
                </Row>
                <Row label="Category">
                  <span className="text-foreground">{agent.category}</span>
                </Row>
                <Row label="Reputation">
                  <span className="text-foreground">
                    {agent.reputationScore}/100
                  </span>
                </Row>
                <Row label="Verified">
                  <span className="text-foreground">
                    {agent.verified ? "Yes" : "No"}
                  </span>
                </Row>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}
