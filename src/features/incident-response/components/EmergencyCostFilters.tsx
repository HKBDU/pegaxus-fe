import { Search } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { DatePicker } from "@/shared/components/ui/date-picker";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  EMERGENCY_COST_CATEGORY_LABELS,
  EMERGENCY_COST_STATUS_OPTIONS,
} from "@/shared/constants/incident";
import {
  emergencyCostCategories,
  emergencyCostStatuses,
  emergencyCostSortSchema,
  type EmergencyCostParams,
} from "../schemas";

export type EmergencyCostFilterPatch = Partial<
  Pick<
    EmergencyCostParams,
    "keyword" | "status" | "category" | "fromDate" | "toDate" | "sortBy"
  >
>;
const controlClass =
  "h-11 rounded-[2px] border-input bg-background font-sans text-xs font-normal shadow-none focus-visible:border-primary focus-visible:ring-primary/20 sm:h-8";

export function EmergencyCostFilters({
  params,
  dateError,
  onChange,
}: {
  params: EmergencyCostParams;
  dateError?: string;
  onChange: (patch: EmergencyCostFilterPatch) => void;
}) {
  const selected = params.status?.split(",") ?? [];
  const all = selected.length === emergencyCostStatuses.length;
  return (
    <div className="space-y-2">
      <div
        role="region"
        tabIndex={0}
        aria-label="Emergency cost filter toolbar"
        className="@container w-full min-w-0 max-w-full rounded-[2px] p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-inset"
      >
        {/*
          A fixed grid, not flex-wrap: the controls had different fixed widths (~1000px together) and wrapped at random
          points. The breakpoints are container queries, not viewport ones: the list is also embedded in the narrow column
          of the incident page, where a viewport breakpoint switched to the one-row layout and pushed the last filters past
          the border. Under 672px: search, pairs, sort. From 672px: search, then five even cells. From 1152px: one row.
        */}
        <div
          role="group"
          aria-label="Emergency cost filters"
          className="grid w-full min-w-0 grid-cols-2 items-center gap-2 @2xl:grid-cols-5 @6xl:grid-cols-[minmax(14rem,1fr)_repeat(5,minmax(0,9.5rem))]"
        >
          <div className="relative col-span-2 min-w-0 @2xl:col-span-5 @6xl:col-span-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              aria-label="Search request or incident code"
              placeholder="Search request / incident code..."
              value={params.keyword ?? ""}
              onChange={(event) => onChange({ keyword: event.target.value })}
              className={`${controlClass} pl-8`}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={`${controlClass} w-full min-w-0 justify-start`}
                aria-label="Filter emergency cost statuses"
                title={all ? "All statuses" : selected.join(", ")}
              >
                <span className="truncate">
                  {all
                    ? "All statuses"
                    : selected
                        .map(
                          (status) =>
                            EMERGENCY_COST_STATUS_OPTIONS[
                              status as keyof typeof EMERGENCY_COST_STATUS_OPTIONS
                            ].label,
                        )
                        .join(", ")}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {emergencyCostStatuses.map((status) => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={selected.includes(status)}
                  disabled={selected.length === 1 && selected.includes(status)}
                  onSelect={(event) => event.preventDefault()}
                  onCheckedChange={(checked) =>
                    onChange({
                      status: emergencyCostStatuses
                        .filter((value) =>
                          value === status
                            ? checked === true
                            : selected.includes(value),
                        )
                        .join(","),
                    })
                  }
                >
                  {EMERGENCY_COST_STATUS_OPTIONS[status].label}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() =>
                  onChange({ status: emergencyCostStatuses.join(",") })
                }
              >
                All statuses
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Select
            value={params.category ?? "ALL"}
            onValueChange={(value) =>
              onChange({
                category: emergencyCostCategories.find(
                  (category) => category === value,
                ),
              })
            }
          >
            <SelectTrigger
              aria-label="Filter emergency cost category"
              className={`${controlClass} w-full min-w-0`}
            >
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All categories</SelectItem>
              {emergencyCostCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {EMERGENCY_COST_CATEGORY_LABELS[category]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="min-w-0">
            <DatePicker
              aria-label="Requested from date"
              placeholder="From date"
              value={params.fromDate}
              onChange={(value) => onChange({ fromDate: value || undefined })}
              className={controlClass}
            />
          </div>
          <div className="min-w-0">
            <DatePicker
              aria-label="Requested to date"
              placeholder="To date"
              value={params.toDate}
              onChange={(value) => onChange({ toDate: value || undefined })}
              aria-invalid={Boolean(dateError)}
              className={controlClass}
            />
          </div>
          {/* Alone on its row in a narrow container, one even cell from 672px. */}
          <div className="col-span-2 min-w-0 @2xl:col-span-1 [&>button]:h-11 [&>button]:w-full [&>button]:border-input [&>button]:bg-background [&>button]:text-foreground sm:[&>button]:h-8">
            <DataTableRadioFilter
              title="Newest requests"
              ariaLabel="Sort emergency cost requests"
              value={params.sortBy}
              defaultValue="requestedAt:desc"
              hideTitleWhenFiltered
              options={[
                { value: "requestedAt:desc", label: "Newest requests" },
                { value: "requestedAt:asc", label: "Oldest requests" },
              ]}
              onValueChange={(value) =>
                onChange({ sortBy: emergencyCostSortSchema.parse(value) })
              }
            />
          </div>
        </div>
      </div>
      {dateError ? (
        <p role="alert" className="m-0 px-1 text-sm text-destructive">
          {dateError}
        </p>
      ) : null}
    </div>
  );
}
