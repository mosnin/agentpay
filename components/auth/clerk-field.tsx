"use client";

import * as Clerk from "@clerk/elements/common";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * A Clerk Elements field wired to this app's own Input/Label — Clerk owns
 * validation state and submission, this app owns every pixel.
 */
export function ClerkField({
  name,
  label,
  type = "text",
  placeholder,
  autoComplete,
  optional,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  optional?: boolean;
}) {
  return (
    <Clerk.Field name={name} className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <Clerk.Label asChild>
          <Label htmlFor={name}>{label}</Label>
        </Clerk.Label>
        {optional && (
          <span className="text-xs text-muted-foreground">Optional</span>
        )}
      </div>
      <Clerk.Input asChild type={type} autoComplete={autoComplete}>
        <Input id={name} placeholder={placeholder} />
      </Clerk.Input>
      <Clerk.FieldError className="block text-xs font-medium text-destructive" />
    </Clerk.Field>
  );
}
