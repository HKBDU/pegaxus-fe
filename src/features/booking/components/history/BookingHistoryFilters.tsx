import { useId } from "react";
import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { formatHistoryLabel, type HistoryFilters } from "../../history/utils";

interface BookingHistoryFiltersProps {
  filters: HistoryFilters;
  actions: string[];
  statuses: string[];
  onChange: (filters: HistoryFilters) => void;
  onRefresh: () => void;
  onDownload: () => void;
  isFetching: boolean;
  canRefresh: boolean;
  canDownload: boolean;
}

function HistorySelect({
  label,
  value,
  options,
  allLabel,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  allLabel: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="min-w-0 space-y-1">
      <label htmlFor={id} className="block text-[11px] font-semibold uppercase">
        {label}
      </label>
      <Select
        value={value ? `value:${value}` : "all"}
        onValueChange={(next) => onChange(next === "all" ? "" : next.slice(6))}
      >
        <SelectTrigger
          id={id}
          size="sm"
          className="h-8 w-full min-w-0 rounded-none border-[#f39200] bg-white text-xs"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          position="popper"
          side="bottom"
          align="start"
          sideOffset={2}
          avoidCollisions={false}
          className="z-50 max-h-64 min-w-[var(--radix-select-trigger-width)] rounded-none border-neutral-200 bg-white text-neutral-900"
        >
          <SelectItem value="all">{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={`value:${option}`}>
              {formatHistoryLabel(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function BookingHistoryFilters({
  filters,
  actions,
  statuses,
  onChange,
  onRefresh,
  onDownload,
  isFetching,
  canRefresh,
  canDownload,
}: BookingHistoryFiltersProps) {
  return (
    <div className="grid grid-cols-2 gap-3 border border-[#dfc9b6] bg-white p-3 items-end md:grid-cols-[1fr_1fr_1fr_auto]">
      {" "}
      <HistorySelect
        label="Action filter"
        allLabel="All actions"
        value={filters.action}
        options={actions}
        onChange={(action) => onChange({ ...filters, action })}
      />
      <HistorySelect
        label="From status"
        allLabel="All statuses"
        value={filters.fromStatus}
        options={statuses}
        onChange={(fromStatus) => onChange({ ...filters, fromStatus })}
      />
      <HistorySelect
        label="To status"
        allLabel="All statuses"
        value={filters.toStatus}
        options={statuses}
        onChange={(toStatus) => onChange({ ...filters, toStatus })}
      />
      <div className="min-w-0 space-y-1">
        <p
          id="history-order-label"
          className="h-7 block text-[11px] font-semibold uppercase"
        >
          Order
        </p>
        <div className="flex flex-nowrap gap-1">
          <div
            role="group"
            aria-labelledby="history-order-label"
            className="flex"
          >
            {(["newest", "oldest"] as const).map((order) => (
              <Button
                key={order}
                type="button"
                variant="outline"
                aria-pressed={filters.order === order}
                onClick={() => onChange({ ...filters, order })}
                className={`h-8 whitespace-nowrap rounded-none border-[#f39200] px-1.5 text-[11px] uppercase ${filters.order === order ? "bg-[#f39200] text-black hover:bg-[#df8500] hover:text-black" : "bg-white"}`}
              >
                {order === "newest" ? "Newest first" : "Oldest first"}
              </Button>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 shrink-0 rounded-none border-[#f39200]"
            aria-label="Refresh history"
            title="Refresh history"
            disabled={!canRefresh || isFetching}
            onClick={onRefresh}
          >
            <RefreshCw
              aria-hidden="true"
              className={`size-3.5 ${isFetching ? "animate-spin" : ""}`}
            />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 shrink-0 rounded-none border-[#f39200]"
            aria-label="Download history"
            title="Download filtered history as CSV"
            disabled={!canDownload}
            onClick={onDownload}
          >
            <Download aria-hidden="true" className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
