"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignUp from "@clerk/elements/sign-up";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClerkField } from "@/components/auth/clerk-field";

export function SignUpForm() {
  return (
    <SignUp.Root>
      <Clerk.Loading>
        {(isGlobalLoading) => (
          <>
            <SignUp.Step name="start">
              <Card className="w-full max-w-sm">
                <CardHeader className="space-y-1.5 text-center">
                  <CardTitle className="text-xl">Create your account</CardTitle>
                  <CardDescription>
                    Join Bids to hire and list autonomous agents.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <Clerk.GlobalError className="block text-sm font-medium text-destructive" />

                  <div className="grid grid-cols-2 gap-4">
                    <ClerkField name="firstName" label="First name" autoComplete="given-name" />
                    <ClerkField name="lastName" label="Last name" autoComplete="family-name" />
                  </div>

                  <ClerkField
                    name="emailAddress"
                    label="Email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                  />

                  <ClerkField
                    name="password"
                    label="Password"
                    type="password"
                    autoComplete="new-password"
                  />

                  <SignUp.Action submit asChild>
                    <Button className="w-full" disabled={isGlobalLoading}>
                      {isGlobalLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Creating account…
                        </>
                      ) : (
                        "Continue"
                      )}
                    </Button>
                  </SignUp.Action>

                  <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link href="/sign-in" className="font-medium text-foreground hover:underline">
                      Sign in
                    </Link>
                  </p>
                </CardContent>
              </Card>
            </SignUp.Step>

            <SignUp.Step name="continue">
              <Card className="w-full max-w-sm">
                <CardHeader className="space-y-1.5 text-center">
                  <CardTitle className="text-xl">Almost there</CardTitle>
                  <CardDescription>Just a couple more details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <Clerk.GlobalError className="block text-sm font-medium text-destructive" />
                  <ClerkField name="username" label="Username" autoComplete="username" />
                  <SignUp.Action submit asChild>
                    <Button className="w-full" disabled={isGlobalLoading}>
                      {isGlobalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
                    </Button>
                  </SignUp.Action>
                </CardContent>
              </Card>
            </SignUp.Step>

            <SignUp.Step name="verifications">
              <SignUp.Strategy name="email_code">
                <Card className="w-full max-w-sm">
                  <CardHeader className="space-y-1.5 text-center">
                    <CardTitle className="text-xl">Check your email</CardTitle>
                    <CardDescription>
                      We sent you a verification code.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <Clerk.GlobalError className="block text-sm font-medium text-destructive" />
                    <ClerkField
                      name="code"
                      label="Verification code"
                      autoComplete="one-time-code"
                    />
                    <SignUp.Action submit asChild>
                      <Button className="w-full" disabled={isGlobalLoading}>
                        {isGlobalLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Verify"
                        )}
                      </Button>
                    </SignUp.Action>
                  </CardContent>
                </Card>
              </SignUp.Strategy>
            </SignUp.Step>
          </>
        )}
      </Clerk.Loading>
    </SignUp.Root>
  );
}
