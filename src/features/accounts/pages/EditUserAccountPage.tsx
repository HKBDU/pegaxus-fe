import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useFormRequestAttemptGuard } from "@/shared/hooks/useFormRequestAttemptGuard";
import { BriefcaseBusiness, Info, ShieldCheck } from "lucide-react";
import { accountDetail } from "@/app/route-config";
import { PageHeader } from "@/shared/components/PageHeader";
import { LoadingState, ErrorState } from "@/shared/components/common";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useEmployee, useUpdateEmployment } from "../hooks/useAccounts";
import {
  employeeRoles,
  formatAccountLabel,
} from "../constants";
import { getAccountError } from "../services";
import type { EmployeeDetail } from "../types";
import { EmployeeSummaryCard } from "../components/EmployeeSummaryCard";
import { updateEmploymentSchema, type UpdateEmploymentValues } from "../schemas";

function EmploymentForm({ employee }: { employee: EmployeeDetail }) {
  const form = useForm<UpdateEmploymentValues>({
    resolver: zodResolver(updateEmploymentSchema),
    mode: "onTouched",
    defaultValues: {
      role: employeeRoles.find((role) => role === employee.role),
      workingStatus: employee.workingStatus,
      accountStatus: employee.accountStatus === "SUSPENDED" ? undefined : employee.accountStatus,
    },
  });
  const mutation = useUpdateEmployment();
  const attempt = useFormRequestAttemptGuard(form);
  const isPending = mutation.isPending || attempt.isRunning || form.formState.isSubmitting;
  const navigate = useNavigate();
  const submit = form.handleSubmit(async ({ accountStatus, ...changes }) => {
    try {
      const result = await attempt.run(() => mutation.mutateAsync({
        id: employee.employeeId,
        changes,
        accountStatus: accountStatus === employee.accountStatus ? undefined : accountStatus,
      }));
      if (!result.started) return;
      toast.success("Employee employment information updated successfully.");
      navigate(accountDetail(employee.employeeId));
    } catch (error) {
      toast.error(getAccountError(error));
    }
  });
  return (
    <Form {...form}>
    <form className="booking-stagger space-y-3" onSubmit={submit} noValidate>
      <EmployeeSummaryCard employee={employee} />
      <Card className="booking-panel gap-0 rounded-[2px] border bg-white py-0">
        <CardContent className="px-5 py-3.5">
          <h2 className="mb-3! flex items-center gap-2 font-heading text-base! font-bold! uppercase text-gray-900!">
            <BriefcaseBusiness aria-hidden="true" className="size-4" />
            Employment Settings
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem className="gap-1">
                  <FormLabel className="font-heading text-[11px] uppercase text-gray-800">Role *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={mutation.isPending}>
                    <FormControl>
                      <SelectTrigger className="w-full" onBlur={field.onBlur}><SelectValue placeholder="Select a role" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employeeRoles.map((value) => (
                        <SelectItem key={value} value={value}>{formatAccountLabel(value)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="workingStatus"
              render={({ field }) => (
                <FormItem className="gap-1">
                  <FormLabel className="font-heading text-[11px] uppercase text-gray-800">Working Status *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={mutation.isPending}>
                    <FormControl>
                      <SelectTrigger className="w-full" onBlur={field.onBlur}><SelectValue placeholder="Select a working status" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(["ACTIVE", "INACTIVE"] as const).map((value) => (
                        <SelectItem key={value} value={value}>{formatAccountLabel(value)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="accountStatus"
              render={({ field }) => (
                <FormItem className="gap-1">
                  <FormLabel className="font-heading text-[11px] uppercase text-gray-800">Account Status *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={mutation.isPending}>
                    <FormControl>
                      <SelectTrigger className="w-full" onBlur={field.onBlur}><SelectValue placeholder="Select an account status" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(["ACTIVE", "INACTIVE"] as const).map((value) => (
                        <SelectItem key={value} value={value}>{formatAccountLabel(value)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>
          <p className="mt-3! flex items-start gap-2 text-xs leading-5 text-sky-800">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>Only role, working status and account status can be updated here. Personal information is managed through the employee profile flow.</span>
          </p>
        </CardContent>
      </Card>
      <Card className="booking-panel gap-0 rounded-[2px] border bg-white py-0">
        <CardContent className="px-5 py-5">
          <h2 className="mb-4! flex items-center gap-2 font-heading text-base! font-bold! uppercase text-gray-900!">
            <ShieldCheck aria-hidden="true" className="size-4" />
            Account Information
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Employee Code", employee.employeeCode],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="font-heading text-[11px] uppercase text-gray-500">
                  {label}
                </dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
      <div className="flex justify-end gap-2 pt-2">
        <Button asChild variant="outline" size="sm" className="rounded-[2px]">
          <Link to={accountDetail(employee.employeeId)}>Cancel</Link>
        </Button>
        <Button
          type="submit"
          disabled={isPending || attempt.isBlocked}
          size="sm"
          className="rounded-[2px]"
        >
          {isPending ? "Saving..." : attempt.isBlocked ? "Please wait..." : "Save Changes"}
        </Button>
      </div>
    </form>
    </Form>
  );
}

export default function EditUserAccountPage() {
  const { employeeId = "" } = useParams();
  const query = useEmployee(employeeId);
  return (
    <div className="booking-page-shell min-h-[calc(100svh-3rem)] px-5 pt-5 pb-8 font-sans sm:px-6 lg:px-10">
      <div className="booking-page-enter mx-auto w-full max-w-[1152px]">
        <div className="mb-4">
          <PageHeader
            title="EDIT EMPLOYEE ACCOUNT"
            backHref={accountDetail(employeeId)}
            backLabel="BACK TO EMPLOYEE ACCOUNT"
          />
          <p className="text-xs text-gray-600 sm:text-sm">
            Update employment settings for this employee account.
          </p>
        </div>
        {query.isPending ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState
            message={getAccountError(query.error)}
            onRetry={() => void query.refetch()}
          />
        ) : query.data ? (
          <EmploymentForm key={employeeId} employee={query.data} />
        ) : null}
      </div>
    </div>
  );
}
