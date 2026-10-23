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
        aria-label="Emergency cost filter toolbar, scroll horizontally for more controls"
        className="w-full min-w-0 max-w-full rounded-[2px] p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-inset"
      >
        <div
          role="group"
          aria-label="Emergency cost filters"
          className="flex w-full min-w-max flex-nowrap items-center gap-1"
        >
          <div className="relative min-w-56 flex-1">
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
                className={`${controlClass} w-36 shrink-0 justify-start`}
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
              className={`${controlClass} w-44 shrink-0`}
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
          <div className="w-36 shrink-0">
            <DatePicker
              aria-label="Requested from date"
              placeholder="From date"
              value={params.fromDate}
              onChange={(value) => onChange({ fromDate: value || undefined })}
              className={controlClass}
            />
          </div>
          <div className="w-36 shrink-0">
            <DatePicker
              aria-label="Requested to date"
              placeholder="To date"
              value={params.toDate}
              onChange={(value) => onChange({ toDate: value || undefined })}
              aria-invalid={Boolean(dateError)}
              className={controlClass}
            />
          </div>
          <div className="w-34 shrink-0 [&>button]:h-11 [&>button]:w-full [&>button]:border-input [&>button]:bg-background [&>button]:text-foreground sm:[&>button]:h-8">
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
