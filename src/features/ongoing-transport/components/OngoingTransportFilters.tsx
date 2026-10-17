import { ChevronDown, Filter, Search, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { DataTableRadioFilter } from "@/shared/components/ui/data-table-radio-filter";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  DEFAULT_SORT,
  ONGOING_TRANSPORT_STATUSES,
  sortOptions,
  statusOptions,
} from "../constants";
import { ongoingTransportSortSchema } from "../schemas";
import type {
  OngoingTransportFilterPatch,
  OngoingTransportParams,
} from "../types";

export function OngoingTransportFilters({
  params,
  onChange,
}: {
  params: OngoingTransportParams;
  onChange: (patch: OngoingTransportFilterPatch) => void;
}) {
  const selected = params.status.split(",");
  const statusLabel =
    selected.length === ONGOING_TRANSPORT_STATUSES.length
      ? "All statuses"
      : statusOptions
          .filter((option) => selected.includes(option.value))
          .map((option) => option.label)
          .join(", ");
  return (
    <div
      role="group"
      aria-label="Ongoing transport filters"
      className="flex min-w-0 flex-wrap items-center gap-2 p-1"
    >
      <div className="relative min-w-52 flex-[1_1_17rem]">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-400"
        />
        <Input
          type="search"
          aria-label="Search transport, booking or customer"
          value={params.search ?? ""}
          onChange={(event) => onChange({ search: event.target.value })}
          placeholder="Search transport / booking / customer..."
          className="h-8 rounded-[2px] border-slate-300 bg-white pr-8 pl-8 text-xs shadow-none motion-reduce:transition-none [&::-webkit-search-cancel-button]:appearance-none"
        />
        {params.search ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange({ search: "" })}
            aria-label="Clear search"
            className="absolute top-1/2 right-0.5 size-7 -translate-y-1/2 rounded-[2px] text-slate-500 motion-reduce:transition-none"
          >
            <X className="size-3.5" />
          </Button>
        ) : null}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={`Filter transport status: ${statusLabel}`}
            className="h-8 min-w-40 justify-start rounded-[2px] border-slate-300 bg-white text-xs font-normal shadow-none motion-reduce:transition-none"
          >
            <Filter aria-hidden="true" className="size-3.5 text-slate-500" />
            <span className="max-w-48 truncate">{statusLabel}</span>
            <ChevronDown
              aria-hidden="true"
              className="ml-auto size-3.5 text-slate-500"
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="min-w-52 motion-reduce:animate-none"
        >
          {statusOptions.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              className="text-xs"
              checked={selected.includes(option.value)}
              disabled={
                selected.length === 1 && selected.includes(option.value)
              }
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={(checked) =>
                onChange({
                  status: ONGOING_TRANSPORT_STATUSES.filter((status) =>
                    status === option.value
                      ? checked === true
                      : selected.includes(status),
                  ).join(","),
                })
              }
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-xs"
            onSelect={() =>
              onChange({ status: ONGOING_TRANSPORT_STATUSES.join(",") })
            }
          >
            All statuses
          </DropdownMenuItem>
          <p className="m-0 px-2 py-1 text-[10px] text-slate-500">
            Select at least one status.
          </p>
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="min-w-48 flex-[0_1_13rem] [&>button]:w-full">
        <DataTableRadioFilter
          title="Departure: earliest first"
          ariaLabel="Sort ongoing transports"
          hideTitleWhenFiltered
          defaultValue={DEFAULT_SORT}
          value={params.sortBy}
          options={[...sortOptions]}
          onValueChange={(value) =>
            onChange({ sortBy: ongoingTransportSortSchema.parse(value) })
          }
        />
      </div>
      <label className="flex h-8 shrink-0 cursor-pointer items-center gap-2 rounded-[2px] border border-slate-300 bg-white px-2.5 text-xs text-slate-700">
        <Checkbox
          checked={params.hasActiveIncident === true}
          onCheckedChange={(checked) =>
            onChange({ hasActiveIncident: checked === true ? true : undefined })
          }
          className="size-3.5 rounded-[2px] motion-reduce:transition-none"
        />
        Has active incidents
      </label>
    </div>
  );
}
