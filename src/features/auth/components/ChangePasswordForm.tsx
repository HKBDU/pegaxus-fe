import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { changePasswordSchema, type ChangePasswordFormValues } from "../schema";
import { getAuthApiError } from "../services";
import { useChangePasswordMutation } from "../hooks/useAuth";
import type { ChangePasswordRequest } from "../types";
import { Button } from "@/shared/components/ui/button";
import { Form } from "@/shared/components/ui/form";
import { AuthPasswordFormField, authPrimaryButtonClass } from "./AuthFormField";
import {
  PasswordMatchHint,
  PasswordRequirements,
} from "./PasswordRequirements";
import { useFormRequestAttemptGuard } from "@/shared/hooks/useFormRequestAttemptGuard";

const fields = new Map<string, keyof ChangePasswordRequest>([
  ["currentpassword", "currentPassword"],
  ["newpassword", "newPassword"],
  ["confirmpassword", "confirmPassword"],
]);

export function ChangePasswordForm({
  onSuccess,
  onCancel,
  onPendingChange,
}: {
  onSuccess: () => void;
  onCancel?: () => void;
  onPendingChange?: (pending: boolean) => void;
}) {
  const mutation = useChangePasswordMutation(onSuccess);
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  const attempt = useFormRequestAttemptGuard(form);
  const password = useWatch({ control: form.control, name: "newPassword" });
  const confirmation = useWatch({
    control: form.control,
    name: "confirmPassword",
  });
  const isPending =
    mutation.isPending || attempt.isRunning || form.formState.isSubmitting;

  useEffect(() => {
    onPendingChange?.(isPending);
  }, [isPending, onPendingChange]);

  async function submit(values: ChangePasswordRequest) {
    if (attempt.isBlocked) return;
    form.clearErrors("root");

    try {
      const result = await attempt.run(() => mutation.mutateAsync(values));
      if (result.started) form.reset();
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
          message:
            apiError?.message ??
            "Unable to change your password. Please try again.",
        });
      }
    } finally {
      mutation.reset();
    }
  }

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={(event) => void form.handleSubmit(submit)(event)}
        className="space-y-2.5 border-t border-neutral-300 pt-3"
        aria-busy={isPending}
      >
        <AuthPasswordFormField
          control={form.control}
          name="currentPassword"
          label="Current password *"
          autoComplete="current-password"
          visibilityLabel="current password"
          placeholder="Enter current password"
          disabled={isPending}
        />
        <AuthPasswordFormField
          control={form.control}
          name="newPassword"
          label="New password *"
          autoComplete="new-password"
          visibilityLabel="new password"
          placeholder="Enter new password"
          disabled={isPending}
        />

        <AuthPasswordFormField
          control={form.control}
          name="confirmPassword"
          label="Confirm new password *"
          autoComplete="new-password"
          visibilityLabel="confirm new password"
          placeholder="Confirm new password"
          disabled={isPending}
        />
        <PasswordRequirements value={password ?? ""} />
        <PasswordMatchHint
          password={password ?? ""}
          confirmation={confirmation ?? ""}
        />

        {form.formState.errors.root?.server && (
          <p role="alert" className="text-sm text-red-700">
            {form.formState.errors.root.server.message}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-neutral-300 pt-3 sm:flex-row sm:justify-end">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={onCancel}
              className="h-8 rounded-none border-neutral-300 px-3 font-['Arial_Narrow',Impact,sans-serif] text-sm font-bold uppercase"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={isPending || attempt.isBlocked}
            className={`${authPrimaryButtonClass} ${onCancel ? "h-8 text-sm sm:w-auto sm:px-3" : ""}`}
          >
            {isPending && (
              <LoaderCircle
                aria-hidden="true"
                className="size-5 animate-spin"
              />
            )}
            {isPending
              ? "Changing..."
              : attempt.isBlocked
                ? "Edit password to retry"
                : "Update password"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
