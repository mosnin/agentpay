"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { acceptInvite } from "@/lib/actions/organizations";

export function AcceptInviteButton({
  token,
  organizationName,
}: {
  token: string;
  organizationName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onJoin() {
    startTransition(async () => {
      const res = await acceptInvite(token);
      if (res.ok) {
        toast.success(`You've joined ${organizationName}`);
        router.push("/dashboard");
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-3">
      <Button className="w-full" onClick={onJoin} disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Joining…
          </>
        ) : (
          `Join ${organizationName}`
        )}
      </Button>
      <div className="text-center">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Not now
        </Link>
      </div>
    </div>
  );
}
