import { Search } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { DataTableRadioFilter } from "@/shared/components/ui/data-table-radio-filter";
import { routeStatusOptions } from "../constants";
import { transportPlanStatusOptions } from "../constants";
import { routePlanStatusSchema, transportPlanStatusSchema } from "../schemas";
import { DepartureDateRangeFilter } from "./DepartureDateRangeFilter";
import type { ApprovedBookingsQueryParams } from "../types";

interface Props {
  params: ApprovedBookingsQueryParams;
  onChange: (
    patch: Partial<Omit<ApprovedBookingsQueryParams, "pageIndex">>,
  ) => void;
}

export function ApprovedBookingFilters({ params, onChange }: Props) {
  return (
    <div
      role="group"
      aria-label="Approved booking filters"
      className="@container min-w-0 space-y-2 p-1"
    >
      <div className="grid min-w-0 grid-cols-2 items-start gap-2 @min-[40rem]:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
        <div className="relative col-span-2 min-w-0 @min-[40rem]:col-span-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-400"
          />
          <Input
            aria-label="Search approved bookings"
            value={params.search ?? ""}
            onChange={(event) => onChange({ search: event.target.value })}
            placeholder="Search booking code or customer..."
            className="h-8 rounded-[2px] border-slate-300 bg-white pl-8 font-sans text-xs font-normal shadow-none placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-primary/20 motion-reduce:transition-none"
          />
        </div>
        <div className="min-w-0 [&>button]:w-full">
          <DataTableRadioFilter
            title="Plan status"
            value={params.transportPlanStatus ?? "ALL"}
            options={transportPlanStatusOptions}
            onValueChange={(value) =>
              onChange({
                transportPlanStatus:
                  value === "ALL"
                    ? undefined
                    : transportPlanStatusSchema.parse(value),
              })
            }
          />
        </div>
        <div className="min-w-0 [&>button]:w-full">
          <DataTableRadioFilter
            title="Route status"
            value={params.routePlanStatus ?? "ALL"}
            options={routeStatusOptions}
            onValueChange={(value) =>
              onChange({
                routePlanStatus:
                  value === "ALL"
                    ? undefined
                    : routePlanStatusSchema.parse(value),
              })
            }
          />
        </div>
        <div className="col-span-2 min-w-0 @min-[40rem]:col-span-1">
          <DepartureDateRangeFilter
            from={params.departureFrom}
            to={params.departureTo}
            onChange={onChange}
          />
        </div>
      </div>
      <p className="text-[11px] text-slate-500">
        Departure:{" "}
        {params.sortBy === "requestedDepartureDate:asc"
          ? "Earliest first"
          : params.sortBy === "requestedDepartureDate:desc"
            ? "Latest first"
            : "Sorted by table column"}
      </p>
    </div>
  );
}
