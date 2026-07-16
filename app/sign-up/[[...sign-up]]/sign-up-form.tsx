"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
// The classic custom-flow hook (isLoaded/signUp/setActive). The main
// entrypoint's useSignUp returns Core 3's new signals API instead.
import { useSignUp } from "@clerk/nextjs/legacy";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthField, clerkErrorMessage } from "@/components/auth/auth-field";

type Step = "start" | "verify" | "username";

function LoadingCard() {
  return (
    <Card className="flex w-full max-w-sm items-center justify-center py-20">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </Card>
  );
}

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn } = useAuth();
  const { isLoaded, signUp, setActive } = useSignUp();

  const redirectUrl = searchParams.get("redirect_url");
  // New accounts go through onboarding; the requireOnboardedUser gate would
  // send them there anyway, this just skips the extra hop.
  const target = redirectUrl || "/onboarding";
  const signInHref = redirectUrl
    ? `/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`
    : "/sign-in";

  const [step, setStep] = React.useState<Step>("start");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [resendIn, setResendIn] = React.useState(0);

  React.useEffect(() => {
    if (isSignedIn) router.replace(redirectUrl || "/dashboard");
  }, [isSignedIn, router, redirectUrl]);

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

  /** Route the sign-up attempt to whatever it still needs. */
  async function advance(attempt: {
    status: string | null;
    createdSessionId: string | null;
    unverifiedFields: string[];
    missingFields: string[];
  }) {
    if (attempt.status === "complete") {
      await finish(attempt.createdSessionId);
      return;
    }
    if (attempt.unverifiedFields.includes("email_address")) {
      await signUp!.prepareEmailAddressVerification({ strategy: "email_code" });
      setResendIn(30);
      setError(null);
      setCode("");
      setStep("verify");
      return;
    }
    if (attempt.missingFields.includes("username")) {
      setError(null);
      setStep("username");
      return;
    }
    setError("Something else is required to finish signing up. Please try again.");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const attempt = await signUp!.create({
        emailAddress: email,
        password,
        firstName,
        lastName,
      });
      await advance(attempt);
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const attempt = await signUp!.attemptEmailAddressVerification({ code });
      await advance(attempt);
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  async function handleUsername(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const attempt = await signUp!.update({ username });
      await advance(attempt);
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  async function resend() {
    setPending(true);
    setError(null);
    try {
      await signUp!.prepareEmailAddressVerification({ strategy: "email_code" });
      setResendIn(30);
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  const globalError = error && (
    <p className="text-sm font-medium text-destructive">{error}</p>
  );

  return (
    <>
      {step === "start" && (
        <Card className="w-full max-w-sm">
          <CardHeader className="space-y-1.5 text-center">
            <CardTitle className="text-xl">Create your account</CardTitle>
            <CardDescription>
              A few details, a quick email check, and you&apos;re in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-5">
              {globalError}
              <div className="grid grid-cols-2 gap-4">
                <AuthField
                  id="firstName"
                  label="First name"
                  autoComplete="given-name"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
                <AuthField
                  id="lastName"
                  label="Last name"
                  autoComplete="family-name"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
              <AuthField
                id="email"
                label="Email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                hint="We'll send a verification code to this address."
              />
              <AuthField
                id="password"
                label="Password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                hint="At least 8 characters."
              />
              {/* Clerk renders its bot-protection widget here when enabled. */}
              <div id="clerk-captcha" />
              <Button className="w-full" disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating account…
                  </>
                ) : (
                  "Create account"
                )}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href={signInHref} className="font-medium text-foreground hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      )}

      {step === "verify" && (
        <Card className="w-full max-w-sm">
          <CardHeader className="space-y-1.5 text-center">
            <CardTitle className="text-xl">Verify your email</CardTitle>
            <CardDescription>
              We sent a 6-digit code to {email}. Enter it below to finish
              creating your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify} className="space-y-5">
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
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Verify & continue"
                )}
              </Button>
              <div className="text-center text-sm">
                {resendIn > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    You can request a new code in {resendIn}s
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={resend}
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

      {step === "username" && (
        <Card className="w-full max-w-sm">
          <CardHeader className="space-y-1.5 text-center">
            <CardTitle className="text-xl">Almost there</CardTitle>
            <CardDescription>One more detail to finish setting up.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUsername} className="space-y-5">
              {globalError}
              <AuthField
                id="username"
                label="Username"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <Button className="w-full" disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </>
  );
}
