"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClerkField } from "@/components/auth/clerk-field";

export function SignInForm() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect_url");
  const signUpHref = redirectUrl
    ? `/sign-up?redirect_url=${encodeURIComponent(redirectUrl)}`
    : "/sign-up";

  return (
    <SignIn.Root>
      <Clerk.Loading>
        {(isGlobalLoading) => (
          <>
            <SignIn.Step name="start">
              <Card className="w-full max-w-sm">
                <CardHeader className="space-y-1.5 text-center">
                  <CardTitle className="text-xl">Sign in</CardTitle>
                  <CardDescription>Welcome back to Bids.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <Clerk.GlobalError className="block text-sm font-medium text-destructive" />

                  <ClerkField
                    name="identifier"
                    label="Email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                  />

                  <SignIn.Strategy name="password">
                    <ClerkField
                      name="password"
                      label="Password"
                      type="password"
                      autoComplete="current-password"
                    />
                  </SignIn.Strategy>

                  <SignIn.Action submit asChild>
                    <Button className="w-full" disabled={isGlobalLoading}>
                      {isGlobalLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Signing in…
                        </>
                      ) : (
                        "Continue"
                      )}
                    </Button>
                  </SignIn.Action>

                  <p className="text-center text-sm text-muted-foreground">
                    New to Bids?{" "}
                    <Link href={signUpHref} className="font-medium text-foreground hover:underline">
                      Create an account
                    </Link>
                  </p>
                </CardContent>
              </Card>
            </SignIn.Step>

            <SignIn.Step name="verifications">
              <Card className="w-full max-w-sm">
                <CardHeader className="space-y-1.5 text-center">
                  <CardTitle className="text-xl">Check your email</CardTitle>
                  <SignIn.SafeIdentifier />
                </CardHeader>
                <CardContent className="space-y-5">
                  <Clerk.GlobalError className="block text-sm font-medium text-destructive" />

                  <SignIn.Strategy name="email_code">
                    <ClerkField
                      name="code"
                      label="Verification code"
                      autoComplete="one-time-code"
                    />
                    <SignIn.Action submit asChild>
                      <Button className="w-full" disabled={isGlobalLoading}>
                        {isGlobalLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Continue"
                        )}
                      </Button>
                    </SignIn.Action>
                  </SignIn.Strategy>

                  <SignIn.Strategy name="password">
                    <ClerkField
                      name="password"
                      label="Password"
                      type="password"
                      autoComplete="current-password"
                    />
                    <SignIn.Action submit asChild>
                      <Button className="w-full" disabled={isGlobalLoading}>
                        {isGlobalLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Continue"
                        )}
                      </Button>
                    </SignIn.Action>
                  </SignIn.Strategy>
                </CardContent>
              </Card>
            </SignIn.Step>
          </>
        )}
      </Clerk.Loading>
    </SignIn.Root>
  );
}
