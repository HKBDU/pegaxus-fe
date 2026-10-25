import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  BriefcaseBusiness,
  Clock3,
  Pencil,
  Trash2,
  UserRound,
} from "lucide-react";
import { ROLE_ROUTES, accountEdit } from "@/app/route-config";
import { formatBookingDate } from "@/features/booking/utils";
import { PageHeader } from "@/shared/components/PageHeader";
import { LoadingState, ErrorState } from "@/shared/components/common";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { useEmployee } from "../hooks/useAccounts";
import { getAccountError } from "../services";
import { formatAccountLabel } from "../constants";
import { DeleteAccountDialog } from "../components/DeleteAccountDialog";
import { EmployeeSummaryCard } from "../components/EmployeeSummaryCard";

export default function ViewUserAccountPage() {
  const { employeeId = "" } = useParams();
  const query = useEmployee(employeeId);
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const employee = query.data;
  const date = (value: string | null, time = true) =>
    value ? formatBookingDate(value, time) : "—";
  const sections = employee
    ? [
        {
          title: "Personal Information",
          Icon: UserRound,
          fields: [
            ["Full Name", employee.fullName],
            ["Email", employee.email],
            ["Phone", employee.phone],
            ["Date of Birth", date(employee.dateOfBirth, false)],
          ],
        },
        {
          title: "Employment Information",
          Icon: BriefcaseBusiness,
          fields: [
            ["Employee Code", employee.employeeCode],
            ["Role", formatAccountLabel(employee.role)],
          ],
        },
        {
          title: "Account Activity (UTC)",
          Icon: Clock3,
          fields: [
            ["Last Login", date(employee.lastLoginAt)],
            ["Created", date(employee.createdAt)],
            ["Last Updated", date(employee.updatedAt)],
          ],
        },
      ]
    : [];
  return (
    <div className="booking-page-shell min-h-[calc(100svh-5rem)] px-5 pt-5 pb-8 font-sans sm:px-6 lg:px-10">
      <div className="booking-page-enter mx-auto w-full max-w-[1152px]">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <PageHeader
              title="VIEW EMPLOYEE ACCOUNT"
              backHref={ROLE_ROUTES.managerUsers}
              backLabel="BACK TO EMPLOYEE ACCOUNTS"
            />
            <p className="text-xs text-gray-600 sm:text-sm">
              View detailed information for this employee account.
            </p>
          </div>
          {employee ? (
            <div className="flex flex-wrap gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="rounded-[2px] bg-white"
              >
                <Link to={accountEdit(employee.employeeId)}>
                  <Pencil className="size-3.5" />
                  Edit
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-[2px] border-red-300 bg-white text-red-700 hover:bg-red-50"
                onClick={() => setDeleting(true)}
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            </div>
          ) : null}
        </div>
        {query.isPending ? (
          <LoadingState />
        ) : query.isError ? (
          <div className="space-y-4">
            <ErrorState
              message={getAccountError(query.error)}
              onRetry={() => void query.refetch()}
            />
            <div className="flex justify-center">
              <Button asChild variant="outline" className="rounded-[2px]">
                <Link to={ROLE_ROUTES.managerUsers}>
                  Back to Employee Accounts
                </Link>
              </Button>
            </div>
          </div>
        ) : employee ? (
          <div className="booking-stagger space-y-3">
            <EmployeeSummaryCard employee={employee} />
            {sections.map(({ title, Icon, fields }) => (
              <Card
                key={title}
                className="booking-panel gap-0 rounded-[2px] border bg-white py-0"
              >
                <CardContent className="px-5 py-5">
                  <h2 className="mb-4! flex items-center gap-2 font-heading text-base! font-bold! uppercase text-gray-900!">
                    <Icon aria-hidden="true" className="size-4" />
                    {title}
                  </h2>
                  <dl className="grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                    {fields.map(([label, value]) => (
                      <div
                        key={label}
                        className="min-w-0 border-t border-slate-100 pt-2"
                      >
                        <dt className="font-heading text-[11px] uppercase tracking-[0.04em] text-gray-500">
                          {label}
                        </dt>
                        <dd className="mt-1 break-words text-sm font-medium text-gray-900">
                          {value || "—"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}
      </div>
      <DeleteAccountDialog
        account={deleting && employee ? employee : null}
        onClose={() => setDeleting(false)}
        onDeleted={() => navigate(ROLE_ROUTES.managerUsers, { replace: true })}
      />
    </div>
  );
}
