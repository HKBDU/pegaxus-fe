import { Link } from "react-router-dom";
import { ROLE_ROUTES } from "@/app/route-config";
import { TablePagination } from "@/shared/components/common/TablePagination";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  bucketLabels,
  causeLabels,
  reportMeta,
  reportTime,
  signedNumber,
} from "../presentation";
import {
  bucketSchema,
  sortSchema,
  type OnTimeReport,
  type ReportFilters,
} from "../schemas";

const sorts = {
  "delayMinutes:desc": "Delay: highest first",
  "delayMinutes:asc": "Delay: lowest first",
  "completedAt:desc": "Completed: newest first",
  "completedAt:asc": "Completed: oldest first",
};
export function TransportReportTable({
  report,
  filters,
  onChange,
  returnUrl,
  pending,
  disabled,
  tableError,
}: {
  report: OnTimeReport;
  filters: ReportFilters;
  onChange: (update: Partial<ReportFilters>) => void;
  returnUrl: string;
  pending: boolean;
  disabled: boolean;
  tableError?: string;
}) {
  const pageMissing = report.pageIndex > Math.max(1, report.totalPages);
  return (
    <section
      className="min-w-0 space-y-3 rounded-[2px] border border-slate-200 bg-white p-4"
      aria-labelledby="transport-details-heading"
      aria-busy={pending}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="transport-details-heading"
            className="m-0 font-heading text-base uppercase"
          >
            Transport details
          </h2>
          <p className="mt-1 mb-0 text-xs text-slate-500">
            Bucket and sorting affect this table only. KPI and chart totals
            remain report-wide.
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <div className="min-w-0 flex-1 space-y-1 sm:w-44 sm:flex-none">
            <Label htmlFor="report-bucket" className="text-xs">
              Table bucket
            </Label>
            <Select
              value={filters.bucket || "DELAYED"}
              disabled={disabled}
              onValueChange={(value) =>
                onChange({
                  bucket: value === "DELAYED" ? "" : bucketSchema.parse(value),
                  pageIndex: 1,
                })
              }
            >
              <SelectTrigger
                id="report-bucket"
                className="h-9 w-full rounded-[2px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DELAYED">Delayed (default)</SelectItem>
                <SelectItem value="ON_TIME">On time</SelectItem>
                <SelectItem value="MINOR_DELAY">Minor delay</SelectItem>
                <SelectItem value="MAJOR_DELAY">Major delay</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 flex-1 space-y-1 sm:w-48 sm:flex-none">
            <Label htmlFor="report-sort" className="text-xs">
              Server sorting
            </Label>
            <Select
              value={filters.sortBy}
              disabled={disabled}
              onValueChange={(value) =>
                onChange({ sortBy: sortSchema.parse(value), pageIndex: 1 })
              }
            >
              <SelectTrigger
                id="report-sort"
                className="h-9 w-full rounded-[2px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(sorts) as (keyof typeof sorts)[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {sorts[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="report-page-size" className="text-xs">
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
                id="report-page-size"
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
            tableError ? "Transport rows unavailable" : "Loading transport rows"
          }
          className="space-y-2 py-2"
        >
          {tableError ? (
            <p className="m-0 py-4 text-center text-sm text-slate-500">
              Unable to load rows for this table selection. Use Retry report
              above.
            </p>
          ) : (
            [1, 2, 3, 4].map((row) => (
              <Skeleton key={row} className="h-10 w-full" />
            ))
          )}
        </div>
      ) : report.items.length ? (
        <div className="min-w-0 rounded-[2px] border border-slate-200">
          <Table className="min-w-[1080px] text-xs">
            <TableCaption className="sr-only">
              Completed transports for the selected table bucket; all timestamps
              are UTC
            </TableCaption>
            <TableHeader className="bg-stone-100">
              <TableRow>
                {[
                  "Transport",
                  "Booking",
                  "Origin → Destination",
                  "Planned end (UTC)",
                  "Actual arrival (UTC)",
                  "Deviation (min)",
                  "Bucket",
                  "Main cause",
                ].map((label, index) => (
                  <TableHead
                    scope="col"
                    key={label}
                    className={`h-10 px-3 font-heading text-xs uppercase ${index === 5 ? "text-right" : ""}`}
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
                  <TableCell className="px-3">{item.bookingCode}</TableCell>
                  <TableCell className="max-w-52 whitespace-normal px-3">
                    {item.originCountry} → {item.destinationCountry}
                  </TableCell>
                  <TableCell className="px-3">
                    {reportTime(item.plannedEndAt).replace(" UTC", "")}
                  </TableCell>
                  <TableCell className="px-3">
                    {reportTime(item.actualArrivalAt).replace(" UTC", "")}
                  </TableCell>
                  <TableCell className="px-3 text-right tabular-nums">
                    {signedNumber(item.delayMinutes)}
                  </TableCell>
                  <TableCell className="px-3">
                    <Badge
                      variant="outline"
                      className={
                        item.bucket === "ON_TIME"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : item.bucket === "MAJOR_DELAY"
                            ? "border-red-200 bg-red-50 text-red-800"
                            : "border-amber-200 bg-amber-50 text-amber-900"
                      }
                    >
                      {bucketLabels[item.bucket]}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-3">
                    {item.mainCause === null
                      ? "—"
                      : causeLabels[item.mainCause]}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div role="status" className="py-8 text-center text-sm text-slate-500">
          No transports match this table bucket on the selected page.
          Report-wide results above may still contain measured trips.
        </div>
      )}
      {!pending && pageMissing ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>This page is outside the current result range.</span>
          <Button
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
          className={disabled ? "pointer-events-none opacity-60" : ""}
          inert={disabled}
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
