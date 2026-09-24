import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import heroPanel from "@/assets/hero-panel.png";
import { PasswordField } from "@/features/auth/components/PasswordField";
import { useLoginMutation } from "@/features/auth/hooks/useAuth";
import type { AuthApiError, LoginRequest } from "@/features/auth/types";
import { Button } from "@/shared/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Email format is invalid.")
    .max(255, "Email must not exceed 255 characters."),
  password: z.string().min(1, "Password is required."),
});

const inputClass =
  "h-14 rounded-none border-neutral-300 bg-white px-4 text-base text-neutral-900 shadow-none placeholder:text-neutral-400 focus-visible:border-[#F39200] focus-visible:ring-[#F39200]/20";
const labelClass =
  "font-['Arial_Narrow',Impact,sans-serif] text-xl font-bold uppercase !text-[#202020]";

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
    <main className="grid min-h-svh bg-[#f4f2ed] lg:grid-cols-[45%_55%]">
      <aside
        className="relative hidden min-h-svh overflow-hidden bg-[#171819] lg:block"
        aria-label="PEGAXUS Logistics"
      >
        <img
          src={heroPanel}
          alt=""
          className="size-full object-cover object-center"
        />
      </aside>

      <section className="flex min-h-svh flex-col px-6 py-8 sm:px-10 lg:px-[clamp(3rem,6vw,8rem)]">
        <div className="mx-auto flex w-full max-w-[700px] flex-1 flex-col justify-center py-8">
          <p className="mb-8 font-['Arial_Narrow',Impact,sans-serif] text-3xl font-bold text-[#202020] lg:hidden">
            PEGAXUS
          </p>
          <h1 className="m-0 font-['Oswald',sans-serif] text-5xl leading-none font-black !text-[#202020] uppercase sm:text-6xl">
            SIGN IN
          </h1>

          <Form {...form}>
            <form
              noValidate
              onSubmit={form.handleSubmit(submit)}
              className="mt-10 space-y-5"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelClass}>Email address</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        autoComplete="email"
                        placeholder="Enter your email address"
                        className={inputClass}
                      />
                    </FormControl>
                    <FormMessage className="text-sm text-red-700" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelClass}>Password</FormLabel>
                    <FormControl>
                      <PasswordField
                        {...field}
                        autoComplete="current-password"
                        visibilityLabel="password"
                        placeholder="Enter your password"
                        className={inputClass}
                      />
                    </FormControl>
                    <FormMessage className="text-sm text-red-700" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={mutation.isPending}
                className="mt-4 h-15 w-full rounded-none bg-[#F39200] font-['Arial_Narrow',Impact,sans-serif] text-2xl font-bold text-[#202020] uppercase shadow-none hover:bg-[#df8500]"
              >
                {mutation.isPending && (
                  <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
                )}
                {mutation.isPending ? "Signing in" : "Sign in"}
              </Button>
            </form>
          </Form>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 text-base">
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
        </div>
      </section>
    </main>
  );
}
