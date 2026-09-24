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
import { useLoginMutation } from "@/features/auth/hooks/useAuth";
import type { AuthApiError, LoginRequest } from "@/features/auth/types";
import { Button } from "@/shared/components/ui/button";
import { Form } from "@/shared/components/ui/form";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Email format is invalid.")
    .max(255, "Email must not exceed 255 characters."),
  password: z.string().min(1, "Password is required."),
});

export default function LoginPage() {
  const mutation = useLoginMutation();
  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  function submit(values: LoginRequest) {
    mutation.mutate(values, {
      onError: (error) => {
        const apiError = isAxiosError<AuthApiError>(error)
          ? error.response?.data
          : undefined;

        for (const item of apiError?.errors ?? []) {
          if (item.field === "email" || item.field === "password") {
            form.setError(item.field, { message: item.message });
          }
        }
      },
    });
  }

  return (
    <AuthFlowLayout
      title="Sign in"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <p className="text-neutral-600">
            Don&apos;t have an account?{" "}
            <Link
              to="/register"
              className="font-semibold text-[#d47d00] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F39200]"
            >
              Sign up
            </Link>
          </p>
          <Link
            to="/forgot-password"
            className="font-semibold text-[#d47d00] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F39200]"
          >
            Forgot password?
          </Link>
        </div>
      }
    >
      <Form {...form}>
        <form
          noValidate
          onSubmit={form.handleSubmit(submit)}
          className="mt-6 space-y-4"
        >
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
            autoComplete="current-password"
            visibilityLabel="password"
            placeholder="Enter your password"
          />
          <Button
            type="submit"
            disabled={mutation.isPending}
            className={authPrimaryButtonClass}
          >
            {mutation.isPending && (
              <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
            )}
            {mutation.isPending ? "Signing in" : "Sign in"}
          </Button>
        </form>
      </Form>
    </AuthFlowLayout>
  );
}
