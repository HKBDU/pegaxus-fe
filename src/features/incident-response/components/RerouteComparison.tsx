import type { ReactNode } from "react";
import { ArrowRight, ChevronDown, CircleDot, MapPin, X } from "lucide-react";
import { Link } from "react-router-dom";
import { routePlanDetail } from "@/app/route-config";
import { Section } from "@/features/transport-plan/components/ApprovedBookingDetails";
import { formatPlanDate } from "@/features/transport-plan/format";
import { distanceLabel, durationLabel } from "@/features/route-view/display";
import { Badge } from "@/shared/components/ui/badge";
import {
  rerouteIncidentIdSchema,
  type RerouteContext,
  type ReroutePlan,
} from "../reroute-schemas";
import { isEmergencyCostMockMode } from "../source";

const checkLabels: Record<string, string> = {
  DRIVING_HOURS_BR033: "Driving hours · BR-033",
  REST_STOP_24H_BR034: "Required rest stop · BR-034",
};
const checkLabel = (code: string) =>
  checkLabels[code] ?? code.replaceAll("_", " ");

export const statusLabel = (value: string) => value.replaceAll("_", " ");

export const rerouteLinkClass =
  "inline-flex min-h-11 items-center text-sm font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:min-h-8";

export const rerouteEyebrowClass =
  "m-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500";

/** "+1h 30m", "−45m" or "On time" from a delay in minutes. */
function etaDifference(minutes: number | null | undefined) {
  if (minutes == null) return "Not provided";
  if (minutes === 0) return "On time";
  return (minutes > 0 ? "+" : "−") + durationLabel(Math.abs(minutes));
}

