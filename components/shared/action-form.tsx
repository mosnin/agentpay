"use client";
import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
export function ActionForm({
  action,
  successMessage,
  children,
  className,
}: {
  action: (form: FormData) => Promise<void>;
  successMessage: string;
  children: ReactNode;
  className?: string;
}) {
  const [pending, start] = useTransition(),
    [message, setMessage] = useState(""),
    router = useRouter();
  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget,
          values = new FormData(form);
        start(async () => {
          setMessage("Saving…");
          try {
            await action(values);
            form.reset();
            setMessage(successMessage);
            router.refresh();
          } catch {
            setMessage(
              "Could not save. Check the fields and try again. Your text is preserved.",
            );
          }
        });
      }}
    >
      <fieldset disabled={pending} className="min-w-0 space-y-4">
        {children}
      </fieldset>
      <p role="status" className="text-sm text-muted-foreground">
        {message}
      </p>
    </form>
  );
}
