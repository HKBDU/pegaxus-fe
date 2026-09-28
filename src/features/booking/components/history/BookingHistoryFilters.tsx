import type { ReactNode } from "react";
import { Download } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { DataTableRadioFilter } from "@/shared/components/ui/data-table-radio-filter";
import { formatHistoryLabel, type HistoryFilters } from "../../history/utils";

interface BookingHistoryFiltersProps {
  filters: HistoryFilters;
  actions: string[];
  statuses: string[];
  onChange: (filters: HistoryFilters) => void;
  onDownload: () => void;
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
  return (
    <DataTableRadioFilter
      title={allLabel}
      ariaLabel={label}
      value={value || "ALL"}
      options={[
        { value: "ALL", label: allLabel },
        ...options.map((option) => ({ value: option, label: formatHistoryLabel(option) })),
      ]}
      onValueChange={(next) => onChange(next === "ALL" ? "" : next)}
    />
  );
}

export function BookingHistoryFilters({
  filters,
  actions,
  statuses,
  onChange,
  onDownload,
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
      <DataTableRadioFilter
        title="Sort"
        value={filters.order}
        defaultValue=""
        options={[
          { value: "newest", label: "Newest" },
          { value: "oldest", label: "Oldest" },
        ]}
        onValueChange={(order) => {
          if (order === "newest" || order === "oldest") onChange({ ...filters, order });
        }}
      />
        <div className="flex items-center justify-end gap-1.5 sm:col-span-2 lg:col-span-1">
          {viewOptions}
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
