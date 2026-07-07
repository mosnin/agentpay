"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
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

export function SignInForm() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect_url");
  const signUpHref = redirectUrl
    ? `/sign-up?redirect_url=${encodeURIComponent(redirectUrl)}`
    : "/sign-up";

  return (
    <SignIn.Root fallback={<LoadingCard />}>
      <Clerk.Loading>
        {(isGlobalLoading) => (
          <>
            {/* Step 1 — who are you? */}
            <SignIn.Step name="start">
              <Card className="w-full max-w-sm">
                <CardHeader className="space-y-1.5 text-center">
                  <CardTitle className="text-xl">Sign in to Bids</CardTitle>
                  <CardDescription>
                    Enter your account email and we&apos;ll take you to the next step.
                  </CardDescription>
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

                  <SignIn.Action submit asChild>
                    <Button className="w-full" disabled={isGlobalLoading}>
                      {isGlobalLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          One moment…
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

            {/* Step 2 — prove it. One card per verification method, each
                saying exactly what happened and what to do next. */}
            <SignIn.Step name="verifications">
              <SignIn.Strategy name="password">
                <Card className="w-full max-w-sm">
                  <CardHeader className="space-y-1.5 text-center">
                    <CardTitle className="text-xl">Enter your password</CardTitle>
                    <CardDescription>
                      Signing in as <SignIn.SafeIdentifier />
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <Clerk.GlobalError className="block text-sm font-medium text-destructive" />

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
                          "Sign in"
                        )}
                      </Button>
                    </SignIn.Action>

                    <div className="flex items-center justify-between text-sm">
                      <SignIn.Action navigate="forgot-password" asChild>
                        <button type="button" className="font-medium text-foreground hover:underline">
                          Forgot password?
                        </button>
                      </SignIn.Action>
                      <SignIn.Action navigate="start" asChild>
                        <button type="button" className="text-muted-foreground transition-colors hover:text-foreground">
                          Use a different email
                        </button>
                      </SignIn.Action>
                    </div>
                  </CardContent>
                </Card>
              </SignIn.Strategy>

              <SignIn.Strategy name="email_code">
                <Card className="w-full max-w-sm">
                  <CardHeader className="space-y-1.5 text-center">
                    <CardTitle className="text-xl">Check your email</CardTitle>
                    <CardDescription>
                      We sent a sign-in code to <SignIn.SafeIdentifier />. Enter it below.
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

                    <SignIn.Action submit asChild>
                      <Button className="w-full" disabled={isGlobalLoading}>
                        {isGlobalLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Continue"
                        )}
                      </Button>
                    </SignIn.Action>

                    <div className="space-y-2 text-center text-sm">
                      <SignIn.Action
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
                      </SignIn.Action>
                      <div>
                        <SignIn.Action navigate="start" asChild>
                          <button type="button" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
                            Use a different email
                          </button>
                        </SignIn.Action>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </SignIn.Strategy>

              <SignIn.Strategy name="reset_password_email_code">
                <Card className="w-full max-w-sm">
                  <CardHeader className="space-y-1.5 text-center">
                    <CardTitle className="text-xl">Check your email</CardTitle>
                    <CardDescription>
                      We sent a password reset code to <SignIn.SafeIdentifier />. Enter it below.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <Clerk.GlobalError className="block text-sm font-medium text-destructive" />

                    <ClerkField
                      name="code"
                      label="Reset code"
                      autoComplete="one-time-code"
                      hint="Didn't get it? Check your spam folder."
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
                  </CardContent>
                </Card>
              </SignIn.Strategy>
            </SignIn.Step>

            {/* Forgot password — offer the reset path in one obvious button. */}
            <SignIn.Step name="forgot-password">
              <Card className="w-full max-w-sm">
                <CardHeader className="space-y-1.5 text-center">
                  <CardTitle className="text-xl">Reset your password</CardTitle>
                  <CardDescription>
                    We&apos;ll email you a code to confirm it&apos;s you, then you&apos;ll choose a
                    new password.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <SignIn.SupportedStrategy name="reset_password_email_code" asChild>
                    <Button type="button" className="w-full">
                      Email me a reset code
                    </Button>
                  </SignIn.SupportedStrategy>
                  <SignIn.Action navigate="start" asChild>
                    <Button type="button" variant="ghost" className="w-full">
                      Back to sign in
                    </Button>
                  </SignIn.Action>
                </CardContent>
              </Card>
            </SignIn.Step>

            {/* New password — the last step of the reset path. */}
            <SignIn.Step name="reset-password">
              <Card className="w-full max-w-sm">
                <CardHeader className="space-y-1.5 text-center">
                  <CardTitle className="text-xl">Set a new password</CardTitle>
                  <CardDescription>
                    Almost done — choose a new password for your account.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <Clerk.GlobalError className="block text-sm font-medium text-destructive" />

                  <ClerkField
                    name="password"
                    label="New password"
                    type="password"
                    autoComplete="new-password"
                    hint="At least 8 characters."
                  />
                  <ClerkField
                    name="confirmPassword"
                    label="Confirm password"
                    type="password"
                    autoComplete="new-password"
                  />

                  <SignIn.Action submit asChild>
                    <Button className="w-full" disabled={isGlobalLoading}>
                      {isGlobalLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Update password & sign in"
                      )}
                    </Button>
                  </SignIn.Action>
                </CardContent>
              </Card>
            </SignIn.Step>
          </>
        )}
      </Clerk.Loading>
    </SignIn.Root>
  );
}
