import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { BriefcaseBusiness, Circle, Info, ShieldCheck } from "lucide-react";
import { accountDetail } from "@/app/route-config";
import { PageHeader } from "@/shared/components/PageHeader";
import { LoadingState, ErrorState } from "@/shared/components/common";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
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
  employeeStatusBadgeClass,
  formatAccountLabel,
  getEmployeeStatusBadgeClass,
} from "../constants";
import { getAccountError } from "../services";
import type { EmployeeDetail } from "../types";
import { EmployeeSummaryCard } from "../components/EmployeeSummaryCard";

function EmploymentForm({ employee }: { employee: EmployeeDetail }) {
  const [role, setRole] = useState(employee.role);
  const [workingStatus, setWorkingStatus] = useState(employee.workingStatus);
  const mutation = useUpdateEmployment();
  const navigate = useNavigate();
  return (
    <form
      className="booking-stagger space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        if (mutation.isPending) return;
        try {
          await mutation.mutateAsync({
            id: employee.employeeId,
            changes: { role, workingStatus },
          });
          toast.success(
            "Employee employment information updated successfully.",
          );
          navigate(accountDetail(employee.employeeId));
        } catch (error) {
          toast.error(getAccountError(error));
        }
      }}
    >
      <EmployeeSummaryCard employee={employee} />
      <Card className="booking-panel gap-0 rounded-[2px] border bg-white py-0">
        <CardContent className="px-5 py-5">
          <h2 className="mb-4! flex items-center gap-2 font-heading text-base! font-bold! uppercase text-gray-900!">
            <BriefcaseBusiness aria-hidden="true" className="size-4" />
            Employment Settings
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1">
              <label
                htmlFor="employee-role"
                className="font-heading text-[11px] uppercase text-gray-800"
              >
                Role *
              </label>
              <Select
                value={role}
                onValueChange={setRole}
                disabled={mutation.isPending}
              >
                <SelectTrigger id="employee-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {employeeRoles.map((value) => (
                    <SelectItem key={value} value={value}>
                      {formatAccountLabel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <label
                htmlFor="employee-working-status"
                className="font-heading text-[11px] uppercase text-gray-800"
              >
                Working Status *
              </label>
              <Select
                value={workingStatus}
                onValueChange={(value) =>
                  setWorkingStatus(value as "ACTIVE" | "INACTIVE")
                }
                disabled={mutation.isPending}
              >
                <SelectTrigger id="employee-working-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["ACTIVE", "INACTIVE"] as const).map((value) => (
                    <SelectItem key={value} value={value}>
                      {formatAccountLabel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="mt-4 flex items-start gap-2 border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
            <Info aria-hidden="true" className="size-4 shrink-0" /> Only role
            and working status can be updated here. Personal information is
            managed through the employee profile flow.
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
              ["Employee ID", String(employee.employeeId)],
              ["Account ID", String(employee.accountId)],
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
            <div>
              <dt className="font-heading text-[11px] uppercase text-gray-500">
                Account Status
              </dt>
              <dd className="mt-1">
                <Badge
                  variant="outline"
                  className={
                    employeeStatusBadgeClass +
                    " " +
                    getEmployeeStatusBadgeClass(employee.accountStatus)
                  }
                >
                  <Circle aria-hidden="true" className="size-1! fill-current" />
                  {formatAccountLabel(employee.accountStatus)}
                </Badge>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
      <div className="flex justify-end gap-2 pt-2">
        <Button asChild variant="outline" size="sm" className="rounded-[2px]">
          <Link to={accountDetail(employee.employeeId)}>Cancel</Link>
        </Button>
        <Button
          type="submit"
          disabled={mutation.isPending}
          size="sm"
          className="rounded-[2px]"
        >
          {mutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

export default function EditUserAccountPage() {
  const { employeeId = "" } = useParams();
  const query = useEmployee(employeeId);
  return (
    <div className="booking-page-shell min-h-[calc(100svh-3rem)] px-5 pt-5 pb-8 font-sans sm:px-6 lg:px-10">
      <div className="booking-page-enter mx-auto w-full max-w-[1200px]">
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
