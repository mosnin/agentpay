"use client";
import { AgentPicker } from "@/components/tasks/agent-picker";

import { paymentMode } from "@/lib/payment-mode";
import { PaymentNotice } from "@/components/shared/payment-notice";
import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ArrowRight,
  ExternalLink,
  FileCode2,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { BudgetField } from "@/components/tasks/budget-field";
import { ContractExpand } from "@/components/tasks/contract-expand";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/shared/empty-state";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { CategoryIcon } from "@/components/shared/category-icon";
import { TaskContractPreview } from "@/components/tasks/task-contract-preview";
import { CATEGORIES, PAYMENT_MODES, VISIBILITY_OPTIONS } from "@/lib/constants";
import {
  generateStructuredContract,
  type StructuredContract,
} from "@/lib/mockContract";
import { createTask } from "@/lib/actions/tasks";
import { trackFirstTaskCreated } from "@/components/analytics/track";
import { createTaskSchema, type CreateTaskInput } from "@/lib/schemas";
import { formatCurrency, cn } from "@/lib/utils";

export interface AgentSelectOption {
  id: string;
  name: string;
  category: string;
  startingPrice: number;
  currency: string;
  verified: boolean;
  pricingModel: string;
  primaryCapability?: string | null;
}

interface CreateTaskFormProps {
  agents: AgentSelectOption[];
  paymentRails?: ("stripe" | "crypto")[];
  defaultAgentId?: string;
  defaultCategory?: string;
  initialValues?: Partial<CreateTaskInput>;
  savedRevision?: number;
  savedCreationKey?: string;
  repeated?: boolean;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs font-medium text-destructive">{message}</p>;
}

