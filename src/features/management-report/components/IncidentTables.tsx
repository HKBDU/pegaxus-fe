import { Link } from "react-router-dom";
import { REPORT_MOCK_MODE } from "@/lib/report-mode";
import { incidentPaths } from "@/shared/constants/incident";
import { TablePagination } from "@/shared/components/common/TablePagination";
import { Badge } from "@/shared/components/ui/badge";
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
  incidentSortSchema,
  type IncidentFilters,
  type IncidentClaimReport,
} from "../schemas";
import {
  reportLabel,
  reportMoney,
  reportNumber,
  reportTime,
  reportMeta,
} from "../presentation";

const severityStyle = {
  LOW: "border-slate-200 bg-slate-50 text-slate-700",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-900",
  HIGH: "border-orange-200 bg-orange-50 text-orange-900",
  CRITICAL: "border-red-200 bg-red-50 text-red-800",
};
const head = "h-10 px-3 font-heading text-xs uppercase";

export function VehicleReliability({
  report,
}: {
  report: IncidentClaimReport;
}) {
  return (
    <section
      aria-labelledby="vehicle-reliability-heading"
      className="min-w-0 space-y-3 rounded-[2px] border border-slate-200 bg-white p-4"
    >
      <h2
        id="vehicle-reliability-heading"
        className="m-0 font-heading text-base uppercase"
      >
        Vehicle reliability
      </h2>
      {report.vehicleReliability.length ? (
        <div className="min-w-0 rounded-[2px] border border-slate-200">
          <Table className="min-w-[540px] text-xs">
            <TableCaption className="sr-only">
              Vehicle incidents and repair-required counts; no maintenance
              prediction
            </TableCaption>
            <TableHeader className="bg-stone-100">
              <TableRow>
                <TableHead className={head}>Vehicle</TableHead>
                <TableHead className={head}>License plate</TableHead>
                <TableHead className={`${head} text-right`}>
                  Incidents
                </TableHead>
                <TableHead className={`${head} text-right`}>
                  Repair required
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.vehicleReliability.map((vehicle) => (
                <TableRow key={vehicle.vehicleId} className="even:bg-stone-50">
                  <TableCell className="whitespace-normal px-3 py-3 font-medium">
                    {vehicle.vehicleCode}
                  </TableCell>
                  <TableCell className="px-3">
                    {vehicle.licensePlate ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 text-right tabular-nums">
                    {reportNumber(vehicle.incidentCount)}
                  </TableCell>
                  <TableCell className="px-3 text-right tabular-nums">
                    {reportNumber(vehicle.repairRequiredCount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p role="status" className="m-0 py-4 text-sm text-slate-500">
          No vehicle reliability records match these filters.
        </p>
      )}
    </section>
  );
}

export function IncidentDetailsTable({
  report,
  filters,
  onChange,
  returnUrl,
  pending,
  disabled,
  error,
}: {
  report: IncidentClaimReport;
  filters: IncidentFilters;
  onChange: (update: Partial<IncidentFilters>) => void;
  returnUrl: string;
  pending: boolean;
  disabled: boolean;
  error?: string;
}) {
  const pageMissing = report.pageIndex > Math.max(1, report.totalPages);
  return (
    <section
      aria-labelledby="incident-details-heading"
      aria-busy={pending}
      className="min-w-0 space-y-3 rounded-[2px] border border-slate-200 bg-white p-4"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2
            id="incident-details-heading"
            className="m-0 font-heading text-base uppercase"
          >
            Incident details
          </h2>
          <p className="mt-1 mb-0 max-w-xl text-xs text-slate-500">
            Claim codes refer to the same transport, not necessarily this
            incident. Incidents without a transport remain visible.
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <div className="min-w-0 flex-1 space-y-1 sm:w-48 sm:flex-none">
            <Label htmlFor="incident-report-sort" className="text-xs">
              Occurred at
            </Label>
            <Select
              disabled={disabled}
              value={filters.sortBy}
              onValueChange={(value) =>
                onChange({
                  sortBy: incidentSortSchema.parse(value),
                  pageIndex: 1,
                })
              }
            >
              <SelectTrigger
                id="incident-report-sort"
                className="h-9 w-full rounded-[2px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="occurredAt:desc">Newest first</SelectItem>
                <SelectItem value="occurredAt:asc">Oldest first</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="incident-report-size" className="text-xs">
              Rows
            </Label>
            <Select
              disabled={disabled}
              value={String(filters.pageSize)}
              onValueChange={(value) =>
                onChange({ pageSize: Number(value), pageIndex: 1 })
              }
            >
              <SelectTrigger
                id="incident-report-size"
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
            error ? "Incident rows unavailable" : "Loading incident rows"
          }
          className="space-y-2 py-2"
        >
          {error ? (
            <p className="m-0 py-4 text-center text-sm text-slate-500">
              Unable to load incident rows for this selection. Use Retry report
              above.
            </p>
          ) : (
            [1, 2, 3, 4].map((index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))
          )}
        </div>
      ) : report.items.length ? (
        <div className="min-w-0 rounded-[2px] border border-slate-200">
          <Table className="min-w-[1150px] text-xs">
            <TableCaption className="sr-only">
              Incident events in the selected period, with same-transport claim
              codes; UTC timestamps
            </TableCaption>
            <TableHeader className="bg-stone-100">
              <TableRow>
                {[
                  "Incident",
                  "Occurred at (UTC)",
                  "Category / type",
                  "Severity",
                  "Status",
                  "Transport",
                  "Approved cost (VND)",
                  "Same-transport claim codes",
                ].map((label, index) => (
                  <TableHead
                    key={label}
                    scope="col"
                    className={`${head} ${index === 6 ? "text-right" : ""}`}
                  >
                    {label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.items.map((incident) => (
                <TableRow
                  key={incident.incidentReportId}
                  className="even:bg-stone-50"
                >
                  <TableCell className="px-3 py-3 font-medium">
                    {REPORT_MOCK_MODE ? (
                      <span>{incident.incidentCode}</span>
                    ) : (
                      <Link
                        to={incidentPaths.detail(
                          "LM",
                          encodeURIComponent(incident.incidentReportId),
                        )}
                        state={{ from: returnUrl }}
                        className="text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        {incident.incidentCode}
                      </Link>
                    )}
                  </TableCell>
                  <TableCell className="px-3">
                    {reportTime(incident.occurredAt).replace(" UTC", "")}
                  </TableCell>
                  <TableCell className="max-w-56 whitespace-normal px-3">
                    <span>{reportLabel(incident.category)}</span>
                    <span className="mt-1 block text-[11px] text-slate-500">
                      {incident.incidentType === null
                        ? "—"
                        : reportLabel(incident.incidentType)}
                    </span>
                  </TableCell>
                  <TableCell className="px-3">
                    <Badge
                      variant="outline"
                      className={severityStyle[incident.severity]}
                    >
                      {reportLabel(incident.severity)}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-3">
                    <Badge variant="outline">
                      {reportLabel(incident.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-3">
                    {incident.transportCode ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 text-right tabular-nums">
                    {reportMoney(incident.emergencyCost)}
                  </TableCell>
                  <TableCell className="max-w-64 whitespace-normal px-3">
                    <div className="flex flex-wrap gap-1">
                      {incident.claimCodes.length
                        ? incident.claimCodes.map((code, index) => (
                            <span
                              key={`${code}-${index}`}
                              className="break-all text-[11px] text-slate-600"
                            >
                              {code}
                              {index < incident.claimCodes.length - 1
                                ? ","
                                : ""}
                            </span>
                          ))
                        : "—"}
                    </div>
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
          No incident events match this selection on the current page. Claim
          metrics or completed-transport KPIs may still contain data.
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
