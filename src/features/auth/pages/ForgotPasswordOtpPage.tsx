import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { getAuthApiError } from "../services";
import { ChevronRight } from "lucide-react";
import { OtpResend } from "../components/OtpResend";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { emailRouteStateSchema, forgotPasswordOtpSchema, type ForgotPasswordOtpFormValues } from "../schema";
import { AuthFlowLayout } from "@/features/auth/components/AuthFlowLayout";
import {
  AuthOtpFormField,
  authPrimaryButtonClass,
} from "@/features/auth/components/AuthFormField";
import { useResendOtpMutation } from "@/features/auth/hooks/useAuth";
import { Button } from "@/shared/components/ui/button";
import { Form } from "@/shared/components/ui/form";
import { useRequestAttemptGuard } from "@/shared/hooks/useRequestAttemptGuard";

export default function ForgotPasswordOtpPage() {
  const location = useLocation();
  const result = emailRouteStateSchema.safeParse(location.state);

  if (!result.success) return <Navigate to="/forgot-password" replace />;

  return (
    <PasswordResetOtpForm key={result.data.email} email={result.data.email} />
  );
}

function PasswordResetOtpForm({ email }: { email: string }) {
  const navigate = useNavigate();
  const resend = useResendOtpMutation();
  const [cooldownUntil, setCooldownUntil] = useState(() => Date.now() + 60_000);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const form = useForm<ForgotPasswordOtpFormValues>({
    resolver: zodResolver(forgotPasswordOtpSchema),
    defaultValues: { otp: "" },
  });
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
      const result = await resendAttempt.run(() => resend.mutateAsync({ email, purpose: "PASSWORD_RESET" }));
      if (result.started) {
        restartCooldown();
        form.reset({ otp: "" });
      }
    } catch (error) {
      restartCooldown(getAuthApiError(error)?.errorCode === "OTP_RESEND_TOO_SOON" ? 60 : 10);
    }
  }

  function submit({ otp }: ForgotPasswordOtpFormValues) {
    if (resend.isPending) return;
    navigate("/reset-password", { state: { email, otp } });
  }

  return (
    <AuthFlowLayout
      title="OTP verification"
      backTo="/forgot-password"
      footer={
        <p>
          Remember your password?{" "}
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
          onSubmit={form.handleSubmit(submit)}
          className="mt-7 space-y-7"
        >
          <AuthOtpFormField
            control={form.control}
            name="otp"
            disabled={resend.isPending}
          />
          <Button
            type="submit"
            disabled={resend.isPending}
            className={`${authPrimaryButtonClass} auth-otp-submit`}
          >
            Continue
            <ChevronRight aria-hidden="true" className="auth-otp-arrow" />
          </Button>
        </form>
      </Form>
      <OtpResend secondsLeft={secondsLeft} isPending={resend.isPending} disabled={resend.isPending || resendAttempt.isBlocked} onResend={() => void resendCode()} />
    </AuthFlowLayout>
  );
}
