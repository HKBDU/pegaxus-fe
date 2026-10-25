import { Link } from "react-router-dom";
import { ROLE_ROUTES } from "@/app/route-config";
import { TablePagination } from "@/shared/components/common/TablePagination";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
  TableCaption,
} from "@/shared/components/ui/table";
import {
  transitDelaySchema,
  transitSortSchema,
  type TransitFilters,
  type TransitTimeReport,
} from "../schemas";
import {
  reportMeta,
  reportNumber,
  reportTime,
  signedNumber,
} from "../presentation";

const sorts = {
  "deltaDays:desc": "Deviation: highest first",
  "deltaDays:asc": "Deviation: lowest first",
  "actualDays:desc": "Actual: longest first",
  "actualDays:asc": "Actual: shortest first",
};
const head = "h-10 px-3 font-heading text-xs uppercase";

export function TransitDetailsTable({
  report,
  filters,
  onChange,
  returnUrl,
  pending,
  disabled,
  error,
}: {
  report: TransitTimeReport;
  filters: TransitFilters;
  onChange: (update: Partial<TransitFilters>) => void;
  returnUrl: string;
  pending: boolean;
  disabled: boolean;
  error?: string;
}) {
  const pageMissing = report.pageIndex > Math.max(1, report.totalPages);
  return (
    <section
      aria-labelledby="transit-details-heading"
      aria-busy={pending}
      className="min-w-0 space-y-3 rounded-[2px] border border-slate-200 bg-white p-4"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2
            id="transit-details-heading"
            className="m-0 font-heading text-base uppercase"
          >
            Transport details
          </h2>
          <p className="mt-1 mb-0 max-w-xl text-xs text-slate-500">
            Filters affect this table only. Displayed durations and deviations
            are rounded.
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <div className="min-w-0 flex-1 basis-48 space-y-1 sm:w-52 sm:flex-none">
            <Label htmlFor="transit-delay-filter" className="text-xs">
              Duration deviation
            </Label>
            <Select
              value={filters.delayFilter || "ALL"}
              disabled={disabled}
              onValueChange={(value) =>
                onChange({
                  delayFilter:
                    value === "ALL" ? "" : transitDelaySchema.parse(value),
                  pageIndex: 1,
                })
              }
            >
              <SelectTrigger
                id="transit-delay-filter"
                className="h-9 w-full rounded-[2px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All measured transports</SelectItem>
                <SelectItem value="EARLY">Shorter than estimate</SelectItem>
                <SelectItem value="LATE_OVER_1_DAY">
                  Longer by &gt; 1 day
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 flex-1 basis-48 space-y-1 sm:w-52 sm:flex-none">
            <Label htmlFor="transit-sort" className="text-xs">
              Server sorting
            </Label>
            <Select
              value={filters.sortBy}
              disabled={disabled}
              onValueChange={(value) =>
                onChange({
                  sortBy: transitSortSchema.parse(value),
                  pageIndex: 1,
                })
              }
            >
              <SelectTrigger
                id="transit-sort"
                className="h-9 w-full rounded-[2px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {transitSortSchema.options.map((value) => (
                  <SelectItem key={value} value={value}>
                    {sorts[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="transit-size" className="text-xs">
              Rows
            </Label>
            <Select
              value={String(filters.pageSize)}
              disabled={disabled}
              onValueChange={(value) =>
                onChange({ pageSize: Number(value), pageIndex: 1 })
              }
            >
              <SelectTrigger
                id="transit-size"
                className="h-9 w-20 rounded-[2px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from(new Set([10, 20, 50, 100, filters.pageSize]))
                  .sort((a, b) => a - b)
                  .map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      {pending ? (
        <div
          role="status"
          aria-label={
            error ? "Transport rows unavailable" : "Loading transport rows"
          }
          className="space-y-2 py-2"
        >
          {error ? (
            <p className="m-0 py-4 text-center text-sm text-slate-500">
              Unable to load transport rows for this selection. Use Retry report
              above.
            </p>
          ) : (
            [1, 2, 3, 4].map((item) => (
              <Skeleton key={item} className="h-10 w-full" />
            ))
          )}
        </div>
      ) : report.items.length ? (
        <div className="min-w-0 rounded-[2px] border border-slate-200">
          <Table className="min-w-[1050px] text-xs">
            <TableCaption className="sr-only">
              Measured transports with actual and estimated durations in days;
              UTC departure and arrival timestamps
            </TableCaption>
            <TableHeader className="bg-stone-100">
              <TableRow>
                {[
                  "Transport",
                  "Origin → Destination",
                  "Departure (UTC)",
                  "Arrival (UTC)",
                  "Estimated days",
                  "Actual days",
                  "Deviation days",
                ].map((label, index) => (
                  <TableHead
                    key={label}
                    scope="col"
                    className={`${head} ${index >= 4 ? "text-right" : ""}`}
                  >
                    {label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.items.map((item) => (
                <TableRow key={item.transportId} className="even:bg-stone-50">
                  <TableCell className="px-3 py-3 font-medium">
                    <Link
                      to={`${ROLE_ROUTES.ongoingTransports}/${encodeURIComponent(item.transportId)}`}
                      state={{ from: returnUrl }}
                      className="text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      {item.transportCode}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-60 whitespace-normal break-words px-3">
                    {item.originCountry} → {item.destinationCountry}
                  </TableCell>
                  <TableCell className="px-3">
                    {reportTime(item.actualDepartureAt).replace(" UTC", "")}
                  </TableCell>
                  <TableCell className="px-3">
                    {reportTime(item.actualArrivalAt).replace(" UTC", "")}
                  </TableCell>
                  <TableCell className="px-3 text-right tabular-nums">
                    {reportNumber(item.estimatedDays)}
                  </TableCell>
                  <TableCell className="px-3 text-right tabular-nums">
                    {reportNumber(item.actualDays)}
                  </TableCell>
                  <TableCell
                    className={`px-3 text-right tabular-nums ${item.deltaDays < 0 ? "text-emerald-700" : item.deltaDays > 0 ? "text-amber-800" : "text-slate-700"}`}
                  >
                    {signedNumber(item.deltaDays)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p
          role="status"
          className="m-0 py-8 text-center text-sm text-slate-500"
        >
          No measured transports match this table selection on the current page.
          Report-wide KPIs, benchmarks or exclusions may still contain data.
        </p>
      )}
      {!pending && pageMissing ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>This page is outside the current result range.</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onChange({ pageIndex: 1 })}
          >
            Go to first page
          </Button>
        </div>
      ) : !pending ? (
        <div
          inert={disabled}
          className={disabled ? "pointer-events-none opacity-60" : ""}
        >
          <TablePagination
            meta={reportMeta(report)}
            onPageChange={(pageIndex) => onChange({ pageIndex })}
          />
        </div>
      ) : null}
    </section>
  );
}
