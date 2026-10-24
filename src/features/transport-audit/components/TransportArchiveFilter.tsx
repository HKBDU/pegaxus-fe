import { Search, RotateCcw } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { CountrySelect } from "@/shared/components/ui/country-select";
import type { TransportArchiveQuery } from "../types";
export function TransportArchiveFilter({
  value,
  onChange,
}: {
  value: TransportArchiveQuery;
  onChange: (next: Partial<TransportArchiveQuery>) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Transport archive filters"
      className="flex flex-wrap items-end gap-2 border border-[#e5e2d9] bg-white p-3"
    >
      <div className="relative min-w-[240px] flex-1">
        <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-slate-400" />
        <Input
          aria-label="Search transport archive"
          className="pl-8"
          value={value.search ?? ""}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="Search transport, booking, horse..."
        />
      </div>
      <DatePicker
        aria-label="Completed from"
        value={value.completedFrom ?? ""}
        onChange={(completedFrom) => onChange({ completedFrom })}
        placeholder="Completed from"
        className="w-40"
      />
      <div className="w-44">
        <CountrySelect
          aria-label="Origin country"
          value={value.originCountry ?? ""}
          onValueChange={(originCountry) => onChange({ originCountry })}
          placeholder="Origin country"
        />
      </div>
      <div className="w-44">
        <CountrySelect
          aria-label="Destination country"
          value={value.destinationCountry ?? ""}
          onValueChange={(destinationCountry) =>
            onChange({ destinationCountry })
          }
          placeholder="Destination country"
        />
      </div>
      <DatePicker
        aria-label="Completed to"
        value={value.completedTo ?? ""}
        onChange={(completedTo) => onChange({ completedTo })}
        placeholder="Completed to"
        className="w-40"
      />
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          onChange({
            search: "",
            completedFrom: undefined,
            completedTo: undefined,
            originCountry: undefined,
            destinationCountry: undefined,
            pageIndex: 1,
          })
        }
      >
        <RotateCcw className="size-4" /> Reset
      </Button>
    </div>
  );
}
