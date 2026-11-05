import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { useReportAccess } from "../hooks";
import { getReportLookup, reportError } from "../services";
import type { LookupKind } from "../schemas";

export function LookupFilter({
  kind,
  value,
  onChange,
  id,
}: {
  kind: LookupKind;
  value: string;
  onChange: (id: string) => void;
  id: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [chosen, setChosen] = useState<{ id: string; label: string } | null>(
    null,
  );
  const { allowed, scope } = useReportAccess();
  const query = useQuery({
    queryKey: ["management-report", scope, "lookup", kind, appliedSearch, page],
    queryFn: ({ signal }) =>
      getReportLookup(kind, appliedSearch, page, scope, signal),
    enabled: allowed && open,
    retry: false,
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });
  const caption = kind;
  const selected =
    chosen?.id === value
      ? chosen.label
      : query.data?.items.find((item) => item.id === value)?.label;
  const applySearch = () => {
    setAppliedSearch(search.trim());
    setPage(1);
  };
  function choose(item: { id: string; label: string }) {
    setChosen(item);
    onChange(item.id);
    setOpen(false);
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          title={selected ?? value}
          className="h-9 w-full min-w-0 justify-between rounded-[2px] border-input bg-white px-3 text-left text-sm font-normal shadow-none"
        >
          <span className="truncate">
            {value
              ? (selected ?? `Selected ${caption} · …${value.slice(-6)}`)
              : `Any ${caption}`}
          </span>
          <ChevronsUpDown aria-hidden="true" className="size-3.5 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        collisionPadding={12}
        className="flex max-h-[min(32rem,var(--radix-popover-content-available-height))] w-[max(18rem,var(--radix-popover-trigger-width))] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[2px] border-input bg-white p-0"
      >
        <div className="flex shrink-0 gap-2 border-b border-input p-2">
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              aria-label={`Search ${caption}s`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applySearch();
                }
              }}
              placeholder={`Search ${caption}s`}
              className="h-9 min-w-0 rounded-[2px] border-input pl-8 text-sm shadow-none"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            aria-label={`Find ${caption}s`}
            onClick={applySearch}
            className="h-9 rounded-[2px] border-input px-3 shadow-none"
          >
            Search
          </Button>
        </div>
        <div
          className="min-h-0 space-y-1 overflow-y-auto overscroll-contain p-1"
          aria-label={`${caption} results`}
          aria-busy={query.isFetching}
        >
          <Button
            type="button"
            variant="ghost"
            className="h-9 w-full justify-start rounded-[2px] px-2 text-sm font-normal text-muted-foreground"
            onClick={() => choose({ id: "", label: `Any ${caption}` })}
          >
            Any {caption}
          </Button>
          {query.isFetching ? (
            <p role="status" className="m-0 p-2 text-xs text-slate-500">
              Loading {caption}s…
            </p>
          ) : query.isError ? (
            <p role="alert" className="m-0 p-2 text-xs text-destructive">
              {reportError(query.error).message}
            </p>
          ) : query.data?.items.length ? (
            query.data.items.map((item) => (
              <Button
                type="button"
                variant={value === item.id ? "secondary" : "ghost"}
                aria-pressed={value === item.id}
                key={item.id}
                className="h-auto min-h-9 w-full justify-between whitespace-normal rounded-[2px] px-2 py-2 text-left text-sm font-normal"
                onClick={() => choose(item)}
              >
                <span className="min-w-0 break-words">{item.label}</span>
                {value === item.id ? (
                  <Check
                    aria-hidden="true"
                    className="size-3.5 shrink-0 text-primary"
                  />
                ) : null}
              </Button>
            ))
          ) : (
            <p className="m-0 p-2 text-xs text-slate-500">
              No matches. Try another search or use a known historical ID below.
            </p>
          )}
          <details className="border-t border-input p-2 text-xs text-muted-foreground">
            <summary className="cursor-pointer rounded-[2px] focus-visible:outline-2 focus-visible:outline-primary">
              Use a historical {caption} ID
            </summary>
            <p className="my-2">
              Deleted or reclassified records may not appear in the catalog.
              Enter a known reference ID to retain the historical filter.
            </p>
            <Input
              aria-label={`Historical ${caption} reference ID`}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.preventDefault();
              }}
              className="h-9 rounded-[2px] border-input text-sm shadow-none"
            />
          </details>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-input p-2 text-xs text-muted-foreground">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1 || query.isFetching}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </Button>
          <span>Page {page}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={
              !query.data || page >= query.data.totalPages || query.isFetching
            }
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
