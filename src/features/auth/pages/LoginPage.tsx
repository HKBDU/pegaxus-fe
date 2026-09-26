import { zodResolver } from "@hookform/resolvers/zod";
import { getAuthApiError } from "../services";
import { LoaderCircle } from "lucide-react";
import { env } from "@/lib/env";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { loginSchema, type LoginFormValues } from "../schema";
import { AuthFlowLayout } from "@/features/auth/components/AuthFlowLayout";
import {
  AuthFormField,
  AuthPasswordFormField,
  authPrimaryButtonClass,
} from "@/features/auth/components/AuthFormField";
import { useLoginMutation } from "@/features/auth/hooks/useAuth";
import { Button } from "@/shared/components/ui/button";
import { Form } from "@/shared/components/ui/form";

export default function LoginPage() {
  const mutation = useLoginMutation();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  function submit(values: LoginFormValues) {
    if (mutation.isPending) return;
    mutation.mutate(values, {
      onError: (error) => {
        const apiError = getAuthApiError(error);

        for (const item of apiError?.errors ?? []) {
          if (item.field === "email" || item.field === "password") {
            form.setError(item.field, { message: item.message });
          }
        }
      },
      onSettled: () => mutation.reset(),
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
            placeholder="•••••••••"
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
        <div className="my-5 flex items-center gap-3 text-xs uppercase text-neutral-400">
          <span className="h-px flex-1 bg-neutral-300" />
          <span>or</span>
          <span className="h-px flex-1 bg-neutral-300" />
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-9 w-full rounded-none border-neutral-300 bg-white font-['Arial_Narrow',Impact,sans-serif] text-base font-bold uppercase text-[#202020] shadow-none hover:bg-neutral-50"
          onClick={() => {
            window.location.href = `${env.API_URL}auth/google/login`;
          }}
        >
          <GoogleIcon />
          Continue with Google
        </Button>
      </Form>
    </AuthFlowLayout>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" role="img">
      <path fill="#4285F4" d="M21.35 12.23c0-.68-.06-1.34-.17-1.97H12v3.73h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.7 2.91-4.2 2.91-7.15Z" />
      <path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.37l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.75 9.75 0 0 0 12 21.75Z" />
      <path fill="#FBBC05" d="M6.54 13.82A5.86 5.86 0 0 1 6.23 12c0-.63.11-1.24.31-1.82V7.65H3.3A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.06 1.05 4.35l3.24-2.53Z" />
      <path fill="#EA4335" d="M12 6.15c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.84 3.25 14.63 2.25 12 2.25a9.75 9.75 0 0 0-8.7 5.4l3.24 2.53c.77-2.31 2.92-4.03 5.46-4.03Z" />
    </svg>
  );
}
