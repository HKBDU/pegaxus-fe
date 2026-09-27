import { zodResolver } from "@hookform/resolvers/zod";
import { getAuthApiError } from "../services";
import { LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";
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

  function submit(values: RegisterFormValues) {
    if (mutation.isPending) return;
    form.clearErrors("root");
    mutation.mutate(values, {
      onError: (error) => {
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
      },
      onSettled: () => mutation.reset(),
    });
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
          onSubmit={form.handleSubmit(submit)}
          className="mt-5 space-y-2"
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
          <AuthPasswordFormField
            control={form.control}
            name="confirmPassword"
            label="Confirm password"
            autoComplete="new-password"
            visibilityLabel="confirm password"
            placeholder="•••••••••"
          />

          {form.formState.errors.root?.server && (
            <p role="alert" className="text-sm text-red-700">
              {form.formState.errors.root.server.message}
            </p>
          )}

          <Button
            type="submit"
            disabled={mutation.isPending}
            className={authPrimaryButtonClass}
          >
            {mutation.isPending && (
              <LoaderCircle
                aria-hidden="true"
                className="size-5 animate-spin"
              />
            )}
            {mutation.isPending ? "Creating account" : "Sign up"}
          </Button>
        </form>
      </Form>
    </AuthFlowLayout>
  );
}
