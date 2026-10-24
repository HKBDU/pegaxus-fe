import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronsUpDown, Search } from "lucide-react";
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
          className="h-9 w-full min-w-0 justify-between rounded-[2px] px-3 text-left font-normal"
        >
          <span className="truncate">
            {value ? (selected ?? value) : `Any ${caption}`}
          </span>
          <ChevronsUpDown aria-hidden="true" className="size-3.5 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-80 max-w-[calc(100vw-2rem)] space-y-3 rounded-[2px] p-3"
      >
        <div className="flex gap-2">
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
            className="min-w-0 rounded-[2px]"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={`Find ${caption}s`}
            onClick={applySearch}
          >
            <Search className="size-4" />
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="h-8 w-full justify-start text-xs"
          onClick={() => choose({ id: "", label: `Any ${caption}` })}
        >
          Any {caption}
        </Button>
        <div
          className="max-h-56 space-y-1 overflow-y-auto"
          aria-label={`${caption} results`}
          aria-busy={query.isFetching}
        >
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
                key={item.id}
                className="h-auto min-h-9 w-full justify-start whitespace-normal rounded-[2px] px-2 py-2 text-left text-xs"
                onClick={() => choose(item)}
              >
                {item.label}
              </Button>
            ))
          ) : (
            <p className="m-0 p-2 text-xs text-slate-500">
              No matches. Try another search or use a known historical ID below.
            </p>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
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
        <details className="border-t border-slate-200 pt-2 text-xs text-slate-500">
          <summary className="cursor-pointer focus-visible:outline-2 focus-visible:outline-primary">
            Use a historical {caption} ID
          </summary>
          <p className="my-2">
            Deleted or reclassified records may not appear in the catalog. Enter
            a known GUID to retain the historical filter.
          </p>
          <Input
            aria-label={`Historical ${caption} GUID`}
            value={value}
            onChange={(event) => onChange(event.target.value.trim())}
            className="rounded-[2px] text-xs"
          />
        </details>
      </PopoverContent>
    </Popover>
  );
}
