"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Building2, Cpu, Loader2, Rocket, Sparkles, Tag, X } from "lucide-react";

import { createAgentSchema, type CreateAgentInput } from "@/lib/schemas";
import { createAgent, updateAgent } from "@/lib/actions/agents";
import { CATEGORIES, PRICING_MODELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type OrganizationOption = { id: string; name: string };

const NO_ORGANIZATION = "__none__";

const INPUT_SCHEMA_PLACEHOLDER = `{
  "type": "object",
  "properties": {
    "objective": { "type": "string" },
    "context_url": { "type": "string", "format": "uri" }
  },
  "required": ["objective"]
}`;

const OUTPUT_SCHEMA_PLACEHOLDER = `{
  "type": "object",
  "properties": {
    "summary": { "type": "string" },
    "confidence": { "type": "number" }
  }
}`;

/** A labelled form field wrapper with optional helper text + error message. */
function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  optional,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={htmlFor} className="text-foreground">
          {label}
          {required && <span className="ml-0.5 text-primary">*</span>}
        </Label>
        {optional && (
          <span className="text-xs text-muted-foreground">Optional</span>
        )}
      </div>
      {children}
      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** Section header used inside each card. */
function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <CardHeader className="gap-1.5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <CardTitle className="text-base">{title}</CardTitle>
      </div>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
  );
}

/**
 * Controlled chip input — type a capability and press Enter or comma to add it.
 * Backspace on an empty input removes the last chip. Duplicates are ignored.
 */
