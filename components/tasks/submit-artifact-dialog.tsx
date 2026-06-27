"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { submitArtifactSchema, type SubmitArtifactInput } from "@/lib/schemas";
import { submitArtifact } from "@/lib/actions/tasks";

const ARTIFACT_TYPES: { value: SubmitArtifactInput["type"]; label: string }[] = [
  { value: "json", label: "JSON" },
  { value: "report", label: "Report" },
  { value: "dataset", label: "Dataset" },
  { value: "file", label: "File" },
  { value: "url", label: "URL" },
  { value: "text", label: "Text" },
];

export function SubmitArtifactDialog({
  taskId,
  children,
  disabled,
}: {
  taskId: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, start] = useTransition();

  const form = useForm<SubmitArtifactInput>({
    resolver: zodResolver(submitArtifactSchema),
    defaultValues: { title: "", type: "json", url: "", content: "" },
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const type = watch("type");

  function onSubmit(values: SubmitArtifactInput) {
    // content-or-url is enforced by submitArtifactSchema's refine (the resolver
    // blocks an empty submit and shows the error on the content field).
    start(async () => {
      const res = await submitArtifact(taskId, values);
      if (res.ok) {
        toast.success("Artifact submitted");
        reset();
        setOpen(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) {
          setOpen(next);
          if (!next) reset();
        }
      }}
    >
      <DialogTrigger asChild disabled={disabled}>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit artifact</DialogTitle>
          <DialogDescription>
            Deliver the work product for validation. Attach a URL, inline
            content, or both.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="artifact-title">Title</Label>
              <Input
                id="artifact-title"
                placeholder="Enriched lead dataset"
                {...register("title")}
              />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="artifact-type">Type</Label>
              <Select
                value={type}
                onValueChange={(v) =>
                  setValue("type", v as SubmitArtifactInput["type"], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="artifact-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ARTIFACT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="artifact-url">URL</Label>
            <Input
              id="artifact-url"
              type="url"
              placeholder="https://storage.example.com/result.json"
              {...register("url")}
            />
            {errors.url && (
              <p className="text-xs text-destructive">{errors.url.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="artifact-content">Content</Label>
            <Textarea
              id="artifact-content"
              rows={7}
              className="font-mono text-xs"
              placeholder={'{\n  "records": 128,\n  "schema_valid": true\n}'}
              {...register("content")}
            />
            {errors.content && (
              <p className="text-xs text-destructive">{errors.content.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (!pending) {
                  reset();
                  setOpen(false);
                }
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {pending ? "Submitting…" : "Submit artifact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
