import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation } from "react-router-dom";
import { z } from "zod";
import { AuthFlowLayout } from "@/features/auth/components/AuthFlowLayout";
import {
  AuthFormField,
  authPrimaryButtonClass,
} from "@/features/auth/components/AuthFormField";
import {
  useResendOtpMutation,
  useVerifyEmailMutation,
} from "@/features/auth/hooks/useAuth";
import type { AuthApiError } from "@/features/auth/types";
import { Button } from "@/shared/components/ui/button";
import { Form } from "@/shared/components/ui/form";

const routeStateSchema = z.object({ email: z.string().email().max(255) });
const verifyEmailSchema = z.object({
  otp: z
    .string()
    .min(1, "Verification code is required.")
    .regex(/^[0-9]{6}$/, "Verification code must contain exactly 6 digits."),
});

const verificationErrors: Record<string, string> = {
  OTP_INVALID: "The verification code is invalid.",
  OTP_EXPIRED: "The verification code has expired.",
  OTP_TOO_MANY_ATTEMPTS:
    "Too many invalid attempts. Please request a new code.",
  ACCOUNT_NOT_FOUND: "Account not found.",
};

export default function VerifyEmailPage() {
  const location = useLocation();
  const result = routeStateSchema.safeParse(location.state);

  if (!result.success) return <Navigate to="/register" replace />;

  return <VerifyEmailForm key={result.data.email} email={result.data.email} />;
}

function VerifyEmailForm({ email }: { email: string }) {
  const verifyEmail = useVerifyEmailMutation();
  const resend = useResendOtpMutation();
  const [cooldownUntil, setCooldownUntil] = useState(() => Date.now() + 60_000);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const form = useForm<z.infer<typeof verifyEmailSchema>>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { otp: "" },
  });

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

  function restartCooldown() {
    setSecondsLeft(60);
    setCooldownUntil(Date.now() + 60_000);
  }

  function resendCode() {
    if (resend.isPending || secondsLeft > 0) return;

    resend.mutate(
      { email, purpose: "EMAIL_VERIFICATION" },
      {
        onSuccess: () => {
          restartCooldown();
          form.reset({ otp: "" });
        },
        onError: (error) => {
          if (
            isAxiosError<AuthApiError>(error) &&
            error.response?.data.errorCode === "OTP_RESEND_TOO_SOON"
          ) {
            restartCooldown();
          }
        },
      },
    );
  }

  function submit({ otp }: z.infer<typeof verifyEmailSchema>) {
    if (verifyEmail.isPending || resend.isPending) return;
    form.clearErrors("root");

    verifyEmail.mutate(
      { email, otp },
      {
        onError: (error) => {
          const apiError = isAxiosError<AuthApiError>(error)
            ? error.response?.data
            : undefined;
          const message = apiError?.errorCode
            ? verificationErrors[apiError.errorCode]
            : undefined;

          if (apiError?.errorCode?.startsWith("OTP_")) {
            form.setError("otp", {
              message:
                message ?? "Unable to verify your email. Please try again.",
            });
            return;
          }

          form.setError("root.server", {
            message:
              message ?? "Unable to verify your email. Please try again.",
          });
        },
      },
    );
  }

  const isPending = verifyEmail.isPending || resend.isPending;

  return (
    <AuthFlowLayout
      title="OTP verification"
      backTo="/register"
      footerText="Already verified?"
    >
      <p className="!mt-9 break-words font-['Arial_Narrow',Impact,sans-serif] text-base font-bold text-[#202020]">
        <span className="uppercase">We have sent a code to your email:</span>{" "}
        <span className="text-[#F39200]">{email}</span>
      </p>
      <Form {...form}>
        <form
          noValidate
          onSubmit={form.handleSubmit(submit)}
          className="mt-8 space-y-6"
          aria-busy={isPending}
        >
          <AuthFormField
            control={form.control}
            name="otp"
            label="OTP verification"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="XXXXXX"
            disabled={isPending}
          />
          {form.formState.errors.root?.server && (
            <p role="alert" className="text-sm text-red-700">
              {form.formState.errors.root.server.message}
            </p>
          )}
          <Button
            type="submit"
            disabled={isPending}
            className={`${authPrimaryButtonClass} mt-3`}
          >
            {verifyEmail.isPending && (
              <LoaderCircle
                aria-hidden="true"
                className="size-5 animate-spin"
              />
            )}
            {verifyEmail.isPending ? "Verifying..." : "Verify account"}
          </Button>
        </form>
      </Form>
      <div className="mt-6 flex justify-center">
        <Button
          type="button"
          variant="link"
          onClick={resendCode}
          disabled={secondsLeft > 0 || isPending}
          className="font-['Arial_Narrow',Impact,sans-serif] text-lg font-bold text-[#202020] uppercase underline"
        >
          {resend.isPending && (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          )}
          {resend.isPending
            ? "Sending..."
            : secondsLeft > 0
              ? `Resend OTP in ${secondsLeft}s`
              : "Resend OTP"}
        </Button>
      </div>
    </AuthFlowLayout>
  );
}
