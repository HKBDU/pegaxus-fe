import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { AuthFlowLayout } from "@/features/auth/components/AuthFlowLayout";
import {
  AuthFormField,
  AuthPasswordFormField,
  authPrimaryButtonClass,
} from "@/features/auth/components/AuthFormField";
import { useRegisterMutation } from "@/features/auth/hooks/useAuth";
import type { AuthApiError, RegisterRequest } from "@/features/auth/types";
import { Button } from "@/shared/components/ui/button";
import { Form } from "@/shared/components/ui/form";

const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, "Full name is required.")
      .max(150, "Full name must not exceed 150 characters."),

    email: z
      .string()
      .trim()
      .min(1, "Email is required.")
      .email("Email format is invalid.")
      .max(255, "Email must not exceed 255 characters."),

    password: z
      .string()
      .min(1, "Password is required.")
      .min(8, "Password must be at least 8 characters.")
      .max(128, "Password must not exceed 128 characters.")
      .regex(/[A-Z]/, "Password must contain at least 1 uppercase letter.")
      .regex(/[a-z]/, "Password must contain at least 1 lowercase letter.")
      .regex(/[0-9]/, "Password must contain at least 1 numeric character."),

    confirmPassword: z.string().min(1, "Confirm password is required."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

const fields = new Set<keyof RegisterRequest>([
  "fullName",
  "email",
  "password",
  "confirmPassword",
]);
export default function RegisterPage() {
  const mutation = useRegisterMutation();
  const form = useForm<RegisterRequest>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  function submit(values: RegisterRequest) {
    form.clearErrors("root");
    mutation.mutate(values, {
      onError: (error) => {
        const apiError = isAxiosError<AuthApiError>(error)
          ? error.response?.data
          : undefined;
        let hasFieldError = false;

        for (const item of apiError?.errors ?? []) {
          if (fields.has(item.field as keyof RegisterRequest)) {
            form.setError(item.field as keyof RegisterRequest, {
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
            placeholder="Enter your email address"
          />
          <AuthPasswordFormField
            control={form.control}
            name="password"
            label="Password"
            autoComplete="new-password"
            visibilityLabel="password"
            placeholder="Create a password"
          />
          <AuthPasswordFormField
            control={form.control}
            name="confirmPassword"
            label="Confirm password"
            autoComplete="new-password"
            visibilityLabel="confirm password"
            placeholder="Confirm your password"
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
