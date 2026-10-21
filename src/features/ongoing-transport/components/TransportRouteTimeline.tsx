import { useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleDot,
  Clock3,
  Route,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { formatTransportDate, formatTransportLabel } from "../format";
import { routeLabels, segmentLabels } from "../constants";
import { buildTransportTimeline } from "../timeline";
import type {
  TrackingSegment,
  TransportAudience,
  TransportSegments,
} from "../types";
import { TransportStaff } from "./TransportOverviewSections";
import { TransportHandoverBoundary } from "./TransportHandoverBoundary";

function SegmentSchedule({ segment }: { segment: TrackingSegment }) {
  const fields: [string, string | null][] = [
    ["Planned departure", segment.plannedDepartureAt],
    ["Actual departure", segment.actualDepartureAt],
    ["Planned arrival", segment.plannedArrivalAt],
    ["Actual arrival", segment.actualArrivalAt],
    ["Last updated", segment.updatedAt],
  ];
  return (
    <section
      className="overview-cell"
      aria-label={`Leg ${segment.displayOrder} schedule`}
    >
      <h3 className="m-0 text-sm font-semibold text-slate-800">
        Schedule &amp; locations
      </h3>
      <dl className="mt-4 mb-0 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-[11px] text-slate-500">{label}</dt>
            <dd className="mt-1 ml-0 text-xs font-medium tabular-nums text-slate-800">
              {formatTransportDate(value)}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-600">
        <p className="mt-0 mb-1 font-medium">
          From: {segment.fromLocation.locationName}
        </p>
        <p className="mt-0 mb-3">
          {[
            segment.fromLocation.city,
            segment.fromLocation.country,
            segment.fromLocation.locationType &&
              formatTransportLabel(segment.fromLocation.locationType),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className="mt-0 mb-1 font-medium">
          To: {segment.toLocation.locationName}
        </p>
        <p className="m-0">
          {[
            segment.toLocation.city,
            segment.toLocation.country,
            segment.toLocation.locationType &&
              formatTransportLabel(segment.toLocation.locationType),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    </section>
  );
}

function RouteLeg({ segment }: { segment: TrackingSegment }) {
  const [expanded, setExpanded] = useState(() => segment.isCurrent);
  const Icon =
    segment.status === "COMPLETED"
      ? Check
      : segment.status === "IN_TRANSIT"
        ? CircleDot
        : Clock3;
  return (
    <details
      className="route-leg overview-panel"
      data-status={segment.status}
      data-current={segment.isCurrent}
      open={expanded}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary className="route-leg-trigger list-none cursor-pointer px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        <div className="route-timeline-marker">
          <Icon aria-hidden="true" className="size-3.5" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-slate-900">
            <span className="text-[11px] tracking-wide text-slate-500 uppercase">
              Leg {segment.displayOrder}
            </span>
            <span className="break-words">
              {segment.fromLocation.locationName}
            </span>
            <ArrowRight
              aria-hidden="true"
              className="size-3.5 shrink-0 text-slate-400"
            />
            <span className="sr-only">to</span>
            <span className="break-words">
              {segment.toLocation.locationName}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {segment.isCurrent ? (
              <Badge
                variant="outline"
                className="rounded-xs border-blue-200 bg-blue-50 text-[10px] text-blue-800"
              >
                Current leg
              </Badge>
            ) : null}
            <Badge
              variant="outline"
              className="route-leg-status rounded-xs text-[10px]"
            >
              <Icon aria-hidden="true" className="size-3" />
              {segmentLabels[segment.status]}
            </Badge>
            <ChevronDown
              aria-hidden="true"
              className="route-leg-chevron size-4 text-slate-500"
            />
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span>
            {routeLabels[segment.routeType]} ·{" "}
            {formatTransportLabel(segment.transportMode)}
          </span>
          <span>
            {segment.distanceKm === null
              ? "Distance unavailable"
              : `${segment.distanceKm.toLocaleString()} km`}
          </span>
          <span className="break-words">
            {segment.routePlanCode} · Plan sequence {segment.sequenceNo}
          </span>
          {segment.isOutsourced ? (
            <span className="font-medium text-slate-700">
              Outsourced ·{" "}
              {segment.provider?.providerName ?? "Provider unavailable"}
            </span>
          ) : null}
        </div>
      </summary>
      <div className="grid divide-y divide-slate-100 border-t border-slate-100 md:grid-cols-2 md:divide-x md:divide-y-0">
        <SegmentSchedule segment={segment} />
        <TransportStaff segment={segment} />
      </div>
    </details>
  );
}

export function TransportRouteTimeline({
  data,
  audience,
}: {
  data: TransportSegments;
  audience: TransportAudience;
}) {
  const entries = buildTransportTimeline(
    data.segments,
    data.handoverBoundaries,
  );
  return (
    <section aria-labelledby="route-leg-tracking">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="route-leg-tracking" className="overview-heading">
            <Route aria-hidden="true" />
            Route leg tracking
          </h2>
          <p className="mt-1 mb-0 text-xs text-slate-500">
            Effective itinerary · includes returned PRIMARY / BACKUP / RETURN
            history
          </p>
        </div>
        <span className="text-xs tabular-nums text-slate-600">
          {
            data.segments.filter((segment) => segment.status === "COMPLETED")
              .length
          }{" "}
          completed / {data.segments.length} total
        </span>
      </div>
      {data.segments.length === 0 ? (
        <div
          className="overview-panel px-4 py-8 text-center text-sm text-slate-600"
          role="status"
        >
          <Route
            aria-hidden="true"
            className="mx-auto mb-2 size-6 text-slate-300"
          />
          No effective route legs available.
        </div>
      ) : data.handoverBoundaries.length === 0 ? (
        <p className="mb-3 text-xs text-slate-500">
          No handover boundaries returned.
        </p>
      ) : null}
      {entries.length > 0 ? (
        <div className="route-timeline mt-4 space-y-4">
          {entries.map((entry) =>
            entry.kind === "leg" ? (
              <RouteLeg
                key={`leg-${entry.segment.routePlanRouteId}`}
                segment={entry.segment}
              />
            ) : (
              <TransportHandoverBoundary
                key={`boundary-${entry.boundary.boundaryNo}`}
                boundary={entry.boundary}
                position={entry.position}
                audience={audience}
                segments={data.segments}
              />
            ),
          )}
        </div>
      ) : null}
    </section>
  );
}