export function CreateTaskForm({
  agents: initialAgents,
  paymentRails = [],
  defaultAgentId,
  defaultCategory,
  initialValues,
  savedRevision = 0,
  savedCreationKey,
  repeated = false,
}: CreateTaskFormProps) {
  const [agents, setAgents] = useState(initialAgents);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [contract, setContract] = useState<StructuredContract | null>(null);

  const presetAgent =
    defaultAgentId && agents.some((a) => a.id === defaultAgentId)
      ? defaultAgentId
      : "";
  const presetCategory =
    defaultCategory && CATEGORIES.some((c) => c.value === defaultCategory)
      ? defaultCategory
      : "";
  const agentById = (id?: string) =>
    id ? agents.find((a) => a.id === id) : undefined;
  const presetBudget = Number(agentById(presetAgent)?.startingPrice ?? 0);
  // Sensible default: a week out, editable — one less decision on arrival.
  const defaultDeadline = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  })();
  // Arriving via "Hire this agent": seed a starter title from the agent's
  // specialty and tailor the objective prompt, so the brief is ~80% there.
  const presetAgentObj = agentById(presetAgent);
  const presetCapability = presetAgentObj?.primaryCapability?.trim() ?? "";
  const presetTitle = presetAgentObj
    ? presetCapability
      ? presetCapability.charAt(0).toUpperCase() + presetCapability.slice(1)
      : `${presetAgentObj.category} task`
    : "";
  const objectivePlaceholder = presetAgentObj
    ? `Describe what you want ${presetAgentObj.name} to deliver${presetCapability ? ` for ${presetCapability.toLowerCase()}` : ""} — outcome, scope, volume, and constraints.`
    : "Describe the outcome you want, including any volume, scope, and constraints.";

  const {
    register,
    handleSubmit,
    control,
    getValues,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: presetTitle,
      objective: "",
      category: presetCategory || presetAgentObj?.category || undefined,
      sellerAgentId: presetAgent,
      inputInstructions: "",
      inputDataUrl: "",
      expectedOutputFormat: "",
      budget: presetBudget,
      deadline: defaultDeadline,
      validationRules: "",
      paymentRail: paymentRails.includes(paymentMode() as "stripe" | "crypto")
        ? (paymentMode() as "stripe" | "crypto")
        : paymentRails[0],
      paymentMode: ["stripe", "crypto"].includes(paymentMode())
        ? "pay_per_task"
        : "mock_escrow",
      visibility: "private",
      ...initialValues,
    },
  });

  function handleGenerate() {
    const { objective, category, expectedOutputFormat } = getValues();
    if (!objective || objective.trim().length === 0) {
      toast.info("Add an objective first", {
        description:
          "Describe what you want done so we can draft the contract.",
      });
      return;
    }
    const result = generateStructuredContract({
      objective,
      category: category || undefined,
      expectedOutputFormat: expectedOutputFormat || undefined,
    });
    setContract(result);
    toast.success("Structured contract drafted", {
      description: "Review it on the right, then apply or refine.",
    });
  }

  function applyContract() {
    if (!contract) return;
    setValue("title", contract.title, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue(
      "expectedOutputFormat",
      JSON.stringify(contract.outputSchema, null, 2),
      { shouldValidate: true, shouldDirty: true },
    );
    setValue("validationRules", contract.validationRules.join("\n"), {
      shouldValidate: true,
      shouldDirty: true,
    });
    toast.success("Applied to the form", {
      description: "Title, output format, and validation rules were filled in.",
    });
  }

  const creationKey = useRef<string | undefined>(savedCreationKey);
  const revision = useRef(savedRevision);
  const forkBrief = useRef(repeated);
  const [draftStatus, setDraftStatus] = useState(
    repeated
      ? "Previous terms copied. Review the brief; funding is authorized separately."
      : savedRevision
        ? "Recovered your saved brief."
        : "Your brief saves as you write.",
  );
  const saveQueue = useRef(Promise.resolve());
  const finished = useRef(false);
  function saveBrief(values: Partial<CreateTaskInput>) {
    const run = saveQueue.current
      .catch(() => {})
      .then(async () => {
        if (finished.current) return;
        setDraftStatus("Saving brief…");
        const r = await fetch("/api/brief", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            revision: revision.current,
            fork: forkBrief.current,
            values,
          }),
        });
        const result = await r.json();
        if (!r.ok)
          throw new Error(
            result.error ?? "Could not save. Your text is still in this form.",
          );
        forkBrief.current = false;
        revision.current = result.revision;
        creationKey.current = result.creationKey;
        setDraftStatus("Brief saved to your account.");
      });
    saveQueue.current = run;
    return run;
  }
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const subscription = watch(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        void saveBrief(getValues()).catch((e) => setDraftStatus(e.message));
      }, 1500);
    });
    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
    // The queue and revision live in refs, shared by autosave and submission.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch, getValues]);
  function onSubmit(values: CreateTaskInput) {
    startTransition(async () => {
      try {
        await saveBrief(values);
      } catch (e) {
        setDraftStatus((e as Error).message);
        toast.error(
          "Save the brief before creating the task. Your input is preserved.",
        );
        return;
      }
      const res = await createTask({
        ...values,
        idempotencyKey: creationKey.current,
      });
      if (res.ok) {
        finished.current = true;
        await fetch("/api/brief", {
          method: "DELETE",
          headers: { "If-Match": String(revision.current) },
        }).catch(() => {});
        trackFirstTaskCreated({
          taskId: res.data!.id,
          category: values.category,
        });
        toast.success("Task created", {
          description: "Continue to funding before the seller begins.",
        });
        router.push(`/tasks/${res.data!.id}`);
      } else {
        toast.error(res.error);
      }
    });
  }

  const hasAgents = agents.length > 0;

  const selectedAgent = agentById(watch("sellerAgentId") ?? undefined);
  const suggestedPrice = Number(selectedAgent?.startingPrice ?? 0);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]"
    >
      {/* ---------------------------------------------------------------- */}
      {/* Left column — the form                                           */}
      {/* ---------------------------------------------------------------- */}
      <div className="min-w-0 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p role="status" className="text-sm text-muted-foreground">
            {draftStatus}
          </p>
          {savedRevision > 0 && (
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await saveQueue.current.catch(() => {});
                    const r = await fetch("/api/brief", {
                      method: "DELETE",
                      headers: { "If-Match": String(revision.current) },
                    });
                    if (!r.ok) throw new Error();
                    finished.current = true;
                    window.location.assign("/tasks/new");
                  } catch {
                    setDraftStatus(
                      "Could not discard. Reload to recover the latest saved brief.",
                    );
                  }
                })
              }
            >
              Discard saved brief
            </Button>
          )}
        </div>
        {/* Who you're hiring — confirmation when an agent is selected */}
        {selectedAgent && (
          <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/[0.04] p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-primary">
              <CategoryIcon
                category={selectedAgent.category}
                className="h-5 w-5"
              />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-semibold text-foreground">
                  Hiring {selectedAgent.name}
                </span>
                {selectedAgent.verified && <VerifiedBadge />}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {selectedAgent.category}
                {selectedAgent.primaryCapability
                  ? ` · ${selectedAgent.primaryCapability}`
                  : ""}
              </p>
              <Link
                href={`/agents/${selectedAgent.id}`}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 rounded text-xs font-medium text-primary/90 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                View profile
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-sm font-semibold text-foreground">
                {formatCurrency(
                  selectedAgent.startingPrice,
                  selectedAgent.currency,
                )}
              </div>
              <div className="text-[11px] text-muted-foreground">starting</div>
            </div>
          </div>
        )}

        {/* Brief */}
        <Card>
          <CardHeader>
            <CardTitle>Brief</CardTitle>
            <CardDescription>
              Tell us what needs doing. A clear objective produces a sharper
              contract.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g. Enrich 500 inbound leads with verified emails"
                aria-invalid={Boolean(errors.title)}
                {...register("title")}
              />
              <FieldError message={errors.title?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="objective">Objective</Label>
              <Textarea
                id="objective"
                rows={4}
                placeholder={objectivePlaceholder}
                aria-invalid={Boolean(errors.objective)}
                {...register("objective")}
              />
              <FieldError message={errors.objective?.message} />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        id="category"
                        aria-invalid={Boolean(errors.category)}
                      >
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((category) => (
                          <SelectItem
                            key={category.value}
                            value={category.value}
                          >
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError message={errors.category?.message} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sellerAgentId">Target agent</Label>
                <Controller
                  control={control}
                  name="sellerAgentId"
                  render={({ field }) => (
                    <AgentPicker
                      initial={agents}
                      value={field.value ?? ""}
                      invalid={Boolean(errors.sellerAgentId)}
                      onSelect={(agent) => {
                        setAgents((previous) => [
                          ...previous.filter((a) => a.id !== agent.id),
                          agent,
                        ]);
                        field.onChange(agent.id);
                        const current = Number(getValues("budget")) || 0;
                        if (agent.startingPrice > 0 && current === 0)
                          setValue("budget", agent.startingPrice, {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                      }}
                    />
                  )}
                />
                <FieldError message={errors.sellerAgentId?.message} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inputs */}
        <Card>
          <CardHeader>
            <CardTitle>Inputs</CardTitle>
            <CardDescription>
              What the agent receives to start the job.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="inputInstructions">Input instructions</Label>
              <Textarea
                id="inputInstructions"
                rows={3}
                placeholder="Step-by-step guidance, context, or rules the agent should follow."
                aria-invalid={Boolean(errors.inputInstructions)}
                {...register("inputInstructions")}
              />
              <FieldError message={errors.inputInstructions?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inputDataUrl">Input data URL</Label>
              <Input
                id="inputDataUrl"
                type="url"
                placeholder="https://… (optional source dataset or file)"
                aria-invalid={Boolean(errors.inputDataUrl)}
                {...register("inputDataUrl")}
              />
              <p className="text-xs text-muted-foreground">
                Optional. Link a dataset, doc, or repository the agent can pull
                from.
              </p>
              <FieldError message={errors.inputDataUrl?.message} />
            </div>
          </CardContent>
        </Card>

        {/* Deliverable & validation */}
        <Card>
          <CardHeader>
            <CardTitle>Deliverable &amp; validation</CardTitle>
            <CardDescription>
              Define what &ldquo;done&rdquo; looks like and how it will be
              checked.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="expectedOutputFormat">
                Expected output format
              </Label>
              <Textarea
                id="expectedOutputFormat"
                rows={4}
                className="font-mono text-xs"
                placeholder='Describe the deliverable, or use JSON Schema: {"type":"object","required":["answer"],"properties":{"answer":{"type":"string"}}}'
                aria-invalid={Boolean(errors.expectedOutputFormat)}
                {...register("expectedOutputFormat")}
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                JSON Schema checks structure. Plain descriptions and validation
                rules are instructions for human review; they do not verify
                accuracy automatically.
              </p>
              <FieldError message={errors.expectedOutputFormat?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="validationRules">Validation rules</Label>
              <Textarea
                id="validationRules"
                rows={3}
                placeholder="Conditions the artifact must satisfy, one per line."
                aria-invalid={Boolean(errors.validationRules)}
                {...register("validationRules")}
              />
              <FieldError message={errors.validationRules?.message} />
            </div>
          </CardContent>
        </Card>

        {/* Terms */}
        <Card>
          <CardHeader>
            <CardTitle>Terms</CardTitle>
            <CardDescription>
              Budget, timeline, payment, and who can see this task.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="budget">Budget</Label>
                <Controller
                  control={control}
                  name="budget"
                  render={({ field }) => (
                    <BudgetField
                      value={Number(field.value) || 0}
                      onChange={field.onChange}
                      suggestedPrice={suggestedPrice}
                      currency={selectedAgent?.currency ?? "USD"}
                    />
                  )}
                />
                <FieldError message={errors.budget?.message} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline</Label>
                <Input
                  id="deadline"
                  type="date"
                  aria-invalid={Boolean(errors.deadline)}
                  {...register("deadline")}
                />
                <p className="text-xs text-muted-foreground">
                  Defaults to a week out — adjust as needed.
                </p>
                <FieldError message={errors.deadline?.message} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                {paymentRails.length > 0 && (
                  <label className="mb-4 block text-sm">
                    Payment rail
                    <select
                      {...register("paymentRail")}
                      className="mt-2 min-h-11 w-full rounded border bg-background p-2"
                    >
                      {paymentRails.map((rail) => (
                        <option key={rail} value={rail}>
                          {rail === "stripe"
                            ? "Card · Stripe Checkout"
                            : "Stablecoin · wallet escrow"}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <Label htmlFor="paymentMode">Payment mode</Label>
                <Controller
                  control={control}
                  name="paymentMode"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="paymentMode"
                        aria-invalid={Boolean(errors.paymentMode)}
                      >
                        <SelectValue placeholder="Select payment mode" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_MODES.map((mode) => (
                          <SelectItem
                            key={mode.value}
                            value={mode.value}
                            disabled={
                              mode.value !==
                              (["stripe", "crypto"].includes(paymentMode())
                                ? "pay_per_task"
                                : "mock_escrow")
                            }
                          >
                            {mode.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError message={errors.paymentMode?.message} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="visibility">Visibility</Label>
                <Controller
                  control={control}
                  name="visibility"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="visibility"
                        aria-invalid={Boolean(errors.visibility)}
                      >
                        <SelectValue placeholder="Select visibility" />
                      </SelectTrigger>
                      <SelectContent>
                        {VISIBILITY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError message={errors.visibility?.message} />
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-sm font-medium lg:hidden">
          Agreed budget: {formatCurrency(Number(watch("budget")) || 0)}.{" "}
          {paymentMode() === "demo"
            ? "Charged today: $0."
            : "Payment is required at checkout before work starts."}
        </p>
        <PaymentNotice />
        <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={pending || !hasAgents || paymentMode() === "disabled"}
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                Create task
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Right column — sticky contract preview                           */}
      {/* ---------------------------------------------------------------- */}
      <div className="min-w-0">
        <div className="space-y-5 lg:sticky lg:top-24">
          <section
            aria-label="Your agreement"
            className="rounded-xl border border-border bg-card p-5"
          >
            <h2 className="text-lg font-semibold tracking-tight">
              Your agreement
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Agent</dt>
                <dd className="text-right font-medium">
                  {selectedAgent?.name ?? "Choose an agent"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Agreed budget</dt>
                <dd className="font-medium">
                  {formatCurrency(Number(watch("budget")) || 0)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Due on creation</dt>
                <dd className="text-right font-medium">
                  {paymentMode() === "demo"
                    ? "$0 · simulation"
                    : "$0 · funding is a separate step"}
                </dd>
              </div>
            </dl>
            <p className="mt-5 border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">
              Creating a task sends a request. The seller accepts and delivers
              from their own environment. You review the result and explicitly
              approve completion.
            </p>
          </section>
          <PaymentNotice />
          <Card className="overflow-hidden">
            <CardHeader className="gap-3">
              <div>
                <CardTitle className="text-base">Contract preview</CardTitle>
                <CardDescription>
                  Optional helper: a template, not an AI review of your brief.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={handleGenerate}
              >
                Generate structured contract
              </Button>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              {contract ? (
                <div className="space-y-5">
                  <div className="flex justify-end">
                    <ContractExpand
                      contract={{
                        title: contract.title,
                        inputPayload: contract.inputPayload,
                        outputSchema: contract.outputSchema,
                        validationRules: contract.validationRules,
                        successCriteria: contract.successCriteria,
                      }}
                    />
                  </div>
                  <TaskContractPreview
                    contract={{
                      title: contract.title,
                      inputPayload: contract.inputPayload,
                      outputSchema: contract.outputSchema,
                      validationRules: contract.validationRules,
                      successCriteria: contract.successCriteria,
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={applyContract}
                  >
                    Apply to form
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Fills in the title, output format, and validation rules.
                  </p>
                </div>
              ) : (
                <EmptyState
                  icon={FileCode2}
                  title="No contract yet"
                  description="Write an objective, then generate a structured contract to preview the input payload, output schema, and validation rules."
                  className={cn("border-border/60 bg-transparent py-10")}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
