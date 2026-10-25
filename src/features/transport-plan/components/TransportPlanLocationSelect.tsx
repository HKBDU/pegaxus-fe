import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { z } from "zod";
import { useAuthStore } from "@/features/auth/store";
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
import { locationBriefSchema } from "../schemas";
import { transportPlanService } from "../services";
import { isFlow3MockMode } from "../source";

export function TransportPlanLocationSelect({
  value,
  current,
  disabled,
  editing,
  label,
  onChange,
  onBlur,
  id,
  invalid,
}: {
  value: string;
  current?: z.infer<typeof locationBriefSchema> | null;
  disabled: boolean;
  editing: boolean;
  label: string;
  id?: string;
  invalid?: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(current);
  const debounced = useDebounce(search.trim(), 300);
  const principal = useAuthStore((state) => state.principal);
  const sessionVersion = useAuthStore((state) => state.sessionVersion);
  const query = useQuery({
    queryKey: [
      "transport-plan-locations",
      isFlow3MockMode(),
      principal?.id,
      sessionVersion,
      debounced,
      page,
    ],
    queryFn: ({ signal }) =>
      transportPlanService.getLocations(debounced, page, signal),
    enabled: !disabled,
    retry: false,
  });
  const options = query.data?.items ?? [];
  const retained = [selected, current].find(
    (item) => item?.locationId === value,
  );
  return (
    <div className="min-w-0 space-y-2">
      <Input
        aria-label={`Search ${label}`}
        placeholder="Search existing locations"
        value={search}
        disabled={disabled}
        className="h-9 rounded-[2px]"
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
      />
      <Select
        value={value || "__unchanged"}
        disabled={disabled}
        onValueChange={(next) => {
          onChange(next === "__unchanged" ? "" : next);
          setSelected(options.find((item) => item.locationId === next));
          onBlur();
        }}
      >
        <SelectTrigger
          id={id}
          aria-label={label}
          aria-invalid={invalid}
          aria-describedby={
            id ? `${id}-hint${invalid ? ` ${id}-error` : ""}` : undefined
          }
          onBlur={onBlur}
          className="h-9 w-full min-w-0 rounded-[2px] [&>span]:truncate"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="z-[60] max-h-60">
          <SelectItem value="__unchanged">
            {editing ? "Keep current location" : "Automatic from booking"}
          </SelectItem>
          {value && !options.some((item) => item.locationId === value) && (
            <SelectItem value={value}>
              {retained?.locationName ?? "Current location"}
            </SelectItem>
          )}
          {options.map((item) => (
            <SelectItem key={item.locationId} value={item.locationId}>
              {item.locationName} ·{" "}
              {[item.city, item.country].filter(Boolean).join(", ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        {query.isError ? (
          <>
            <span role="alert">Locations could not be loaded.</span>
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
        ) : !options.length ? (
          <span>No matching locations.</span>
        ) : null}
        {page > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || query.isFetching}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
        )}
        {(query.data?.totalPages ?? 0) > page && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
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
