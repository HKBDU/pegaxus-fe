import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import heroPanel from "@/assets/hero-panel.png";
import { PasswordField } from "@/features/auth/components/PasswordField";
import { useRegisterMutation } from "@/features/auth/hooks/useAuth";
import type { AuthApiError, RegisterRequest } from "@/features/auth/types";
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
const inputClass =
  "h-14 rounded-none border-neutral-300 bg-white px-4 text-base text-neutral-900 shadow-none placeholder:text-neutral-400 focus-visible:border-[#F39200] focus-visible:ring-[#F39200]/20";
const labelClass =
  "font-['Arial_Narrow',Impact,sans-serif] text-xl font-bold uppercase text-[#202020]";

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
            message:
              apiError?.message ?? "Can't sign up. Please try again.",
          });
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
          <Link
            to="/login"
            className="mb-8 inline-flex w-fit items-center gap-3 font-['Arial_Narrow',Impact,sans-serif] text-2xl font-bold text-[#202020] hover:text-[#F39200] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F39200]"
          >
            <ArrowLeft aria-hidden="true" className="size-7" /> Back
          </Link>
          <h1 className="m-0 font-['Oswald',sans-serif] text-5xl leading-none font-black !text-[#202020] uppercase sm:text-6xl">
            SIGN UP
          </h1>

          <Form {...form}>
            <form
              noValidate
              onSubmit={form.handleSubmit(submit)}
              className="mt-9 space-y-5"
            >
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelClass}>Full name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        autoComplete="name"
                        placeholder="Enter your full name"
                        className={inputClass}
                      />
                    </FormControl>
                    <FormMessage className="text-sm text-red-700" />
                  </FormItem>
                )}
              />
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
                        autoComplete="new-password"
                        visibilityLabel="password"
                        placeholder="Create a password"
                        className={inputClass}
                      />
                    </FormControl>
                    <FormMessage className="text-sm text-red-700" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelClass}>
                      Confirm password
                    </FormLabel>
                    <FormControl>
                      <PasswordField
                        {...field}
                        autoComplete="new-password"
                        visibilityLabel="confirm password"
                        placeholder="Confirm your password"
                        className={inputClass}
                      />
                    </FormControl>
                    <FormMessage className="text-sm text-red-700" />
                  </FormItem>
                )}
              />

              {form.formState.errors.root?.server && (
                <p role="alert" className="text-sm text-red-700">
                  {form.formState.errors.root.server.message}
                </p>
              )}

              <Button
                type="submit"
                disabled={mutation.isPending}
                className="mt-3 h-15 w-full rounded-none bg-[#F39200] font-['Arial_Narrow',Impact,sans-serif] text-2xl font-bold text-[#202020] uppercase shadow-none hover:bg-[#df8500]"
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

          <p className="mt-8 text-base text-neutral-600">
            Already registered with PEGAXUS?{" "}
            <Link
              to="/login"
              className="font-semibold text-[#d47d00] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F39200]"
            >
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
