import { useId, type ReactNode } from "react";
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
  viewOptions?: ReactNode;
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
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Select
        value={value ? `value:${value}` : "all"}
        onValueChange={(next) => onChange(next === "all" ? "" : next.slice(6))}
      >
        <SelectTrigger
          id={id}
          size="sm"
          className="h-8 w-full min-w-0 rounded-[2px] border-slate-300 bg-white text-xs shadow-none focus:border-amber-500 focus:ring-amber-500/20"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          position="popper"
          side="bottom"
          align="start"
          sideOffset={2}
          avoidCollisions={false}
          className="z-50 max-h-64 min-w-[var(--radix-select-trigger-width)] rounded-[2px] border-slate-200 bg-white p-0.5 text-slate-900 shadow-md"
        >
          <SelectItem value="all">{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={`value:${option}`} className="h-7 rounded-[2px] text-xs">
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
  viewOptions,
}: BookingHistoryFiltersProps) {
  return (
    <div role="toolbar" aria-label="History filters" className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_8rem_auto]">
      <HistorySelect
        label="Action filter"
        allLabel="All actions"
        value={filters.action}
        options={actions}
        onChange={(action) => onChange({ ...filters, action })}
      />
      <HistorySelect
        label="From status"
        allLabel="From: All statuses"
        value={filters.fromStatus}
        options={statuses}
        onChange={(fromStatus) => onChange({ ...filters, fromStatus })}
      />
      <HistorySelect
        label="To status"
        allLabel="To: All statuses"
        value={filters.toStatus}
        options={statuses}
        onChange={(toStatus) => onChange({ ...filters, toStatus })}
      />
      <Select value={filters.order} onValueChange={(order) => {
        if (order === "newest" || order === "oldest") onChange({ ...filters, order });
      }}>
        <SelectTrigger aria-label="History sort order" size="sm" className="h-8 w-full rounded-[2px] border-slate-300 bg-white text-xs shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" align="start" className="rounded-[2px] border-slate-200 bg-white p-0.5 shadow-md">
          <SelectItem value="newest" className="h-7 rounded-[2px] text-xs">Newest</SelectItem>
          <SelectItem value="oldest" className="h-7 rounded-[2px] text-xs">Oldest</SelectItem>
        </SelectContent>
      </Select>
        <div className="flex items-center justify-end gap-1.5 sm:col-span-2 lg:col-span-1">
          {viewOptions}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 shrink-0 rounded-[2px] border-slate-300 bg-white shadow-none"
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
            className="size-8 shrink-0 rounded-[2px] border-slate-300 bg-white shadow-none"
            aria-label="Download history"
            title="Download filtered history as CSV"
            disabled={!canDownload}
            onClick={onDownload}
          >
            <Download aria-hidden="true" className="size-3.5" />
          </Button>
        </div>
    </div>
  );
}
