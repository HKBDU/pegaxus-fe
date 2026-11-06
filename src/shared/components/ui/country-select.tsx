import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { getCountryDataList } from "countries-list";

import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";

const countryOptions = getCountryDataList().sort((a, b) =>
  a.name.localeCompare(b.name),
);

interface CountrySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  emptyLabel?: string;
  allowCustomValue?: boolean;
  "aria-describedby"?: string;
  "data-slot"?: string;
  "aria-invalid"?: boolean;
}

export function CountrySelect({
  value,
  onValueChange,
  placeholder = "Select country",
  className,
  id,
  emptyLabel,
  allowCustomValue = false,
  "aria-describedby": ariaDescribedBy,
  "data-slot": dataSlot,
  "aria-invalid": ariaInvalid,
}: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedCountry = countryOptions.find(
    (country) => country.name === value,
  );
  const filteredCountries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return countryOptions;
    return countryOptions.filter((country) =>
      `${country.name} ${country.native} ${country.iso2}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query]);

  function selectCountry(countryName: string) {
    onValueChange(countryName);
    setQuery("");
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          id={id}
          data-slot={dataSlot}
          variant="outline"
          aria-expanded={open}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          className={cn(
            "h-8 w-full min-w-0 justify-between rounded-[2px] border-[#f3aa3b] bg-transparent px-3 py-1 text-left text-xs font-normal text-[#181818] shadow-none hover:bg-transparent",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">
            {(selectedCountry?.name ?? value) || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        collisionPadding={12}
        className="flex max-h-[min(24rem,var(--radix-popover-content-available-height))] w-[var(--radix-popover-trigger-width)] min-w-[min(16rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-[2px] border-input bg-white p-0 shadow-md"
      >
        <div className="shrink-0 border-b border-input p-2">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              autoFocus
              aria-label="Search countries"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  if (allowCustomValue && query.trim())
                    selectCountry(query.trim());
                }
              }}
              maxLength={allowCustomValue ? 100 : undefined}
              placeholder="Search countries..."
              className="h-9 rounded-[2px] border-input pl-8 text-sm shadow-none"
            />
          </div>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain p-1">
          {emptyLabel ? (
            <button
              type="button"
              onClick={() => selectCountry("")}
              className="flex w-full items-center gap-2 rounded-[2px] px-2 py-2 text-left text-sm text-muted-foreground outline-none hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
            >
              {emptyLabel}
            </button>
          ) : null}
          {allowCustomValue &&
          query.trim() &&
          !countryOptions.some((country) => country.name === query.trim()) ? (
            <button
              type="button"
              onClick={() => selectCountry(query.trim())}
              className="flex w-full items-center rounded-[2px] px-2 py-2 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
            >
              <span className="min-w-0 break-words">Use “{query.trim()}”</span>
            </button>
          ) : null}
          {filteredCountries.length ? (
            filteredCountries.map((country) => (
              <button
                type="button"
                key={country.iso2}
                aria-pressed={country.name === value}
                onClick={() => selectCountry(country.name)}
                className="flex w-full items-center gap-2 rounded-[2px] px-2 py-2 text-left text-sm text-foreground outline-none hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
              >
                <span className="truncate">{country.name}</span>
                <span className="ml-auto shrink-0 text-[10px] text-slate-400">
                  {country.iso2}
                </span>
                <Check
                  aria-hidden="true"
                  className={cn(
                    "size-3.5 shrink-0 text-primary",
                    country.name === value ? "opacity-100" : "opacity-0",
                  )}
                />
              </button>
            ))
          ) : (
            <p className="px-2 py-3 text-center text-xs text-slate-500">
              No country found.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
