"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function AuthLoading() {
  const [delayed, setDelayed] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setDelayed(true), 10000); return () => clearTimeout(timer); }, []);
  return <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center">
    <p role="status" className="text-sm leading-relaxed">{delayed ? "Sign-in is taking longer than expected. Your connection or the sign-in service may be unavailable." : "Preparing secure sign-in…"}</p>
    {delayed && <Button className="mt-5 w-full rounded-full" onClick={() => window.location.reload()}>Try again</Button>}
    <Link className="mt-4 inline-flex min-h-11 items-center text-sm text-muted-foreground underline underline-offset-4" href="/marketplace">Back to marketplace</Link>
  </div>;
}
