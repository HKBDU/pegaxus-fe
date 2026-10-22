import { Check, CircleDot, X } from "lucide-react";
import { Section } from "@/features/transport-plan/components/ApprovedBookingDetails";
import { formatPlanDate } from "@/features/transport-plan/format";
import { distanceLabel, durationLabel } from "@/features/route-view/display";
import { EmptyState } from "@/shared/components/common";
import { Badge } from "@/shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import type { RerouteContext } from "../reroute-schemas";

export function RerouteComparison({ context }: { context: RerouteContext }) {
  const segments = [
    ...(context.currentSegment ? [context.currentSegment] : []),
    ...context.remainingSegments,
  ];
  return (
    <Section title="02. Route Comparison">
      <div className="min-w-0 space-y-4">
        {segments.length ? (
          <ol
            aria-label="Current and remaining effective segments"
            className="m-0 space-y-3 border-l border-slate-200 pl-4"
          >
            {segments.map((segment, index) => (
              <li
                key={segment.routePlanRouteId}
                className="relative min-w-0 space-y-1 text-xs"
              >
                <CircleDot
                  aria-hidden="true"
                  className={`absolute top-0.5 -left-[23px] size-3 bg-white ${index === 0 && context.currentSegment ? "text-primary" : "text-slate-400"}`}
                />
                <p className="m-0 break-words font-medium text-slate-800">
                  {segment.fromLocation?.locationName ?? "Location unavailable"}{" "}
                  → {segment.toLocation?.locationName ?? "Location unavailable"}
                </p>
                <p className="m-0 break-words text-[11px] text-slate-500">
                  {segment.routeType} · Segment {segment.sequenceNo} ·{" "}
                  {segment.status.replaceAll("_", " ")}
                </p>
                <p className="m-0 text-[11px] text-slate-500">
                  Planned arrival: {formatPlanDate(segment.plannedArrivalAt)}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState message="No current or remaining effective segments are supplied." />
        )}

        <Table className="table-fixed text-xs">
          <TableHeader className="bg-[#e9e6de]">
            <TableRow>
              {["Route", "Distance / Timing", "Availability / Checks"].map(
                (title) => (
                  <TableHead
                    key={title}
                    scope="col"
                    className="h-11 whitespace-normal break-words px-2.5 font-heading text-[11px] uppercase tracking-[0.06em] text-gray-600"
                  >
                    {title}
                  </TableHead>
                ),
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="bg-white">
              <TableCell className="whitespace-normal break-words px-2.5 py-2 align-top font-medium">
                PRIMARY
              </TableCell>
              <TableCell className="whitespace-normal px-2.5 py-2 align-top">
                —
              </TableCell>
              <TableCell className="whitespace-normal break-words px-2.5 py-2 align-top text-slate-500">
                Route-level metrics and checks are not supplied by RT1.
              </TableCell>
            </TableRow>
            {context.backupPlans.map((plan, index) => (
              <TableRow
                key={plan.routePlanId}
                className={index % 2 === 0 ? "bg-[#f7f6f3]" : "bg-white"}
              >
                <TableCell className="space-y-2 whitespace-normal break-words px-2.5 py-2 align-top">
                  <p className="m-0 text-[11px] text-slate-500">BACKUP</p>
                  <p className="m-0 font-semibold">{plan.routePlanCode}</p>
                  <Badge
                    variant="outline"
                    className="max-w-full whitespace-normal break-words rounded-[2px] text-[10px]"
                  >
                    {plan.status.replaceAll("_", " ")}
                  </Badge>
                  <p className="m-0 text-[11px] text-slate-500">
                    Branch: {plan.branchLocation?.locationName ?? "—"}
                    {plan.branchSequenceNo != null
                      ? ` · Segment ${plan.branchSequenceNo}`
                      : ""}
                  </p>
                </TableCell>
                <TableCell className="space-y-1 whitespace-normal break-words px-2.5 py-2 align-top tabular-nums">
                  <p className="m-0">{distanceLabel(plan.totalDistanceKm)}</p>
                  <p className="m-0">
                    {durationLabel(plan.estimatedDurationMinutes)}
                  </p>
                  <p className="m-0">
                    ETA Δ:{" "}
                    {plan.etaDelayMinutes == null
                      ? "—"
                      : `${plan.etaDelayMinutes > 0 ? "+" : ""}${plan.etaDelayMinutes.toLocaleString("en-GB")} min`}
                  </p>
                  <p className="m-0 text-[11px] text-slate-500">
                    Planned arrival: {formatPlanDate(plan.plannedArrivalAt)}
                  </p>
                </TableCell>
                <TableCell className="space-y-2 whitespace-normal break-words px-2.5 py-2 align-top">
                  <p
                    className={`m-0 font-medium ${plan.isAvailable ? "text-emerald-700" : "text-amber-800"}`}
                  >
                    {plan.isAvailable ? "Available" : "Unavailable"}
                  </p>
                  {plan.unavailableReason && (
                    <p className="m-0 text-[11px] text-amber-800">
                      {plan.unavailableReason.replaceAll("_", " ")}
                    </p>
                  )}
                  {plan.checks.length ? (
                    <ul className="m-0 list-none space-y-2 p-0">
                      {plan.checks.map((check, checkIndex) => {
                        const Icon = check.passed ? Check : X;
                        return (
                          <li
                            key={`${check.code}-${checkIndex}`}
                            className={`flex items-start gap-1 text-[11px] ${check.passed ? "text-slate-600" : "text-red-700"}`}
                          >
                            <Icon
                              aria-hidden="true"
                              className="mt-0.5 size-3 shrink-0"
                            />
                            <span className="min-w-0 break-words">
                              <span className="font-medium">
                                {check.passed ? "Passed" : "Failed"} ·{" "}
                                {check.code.replaceAll("_", " ")}
                              </span>
                              <span className="block">{check.message}</span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="m-0 text-[11px] text-slate-500">
                      No checks supplied.
                    </p>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!context.backupPlans.length && (
          <p className="m-0 text-xs text-slate-500">
            No BACKUP plans are supplied.
          </p>
        )}
      </div>
    </Section>
  );
}
