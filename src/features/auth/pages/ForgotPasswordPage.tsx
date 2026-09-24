import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { AuthFlowLayout } from "@/features/auth/components/AuthFlowLayout";
import {
  AuthFormField,
  authPrimaryButtonClass,
} from "@/features/auth/components/AuthFormField";
import { useForgotPasswordMutation } from "@/features/auth/hooks/useAuth";
import type { ForgotPasswordRequest } from "@/features/auth/types";
import { Button } from "@/shared/components/ui/button";
import { Form } from "@/shared/components/ui/form";

const emailSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Email format is invalid.")
    .max(255, "Email must not exceed 255 characters."),
});

export default function ForgotPasswordPage() {
  const mutation = useForgotPasswordMutation();
  const form = useForm<ForgotPasswordRequest>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  function submit(values: ForgotPasswordRequest) {
    if (mutation.isPending) return;
    mutation.mutate(values);
  }

  return (
    <AuthFlowLayout
      title="Forgot password"
      backTo="/login"
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
      <Form {...form}>
        <form
          noValidate
          onSubmit={form.handleSubmit(submit)}
          className="mt-6 space-y-4"
          aria-busy={mutation.isPending}
        >
          <AuthFormField
            control={form.control}
            name="email"
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="Enter your email address"
            disabled={mutation.isPending}
          />
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
            {mutation.isPending ? "Sending..." : "Send email"}
          </Button>
        </form>
      </Form>
    </AuthFlowLayout>
  );
}
