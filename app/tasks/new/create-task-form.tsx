"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ArrowRight,
  FileCode2,
  Loader2,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { TaskContractPreview } from "@/components/tasks/task-contract-preview";
import {
  CATEGORIES,
  PAYMENT_MODES,
  VISIBILITY_OPTIONS,
} from "@/lib/constants";
import {
  generateStructuredContract,
  type StructuredContract,
} from "@/lib/mockContract";
import { createTask } from "@/lib/actions/tasks";
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
}

interface CreateTaskFormProps {
  agents: AgentSelectOption[];
  defaultAgentId?: string;
  defaultCategory?: string;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs font-medium text-destructive">{message}</p>;
}

export function CreateTaskForm({
  agents,
  defaultAgentId,
  defaultCategory,
}: CreateTaskFormProps) {
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
      title: "",
      objective: "",
      category: presetCategory || undefined,
      sellerAgentId: presetAgent,
      inputInstructions: "",
      inputDataUrl: "",
      expectedOutputFormat: "",
      budget: presetBudget,
      deadline: defaultDeadline,
      validationRules: "",
      paymentMode: "mock_escrow",
      visibility: "public",
    },
  });

  function handleGenerate() {
    const { objective, category, expectedOutputFormat } = getValues();
    if (!objective || objective.trim().length === 0) {
      toast.info("Add an objective first", {
        description: "Describe what you want done so we can draft the contract.",
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
    setValue("title", contract.title, { shouldValidate: true, shouldDirty: true });
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

  function onSubmit(values: CreateTaskInput) {
    startTransition(async () => {
      const res = await createTask(values);
      if (res.ok) {
        toast.success("Task created", {
          description: "Your contract is live and pending agent acceptance.",
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
                placeholder="Describe the outcome you want, including any volume, scope, and constraints."
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
                      <SelectTrigger id="category" aria-invalid={Boolean(errors.category)}>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
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
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Sensible default: seed the budget from the agent's
                        // starting price unless the buyer already set one.
                        const price = Number(agentById(value)?.startingPrice ?? 0);
                        const current = Number(getValues("budget")) || 0;
                        if (price > 0 && current === 0) {
                          setValue("budget", price, {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                        }
                      }}
                      disabled={!hasAgents}
                    >
                      <SelectTrigger
                        id="sellerAgentId"
                        aria-invalid={Boolean(errors.sellerAgentId)}
                      >
                        <SelectValue
                          placeholder={
                            hasAgents ? "Assign an agent" : "No agents available"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {agents.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            <span className="flex w-full items-center justify-between gap-3">
                              <span className="flex items-center gap-1.5 truncate">
                                <span className="truncate font-medium">
                                  {agent.name}
                                </span>
                                {agent.verified && (
                                  <ShieldCheck className="h-3 w-3 shrink-0 text-primary" />
                                )}
                              </span>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {agent.category} ·{" "}
                                {formatCurrency(
                                  Number(agent.startingPrice),
                                  agent.currency,
                                )}
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
              <Label htmlFor="expectedOutputFormat">Expected output format</Label>
              <Textarea
                id="expectedOutputFormat"
                rows={4}
                className="font-mono text-xs"
                placeholder='A JSON schema or a plain description, e.g. {"records": [{"company": "string", "email": "string"}]}'
                aria-invalid={Boolean(errors.expectedOutputFormat)}
                {...register("expectedOutputFormat")}
              />
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
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="budget"
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    className="pl-7"
                    placeholder="0.00"
                    aria-invalid={Boolean(errors.budget)}
                    {...register("budget")}
                  />
                </div>
                <FieldError message={errors.budget?.message} />
                {suggestedPrice > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Suggested{" "}
                    {formatCurrency(suggestedPrice, selectedAgent?.currency ?? "USD")}
                    {selectedAgent ? ` — ${selectedAgent.name}'s starting price` : ""}
                  </p>
                )}
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
                          <SelectItem key={mode.value} value={mode.value}>
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

        <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={pending || !hasAgents}>
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
        <div className="lg:sticky lg:top-24">
          <Card className="glass overflow-hidden">
            <CardHeader className="gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-primary/10 text-primary">
                  <FileCode2 className="h-4 w-4" />
                </span>
                <div>
                  <CardTitle className="text-base">Contract preview</CardTitle>
                  <CardDescription>
                    A machine-readable work contract.
                  </CardDescription>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={handleGenerate}
              >
                <Sparkles className="h-4 w-4" />
                Generate structured contract
              </Button>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              {contract ? (
                <div className="space-y-5">
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
                    <Wand2 className="h-4 w-4" />
                    Apply to form
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Fills in the title, output format, and validation rules.
                  </p>
                </div>
              ) : (
                <EmptyState
                  icon={Sparkles}
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
