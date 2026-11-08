import { useState, type ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { CalendarDays, Search, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { CountrySelect } from "@/shared/components/ui/country-select";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Input } from "@/shared/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import type { TransportArchiveQuery } from "../types";

const fieldClass = "h-8 rounded-[2px] border-slate-300 bg-white text-xs font-normal shadow-none";

function dateLabel(value?: string) {
  return value ? format(parseISO(value), "dd MMM") : "Any";
}

/** One popover for the two completion dates, so the toolbar keeps a single control per filter. */
function CompletedRange({
  from,
  to,
  onChange,
}: {
  from?: string;
  to?: string;
  onChange: (from?: string, to?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ from: "", to: "" });
  const [error, setError] = useState("");
  const active = Boolean(from || to);
  const label = active ? `Completed: ${dateLabel(from)} — ${dateLabel(to)}` : "Completed date";

  function apply(clear = false) {
    if (!clear && draft.from && draft.to && draft.to < draft.from) {
      setError("End date must not precede start date.");
      return;
    }
    onChange(clear ? undefined : draft.from || undefined, clear ? undefined : draft.to || undefined);
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setDraft({ from: from ?? "", to: to ?? "" });
          setError("");
        }
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={label}
          title={label}
          className={`${fieldClass} w-full min-w-0 justify-start gap-2 px-2.5 ${active ? "" : "text-muted-foreground"}`}
        >
          <CalendarDays aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-3 rounded-[2px] border-slate-200 p-3">
        <h3 className="text-sm font-semibold">Completed date</h3>
        <DatePicker
          aria-label="Completed from"
          value={draft.from}
          placeholder="From date"
          maxDate={draft.to || undefined}
          onChange={(value) => setDraft((current) => ({ ...current, from: value }))}
          className="h-8 text-xs"
        />
        <DatePicker
          aria-label="Completed to"
          value={draft.to}
          placeholder="To date"
          minDate={draft.from || undefined}
          onChange={(value) => setDraft((current) => ({ ...current, to: value }))}
          className="h-8 text-xs"
        />
        <div className="min-h-5">
          {error ? (
            <p role="alert" className="text-xs leading-5 text-destructive">
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex justify-between gap-2">
          <Button type="button" variant="outline" size="sm" aria-label="Clear completed date" onClick={() => apply(true)}>
            Clear
          </Button>
          <Button type="button" size="sm" onClick={() => apply()}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface TransportArchiveFilterProps {
  value: TransportArchiveQuery;
  onChange: (next: Partial<TransportArchiveQuery>) => void;
  /** The "View" column picker, built by the table. */
  viewOptions?: ReactNode;
}

/** Same toolbar layout as the transport request list: search, then the filters, then the view options. */
export function TransportArchiveFilter({ value, onChange, viewOptions }: TransportArchiveFilterProps) {
  const search = value.search ?? "";
  return (
    <div
      role="toolbar"
      aria-label="Transport archive filters"
      className="grid grid-cols-2 gap-2 lg:grid-cols-[minmax(15rem,1fr)_11rem_10rem_10rem_auto]"
    >
      <div className="relative col-span-2 lg:col-span-1">
        <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(event) => onChange({ search: event.target.value })}
          aria-label="Search transport archive"
          placeholder="Search transport, booking or horse"
          spellCheck={false}
          className={`${fieldClass} pl-8 pr-8 font-sans placeholder:font-sans placeholder:text-xs placeholder:font-normal placeholder:text-slate-400 focus-visible:border-amber-500 focus-visible:ring-amber-500/20`}
        />
        {search ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onChange({ search: "" })}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        ) : null}
      </div>

      <div className="col-span-2 lg:col-span-1">
        <CompletedRange
          from={value.completedFrom}
          to={value.completedTo}
          onChange={(completedFrom, completedTo) => onChange({ completedFrom, completedTo })}
        />
      </div>
      <CountrySelect
        aria-label="Origin country"
        value={value.originCountry ?? ""}
        onValueChange={(originCountry) => onChange({ originCountry })}
        placeholder="Origin country"
        emptyLabel="All origins"
      />
      <CountrySelect
        aria-label="Destination country"
        value={value.destinationCountry ?? ""}
        onValueChange={(destinationCountry) => onChange({ destinationCountry })}
        placeholder="Destination country"
        emptyLabel="All destinations"
      />

      <div className="col-span-2 flex items-center justify-end gap-1.5 lg:col-span-1 max-lg:[&_button]:w-full">{viewOptions}</div>
    </div>
  );
}
