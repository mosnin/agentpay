"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
// The classic custom-flow hook (isLoaded/signIn/setActive). The main
// entrypoint's useSignIn returns Core 3's new signals API instead.
import { useSignIn } from "@clerk/nextjs/legacy";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthField, clerkErrorMessage } from "@/components/auth/auth-field";

// The verification methods this form knows how to drive, as returned in
// signIn.supportedFirstFactors.
type FirstFactor = {
  strategy: string;
  emailAddressId?: string;
  safeIdentifier?: string;
};

type Step = "start" | "password" | "code" | "reset-code" | "new-password";

function LoadingCard() {
  return (
    <Card className="flex w-full max-w-sm items-center justify-center py-20">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </Card>
  );
}

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn } = useAuth();
  const { isLoaded, signIn, setActive } = useSignIn();

  const redirectUrl = searchParams.get("redirect_url");
  const target = redirectUrl || "/dashboard";
  const signUpHref = redirectUrl
    ? `/sign-up?redirect_url=${encodeURIComponent(redirectUrl)}`
    : "/sign-up";

  const [step, setStep] = React.useState<Step>("start");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [factors, setFactors] = React.useState<FirstFactor[]>([]);
  const [safeIdentifier, setSafeIdentifier] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [resendIn, setResendIn] = React.useState(0);

  // Already signed in — nothing to do here.
  React.useEffect(() => {
    if (isSignedIn) router.replace(target);
  }, [isSignedIn, router, target]);

  React.useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  if (!isLoaded || isSignedIn) return <LoadingCard />;

  async function finish(createdSessionId: string | null) {
    await setActive!({ session: createdSessionId });
    router.push(target);
  }

  function goTo(next: Step) {
    setError(null);
    setCode("");
    setStep(next);
  }

  async function sendCode(strategy: "email_code" | "reset_password_email_code") {
    const factor = factors.find((f) => f.strategy === strategy);
    if (!factor?.emailAddressId) {
      setError(
        strategy === "email_code"
          ? "Email-code sign-in isn't available for this account."
          : "Password reset isn't available for this account.",
      );
      return false;
    }
    await signIn!.prepareFirstFactor(
      strategy === "email_code"
        ? { strategy, emailAddressId: factor.emailAddressId }
        : { strategy, emailAddressId: factor.emailAddressId },
    );
    setSafeIdentifier(factor.safeIdentifier ?? email);
    setResendIn(30);
    return true;
  }

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const attempt = await signIn!.create({ identifier: email });
      if (attempt.status === "complete") {
        await finish(attempt.createdSessionId);
        return;
      }
      const supported = (attempt.supportedFirstFactors ?? []) as FirstFactor[];
      setFactors(supported);
      if (supported.some((f) => f.strategy === "password")) {
        goTo("password");
      } else if (supported.some((f) => f.strategy === "email_code")) {
        const factor = supported.find((f) => f.strategy === "email_code")!;
        await signIn!.prepareFirstFactor({
          strategy: "email_code",
          emailAddressId: factor.emailAddressId!,
        });
        setSafeIdentifier(factor.safeIdentifier ?? email);
        setResendIn(30);
        goTo("code");
      } else {
        setError("No supported sign-in method is available for this account.");
      }
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const attempt = await signIn!.attemptFirstFactor({ strategy: "password", password });
      if (attempt.status === "complete") {
        await finish(attempt.createdSessionId);
      } else {
        setError("Additional verification is required to finish signing in.");
      }
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  async function handleCode(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const attempt = await signIn!.attemptFirstFactor({ strategy: "email_code", code });
      if (attempt.status === "complete") {
        await finish(attempt.createdSessionId);
      } else {
        setError("Additional verification is required to finish signing in.");
      }
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  async function handleResetCode(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const attempt = await signIn!.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
      });
      if (attempt.status === "needs_new_password") {
        goTo("new-password");
      } else if (attempt.status === "complete") {
        await finish(attempt.createdSessionId);
      } else {
        setError("Additional verification is required to finish signing in.");
      }
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  async function handleNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const attempt = await signIn!.resetPassword({ password: newPassword });
      if (attempt.status === "complete") {
        await finish(attempt.createdSessionId);
      } else {
        setError("Additional verification is required to finish signing in.");
      }
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  async function switchTo(strategy: "email_code" | "reset_password_email_code") {
    setPending(true);
    setError(null);
    try {
      if (await sendCode(strategy)) {
        goTo(strategy === "email_code" ? "code" : "reset-code");
      }
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  async function resend(strategy: "email_code" | "reset_password_email_code") {
    setPending(true);
    setError(null);
    try {
      await sendCode(strategy);
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  const globalError = error && (
    <p className="text-sm font-medium text-destructive">{error}</p>
  );

  const hasEmailCode = factors.some((f) => f.strategy === "email_code");

  return (
    <>
      {step === "start" && (
        <Card className="w-full max-w-sm">
          <CardHeader className="space-y-1.5 text-center">
            <CardTitle className="text-xl">Sign in to Bids</CardTitle>
            <CardDescription>
              Enter your account email and we&apos;ll take you to the next step.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStart} className="space-y-5">
              {globalError}
              <AuthField
                id="email"
                label="Email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button className="w-full" disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    One moment…
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                New to Bids?{" "}
                <Link href={signUpHref} className="font-medium text-foreground hover:underline">
                  Create an account
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      )}

      {step === "password" && (
        <Card className="w-full max-w-sm">
          <CardHeader className="space-y-1.5 text-center">
            <CardTitle className="text-xl">Enter your password</CardTitle>
            <CardDescription>Signing in as {email}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePassword} className="space-y-5">
              {globalError}
              <AuthField
                id="password"
                label="Password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button className="w-full" disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
              </Button>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => switchTo("reset_password_email_code")}
                  disabled={pending}
                  className="font-medium text-foreground hover:underline"
                >
                  Forgot password?
                </button>
                <button
                  type="button"
                  onClick={() => goTo("start")}
                  disabled={pending}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Use a different email
                </button>
              </div>
              {hasEmailCode && (
                <div className="text-center text-sm">
                  <button
                    type="button"
                    onClick={() => switchTo("email_code")}
                    disabled={pending}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Email me a sign-in code instead
                  </button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {step === "code" && (
        <Card className="w-full max-w-sm">
          <CardHeader className="space-y-1.5 text-center">
            <CardTitle className="text-xl">Check your email</CardTitle>
            <CardDescription>
              We sent a sign-in code to {safeIdentifier}. Enter it below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCode} className="space-y-5">
              {globalError}
              <AuthField
                id="code"
                label="Verification code"
                autoComplete="one-time-code"
                inputMode="numeric"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                hint="Didn't get it? Check your spam folder."
              />
              <Button className="w-full" disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
              </Button>
              <div className="space-y-2 text-center text-sm">
                {resendIn > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    You can request a new code in {resendIn}s
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => resend("email_code")}
                    disabled={pending}
                    className="font-medium text-foreground hover:underline"
                  >
                    Resend code
                  </button>
                )}
                <div>
                  <button
                    type="button"
                    onClick={() => goTo("start")}
                    disabled={pending}
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Use a different email
                  </button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {step === "reset-code" && (
        <Card className="w-full max-w-sm">
          <CardHeader className="space-y-1.5 text-center">
            <CardTitle className="text-xl">Check your email</CardTitle>
            <CardDescription>
              We sent a password reset code to {safeIdentifier}. Enter it below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetCode} className="space-y-5">
              {globalError}
              <AuthField
                id="reset-code"
                label="Reset code"
                autoComplete="one-time-code"
                inputMode="numeric"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                hint="Didn't get it? Check your spam folder."
              />
              <Button className="w-full" disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
              </Button>
              <div className="text-center text-sm">
                {resendIn > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    You can request a new code in {resendIn}s
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => resend("reset_password_email_code")}
                    disabled={pending}
                    className="font-medium text-foreground hover:underline"
                  >
                    Resend code
                  </button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {step === "new-password" && (
        <Card className="w-full max-w-sm">
          <CardHeader className="space-y-1.5 text-center">
            <CardTitle className="text-xl">Set a new password</CardTitle>
            <CardDescription>
              Almost done — choose a new password for your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleNewPassword} className="space-y-5">
              {globalError}
              <AuthField
                id="new-password"
                label="New password"
                type="password"
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                hint="At least 8 characters."
              />
              <AuthField
                id="confirm-password"
                label="Confirm password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <Button className="w-full" disabled={pending}>
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Update password & sign in"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </>
  );
}
