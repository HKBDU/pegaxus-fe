import { Circle, Plus, Search } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { ROLE_ROUTES } from "@/app/route-config";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { DataTableRadioFilter } from "@/shared/components/ui/data-table-radio-filter";
import {
  employeeRoles,
  employeeStatusBadgeClass,
  formatAccountLabel,
  getEmployeeStatusBadgeClass,
} from "../constants";
import type { EmployeeListParams } from "../types";

interface UserAccountFiltersProps {
  filters: EmployeeListParams;
  onChange: (filters: EmployeeListParams) => void;
  viewOptions: ReactNode;
}

export function UserAccountFilters({
  filters,
  onChange,
  viewOptions,
}: UserAccountFiltersProps) {
  const controls = [
    {
      key: "role",
      title: "Role",
      options: [
        { value: "ALL", label: "All Roles" },
        ...employeeRoles.map((value) => ({
          value,
          label: formatAccountLabel(value),
        })),
      ],
    },
    {
      key: "accountStatus",
      title: "Account Status",
      options: [
        { value: "ALL", label: "All" },
        ...["ACTIVE", "INACTIVE"].map((value) => ({
          value,
          label: formatAccountLabel(value),
        })),
      ],
    },
    {
      key: "workingStatus",
      title: "Working Status",
      options: [
        { value: "ALL", label: "All" },
        ...["ACTIVE", "INACTIVE"].map((value) => ({
          value,
          label: formatAccountLabel(value),
        })),
      ],
    },
  ] as const;

  return (
    <div
      role="toolbar"
      aria-label="User account filters"
      className="flex min-w-0 flex-wrap items-center gap-2 lg:flex-nowrap lg:overflow-x-auto"
    >
      <div className="relative w-full min-w-0 lg:min-w-48 lg:flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
        <Input
          value={filters.search}
          onChange={(event) =>
            onChange({ ...filters, search: event.target.value, pageIndex: 1 })
          }
          aria-label="Search user accounts by name, email or employee ID"
          placeholder="Search name, email, phone or employee code..."
          spellCheck={false}
          className="h-8 rounded-[2px] border-slate-300 bg-white pl-8 font-sans text-xs font-normal shadow-none placeholder:font-sans placeholder:text-xs placeholder:font-normal placeholder:text-slate-400 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
        />
      </div>
      {controls.map(({ key, title, options }) => (
        <div
          key={key}
          className="min-w-0 flex-1 lg:min-w-40 lg:flex-none [&_button]:w-full"
        >
          <DataTableRadioFilter
            title={title}
            value={filters[key]}
            options={[...options]}
            onValueChange={(value) =>
              onChange({ ...filters, [key]: value, pageIndex: 1 })
            }
            renderOption={
              key === "role"
                ? undefined
                : (option) =>
                    option.value === "ALL" ? (
                      <span>{option.label}</span>
                    ) : (
                      <Badge
                        variant="outline"
                        className={
                          employeeStatusBadgeClass +
                          " " +
                          getEmployeeStatusBadgeClass(option.value)
                        }
                      >
                        <Circle
                          aria-hidden="true"
                          className="size-1! fill-current"
                        />
                        {option.label}
                      </Badge>
                    )
            }
          />
        </div>
      ))}
      <div className="flex shrink-0 items-center justify-end gap-2 max-lg:ml-auto">
        {viewOptions}
        <Button
          asChild
          size="sm"
          className="hidden h-8 rounded-[2px] font-heading text-[11px] uppercase xl:inline-flex"
        >
          <Link to={ROLE_ROUTES.managerCreateUser}>
            <Plus className="size-3.5" /> Create Account
          </Link>
        </Button>
      </div>
    </div>
  );
}
