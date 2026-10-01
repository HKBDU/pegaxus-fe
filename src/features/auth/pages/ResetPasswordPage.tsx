import { zodResolver } from "@hookform/resolvers/zod";
import { getAuthApiError } from "../services";
import { LoaderCircle } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { Link, Navigate, useLocation } from "react-router-dom";
import { resetPasswordSchema, resetPasswordRouteStateSchema, type ResetPasswordFormValues, type ResetPasswordRouteState } from "../schema";
import { AuthFlowLayout } from "@/features/auth/components/AuthFlowLayout";
import {
  AuthPasswordFormField,
  authPrimaryButtonClass,
} from "@/features/auth/components/AuthFormField";
import { useResetPasswordMutation } from "@/features/auth/hooks/useAuth";
import { Button } from "@/shared/components/ui/button";
import { Form } from "@/shared/components/ui/form";
import { PasswordMatchHint, PasswordRequirements } from "../components/PasswordRequirements";
import { useFormRequestAttemptGuard } from "@/shared/hooks/useFormRequestAttemptGuard";

const otpErrors: Record<string, string> = {
  OTP_INVALID: "The verification code is invalid.",
  OTP_EXPIRED: "The verification code has expired.",
  OTP_TOO_MANY_ATTEMPTS:
    "Too many invalid attempts. Please request a new code.",
};

export default function ResetPasswordPage() {
  const location = useLocation();
  const result = resetPasswordRouteStateSchema.safeParse(location.state);

  if (!result.success) return <Navigate to="/forgot-password" replace />;

  return (
    <ResetPasswordForm
      key={`${location.key}:${result.data.email}`}
      {...result.data}
    />
  );
}

function ResetPasswordForm({ email, otp }: ResetPasswordRouteState) {
  const mutation = useResetPasswordMutation();
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });
  const attempt = useFormRequestAttemptGuard(form);
  const password = useWatch({ control: form.control, name: "newPassword" });
  const confirmation = useWatch({ control: form.control, name: "confirmPassword" });
  const isPending = mutation.isPending || attempt.isRunning || form.formState.isSubmitting;

  async function submit(values: ResetPasswordFormValues) {
    if (attempt.isBlocked) return;
    form.clearErrors("root");

    try {
      const result = await attempt.run(() => mutation.mutateAsync({ email, otp, ...values }));
      if (result.started) form.reset();
    } catch (error) {
      const apiError = getAuthApiError(error);
      let hasFieldError = false;
      let hasFlowError = false;

      for (const item of apiError?.errors ?? []) {
        const field = item.field.toLowerCase();
        if (field === "newpassword" || field === "confirmpassword") {
          form.setError(
            field === "newpassword" ? "newPassword" : "confirmPassword",
            {
              message: item.message,
            },
          );
          hasFieldError = true;
        } else if (field === "email" || field === "otp") {
          hasFlowError = true;
        }
      }

      if (apiError?.errorCode === "PASSWORD_MISMATCH") {
        form.setError("confirmPassword", {
          message: "Passwords do not match.",
        });
        hasFieldError = true;
      }

      const otpMessage =
        apiError?.errorCode && Object.hasOwn(otpErrors, apiError.errorCode)
          ? otpErrors[apiError.errorCode]
          : undefined;

      if (otpMessage || hasFlowError) {
        form.setError("root.server", {
          message:
            otpMessage ??
            "Unable to use this verification code. Please request a new code.",
        });
      } else if (!hasFieldError) {
        form.setError("root.server", {
          message: apiError?.message ?? "Unable to reset your password. Please try again.",
        });
      }
    } finally {
      // Release the mutation payload containing passwords after each attempt.
      mutation.reset();
    }
  }

  return (
    <AuthFlowLayout
      title="Create new password"
      backTo="/forgot-password"
      footer={
        <p>
          Already registered with PEGAXUS?{" "}
          <Link
            to="/login"
            className="font-semibold text-[#d47d00] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F39200]"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <Form {...form}>
        <form
          noValidate
          onSubmit={(event) => void form.handleSubmit(submit)(event)}
          className="mt-6 space-y-4"
          aria-busy={isPending}
        >
          <AuthPasswordFormField
            control={form.control}
            name="newPassword"
            label="New password"
            autoComplete="new-password"
            visibilityLabel="new password"
            placeholder="Enter your new password"
            disabled={isPending}
          />
          <PasswordRequirements value={password ?? ""} />
          <AuthPasswordFormField
            control={form.control}
            name="confirmPassword"
            label="Confirm password"
            autoComplete="new-password"
            visibilityLabel="confirm password"
            placeholder="Re-enter your new password"
            disabled={isPending}
          />
          <PasswordMatchHint password={password ?? ""} confirmation={confirmation ?? ""} />
          {form.formState.errors.root?.server && (
            <div role="alert" className="space-y-2 text-sm text-red-700">
              <p>{form.formState.errors.root.server.message}</p>
              <Link
                to="/forgot-password"
                className="inline-block font-semibold text-[#a35f00] uppercase underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F39200]"
              >
                Request a new code
              </Link>
            </div>
          )}
          <Button
            type="submit"
            disabled={isPending || attempt.isBlocked}
            className={authPrimaryButtonClass}
          >
            {isPending && (
              <LoaderCircle
                aria-hidden="true"
                className="size-5 animate-spin"
              />
            )}
            {isPending ? "Resetting..." : attempt.isBlocked ? "Please wait..." : "Reset password"}
          </Button>
        </form>
      </Form>
    </AuthFlowLayout>
  );
}
