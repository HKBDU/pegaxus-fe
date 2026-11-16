import { useParams } from "react-router-dom";
import { BackButton } from "@/shared/components/BackButton";
import { getPostLoginPath } from "@/app/route-config";
import { canAccess } from "@/features/auth/access-control";
import { Field } from "@/features/transport-plan/components/ApprovedBookingDetails";
import { formatPlanDate } from "@/features/transport-plan/format";
import { ErrorState } from "@/shared/components/common";
import {
  CategoryBadge,
  SeverityBadge,
  StatusBadge,
} from "@/shared/components/incident";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  RerouteComparison,
  RouteLine,
  rerouteEyebrowClass,
  statusLabel,
} from "../components/RerouteComparison";
import {
  RerouteDecisionContext,
  RerouteDecisionOptions,
} from "../components/RerouteDecisionContext";
import { useRerouteContext } from "../hooks/useRerouteContext";
import { getRerouteError } from "../reroute-services";
import { RerouteEscalationAction } from "../components/RerouteEscalationAction";
import { RerouteHoldAction } from "../components/RerouteHoldAction";

export default function EmergencyReroutePage() {
  const { incidentReportId } = useParams<{ incidentReportId: string }>();
  const query = useRerouteContext(incidentReportId);
  const manager = canAccess(query.principal, {
    anyRole: ["LOGISTICS_MANAGER"],
  });
  const error = query.isError ? getRerouteError(query.error) : null;
  const data =
    query.allowed && query.validId && !query.isError ? query.data : undefined;
  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl space-y-3 p-3 font-sans sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <BackButton
          to={getPostLoginPath(
            manager ? "LOGISTICS_MANAGER" : "FLEET_ROUTE_COORDINATOR",
          )}
        >
          Workspace
        </BackButton>
      </div>
      <header className="min-w-0 space-y-3 rounded-[2px] border border-slate-200 border-l-2 border-l-primary bg-white p-3 sm:p-4">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <h1 className="m-0! font-heading text-2xl! leading-tight! uppercase text-slate-900 [overflow-wrap:anywhere]">
              Emergency Route Decision
            </h1>
            {data && (
              <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-slate-700">
                <span className="font-semibold [overflow-wrap:anywhere]">
                  {data.incident.incidentCode}
                </span>
                <SeverityBadge severity={data.incident.severity} />
                <StatusBadge status={data.incident.status} />
                <span className="text-slate-400" aria-hidden="true">
                  /
                </span>
                <span className="[overflow-wrap:anywhere]">
                  {data.transport.transportCode}
                </span>
                <Badge variant="outline" className="rounded-[2px] text-xs">
                  {statusLabel(data.transport.status)}
                </Badge>
              </div>
            )}
          </div>
          <p className="m-0 text-xs text-slate-500">
            {manager ? "Logistics Manager" : "Fleet & Route Coordinator"}
          </p>
        </div>
        {query.source === "mock" && (
          <p
            role="note"
            className="m-0 flex flex-wrap items-center gap-2 text-xs text-amber-900"
          >
            <Badge
              variant="outline"
              className="rounded-[2px] border-amber-300 bg-amber-50 text-xs text-amber-900"
            >
              MOCK DATA
            </Badge>
            Synthetic routes and assignments. Real sign-in is required.
          </p>
        )}
        {data && (
          <div className="min-w-0 space-y-3 border-t border-slate-200 pt-3">
            <div className="space-y-1.5">
              <p className={rerouteEyebrowClass}>Current situation</p>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <CategoryBadge category={data.incident.category} />
                <p className="m-0 text-base font-semibold leading-6 text-slate-900 [overflow-wrap:anywhere]">
                  {data.incident.title}
                </p>
              </div>
            </div>
            <dl className="m-0 grid grid-cols-2 gap-3 lg:grid-cols-4 [&_dd]:[overflow-wrap:anywhere]">
              <div className="col-span-2 min-w-0">
                <Field label="Current segment">
                  {data.currentSegment ? (
                    <span className="block space-y-0.5">
                      <RouteLine
                        from={data.currentSegment.fromLocation?.locationName}
                        to={data.currentSegment.toLocation?.locationName}
                      />
                      <span className="block text-xs font-normal text-slate-500">
                        {data.currentSegment.routeType} · Segment{" "}
                        {data.currentSegment.sequenceNo} ·{" "}
                        {statusLabel(data.currentSegment.status)}
                      </span>
                    </span>
                  ) : (
                    "No current segment provided"
                  )}
                </Field>
              </div>
              <Field label="Occurred">
                {formatPlanDate(data.incident.occurredAt)}
              </Field>
              <Field label="Planned arrival">
                {data.currentSegment?.plannedArrivalAt
                  ? formatPlanDate(data.currentSegment.plannedArrivalAt)
                  : "Not provided"}
              </Field>
              {data.incident.vehicleOperable !== null && (
                <Field label="Vehicle">
                  <span
                    className={
                      data.incident.vehicleOperable
                        ? "text-emerald-700"
                        : "text-red-700"
                    }
                  >
                    {data.incident.vehicleOperable ? "Operable" : "Not operable"}
                  </span>
                </Field>
              )}
            </dl>
            <p className="m-0 text-[11px] text-slate-400">
              Data as of{" "}
              <time dateTime={data.serverTime}>
                {formatPlanDate(data.serverTime)}
              </time>
            </p>
          </div>
        )}
      </header>
      {!query.allowed ? (
        <ErrorState message="Only logistics managers and fleet & route coordinators may view this workspace." />
      ) : !query.validId ? (
        <ErrorState message="A valid, non-empty incident UUID is required. No RT1 request is sent." />
      ) : error ? (
        <ErrorState
          message={error.message}
          onRetry={error.retryable ? () => void query.refetch() : undefined}
        />
      ) : data ? (
        <div className="grid min-w-0 items-start gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:grid-rows-[auto_1fr]">
          <div className="min-w-0 lg:col-start-2 lg:row-start-1">
            <RerouteDecisionOptions
              context={data}
              manager={manager}
              holdAction={
                <RerouteHoldAction
                  key={
                    query.source +
                    ":" +
                    query.scope +
                    ":" +
                    data.incident.incidentReportId
                  }
                  context={data}
                  scope={query.scope}
                  source={query.source}
                  queryKey={query.queryKey}
                  refreshing={query.isFetching}
                />
              }
              escalationAction={
                <RerouteEscalationAction
                  key={
                    query.source +
                    ":" +
                    query.scope +
                    ":" +
                    data.incident.incidentReportId
                  }
                  context={data}
                  scope={query.scope}
                  queryKey={query.queryKey}
                  refreshing={query.isFetching}
                />
              }
            />
          </div>
          <div className="min-w-0 lg:col-start-1 lg:row-start-1 lg:row-span-2">
            <RerouteComparison context={data} />
          </div>
          <div className="min-w-0 lg:col-start-2 lg:row-start-2">
            <RerouteDecisionContext context={data} />
          </div>
        </div>
      ) : (
        <div
          role="status"
          aria-label="Loading rerouting context"
          className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]"
        >
          {[0, 1].map((column) => (
            <div key={column} className="space-y-3">
              {[0, 1].map((row) => (
                <Skeleton key={row} className="h-48 w-full rounded-[2px]" />
              ))}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
