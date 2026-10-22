import { ArrowLeft, RefreshCw } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { getPostLoginPath } from "@/app/route-config";
import { canAccess } from "@/features/auth/access-control";
import {
  Section,
  Field,
} from "@/features/transport-plan/components/ApprovedBookingDetails";
import { formatPlanDate } from "@/features/transport-plan/format";
import { ErrorState } from "@/shared/components/common";
import {
  CategoryBadge,
  SeverityBadge,
  StatusBadge,
} from "@/shared/components/incident";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { RerouteComparison } from "../components/RerouteComparison";
import {
  RerouteDecisionContext,
  RerouteDecisionOptions,
} from "../components/RerouteDecisionContext";
import { useRerouteContext } from "../hooks/useRerouteContext";
import { getRerouteError } from "../reroute-services";

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
    <main className="mx-auto w-full min-w-0 max-w-7xl space-y-3 p-4 font-sans sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="ghost"
          asChild
          className="min-h-11 rounded-[2px] px-2 text-xs"
        >
          <Link
            to={getPostLoginPath(
              manager ? "LOGISTICS_MANAGER" : "FLEET_ROUTE_COORDINATOR",
            )}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Workspace
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!query.allowed || !query.validId || query.isFetching}
          onClick={() => void query.refetch()}
          className="min-h-11 rounded-[2px] font-heading text-[11px] uppercase sm:min-h-8"
        >
          <RefreshCw aria-hidden="true" className="size-3.5" />
          {query.isFetching ? "Refreshing" : "Refresh"}
        </Button>
      </div>
      <header className="space-y-2 border-l-2 border-primary bg-white p-3">
        <h1 className="m-0! break-words font-heading text-2xl! leading-tight! uppercase text-slate-900">
          Emergency Route Decision
        </h1>
        <p className="m-0 text-xs text-slate-500">
          {manager
            ? "Logistics Manager · Decision context"
            : "Fleet & Route Coordinator · Proposal evaluation"}
        </p>
        {data && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
            <span className="break-all font-semibold">
              {data.incident.incidentCode}
            </span>
            <SeverityBadge severity={data.incident.severity} />
            <StatusBadge status={data.incident.status} />
            <span className="break-all">{data.transport.transportCode}</span>
            <span>{data.transport.status.replaceAll("_", " ")}</span>
          </div>
        )}
      </header>
      {query.source === "mock" && (
        <aside
          role="note"
          className="rounded-[2px] border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950"
        >
          <strong>MOCK DATA.</strong> Synthetic route context and assignments;
          no RT1 backend request. Real sign-in remains required.
        </aside>
      )}
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
        <>
          <p role="note" className="m-0 text-xs text-slate-500">
            Read-only context. Proposals, approvals and hold decisions are not
            submitted here.
          </p>
          <div className="grid min-w-0 items-start gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-3">
              <Section title="01. Reroute Context Summary">
                <p className="m-0 break-words text-sm font-medium text-slate-900">
                  {data.incident.title}
                </p>
                <CategoryBadge category={data.incident.category} />
                <dl className="m-0 grid gap-3 sm:grid-cols-2">
                  <Field label="Occurred">
                    {formatPlanDate(data.incident.occurredAt)}
                  </Field>
                  <Field label="Vehicle operability">
                    {data.incident.vehicleOperable === null
                      ? "Not supplied"
                      : data.incident.vehicleOperable
                        ? "Operable"
                        : "Not operable"}
                  </Field>
                  <Field label="Current segment">
                    {data.currentSegment
                      ? `${data.currentSegment.routeType} · Segment ${data.currentSegment.sequenceNo} · ${data.currentSegment.status.replaceAll("_", " ")}`
                      : "No current segment supplied"}
                  </Field>
                  <Field label="Planned arrival">
                    {formatPlanDate(data.currentSegment?.plannedArrivalAt)}
                  </Field>
                  <Field label="From">
                    {data.currentSegment?.fromLocation?.locationName}
                  </Field>
                  <Field label="To">
                    {data.currentSegment?.toLocation?.locationName}
                  </Field>
                </dl>
              </Section>
              <RerouteComparison context={data} />
            </div>
            <div className="min-w-0 space-y-3">
              <RerouteDecisionOptions context={data} />
              <RerouteDecisionContext context={data} />
            </div>
          </div>
          <p className="m-0 text-[11px] text-slate-500">
            Server snapshot: {formatPlanDate(data.serverTime)}
          </p>
        </>
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
