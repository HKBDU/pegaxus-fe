import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { forgotPasswordSchema, type ForgotPasswordFormValues } from "../schema";
import { AuthFlowLayout } from "@/features/auth/components/AuthFlowLayout";
import {
  AuthFormField,
  authPrimaryButtonClass,
} from "@/features/auth/components/AuthFormField";
import { useForgotPasswordMutation } from "@/features/auth/hooks/useAuth";
import { Button } from "@/shared/components/ui/button";
import { Form } from "@/shared/components/ui/form";
import { useFormRequestAttemptGuard } from "@/shared/hooks/useFormRequestAttemptGuard";

export default function ForgotPasswordPage() {
  const mutation = useForgotPasswordMutation();
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });
  const attempt = useFormRequestAttemptGuard(form);
  const isPending = mutation.isPending || attempt.isRunning || form.formState.isSubmitting;

  async function submit(values: ForgotPasswordFormValues) {
    if (attempt.isBlocked) return;
    try {
      await attempt.run(() => mutation.mutateAsync(values));
    } catch {
      // The mutation presents a generic error without revealing account existence.
    }
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
          onSubmit={(event) => void form.handleSubmit(submit)(event)}
          className="mt-6 space-y-4"
          aria-busy={isPending}
        >
          <AuthFormField
            control={form.control}
            name="email"
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="Enter your email address"
            disabled={isPending}
          />
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
            {isPending ? "Sending..." : attempt.isBlocked ? "Edit email to retry" : "Send email"}
          </Button>
        </form>
      </Form>
    </AuthFlowLayout>
  );
}
