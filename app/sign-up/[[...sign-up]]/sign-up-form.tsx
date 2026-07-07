"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignUp from "@clerk/elements/sign-up";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClerkField } from "@/components/auth/clerk-field";

function LoadingCard() {
  return (
    <Card className="flex w-full max-w-sm items-center justify-center py-20">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </Card>
  );
}

export function SignUpForm() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect_url");
  const signInHref = redirectUrl
    ? `/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`
    : "/sign-in";

  return (
    <SignUp.Root fallback={<LoadingCard />}>
      <Clerk.Loading>
        {(isGlobalLoading) => (
          <>
            <SignUp.Step name="start">
              <Card className="w-full max-w-sm">
                <CardHeader className="space-y-1.5 text-center">
                  <CardTitle className="text-xl">Create your account</CardTitle>
                  <CardDescription>
                    A few details, a quick email check, and you&apos;re in.
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
                    hint="We'll send a verification code to this address."
                  />

                  <ClerkField
                    name="password"
                    label="Password"
                    type="password"
                    autoComplete="new-password"
                    hint="At least 8 characters."
                  />

                  <SignUp.Action submit asChild>
                    <Button className="w-full" disabled={isGlobalLoading}>
                      {isGlobalLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Creating account…
                        </>
                      ) : (
                        "Create account"
                      )}
                    </Button>
                  </SignUp.Action>

                  <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link href={signInHref} className="font-medium text-foreground hover:underline">
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
                  <CardDescription>One more detail to finish setting up.</CardDescription>
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
                    <CardTitle className="text-xl">Verify your email</CardTitle>
                    <CardDescription>
                      We emailed you a 6-digit code. Enter it below to finish
                      creating your account.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <Clerk.GlobalError className="block text-sm font-medium text-destructive" />

                    <ClerkField
                      name="code"
                      label="Verification code"
                      autoComplete="one-time-code"
                      hint="Didn't get it? Check your spam folder."
                    />

                    <SignUp.Action submit asChild>
                      <Button className="w-full" disabled={isGlobalLoading}>
                        {isGlobalLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Verify & continue"
                        )}
                      </Button>
                    </SignUp.Action>

                    <div className="text-center text-sm">
                      <SignUp.Action
                        resend
                        asChild
                        fallback={({ resendableAfter }) => (
                          <p className="text-xs text-muted-foreground">
                            You can request a new code in {resendableAfter}s
                          </p>
                        )}
                      >
                        <button type="button" className="font-medium text-foreground hover:underline">
                          Resend code
                        </button>
                      </SignUp.Action>
                    </div>
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
