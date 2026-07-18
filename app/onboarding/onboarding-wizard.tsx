"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Building2, Compass, Loader2, Store, Users } from "lucide-react";
import { completeOnboarding } from "@/lib/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type Intent = "buyer" | "seller" | "both";
type OrgMode = "create" | "skip";

const STEPS = ["Intent", "Organization", "First step"];

/** Selectable card — same tap target as a button, styled like a chosen option. */
function OptionCard({
  selected,
  onClick,
  icon: Icon,
  title,
  description,
  disabled,
  loading,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        selected
          ? "border-primary/50 bg-primary/[0.04]"
          : "border-border/60 bg-card/40 hover:enabled:bg-muted/30",
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
          selected
            ? "border-primary/30 bg-primary/10 text-primary"
            : "border-border/60 bg-muted/40 text-foreground",
        )}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      </span>
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}

export function OnboardingWizard() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingDestination, setPendingDestination] = React.useState<string | null>(null);
  const [step, setStep] = React.useState(0);
  const [intent, setIntent] = React.useState<Intent | undefined>();
  const [orgMode, setOrgMode] = React.useState<OrgMode>("skip");
  const [orgName, setOrgName] = React.useState("");

  function finish(destination: string) {
    setPendingDestination(destination);
    startTransition(async () => {
      const res = await completeOnboarding({
        intent,
        organizationMode: orgMode,
        organizationName: orgMode === "create" ? orgName : undefined,
      });
      if (res.ok) {
        router.push(destination);
      } else {
        toast.error(res.ok === false ? res.error : "Something went wrong.");
      }
    });
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-4">
        <Progress value={((step + 1) / STEPS.length) * 100} />
        <div className="space-y-1.5">
          <CardTitle className="text-xl">{STEPS[step]}</CardTitle>
          <CardDescription>
            {step === 0 && "How will you use Bids?"}
            {step === 1 && "Publish under an organization, or work solo."}
            {step === 2 && "One concrete first move — or explore on your own."}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {step === 0 && (
          <>
            <div className="space-y-3">
              <OptionCard
                selected={intent === "buyer"}
                onClick={() => setIntent("buyer")}
                icon={Compass}
                title="Hire agents"
                description="Commission tasks and get work done by specialized agents."
              />
              <OptionCard
                selected={intent === "seller"}
                onClick={() => setIntent("seller")}
                icon={Store}
                title="List agents"
                description="Publish your own agents and start earning."
              />
              <OptionCard
                selected={intent === "both"}
                onClick={() => setIntent("both")}
                icon={Users}
                title="Both"
                description="Hire specialists and list your own agents."
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Button variant="ghost" onClick={() => setStep(1)}>
                Skip
              </Button>
              <Button onClick={() => setStep(1)}>Continue</Button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="space-y-3">
              <OptionCard
                selected={orgMode === "create"}
                onClick={() => setOrgMode("create")}
                icon={Building2}
                title="Create an organization"
                description="Publish listings under a company or team name."
              />
              <OptionCard
                selected={orgMode === "skip"}
                onClick={() => setOrgMode("skip")}
                icon={Compass}
                title="Work individually"
                description="No organization — you can add one later."
              />
            </div>

            {orgMode === "create" && (
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization name</Label>
                <Input
                  id="orgName"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Northwind Labs"
                />
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Have an invite? Accept it from the link you received — you can also do this later.
            </p>

            <div className="flex items-center justify-between gap-2">
              <Button variant="ghost" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={orgMode === "create" && !orgName.trim()}
              >
                Continue
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="space-y-3">
              {intent !== "seller" && (
                <OptionCard
                  selected={false}
                  onClick={() => finish("/marketplace")}
                  icon={Compass}
                  title="Explore agents"
                  description="Browse the marketplace and commission your first task."
                  disabled={pending}
                  loading={pendingDestination === "/marketplace"}
                />
              )}
              {intent !== "buyer" && (
                <OptionCard
                  selected={false}
                  onClick={() => finish("/agents/new")}
                  icon={Store}
                  title="List your first agent"
                  description="Publish an agent with its capabilities and pricing."
                  disabled={pending}
                  loading={pendingDestination === "/agents/new"}
                />
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <Button variant="ghost" onClick={() => setStep(1)} disabled={pending}>
                Back
              </Button>
              <Button
                variant="outline"
                onClick={() => finish("/dashboard")}
                disabled={pending}
              >
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Finishing…
                  </>
                ) : (
                  "Skip for now"
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
