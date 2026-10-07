import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { useDebounce } from "@/shared/hooks/useDebounce";
import type { MapLocation } from "./types";

type LocationSearchProps = {
  options: MapLocation[];
  value?: string;
  loading?: boolean;
  emptyMessage?: string;
  onChange?: (value: string) => void;
  onSelect: (location: MapLocation) => void;
};

export function LocationSearch({
  options,
  value = "",
  loading,
  emptyMessage = "No locations found.",
  onChange,
  onSelect,
}: LocationSearchProps) {
  const [inputValue, setInputValue] = useState(value);
  const debouncedValue = useDebounce(inputValue, 300);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    onChangeRef.current?.(debouncedValue);
  }, [debouncedValue]);

  return (
    <div className="absolute top-3 left-3 z-10 w-[min(260px,calc(100%-1.5rem))]">
      <div className="relative">
        <Search className="absolute top-2.5 left-2 size-4 text-muted-foreground" />
        <Input
          value={inputValue}
          className="bg-white pl-8 shadow-sm"
          placeholder="Search location"
          aria-label="Search location"
          onChange={(event) => setInputValue(event.target.value)}
        />
      </div>
      {loading && (
        <p className="px-2 py-2 text-sm text-muted-foreground">Loading...</p>
      )}
      {!loading && inputValue.trim() && (
        <div className="mt-1 max-h-48 overflow-y-auto rounded border border-slate-200 bg-white p-1 shadow-md">
          {options.length ? (
            options.map((location) => (
              <button
                key={location.id}
                type="button"
                className="block w-full rounded px-2 py-2 text-left text-sm hover:bg-amber-50 focus-visible:bg-amber-50"
                onClick={() => onSelect(location)}
              >
                <span className="font-medium">{location.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {location.city || location.country || ""}
                </span>
              </button>
            ))
          ) : (
            <p className="px-2 py-2 text-sm text-muted-foreground">
              {emptyMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
