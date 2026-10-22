import { Check, ChevronDown, CircleDot, X } from "lucide-react";
import { Link } from "react-router-dom";
import { routePlanDetail } from "@/app/route-config";
import {
  Section,
  Field,
} from "@/features/transport-plan/components/ApprovedBookingDetails";
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

export function RerouteChecks({ checks }: { checks: ReroutePlan["checks"] }) {
  const failed = checks.filter((check) => !check.passed);
  const passed = checks.filter((check) => check.passed);
  const renderChecks = (items: ReroutePlan["checks"]) => (
    <ul className="m-0 list-none space-y-2 p-0">
      {items.map((check, index) => {
        const Icon = check.passed ? Check : X;
        return (
          <li
            key={check.code + "-" + index}
            className={
              "flex items-start gap-2 text-sm " +
              (check.passed ? "text-slate-600" : "text-red-700")
            }
          >
            <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <div className="min-w-0 [overflow-wrap:anywhere]">
              <p className="m-0 font-medium">
                {check.passed ? "Passed" : "Failed"} · {checkLabel(check.code)}
              </p>
              <p className="m-0 leading-5">{check.message}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
  return (
    <div className="space-y-2">
      {failed.length > 0 && renderChecks(failed)}
      {passed.length > 0 && (
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-[2px] text-sm text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:min-h-9 [&::-webkit-details-marker]:hidden">
            <Check aria-hidden="true" className="size-4 text-emerald-700" />
            {passed.length} passed {passed.length === 1 ? "check" : "checks"}
            <ChevronDown
              aria-hidden="true"
              className="ml-auto size-4 shrink-0 group-open:rotate-180"
            />
          </summary>
          <div className="pt-2">{renderChecks(passed)}</div>
        </details>
      )}
      {checks.length === 0 && (
        <p className="m-0 text-sm text-slate-500">
          No feasibility checks provided.
        </p>
      )}
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
  return (
    <Section title="Route assessment">
      <div className="space-y-3">
        <div className="space-y-2 border-b border-slate-200 pb-3">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <h3 className="m-0! font-heading text-base! uppercase text-slate-900">
              {current ? "Current " + current.routeType : "Current route"}
            </h3>
            {real &&
              current &&
              rerouteIncidentIdSchema.safeParse(current.routePlanId)
                .success && (
                <Link
                  to={routePlanDetail(current.routePlanId)}
                  className="inline-flex min-h-11 items-center text-sm font-medium underline decoration-primary/50 underline-offset-4 hover:decoration-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:min-h-9"
                >
                  View current RoutePlan
                </Link>
              )}
          </div>
          {current ? (
            <>
              <p className="m-0 text-sm text-slate-700">
                Segment {current.sequenceNo} ·{" "}
                {current.status.replaceAll("_", " ")}
              </p>
              <p className="m-0 text-xs leading-5 text-slate-500">
                Route-level distance, duration and feasibility checks are not
                included with this segment.
              </p>
            </>
          ) : (
            <p className="m-0 text-sm text-slate-500">
              No current segment provided.
            </p>
          )}
        </div>

        <h3 className="m-0! font-heading text-base! uppercase text-slate-900">
          BACKUP alternatives{" "}
          <span className="text-slate-500">({context.backupPlans.length})</span>
        </h3>
        {context.backupPlans.length === 0 && (
          <p className="m-0 text-sm text-slate-500">
            No BACKUP plans provided.
          </p>
        )}
        {context.backupPlans.map((plan) => (
          <article
            key={plan.routePlanId}
            aria-label={"BACKUP " + plan.routePlanCode}
            className="min-w-0 space-y-3 border-l-2 border-slate-200 bg-slate-50/70 p-3 [overflow-wrap:anywhere]"
          >
            <header className="flex min-w-0 flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 space-y-1.5">
                <h4 className="m-0! break-words font-sans text-sm! font-semibold! text-slate-900">
                  {plan.routePlanCode}
                </h4>
                <p className="m-0 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                  Plan status
                  <Badge
                    variant="outline"
                    className="max-w-full whitespace-normal rounded-[2px] bg-white text-xs"
                  >
                    {plan.status.replaceAll("_", " ")}
                  </Badge>
                </p>
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
                {plan.unavailableReason.replaceAll("_", " ")}
              </p>
            )}
            <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-3 [&_dt]:text-xs">
              <Field label="Distance">
                {plan.totalDistanceKm == null
                  ? "Not provided"
                  : distanceLabel(plan.totalDistanceKm)}
              </Field>
              <Field label="Travel time">
                {plan.estimatedDurationMinutes == null
                  ? "Not provided"
                  : durationLabel(plan.estimatedDurationMinutes)}
              </Field>
              <Field label="ETA difference">
                {plan.etaDelayMinutes == null
                  ? "Not provided"
                  : (plan.etaDelayMinutes > 0 ? "+" : "") +
                    plan.etaDelayMinutes.toLocaleString("en-GB") +
                    " min"}
              </Field>
              <div className="col-span-2 sm:col-span-3">
                <Field label="Planned arrival">
                  {plan.plannedArrivalAt
                    ? formatPlanDate(plan.plannedArrivalAt)
                    : "Not provided"}
                </Field>
              </div>
            </dl>
            {(plan.branchLocation || plan.branchSequenceNo != null) && (
              <p className="m-0 text-sm text-slate-600">
                Branch:{" "}
                {plan.branchLocation?.locationName ?? "Location not provided"}
                {plan.branchSequenceNo != null
                  ? " · Segment " + plan.branchSequenceNo
                  : ""}
              </p>
            )}
            <RerouteChecks checks={plan.checks} />
            {real &&
              rerouteIncidentIdSchema.safeParse(plan.routePlanId).success && (
                <Link
                  to={routePlanDetail(plan.routePlanId)}
                  className="inline-flex min-h-11 items-center text-sm font-medium underline decoration-primary/50 underline-offset-4 hover:decoration-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:min-h-9"
                >
                  View RoutePlan details
                </Link>
              )}
          </article>
        ))}

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
              className="m-0 mt-2 space-y-4 border-l border-slate-200 pl-4"
            >
              {segments.map((segment, index) => (
                <li
                  key={segment.routePlanRouteId}
                  className="relative min-w-0 space-y-1 text-sm [overflow-wrap:anywhere]"
                >
                  <CircleDot
                    aria-hidden="true"
                    className={
                      "absolute top-0.5 -left-[23px] size-3 bg-white " +
                      (index === 0 && current
                        ? "text-primary"
                        : "text-slate-400")
                    }
                  />
                  <p className="m-0 font-medium text-slate-800">
                    {index === 0 && current ? "Current · " : ""}
                    {segment.fromLocation?.locationName ??
                      "Location not provided"}{" "}
                    →{" "}
                    {segment.toLocation?.locationName ??
                      "Location not provided"}
                  </p>
                  <p className="m-0 text-xs text-slate-500">
                    {segment.routeType} · Segment {segment.sequenceNo} ·{" "}
                    {segment.status.replaceAll("_", " ")}
                  </p>
                  <p className="m-0 text-xs text-slate-500">
                    Planned arrival:{" "}
                    {segment.plannedArrivalAt
                      ? formatPlanDate(segment.plannedArrivalAt)
                      : "Not provided"}
                  </p>
                  {segment.actualDepartureAt && (
                    <p className="m-0 text-xs text-slate-500">
                      Departed: {formatPlanDate(segment.actualDepartureAt)}
                    </p>
                  )}
                  {segment.actualArrivalAt && (
                    <p className="m-0 text-xs text-slate-500">
                      Arrived: {formatPlanDate(segment.actualArrivalAt)}
                    </p>
                  )}
                </li>
              ))}
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
