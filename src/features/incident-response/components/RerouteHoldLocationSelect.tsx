import { useState, type Ref } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { getRerouteHoldLocations } from "../reroute-services";
import type { RerouteHoldLocation } from "../reroute-schemas";

export function RerouteHoldLocationSelect({
  value,
  onChange,
  onBlur,
  scope,
  source,
  active,
  disabled,
  id,
  ref,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
}: {
  value: string;
  onChange: (id: string) => void;
  onBlur: () => void;
  scope: string;
  source: "real" | "mock";
  active: boolean;
  disabled: boolean;
  id?: string;
  ref?: Ref<HTMLButtonElement>;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<RerouteHoldLocation>();
  const debounced = useDebounce(search.trim(), 300);
  const query = useQuery({
    queryKey: [
      "incident-response",
      "hold-locations",
      source,
      scope,
      debounced,
      page,
    ],
    queryFn: ({ signal }) =>
      getRerouteHoldLocations(debounced, page, scope, signal),
    enabled: active && !disabled,
    retry: false,
  });
  const items = query.isError ? [] : (query.data?.items ?? []);
  return (
    <div className="min-w-0 space-y-2">
      <Input
        aria-label="Search master locations"
        placeholder="Search location name or city"
        value={search}
        disabled={disabled}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
        className="min-h-11 rounded-[2px] text-base sm:min-h-9 sm:text-sm"
      />
      <Select
        value={value || "NONE"}
        disabled={disabled}
        onValueChange={(next) => {
          onChange(next === "NONE" ? "" : next);
          setSelected(items.find((item) => item.locationId === next));
          onBlur();
        }}
      >
        <SelectTrigger
          id={id}
          ref={ref}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          onBlur={onBlur}
          aria-label="Optional stop location"
          className="min-h-11 w-full min-w-0 rounded-[2px] text-base sm:min-h-9 sm:text-sm [&>span]:truncate"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          <SelectItem value="NONE">Not specified</SelectItem>
          {value && !items.some((item) => item.locationId === value) && (
            <SelectItem value={value}>
              {selected?.locationId === value
                ? selected.locationName
                : `Selected location · ${value}`}
            </SelectItem>
          )}
          {items.map((item) => (
            <SelectItem key={item.locationId} value={item.locationId}>
              {item.locationName} ·{" "}
              {[item.city, item.country].filter(Boolean).join(", ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {query.isError ? (
          <>
            <span role="status">
              Locations unavailable; you may leave this optional field empty.
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => void query.refetch()}
            >
              Retry
            </Button>
          </>
        ) : query.isFetching ? (
          <span role="status">Loading locations…</span>
        ) : !items.length ? (
          <span>No matching locations.</span>
        ) : null}
        {page > 1 && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled || query.isFetching}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
        )}
        {(query.data?.totalPages ?? 0) > page && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled || query.isFetching}
            onClick={() => setPage(page + 1)}
          >
            More locations
          </Button>
        )}
      </div>
    </div>
  );
}
