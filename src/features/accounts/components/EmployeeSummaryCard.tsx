import { Circle, UserRound } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
  employeeStatusBadgeClass,
  formatAccountLabel,
  getEmployeeStatusBadgeClass,
} from "../constants";
import type { EmployeeDetail } from "../types";

export function EmployeeSummaryCard({
  employee,
}: {
  employee: EmployeeDetail;
}) {
  const initials = (employee.fullName ?? "?")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  return (
    <Card className="booking-panel gap-0 rounded-[2px] border bg-white py-0">
      <CardContent className="px-5 py-5">
        <h2 className="mb-4! flex items-center gap-2 font-heading text-base! font-bold! uppercase text-gray-900!">
          <UserRound aria-hidden="true" className="size-4" /> Employee Summary
        </h2>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <Avatar className="size-14 border border-slate-200">
            <AvatarImage
              src={employee.avatarUrl ?? undefined}
              alt={employee.fullName ?? "Employee avatar"}
            />
            <AvatarFallback className="bg-slate-100 font-semibold text-slate-700">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-40 flex-1">
            <p className="text-base font-semibold text-gray-900">
              {employee.fullName || "—"}
            </p>
            <p className="text-xs text-gray-500">{employee.email}</p>
            <p className="mt-1 text-xs text-gray-600">
              {employee.employeeCode}
            </p>
          </div>
          <Badge variant="secondary" className="rounded-[2px] text-[10px]">
            {formatAccountLabel(employee.role)}
          </Badge>
          <dl className="grid grid-cols-2 gap-4">
            {(
              [
                ["Account Status", employee.accountStatus],
                ["Working Status", employee.workingStatus],
              ] as const
            ).map(([label, status]) => (
              <div key={label}>
                <dt className="font-heading text-[11px] uppercase text-gray-500">
                  {label}
                </dt>
                <dd className="mt-1">
                  <Badge
                    variant="outline"
                    className={
                      employeeStatusBadgeClass +
                      " " +
                      getEmployeeStatusBadgeClass(status)
                    }
                  >
                    <Circle
                      aria-hidden="true"
                      className="size-1! fill-current"
                    />
                    {formatAccountLabel(status)}
                  </Badge>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}