function CapabilityInput({
  value,
  onChange,
  max = 12,
  disabled,
  invalid,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const [draft, setDraft] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const atLimit = value.length >= max;

  function addChip(raw: string) {
    const name = raw.trim().replace(/,$/, "").trim();
    if (!name) return;
    if (value.length >= max) return;
    const exists = value.some((v) => v.toLowerCase() === name.toLowerCase());
    if (exists) {
      setDraft("");
      return;
    }
    onChange([...value, name]);
    setDraft("");
  }

  function removeChip(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addChip(draft);
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      e.preventDefault();
      removeChip(value.length - 1);
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    if (text.includes(",")) {
      e.preventDefault();
      const parts = text.split(",");
      let next = [...value];
      for (const part of parts) {
        const name = part.trim();
        if (!name || next.length >= max) continue;
        if (next.some((v) => v.toLowerCase() === name.toLowerCase())) continue;
        next = [...next, name];
      }
      onChange(next);
      setDraft("");
    }
  }

  return (
    <div
      className={cn(
        "flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5 text-sm shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring",
        invalid && "border-destructive/70 focus-within:ring-destructive",
        disabled && "cursor-not-allowed opacity-50",
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((cap, i) => (
        <span
          key={`${cap}-${i}`}
          className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 py-0.5 pl-2 pr-1 text-xs font-medium text-foreground"
        >
          {cap}
          <button
            type="button"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              removeChip(i);
            }}
            className="rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-label={`Remove ${cap}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={draft}
        disabled={disabled || atLimit}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={() => addChip(draft)}
        placeholder={
          value.length === 0
            ? "e.g. lead-scoring, csv-export — press Enter to add"
            : atLimit
              ? "Limit reached"
              : "Add another…"
        }
        className="h-6 min-w-[8rem] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
      />
    </div>
  );
}

export function CreateAgentForm({
  organizations,
  agentId,
  defaultValues,
}: {
  organizations: OrganizationOption[];
  agentId?: string;
  defaultValues?: Partial<CreateAgentInput>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(agentId);

  const form = useForm<CreateAgentInput>({
    resolver: zodResolver(createAgentSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      shortDescription: "",
      longDescription: "",
      category: undefined,
      capabilities: [],
      pricingModel: "per_task",
      startingPrice: 0,
      currency: "USD",
      endpointUrl: "",
      mcpServerUrl: "",
      inputSchema: "",
      outputSchema: "",
      organizationId: undefined,
      verified: false,
      ...defaultValues,
    },
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = form;

  function onSubmit(values: CreateAgentInput) {
    startTransition(async () => {
      const res = isEdit
        ? await updateAgent({ id: agentId!, ...values })
        : await createAgent(values);
      if (res.ok && res.data) {
        toast.success(isEdit ? "Changes saved" : "Agent listed", {
          description: isEdit
            ? `${values.name} has been updated.`
            : `${values.name} is now live on the marketplace.`,
        });
        router.push(`/agents/${res.data.slug}`);
      } else {
        toast.error(res.ok ? "Could not save agent." : res.error);
      }
    });
  }

  function onInvalid() {
    toast.error("Please fix the highlighted fields before saving.");
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      className="space-y-6"
      noValidate
    >
      {/* Identity ----------------------------------------------------------- */}
      <Card>
        <SectionHeader
          icon={Sparkles}
          title="Identity"
          description="How buyers will recognize and understand your agent at a glance."
        />
        <CardContent className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
          <Field
            label="Agent name"
            htmlFor="name"
            required
            hint="A clear, memorable name. 3–80 characters."
            error={errors.name?.message}
          >
            <Input
              id="name"
              autoFocus
              placeholder="Northwind Lead Scorer"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
          </Field>

          <Field
            label="Category"
            htmlFor="category"
            required
            hint="Where this agent should appear in the marketplace."
            error={errors.category?.message}
          >
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
                    aria-invalid={!!errors.category}
                  >
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <span className="flex flex-col">
                          <span>{cat.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {cat.description}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field
            label="Short description"
            htmlFor="shortDescription"
            required
            className="md:col-span-2"
            hint="One sentence shown on cards and search results. 10–180 characters."
            error={errors.shortDescription?.message}
          >
            <Input
              id="shortDescription"
              placeholder="Scores inbound leads against your ICP and routes the hottest to sales."
              aria-invalid={!!errors.shortDescription}
              {...register("shortDescription")}
            />
          </Field>

          <Field
            label="Full description"
            htmlFor="longDescription"
            required
            className="md:col-span-2"
            hint="Explain inputs, outputs, and what makes this agent reliable. Supports detail buyers need to trust it."
            error={errors.longDescription?.message}
          >
            <Textarea
              id="longDescription"
              rows={6}
              placeholder="Describe how the agent works, the data it expects, the artifacts it returns, and any guarantees on quality or latency."
              aria-invalid={!!errors.longDescription}
              {...register("longDescription")}
            />
          </Field>
        </CardContent>
      </Card>

      {/* Capabilities & pricing -------------------------------------------- */}
      <Card>
        <SectionHeader
          icon={Tag}
          title="Capabilities & pricing"
          description="Tag what the agent can do and how it charges for work."
        />
        <CardContent className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
          <Field
            label="Capabilities"
            required
            className="md:col-span-2"
            hint="Type a capability and press Enter or comma. Add 1–12 tags."
            error={
              errors.capabilities?.message ??
              errors.capabilities?.root?.message
            }
          >
            <Controller
              control={control}
              name="capabilities"
              render={({ field }) => (
                <CapabilityInput
                  value={field.value ?? []}
                  onChange={field.onChange}
                  disabled={pending}
                  invalid={!!errors.capabilities}
                />
              )}
            />
          </Field>

          <Field
            label="Pricing model"
            htmlFor="pricingModel"
            required
            hint="How buyers are billed for this agent."
            error={errors.pricingModel?.message}
          >
            <Controller
              control={control}
              name="pricingModel"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="pricingModel"
                    aria-invalid={!!errors.pricingModel}
                  >
                    <SelectValue placeholder="Select a pricing model" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICING_MODELS.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        <span className="flex flex-col">
                          <span>{model.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {model.description}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field
            label="Starting price"
            htmlFor="startingPrice"
            required
            hint="Base price in USD. Use 0 for free or bounty-only agents."
            error={errors.startingPrice?.message}
          >
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                id="startingPrice"
                type="number"
                min={0}
                step={0.01}
                inputMode="decimal"
                placeholder="0.00"
                className="pl-7"
                aria-invalid={!!errors.startingPrice}
                {...register("startingPrice")}
              />
            </div>
          </Field>
        </CardContent>
      </Card>

      {/* Technical ---------------------------------------------------------- */}
      <Card>
        <SectionHeader
          icon={Cpu}
          title="Technical"
          description="Wire up endpoints and declare the machine-readable I/O contract."
        />
        <CardContent className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
          <Field
            label="Endpoint URL"
            htmlFor="endpointUrl"
            optional
            hint="HTTPS endpoint that receives task payloads."
            error={errors.endpointUrl?.message}
          >
            <Input
              id="endpointUrl"
              type="url"
              placeholder="https://api.example.com/agent"
              aria-invalid={!!errors.endpointUrl}
              {...register("endpointUrl")}
            />
          </Field>

          <Field
            label="MCP server URL"
            htmlFor="mcpServerUrl"
            optional
            hint="Model Context Protocol server exposing this agent's tools."
            error={errors.mcpServerUrl?.message}
          >
            <Input
              id="mcpServerUrl"
              type="url"
              placeholder="https://mcp.example.com/sse"
              aria-invalid={!!errors.mcpServerUrl}
              {...register("mcpServerUrl")}
            />
          </Field>

          <Field
            label="Input schema"
            htmlFor="inputSchema"
            optional
            className="md:col-span-2"
            hint="JSON Schema describing the task payload this agent accepts."
            error={errors.inputSchema?.message}
          >
            <Textarea
              id="inputSchema"
              rows={9}
              spellCheck={false}
              placeholder={INPUT_SCHEMA_PLACEHOLDER}
              aria-invalid={!!errors.inputSchema}
              className="font-mono text-xs leading-relaxed"
              {...register("inputSchema")}
            />
          </Field>

          <Field
            label="Output schema"
            htmlFor="outputSchema"
            optional
            className="md:col-span-2"
            hint="JSON Schema describing the artifact this agent returns."
            error={errors.outputSchema?.message}
          >
            <Textarea
              id="outputSchema"
              rows={9}
              spellCheck={false}
              placeholder={OUTPUT_SCHEMA_PLACEHOLDER}
              aria-invalid={!!errors.outputSchema}
              className="font-mono text-xs leading-relaxed"
              {...register("outputSchema")}
            />
          </Field>
        </CardContent>
      </Card>

      {/* Ownership ---------------------------------------------------------- */}
      <Card>
        <SectionHeader
          icon={Building2}
          title="Ownership"
          description="Attribute the listing and set its verification state."
        />
        <CardContent className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
          <Field
            label="Organization"
            htmlFor="organizationId"
            optional
            hint="Publish under an organization, or leave unattributed."
            error={errors.organizationId?.message}
          >
            <Controller
              control={control}
              name="organizationId"
              render={({ field }) => (
                <Select
                  value={field.value ? field.value : NO_ORGANIZATION}
                  onValueChange={(val) =>
                    field.onChange(val === NO_ORGANIZATION ? undefined : val)
                  }
                >
                  <SelectTrigger id="organizationId">
                    <SelectValue placeholder="Select an organization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_ORGANIZATION}>
                      No organization
                    </SelectItem>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Controller
            control={control}
            name="verified"
            render={({ field }) => (
              <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 bg-muted/30 p-4 md:mt-7">
                <div className="space-y-0.5">
                  <Label htmlFor="verified" className="text-foreground">
                    Mark as verified
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Verified agents earn a badge and a reputation boost.
                  </p>
                </div>
                <Switch
                  id="verified"
                  checked={!!field.value}
                  onCheckedChange={field.onChange}
                />
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Actions ------------------------------------------------------------ */}
      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {isEdit
            ? "Changes go live on the marketplace immediately."
            : "Listings are published immediately and can be edited later."}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => router.push("/seller")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={pending} className="min-w-[9.5rem]">
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isEdit ? "Saving…" : "Publishing…"}
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4" />
                {isEdit ? "Save changes" : "Publish listing"}
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
