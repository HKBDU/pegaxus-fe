import { zodResolver } from "@hookform/resolvers/zod";
import { getAuthApiError } from "../services";
import { LoaderCircle } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { Link } from "react-router-dom";
import { registerSchema, type RegisterFormValues } from "../schema";
import { AuthFlowLayout } from "@/features/auth/components/AuthFlowLayout";
import {
  AuthFormField,
  AuthPasswordFormField,
  authPrimaryButtonClass,
} from "@/features/auth/components/AuthFormField";
import { useRegisterMutation } from "@/features/auth/hooks/useAuth";
import { Button } from "@/shared/components/ui/button";
import { Form } from "@/shared/components/ui/form";
import {
  PasswordMatchHint,
  PasswordRequirements,
} from "../components/PasswordRequirements";
import { useFormRequestAttemptGuard } from "@/shared/hooks/useFormRequestAttemptGuard";

const fields = new Set<keyof RegisterFormValues>([
  "fullName",
  "email",
  "password",
  "confirmPassword",
]);
export default function RegisterPage() {
  const mutation = useRegisterMutation();
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });
  const attempt = useFormRequestAttemptGuard(form);
  const isPending =
    mutation.isPending || attempt.isRunning || form.formState.isSubmitting;
  const password = useWatch({ control: form.control, name: "password" });
  const confirmation = useWatch({
    control: form.control,
    name: "confirmPassword",
  });

  async function submit(values: RegisterFormValues) {
    if (attempt.isBlocked) return;
    form.clearErrors("root");
    try {
      await attempt.run(() => mutation.mutateAsync(values));
    } catch (error) {
      const apiError = getAuthApiError(error);
      let hasFieldError = false;

      for (const item of apiError?.errors ?? []) {
        if (fields.has(item.field as keyof RegisterFormValues)) {
          form.setError(item.field as keyof RegisterFormValues, {
            message: item.message,
          });
          hasFieldError = true;
        }
      }

      if (apiError?.errorCode === "EMAIL_ALREADY_EXISTS") {
        form.setError("email", { message: apiError.message });
        hasFieldError = true;
      } else if (apiError?.errorCode === "PASSWORD_MISMATCH") {
        form.setError("confirmPassword", { message: apiError.message });
        hasFieldError = true;
      }

      if (!hasFieldError) {
        form.setError("root.server", {
          message: apiError?.message ?? "Can't sign up. Please try again.",
        });
      }
    } finally {
      mutation.reset();
    }
  }

  return (
    <AuthFlowLayout
      title="Sign up"
      backTo="/login"
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
          className="mt-5 space-y-2"
          aria-busy={isPending}
        >
          <AuthFormField
            control={form.control}
            name="fullName"
            label="Full name"
            autoComplete="name"
            placeholder="Quock Brown"
          />
          <AuthFormField
            control={form.control}
            name="email"
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="yourname@example.com"
          />
          <AuthPasswordFormField
            control={form.control}
            name="password"
            label="Password"
            autoComplete="new-password"
            visibilityLabel="password"
            placeholder="•••••••••"
          />
          <PasswordRequirements value={password ?? ""} />
          <AuthPasswordFormField
            control={form.control}
            name="confirmPassword"
            label="Confirm password"
            autoComplete="new-password"
            visibilityLabel="confirm password"
            placeholder="•••••••••"
          />
          <PasswordMatchHint
            password={password ?? ""}
            confirmation={confirmation ?? ""}
          />

          {form.formState.errors.root?.server && (
            <p role="alert" className="text-sm text-red-700">
              {form.formState.errors.root.server.message}
            </p>
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
            {isPending
              ? "Creating account"
              : attempt.isBlocked
                ? "Please wait..."
                : "Sign up"}
          </Button>
        </form>
      </Form>
    </AuthFlowLayout>
  );
}
