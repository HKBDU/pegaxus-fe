import { useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation } from "react-router-dom";
import { z } from "zod";
import { AuthFlowLayout } from "@/features/auth/components/AuthFlowLayout";
import {
  AuthPasswordFormField,
  authPrimaryButtonClass,
} from "@/features/auth/components/AuthFormField";
import { useResetPasswordMutation } from "@/features/auth/hooks/useAuth";
import type { AuthApiError } from "@/features/auth/types";
import { Button } from "@/shared/components/ui/button";
import { Form } from "@/shared/components/ui/form";

const routeStateSchema = z.object({
  email: z.string().email().max(255),
  otp: z.string().regex(/^[0-9]{6}$/),
});
const passwordSchema = z
  .object({
    newPassword: z
      .string()
      .min(1, "New password is required.")
      .min(8, "Password must be at least 8 characters.")
      .max(128, "Password must not exceed 128 characters.")
      .regex(/[A-Z]/, "Password must contain at least 1 uppercase letter.")
      .regex(/[a-z]/, "Password must contain at least 1 lowercase letter.")
      .regex(/[0-9]/, "Password must contain at least 1 numeric character."),
    confirmPassword: z.string().min(1, "Confirm password is required."),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

const otpErrors: Record<string, string> = {
  OTP_INVALID: "The verification code is invalid.",
  OTP_EXPIRED: "The verification code has expired.",
  OTP_TOO_MANY_ATTEMPTS:
    "Too many invalid attempts. Please request a new code.",
};

export default function ResetPasswordPage() {
  const location = useLocation();
  const result = routeStateSchema.safeParse(location.state);

  if (!result.success) return <Navigate to="/forgot-password" replace />;

  return (
    <ResetPasswordForm
      key={`${location.key}:${result.data.email}`}
      {...result.data}
    />
  );
}

function ResetPasswordForm({ email, otp }: z.infer<typeof routeStateSchema>) {
  const mutation = useResetPasswordMutation();
  const submitting = useRef(false);
  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });
  const isPending = mutation.isPending || form.formState.isSubmitting;

  async function submit(values: z.infer<typeof passwordSchema>) {
    if (submitting.current) return;
    submitting.current = true;
    form.clearErrors("root");

    try {
      await mutation.mutateAsync({ email, otp, ...values });
      form.reset();
    } catch (error) {
      const apiError = isAxiosError<AuthApiError>(error)
        ? error.response?.data
        : undefined;
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
          message: "Unable to reset your password. Please try again.",
        });
      }
    } finally {
      // Release the mutation payload containing passwords after each attempt.
      mutation.reset();
      submitting.current = false;
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
          <AuthPasswordFormField
            control={form.control}
            name="confirmPassword"
            label="Confirm password"
            autoComplete="new-password"
            visibilityLabel="confirm password"
            placeholder="Re-enter your new password"
            disabled={isPending}
          />
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
            disabled={isPending}
            className={authPrimaryButtonClass}
          >
            {isPending && (
              <LoaderCircle
                aria-hidden="true"
                className="size-5 animate-spin"
              />
            )}
            {isPending ? "Resetting..." : "Reset password"}
          </Button>
        </form>
      </Form>
    </AuthFlowLayout>
  );
}
