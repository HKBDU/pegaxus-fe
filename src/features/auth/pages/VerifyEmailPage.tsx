import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { getAuthApiError } from "../services";
import { ChevronRight, LoaderCircle } from "lucide-react";
import { OtpResend } from "../components/OtpResend";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation } from "react-router-dom";
import { emailRouteStateSchema, verifyEmailSchema, type VerifyEmailFormValues } from "../schema";
import { AuthFlowLayout } from "@/features/auth/components/AuthFlowLayout";
import {
  AuthOtpFormField,
  authPrimaryButtonClass,
} from "@/features/auth/components/AuthFormField";
import {
  useResendOtpMutation,
  useVerifyEmailMutation,
} from "@/features/auth/hooks/useAuth";
import { Button } from "@/shared/components/ui/button";
import { Form } from "@/shared/components/ui/form";
import { useFormRequestAttemptGuard } from "@/shared/hooks/useFormRequestAttemptGuard";
import { useRequestAttemptGuard } from "@/shared/hooks/useRequestAttemptGuard";

const verificationErrors: Record<string, string> = {
  OTP_INVALID: "The verification code is invalid.",
  OTP_EXPIRED: "The verification code has expired.",
  OTP_TOO_MANY_ATTEMPTS:
    "Too many invalid attempts. Please request a new code.",
  ACCOUNT_NOT_FOUND: "Account not found.",
};

export default function VerifyEmailPage() {
  const location = useLocation();
  const result = emailRouteStateSchema.safeParse(location.state);

  if (!result.success) return <Navigate to="/register" replace />;

  return <VerifyEmailForm key={result.data.email} email={result.data.email} />;
}

function VerifyEmailForm({ email }: { email: string }) {
  const verifyEmail = useVerifyEmailMutation();
  const resend = useResendOtpMutation();
  const [cooldownUntil, setCooldownUntil] = useState(() => Date.now() + 60_000);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const form = useForm<VerifyEmailFormValues>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { otp: "" },
  });
  const verifyAttempt = useFormRequestAttemptGuard(form);
  const resendAttempt = useRequestAttemptGuard();
  const { reset: resetResendAttempt } = resendAttempt;

  useEffect(() => {
    if (secondsLeft === 0) resetResendAttempt();
  }, [secondsLeft, resetResendAttempt]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((cooldownUntil - Date.now()) / 1000),
      );
      setSecondsLeft(remaining);
      if (remaining === 0) window.clearInterval(timer);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  function restartCooldown(seconds = 60) {
    setSecondsLeft(seconds);
    setCooldownUntil(Date.now() + seconds * 1000);
  }

  async function resendCode() {
    if (resend.isPending || secondsLeft > 0) return;
    try {
      const result = await resendAttempt.run(() => resend.mutateAsync({ email, purpose: "EMAIL_VERIFICATION" }));
      if (result.started) {
        restartCooldown();
        form.reset({ otp: "" });
      }
    } catch (error) {
      restartCooldown(getAuthApiError(error)?.errorCode === "OTP_RESEND_TOO_SOON" ? 60 : 10);
    }
  }

  async function submit({ otp }: VerifyEmailFormValues) {
    if (resend.isPending || verifyAttempt.isBlocked) return;
    form.clearErrors("root");

    try {
      await verifyAttempt.run(() => verifyEmail.mutateAsync({ email, otp }));
    } catch (error) {
      const apiError = getAuthApiError(error);
      const message = apiError?.errorCode
        ? verificationErrors[apiError.errorCode]
        : undefined;

      if (apiError?.errorCode?.startsWith("OTP_")) {
        form.setError("otp", {
          message: message ?? "Unable to verify your email. Please try again.",
        });
        return;
      }

      form.setError("root.server", {
        message:
          message ?? apiError?.message ?? "Unable to verify your email. Please try again.",
      });
    }
  }

  const isPending = verifyEmail.isPending || resend.isPending || verifyAttempt.isRunning || form.formState.isSubmitting;

  return (
    <AuthFlowLayout
      title="OTP verification"
      backTo="/register"
      footer={
        <p>
          Already verified?{" "}
          <Link
            to="/login"
            className="font-semibold text-[#d47d00] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F39200]"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <p className="mt-5 break-words font-['Arial_Narrow',Impact,sans-serif] text-base font-bold text-[#202020]">
        <span>We have sent a code to your email:</span>{" "}
        <span className="text-[#F39200]">{email}</span>
      </p>
      <Form {...form}>
        <form
          noValidate
          onSubmit={(event) => void form.handleSubmit(submit)(event)}
          className="mt-7 space-y-7"
          aria-busy={isPending}
        >
          <AuthOtpFormField
            control={form.control}
            name="otp"
            disabled={isPending}
          />
          {form.formState.errors.root?.server && (
            <p role="alert" className="text-sm text-red-700">
              {form.formState.errors.root.server.message}
            </p>
          )}
          <Button
            type="submit"
            disabled={isPending || verifyAttempt.isBlocked}
            className={`${authPrimaryButtonClass} auth-otp-submit`}
          >
            {verifyEmail.isPending && (
              <LoaderCircle
                aria-hidden="true"
                className="size-5 animate-spin"
              />
            )}
            {verifyEmail.isPending ? "Verifying..." : verifyAttempt.isBlocked ? "Edit code to retry" : "Verify code"}
            <ChevronRight aria-hidden="true" className="auth-otp-arrow" />
          </Button>
        </form>
      </Form>
      <OtpResend secondsLeft={secondsLeft} isPending={resend.isPending} disabled={isPending || resendAttempt.isBlocked} onResend={() => void resendCode()} />
    </AuthFlowLayout>
  );
}
