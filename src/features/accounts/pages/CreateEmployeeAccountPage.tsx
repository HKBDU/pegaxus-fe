import { zodResolver } from "@hookform/resolvers/zod";
import { Circle, Info, Settings2, UserRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useFormRequestAttemptGuard } from "@/shared/hooks/useFormRequestAttemptGuard";

import { ROLE_ROUTES } from "@/app/route-config";
import { PageHeader } from "@/shared/components/PageHeader";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  employeeStatusBadgeClass,
  formatAccountLabel,
  getEmployeeStatusBadgeClass,
} from "../constants";
import { useCreateEmployee } from "../hooks/useAccounts";
import { createEmployeeSchema, employeeRoles } from "../schemas";
import { getAccountError, getAccountErrorCode } from "../services";
import type { CreateEmployee } from "../types";

const labelClass =
  "font-heading text-[11px] font-medium uppercase tracking-[0.04em] text-gray-800";
const inputClass =
  "h-8 rounded-[2px] border-slate-300 bg-white text-xs shadow-none focus-visible:border-primary focus-visible:ring-primary/20";

export default function CreateEmployeeAccountPage() {
  const navigate = useNavigate();
  const mutation = useCreateEmployee();
  const form = useForm<CreateEmployee>({
    resolver: zodResolver(createEmployeeSchema),
    mode: "onTouched",
    defaultValues: { fullName: "", email: "", phone: "", role: undefined },
  });
  const attempt = useFormRequestAttemptGuard(form);
  const isPending = mutation.isPending || attempt.isRunning || form.formState.isSubmitting;

  const submit = form.handleSubmit(async (values) => {
    try {
      const result = await attempt.run(() => mutation.mutateAsync(values));
      if (!result.started) return;
      toast.success("Employee account created successfully.");
      navigate(ROLE_ROUTES.managerUsers, { replace: true });
    } catch (error) {
      if (getAccountErrorCode(error) === "EMAIL_ALREADY_EXISTS") {
        form.setError(
          "email",
          {
            type: "server",
            message: "This email address is already registered.",
          },
          { shouldFocus: true },
        );
      } else {
        toast.error(getAccountError(error));
      }
    }
  });

  return (
    <div className="booking-page-shell min-h-[calc(100svh-3rem)] px-5 pt-5 pb-8 font-sans sm:px-6 lg:px-10">
      <div className="booking-page-enter mx-auto w-full max-w-[1152px]">
        <div className="mb-4">
          <PageHeader
            title="CREATE EMPLOYEE ACCOUNT"
            backHref={ROLE_ROUTES.managerUsers}
            backLabel="BACK TO EMPLOYEE ACCOUNTS"
          />
          <p className="text-xs text-gray-600 sm:text-sm">
            Create a new employee account for the PEGAXUS system.
          </p>
        </div>

        <Form {...form}>
          <form noValidate onSubmit={submit} className="space-y-3">
            <Card className="booking-panel gap-0 rounded-[2px] border bg-white py-0">
              <CardHeader className="gap-1 px-5 pt-5 pb-4">
                <CardTitle className="flex items-center gap-2 font-heading text-base font-semibold uppercase text-gray-900">
                  <UserRound aria-hidden="true" className="size-4" /> Employee
                  Information
                </CardTitle>
                <p className="text-xs text-gray-500">
                  Enter the basic details for the new employee account.
                </p>
              </CardHeader>
              <CardContent className="grid gap-x-5 gap-y-4 px-5 pb-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem className="gap-1">
                      <FormLabel className={labelClass}>
                        Full Name <span className="text-primary">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className={inputClass}
                          autoComplete="name"
                          placeholder="Enter full name"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="gap-1">
                      <FormLabel className={labelClass}>
                        Email <span className="text-primary">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          className={inputClass}
                          autoComplete="email"
                          placeholder="name@example.com"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="gap-1">
                      <FormLabel className={labelClass}>
                        Phone <span className="text-primary">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="tel"
                          className={inputClass}
                          autoComplete="tel"
                          placeholder="Enter phone number"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem className="gap-1">
                      <FormLabel className={labelClass}>
                        Role <span className="text-primary">*</span>
                      </FormLabel>
                      <Select
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employeeRoles.map((role) => (
                            <SelectItem key={role} value={role}>
                              {formatAccountLabel(role)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="booking-panel gap-0 rounded-[2px] border bg-white py-0">
              <CardHeader className="gap-1 px-5 pt-5 pb-3">
                <CardTitle className="flex items-center gap-2 font-heading text-base font-semibold uppercase text-gray-900">
                  <Settings2 aria-hidden="true" className="size-4" /> Account
                  Defaults
                </CardTitle>
                <p className="text-xs text-gray-500">
                  Review the default account settings.
                </p>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <p className="mb-4 flex items-center gap-2 border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
                  <Info aria-hidden="true" className="size-4 shrink-0" /> These
                  values are assigned automatically after account creation.
                </p>
                <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className={labelClass}>Employee Code</dt>
                    <dd className="mt-1 text-xs text-gray-700">
                      Generated automatically
                    </dd>
                  </div>
                  <div>
                    <dt className={labelClass}>Account Type</dt>
                    <dd className="mt-1">
                      <Badge
                        variant="secondary"
                        className="rounded-[2px] text-[10px]"
                      >
                        Employee
                      </Badge>
                    </dd>
                  </div>
                  {(["Account Status", "Working Status"] as const).map(
                    (label) => (
                      <div key={label}>
                        <dt className={labelClass}>{label}</dt>
                        <dd className="mt-1">
                          <Badge
                            variant="outline"
                            className={
                              employeeStatusBadgeClass +
                              " " +
                              getEmployeeStatusBadgeClass("ACTIVE")
                            }
                          >
                            <Circle
                              aria-hidden="true"
                              className="size-1! fill-current"
                            />
                            Active
                          </Badge>
                        </dd>
                      </div>
                    ),
                  )}
                </dl>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="rounded-[2px]"
              >
                <Link to={ROLE_ROUTES.managerUsers}>Cancel</Link>
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending || attempt.isBlocked}
                className="rounded-[2px]"
              >
                {isPending ? "Creating..." : attempt.isBlocked ? "Please wait..." : "Create Account"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
