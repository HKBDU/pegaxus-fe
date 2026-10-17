import {
  ArrowRight,
  CalendarDays,
  Clock3,
  MapPin,
  Route,
  Truck,
} from "lucide-react";
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
      <div className="grid divide-y divide-slate-100 md:grid-cols-2 xl:grid-cols-4 xl:divide-x xl:divide-y-0">
        <div className="overview-cell">
          <h2 className="overview-heading">
            <MapPin aria-hidden="true" />
            Current segment
          </h2>
          {segment ? (
            <>
              <div className="mt-3 flex items-center gap-3 text-base font-semibold leading-snug text-slate-900">
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
              </div>
              <p className="mt-3 mb-0 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                <Route aria-hidden="true" className="size-3.5" />
                Leg {segment.displayOrder} / {overview.totalSegments}
                <span aria-hidden="true">·</span>
                {segmentLabels[segment.status]}
              </p>
              <span className="mt-1 block text-[11px] text-slate-500">
                {formatTransportLabel(segment.transportMode)}
              </span>
            </>
          ) : (
            <p className="mt-3 mb-0 text-sm text-slate-500">
              No current segment
            </p>
          )}
          <p className="mt-3 mb-0 text-xs text-slate-500">
            {overview.completedSegments} / {overview.totalSegments} legs
            completed
          </p>
        </div>
        <div className="overview-cell">
          <h2 className="overview-heading">
            <Truck aria-hidden="true" />
            Transport / Route
          </h2>
          <dl className="mt-3 mb-0 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <dt className="text-xs text-slate-500">Transport status</dt>
              <dd className="m-0">
                <OngoingTransportStatusBadge
                  status={overview.transport.status}
                />
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-xs text-slate-500">Route type</dt>
              <dd className="m-0">
                <Badge variant="secondary" className="rounded-xs text-[11px]">
                  {overview.routeType
                    ? routeLabels[overview.routeType]
                    : "Not available"}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-slate-500">Route plan</dt>
              <dd className="mt-1 ml-0 break-words text-xs font-medium text-slate-800">
                {overview.routePlan?.routePlanCode ?? "Not available"}
                {overview.routePlan ? (
                  <span className="mt-1 block text-[11px] font-normal text-slate-500">
                    {formatTransportLabel(overview.routePlan.status)}
                  </span>
                ) : null}
              </dd>
            </div>
          </dl>
        </div>
        <div className="overview-cell">
          <h2 className="overview-heading">
            <CalendarDays aria-hidden="true" />
            Journey schedule
          </h2>
          <dl className="mt-3 mb-0 space-y-3">
            <ScheduleValue
              label="Journey departure"
              value={overview.departureAt}
            />
            <ScheduleValue
              label="Actual departure"
              value={overview.transport.actualDepartureAt}
            />
          </dl>
        </div>
        <div className="overview-cell">
          <h2 className="overview-heading">
            <Clock3 aria-hidden="true" />
            Planned arrival
          </h2>
          <p className="mt-3 mb-0 text-base font-semibold tabular-nums text-slate-900">
            {formatTransportDate(overview.etaAt)}
          </p>
          <p className="mt-1 mb-3 text-[11px] text-slate-500">
            Overall journey plan · not GPS live ETA
          </p>
          <dl className="mb-0 space-y-3">
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
        </div>
      </div>
      {segment ? (
        <dl
          aria-label="Current leg schedule"
          className="m-0 grid grid-cols-2 gap-4 border-t border-slate-100 bg-slate-50/60 px-4 py-3 md:grid-cols-4"
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
