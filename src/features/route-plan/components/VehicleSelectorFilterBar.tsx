import { useMemo } from "react";
import { Search, X } from "lucide-react";

import { CAPACITY_FILTER_OPTIONS } from "@/features/fleet/constants/fleet.constants";
import { Button } from "@/shared/components/ui/button";
import {
  DataTableRadioFilter,
  type DataTableRadioOption,
} from "@/shared/components/ui/data-table-radio-filter";
import { Input } from "@/shared/components/ui/input";

export interface VehicleFilterState {
  search: string;
  minCapacity: string;
  vehicleType: string;
}

export const INITIAL_VEHICLE_FILTER_STATE: VehicleFilterState = {
  search: "",
  minCapacity: "ALL",
  vehicleType: "ALL",
};

export interface VehicleFilterItem {
  vehicleId: string;
  vehicleCode: string;
  vehicleName?: string | null;
  licensePlate?: string | null;
  capacityHorses?: number | null;
  vehicleType?: string | null;
}

/** Filters a list of vehicles based on search text, minimum horse capacity, and vehicle type. */
export function filterVehicles<T extends VehicleFilterItem>(
  vehicles: T[],
  filters: VehicleFilterState,
): T[] {
  const query = filters.search.trim().toLowerCase();
  const minCap = filters.minCapacity !== "ALL" ? Number(filters.minCapacity) : null;

  return vehicles.filter((v) => {
    if (minCap != null && (v.capacityHorses == null || v.capacityHorses < minCap)) {
      return false;
    }
    if (filters.vehicleType !== "ALL" && v.vehicleType && v.vehicleType !== filters.vehicleType) {
      return false;
    }
    if (query) {
      const code = (v.vehicleCode ?? "").toLowerCase();
      const name = (v.vehicleName ?? "").toLowerCase();
      const plate = (v.licensePlate ?? "").toLowerCase();
      if (!code.includes(query) && !name.includes(query) && !plate.includes(query)) {
        return false;
      }
    }
    return true;
  });
}

export interface VehicleSelectorFilterBarProps {
  filters: VehicleFilterState;
  onFilterChange: (filters: VehicleFilterState) => void;
  availableTypes?: string[];
  totalCount: number;
  filteredCount: number;
  selectedCount?: number;
  placeholder?: string;
  className?: string;
}

const CAPACITY_OPTIONS: DataTableRadioOption[] = CAPACITY_FILTER_OPTIONS.map((opt) => ({
  value: opt.value,
  label: opt.value === "ALL" ? "Any capacity" : opt.label,
}));

/**
 * Compact inline filter toolbar designed specifically for vehicle selection and assignment modal dialogs.
 * Adheres strictly to the project's design system without expanding the dialog or breaking scroll layouts.
 */
export function VehicleSelectorFilterBar({
  filters,
  onFilterChange,
  availableTypes,
  totalCount,
  filteredCount,
  selectedCount = 0,
  placeholder = "Filter by code, plate, name...",
  className = "",
}: VehicleSelectorFilterBarProps) {
  const typeOptions: DataTableRadioOption[] = useMemo(() => {
    if (!availableTypes || availableTypes.length === 0) return [];
    return [
      { value: "ALL", label: "All types" },
      ...availableTypes.map((type) => ({ value: type, label: type })),
    ];
  }, [availableTypes]);

  const hasActiveFilters =
    Boolean(filters.search.trim()) ||
    filters.minCapacity !== "ALL" ||
    filters.vehicleType !== "ALL";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <div className="relative min-w-[140px] flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
        <Input
          value={filters.search}
          onChange={(event) => onFilterChange({ ...filters, search: event.target.value })}
          placeholder={placeholder}
          spellCheck={false}
          className="h-8 rounded-[2px] border-slate-300 bg-white pl-8 pr-7 font-sans text-xs font-normal shadow-none placeholder:text-xs placeholder:text-slate-400 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
        />
        {filters.search ? (
          <button
            type="button"
            aria-label="Clear filter search"
            onClick={() => onFilterChange({ ...filters, search: "" })}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>

      <DataTableRadioFilter
        title="Capacity"
        value={filters.minCapacity}
        options={CAPACITY_OPTIONS}
        onValueChange={(value) => onFilterChange({ ...filters, minCapacity: value })}
      />

      {typeOptions.length > 2 && (
        <DataTableRadioFilter
          title="Type"
          value={filters.vehicleType}
          options={typeOptions}
          onValueChange={(value) => onFilterChange({ ...filters, vehicleType: value })}
        />
      )}

      {hasActiveFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onFilterChange(INITIAL_VEHICLE_FILTER_STATE)}
          className="h-8 rounded-[2px] px-2 text-xs text-slate-600 hover:text-slate-900"
        >
          <X className="mr-1 size-3" />
          Clear
        </Button>
      )}

      <span className="ml-auto text-[11px] font-medium text-slate-500">
        {filteredCount} of {totalCount} vehicles
        {selectedCount > 0 && ` (${selectedCount} selected)`}
      </span>
    </div>
  );
}

