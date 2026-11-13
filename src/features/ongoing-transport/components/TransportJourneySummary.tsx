import {
  ArrowRight,
  CalendarDays,
  Clock3,
  MapPin,
  Route,
  Truck,
} from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { formatTransportDate, formatTransportLabel } from "../format";
import { routeLabels, segmentLabels } from "../constants";
import type { TransportOverview } from "../types";
import { OngoingTransportStatusBadge } from "./OngoingTransportStatusBadge";

function ScheduleValue({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-slate-500">{label}</dt>
      <dd className="mt-1 ml-0 text-xs font-medium tabular-nums text-slate-800">
        {formatTransportDate(value)}
      </dd>
    </div>
  );
}

/**
 * Every summary cell follows the same rhythm (heading, one prominent value, a caption, then details pinned to the
 * bottom) so the four cells line up row by row instead of each using its own layout.
 */
function SummaryCell({
  icon: Icon,
  title,
  value,
  caption,
  footer,
}: {
  icon: typeof MapPin;
  title: string;
  value: ReactNode;
  caption?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="overview-cell flex flex-col">
      <h2 className="overview-heading">
        <Icon aria-hidden="true" />
        {title}
      </h2>
      <div className="mt-2 text-base font-semibold leading-snug text-slate-900">
        {value}
      </div>
      {caption ? (
        <div className="mt-1 text-[11px] leading-relaxed text-slate-500">
          {caption}
        </div>
      ) : null}
      {footer ? (
        <div className="mt-auto pt-3">
          <div className="border-t border-slate-100 pt-2.5">{footer}</div>
        </div>
      ) : null}
    </div>
  );
}

export function TransportJourneySummary({
  overview,
}: {
  overview: TransportOverview;
}) {
  const segment = overview.currentSegment;
  return (
    <section
      aria-label="Current journey and schedule"
      className="overview-panel"
    >
      <div className="grid divide-y divide-slate-100 md:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))] xl:divide-x xl:divide-y-0">
        <SummaryCell
          icon={MapPin}
          title="Current segment"
          value={
            segment ? (
              <span className="flex items-center gap-2">
                <span className="min-w-0 flex-1 break-words">
                  {segment.fromLocation.locationName}
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-slate-400"
                />
                <span className="sr-only">to</span>
                <span className="min-w-0 flex-1 break-words">
                  {segment.toLocation.locationName}
                </span>
              </span>
            ) : (
              <span className="text-sm font-normal text-slate-500">
                No current segment
              </span>
            )
          }
          caption={
            segment ? (
              <span className="flex flex-wrap items-center gap-1.5">
                <Route aria-hidden="true" className="size-3.5" />
                Leg {segment.displayOrder} / {overview.totalSegments}
                <span aria-hidden="true">·</span>
                {segmentLabels[segment.status]}
                <span aria-hidden="true">·</span>
                {formatTransportLabel(segment.transportMode)}
              </span>
            ) : undefined
          }
          footer={
            <p className="m-0 text-xs text-slate-600">
              <span className="font-semibold tabular-nums text-slate-800">
                {overview.completedSegments} / {overview.totalSegments}
              </span>{" "}
              legs completed
            </p>
          }
        />
        <SummaryCell
          icon={Truck}
          title="Transport / Route"
          value={
            <span className="break-words">
              {overview.routePlan?.routePlanCode ?? "Not available"}
            </span>
          }
          caption={
            overview.routePlan
              ? `Route plan · ${formatTransportLabel(overview.routePlan.status)}`
              : "Route plan"
          }
          footer={
            <dl className="m-0 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <dt className="text-[11px] text-slate-500">Transport status</dt>
                <dd className="m-0">
                  <OngoingTransportStatusBadge
                    status={overview.transport.status}
                  />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-[11px] text-slate-500">Route type</dt>
                <dd className="m-0">
                  <Badge variant="secondary" className="rounded-xs text-[11px]">
                    {overview.routeType
                      ? routeLabels[overview.routeType]
                      : "Not available"}
                  </Badge>
                </dd>
              </div>
            </dl>
          }
        />
        <SummaryCell
          icon={CalendarDays}
          title="Journey departure"
          value={
            <span className="tabular-nums">
              {formatTransportDate(overview.departureAt)}
            </span>
          }
          caption="Planned departure of the journey"
          footer={
            <dl className="m-0">
              <ScheduleValue
                label="Actual departure"
                value={overview.transport.actualDepartureAt}
              />
            </dl>
          }
        />
        <SummaryCell
          icon={Clock3}
          title="Planned arrival"
          value={
            <span className="tabular-nums">
              {formatTransportDate(overview.etaAt)}
            </span>
          }
          caption="Overall journey plan · not GPS live ETA"
          footer={
            <dl className="m-0 space-y-1.5">
              <ScheduleValue
                label="Actual journey arrival"
                value={overview.transport.actualArrivalAt}
              />
              {overview.transport.completedAt ? (
                <ScheduleValue
                  label="Journey completed"
                  value={overview.transport.completedAt}
                />
              ) : null}
            </dl>
          }
        />
      </div>
      {segment ? (
        <dl
          aria-label="Current leg schedule"
          className="m-0 grid grid-cols-2 gap-3 border-t border-slate-100 bg-slate-50/60 px-3 py-2 md:grid-cols-4"
        >
          <ScheduleValue
            label="Leg planned departure"
            value={segment.plannedDepartureAt}
          />
          <ScheduleValue
            label="Leg planned arrival"
            value={segment.plannedArrivalAt}
          />
          <ScheduleValue
            label="Leg actual departure"
            value={segment.actualDepartureAt}
          />
          <ScheduleValue
            label="Leg actual arrival"
            value={segment.actualArrivalAt}
          />
        </dl>
      ) : null}
    </section>
  );
}
