import { useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { getAuthApiError } from "../services";
import { LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { changePasswordSchema, type ChangePasswordFormValues } from "../schema";
import { AuthFlowLayout } from "@/features/auth/components/AuthFlowLayout";
import {
  AuthPasswordFormField,
  authPrimaryButtonClass,
} from "@/features/auth/components/AuthFormField";
import { useChangePasswordMutation } from "@/features/auth/hooks/useAuth";
import type {
  ChangePasswordRequest,
} from "@/features/auth/types";
import { Button } from "@/shared/components/ui/button";
import { Form } from "@/shared/components/ui/form";

const fields = new Map<string, keyof ChangePasswordRequest>([
  ["currentpassword", "currentPassword"],
  ["newpassword", "newPassword"],
  ["confirmpassword", "confirmPassword"],
]);

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  function returnToPreviousPage() {
    const historyIndex = window.history.state?.idx;
    if (typeof historyIndex === "number" && historyIndex > 0) {
      navigate(-1);
      return;
    }

    navigate("/", { replace: true });
  }

  const mutation = useChangePasswordMutation(returnToPreviousPage);
  const submitting = useRef(false);
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  const isPending = mutation.isPending || form.formState.isSubmitting;

  async function submit(values: ChangePasswordRequest) {
    if (submitting.current) return;
    submitting.current = true;
    form.clearErrors("root");

    try {
      await mutation.mutateAsync(values);
      form.reset();
    } catch (error) {
      const apiError = getAuthApiError(error);
      let hasFieldError = false;

      for (const item of apiError?.errors ?? []) {
        const field = fields.get(item.field.toLowerCase());
        if (field) {
          form.setError(field, { message: item.message });
          hasFieldError = true;
        }
      }

      if (apiError?.errorCode === "CURRENT_PASSWORD_INCORRECT") {
        form.setError("currentPassword", {
          message: "Current password is incorrect.",
        });
        hasFieldError = true;
      } else if (apiError?.errorCode === "PASSWORD_MISMATCH") {
        form.setError("confirmPassword", {
          message: "Passwords do not match.",
        });
        hasFieldError = true;
      }

      if (!hasFieldError) {
        form.setError("root.server", {
          message: apiError?.message ?? "Unable to change your password. Please try again.",
        });
      }
    } finally {
      mutation.reset();
      submitting.current = false;
    }
  }

  return (
    <AuthFlowLayout title="Change password" onBack={returnToPreviousPage}>
      <Form {...form}>
        <form
          noValidate
          onSubmit={(event) => void form.handleSubmit(submit)(event)}
          className="mt-5 space-y-3"
          aria-busy={isPending}
        >
          <AuthPasswordFormField
            control={form.control}
            name="currentPassword"
            label="Current password"
            autoComplete="current-password"
            visibilityLabel="current password"
            placeholder="Enter your current password"
            disabled={isPending}
          />
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
            label="Confirm new password"
            autoComplete="new-password"
            visibilityLabel="confirm new password"
            placeholder="Confirm your new password"
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
            className={authPrimaryButtonClass}
          >
            {isPending && (
              <LoaderCircle
                aria-hidden="true"
                className="size-5 animate-spin"
              />
            )}
            {isPending ? "Changing..." : "Confirm"}
          </Button>
        </form>
      </Form>
    </AuthFlowLayout>
  );
}