/** Shows only the checks that failed: passed checks need no action from the reader. */
export function RerouteChecks({ checks }: { checks: ReroutePlan["checks"] }) {
  const failed = checks.filter((check) => !check.passed);
  if (failed.length === 0) return null;
  return (
    <ul className="m-0 list-none space-y-2 p-0">
      {failed.map((check, index) => (
        <li
          key={check.code + "-" + index}
          className="flex items-start gap-2 text-sm text-red-700"
        >
          <X aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <div className="min-w-0 [overflow-wrap:anywhere]">
            <p className="m-0 font-medium">Failed · {checkLabel(check.code)}</p>
            <p className="m-0 leading-5">{check.message}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function RouteLine({
  from,
  to,
  className = "",
}: {
  from?: string | null;
  to?: string | null;
  className?: string;
}) {
  return (
    <span
      className={
        "inline-flex min-w-0 flex-wrap items-center gap-x-1.5 [overflow-wrap:anywhere] " +
        className
      }
    >
      <span>{from ?? "Location not provided"}</span>
      <ArrowRight aria-hidden="true" className="size-3.5 shrink-0 text-slate-400" />
      <span className="sr-only">to</span>
      <span>{to ?? "Location not provided"}</span>
    </span>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-[2px] bg-white px-2.5 py-2 ring-1 ring-slate-200">
      <dt className="text-[11px] font-medium text-slate-500">{label}</dt>
      <dd className="m-0 mt-0.5 text-sm font-semibold leading-5 text-slate-900 [overflow-wrap:anywhere]">
        {children}
      </dd>
    </div>
  );
}

function TimelineTime({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-wrap gap-x-1">
      <dt>{label}</dt>
      <dd className="m-0 text-slate-700">{value}</dd>
    </div>
  );
}

export function RerouteComparison({ context }: { context: RerouteContext }) {
  const real = !isEmergencyCostMockMode();
  const current = context.currentSegment;
  const segments = [
    ...(current ? [current] : []),
    ...context.remainingSegments,
  ];
  const canOpen = (id: string) =>
    real && rerouteIncidentIdSchema.safeParse(id).success;
  return (
    <Section title="Route assessment">
      <div className="space-y-4">
        <div className="space-y-1.5 rounded-[2px] border border-slate-200 bg-white p-3">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <p className={rerouteEyebrowClass}>
              {current ? "Current " + current.routeType : "Current route"}
            </p>
            {current && canOpen(current.routePlanId) && (
              <Link
                to={routePlanDetail(current.routePlanId)}
                className={rerouteLinkClass}
              >
                Open route plan
              </Link>
            )}
          </div>
          {current ? (
            <>
              <RouteLine
                from={current.fromLocation?.locationName}
                to={current.toLocation?.locationName}
                className="text-sm font-semibold text-slate-900"
              />
              <p className="m-0 text-xs text-slate-500">
                Segment {current.sequenceNo} · {statusLabel(current.status)}
              </p>
            </>
          ) : (
            <p className="m-0 text-sm text-slate-500">
              No current segment provided.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="m-0! flex items-center gap-2 font-heading text-sm! uppercase tracking-wide text-slate-900">
            Backup alternatives
            <Badge variant="outline" className="rounded-[2px] text-xs">
              {context.backupPlans.length}
            </Badge>
          </h3>
          {context.backupPlans.length === 0 && (
            <p className="m-0 text-sm text-slate-500">
              No backup plans provided.
            </p>
          )}
          {context.backupPlans.map((plan) => (
            <article
              key={plan.routePlanId}
              aria-label={"Backup " + plan.routePlanCode}
              className="min-w-0 space-y-3 rounded-[2px] border border-slate-200 bg-slate-50/70 p-3 [overflow-wrap:anywhere]"
            >
              <header className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h4 className="m-0! font-sans text-sm! font-semibold! text-slate-900">
                    {plan.routePlanCode}
                  </h4>
                  <Badge
                    variant="outline"
                    className="max-w-full whitespace-normal rounded-[2px] bg-white text-xs"
                  >
                    {statusLabel(plan.status)}
                  </Badge>
                </div>
                <Badge
                  variant="outline"
                  className={
                    "max-w-full whitespace-normal rounded-[2px] text-xs " +
                    (plan.isAvailable
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-amber-200 bg-amber-50 text-amber-900")
                  }
                >
                  {plan.isAvailable ? "Available" : "Unavailable"}
                </Badge>
              </header>
              {plan.unavailableReason && (
                <p className="m-0 text-sm font-medium leading-5 text-amber-900">
                  {statusLabel(plan.unavailableReason)}
                </p>
              )}
              {(plan.branchLocation || plan.branchSequenceNo != null) && (
                <p className="m-0 flex items-start gap-1.5 text-sm text-slate-600">
                  <MapPin
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-slate-400"
                  />
                  <span>
                    Leaves the current route at{" "}
                    <span className="font-medium text-slate-800">
                      {plan.branchLocation?.locationName ??
                        "a location not provided"}
                    </span>
                    {plan.branchSequenceNo != null
                      ? " (segment " + plan.branchSequenceNo + ")"
                      : ""}
                  </span>
                </p>
              )}
              <dl className="m-0 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="Distance">
                  {plan.totalDistanceKm == null
                    ? "Not provided"
                    : distanceLabel(plan.totalDistanceKm)}
                </Stat>
                <Stat label="Travel time">
                  {plan.estimatedDurationMinutes == null
                    ? "Not provided"
                    : durationLabel(plan.estimatedDurationMinutes)}
                </Stat>
                <Stat label="ETA difference">
                  {etaDifference(plan.etaDelayMinutes)}
                </Stat>
                <Stat label="Planned arrival">
                  {plan.plannedArrivalAt
                    ? formatPlanDate(plan.plannedArrivalAt)
                    : "Not provided"}
                </Stat>
              </dl>
              <RerouteChecks checks={plan.checks} />
              {canOpen(plan.routePlanId) && (
                <div className="flex justify-end">
                  <Link
                    to={routePlanDetail(plan.routePlanId)}
                    className={rerouteLinkClass}
                  >
                    Open route plan
                  </Link>
                </div>
              )}
            </article>
          ))}
        </div>

        <details className="group border-t border-slate-200 pt-2">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-[2px] text-sm font-medium text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
            Route timeline
            <span className="text-xs font-normal text-slate-500">
              ({segments.length} segments)
            </span>
            <ChevronDown
              aria-hidden="true"
              className="ml-auto size-4 shrink-0 group-open:rotate-180"
            />
          </summary>
          {segments.length ? (
            <ol
              aria-label="Current and remaining effective segments"
              className="m-0 mt-2 space-y-3 border-l border-slate-200 pl-4"
            >
              {segments.map((segment, index) => {
                const running = index === 0 && Boolean(current);
                return (
                  <li
                    key={segment.routePlanRouteId}
                    className="relative min-w-0 space-y-1 text-sm [overflow-wrap:anywhere]"
                  >
                    <CircleDot
                      aria-hidden="true"
                      className={
                        "absolute top-0.5 -left-[23px] size-3 bg-white " +
                        (running ? "text-primary" : "text-slate-400")
                      }
                    />
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <RouteLine
                        from={segment.fromLocation?.locationName}
                        to={segment.toLocation?.locationName}
                        className="font-medium text-slate-800"
                      />
                      {running && (
                        <Badge className="rounded-[2px] text-[11px]">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="m-0 text-xs text-slate-500">
                      {segment.routeType} · Segment {segment.sequenceNo} ·{" "}
                      {statusLabel(segment.status)}
                    </p>
                    <dl className="m-0 grid gap-x-4 gap-y-0.5 text-xs text-slate-500 sm:grid-cols-3">
                      <TimelineTime
                        label="Planned arrival:"
                        value={
                          segment.plannedArrivalAt
                            ? formatPlanDate(segment.plannedArrivalAt)
                            : "Not provided"
                        }
                      />
                      {segment.actualDepartureAt && (
                        <TimelineTime
                          label="Departed:"
                          value={formatPlanDate(segment.actualDepartureAt)}
                        />
                      )}
                      {segment.actualArrivalAt && (
                        <TimelineTime
                          label="Arrived:"
                          value={formatPlanDate(segment.actualArrivalAt)}
                        />
                      )}
                    </dl>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="m-0 py-2 text-sm text-slate-500">
              No current or remaining segments provided.
            </p>
          )}
        </details>
      </div>
    </Section>
  );
}
