import { Search } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { DataTableRadioFilter } from "@/shared/components/ui/data-table-radio-filter";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import {
  EMERGENCY_COST_CATEGORY_LABELS,
  EMERGENCY_COST_STATUS_OPTIONS,
} from "@/shared/constants/incident";
import {
  emergencyCostCategories, emergencyCostStatuses, emergencyCostSortSchema,
  type EmergencyCostParams,
} from "../schemas";

export type EmergencyCostFilterPatch = Partial<Pick<EmergencyCostParams,
  "keyword" | "status" | "category" | "fromDate" | "toDate" | "sortBy"
>>;

export function EmergencyCostFilters({ params, dateError, onChange, onClear }: {
  params: EmergencyCostParams;
  dateError?: string;
  onChange: (patch: EmergencyCostFilterPatch) => void;
  onClear: () => void;
}) {
  const selected = params.status?.split(",") ?? [];
  const all = selected.length === emergencyCostStatuses.length;
  return (
    <div className="space-y-2">
      <div role="group" aria-label="Emergency cost filters" className="flex min-w-0 flex-wrap items-center gap-2 p-1 [&_button]:min-h-11 sm:[&_button]:min-h-8">
        <div className="relative min-w-0 flex-[1_1_16rem]">
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search" aria-label="Search request or incident code"
            placeholder="Search request / incident code..."
            value={params.keyword ?? ""}
            onChange={(event) => onChange({ keyword: event.target.value })}
            className="h-11 rounded-xs bg-white pl-9 text-sm sm:h-8 sm:text-xs"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" className="rounded-xs bg-white text-xs" aria-label="Filter emergency cost statuses">
              {all ? "All statuses" : selected.map((status) => EMERGENCY_COST_STATUS_OPTIONS[status as keyof typeof EMERGENCY_COST_STATUS_OPTIONS].label).join(", ")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {emergencyCostStatuses.map((status) => (
              <DropdownMenuCheckboxItem
                key={status} checked={selected.includes(status)}
                disabled={selected.length === 1 && selected.includes(status)}
                onSelect={(event) => event.preventDefault()}
                onCheckedChange={(checked) => onChange({
                  status: emergencyCostStatuses.filter((value) => value === status
                    ? checked === true : selected.includes(value)).join(","),
                })}
              >
                {EMERGENCY_COST_STATUS_OPTIONS[status].label}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onChange({ status: emergencyCostStatuses.join(",") })}>
              All statuses
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Select value={params.category ?? "ALL"} onValueChange={(value) => onChange({
          category: emergencyCostCategories.find((category) => category === value),
        })}>
          <SelectTrigger aria-label="Filter emergency cost category" className="max-w-full rounded-xs bg-white text-xs">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All categories</SelectItem>
            {emergencyCostCategories.map((category) => (
              <SelectItem key={category} value={category}>{EMERGENCY_COST_CATEGORY_LABELS[category]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="min-w-0 flex-[1_1_9rem] sm:flex-[0_1_10rem]">
          <DatePicker aria-label="Requested from date" placeholder="From date" value={params.fromDate}
            onChange={(value) => onChange({ fromDate: value || undefined })}
            className="rounded-xs bg-white text-xs" />
        </div>
        <div className="min-w-0 flex-[1_1_9rem] sm:flex-[0_1_10rem]">
          <DatePicker aria-label="Requested to date" placeholder="To date" value={params.toDate}
            onChange={(value) => onChange({ toDate: value || undefined })}
            aria-invalid={Boolean(dateError)} className="rounded-xs bg-white text-xs" />
        </div>
        <DataTableRadioFilter title="Newest requests" ariaLabel="Sort emergency cost requests"
          value={params.sortBy} defaultValue="requestedAt:desc" hideTitleWhenFiltered
          options={[
            { value: "requestedAt:desc", label: "Newest requests" },
            { value: "requestedAt:asc", label: "Oldest requests" },
          ]}
          onValueChange={(value) => onChange({ sortBy: emergencyCostSortSchema.parse(value) })} />
        <Button type="button" variant="ghost" onClick={onClear} className="rounded-xs text-xs">Clear filters</Button>
      </div>
      {dateError ? <p role="alert" className="m-0 px-1 text-sm text-destructive">{dateError}</p> : null}
    </div>
  );
}
