import { useSearchParams } from "react-router-dom";
import { ErrorState } from "@/shared/components/common";
import { PageHeader } from "@/shared/components/PageHeader";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EmergencyCostModeNotice } from "../components/EmergencyCostModeNotice";
import { EmergencyCostForm } from "../components/EmergencyCostForm";
import { useEmergencyCostIncident } from "../hooks/useEmergencyCostIncident";
import { useEmergencyCostScope } from "../hooks/useEmergencyCostScope";
import {
  emergencyCostScopedListPath,
  type EmergencyCostAudience,
} from "../navigation";
import { getEmergencyCostError } from "../services";

const humanize = (value: string) =>
  value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ");

export default function EmergencyCostCreatePage({
  audience,
}: {
  audience: EmergencyCostAudience;
}) {
  const [search] = useSearchParams();
  const incidentId = search.get("incidentReportId");
  const query = useEmergencyCostIncident(incidentId);
  const { scope, source } = useEmergencyCostScope();
  const error = query.isError
    ? getEmergencyCostError(query.error, "context")
    : null;
  const incident = query.data;
  return (
    // Same page frame as the web's other screens: a compact header with its back link, then (on a desktop) the form beside
    // a sticky incident card. It used to be one narrow phone column with a 30px upper-case title.
    <main className="mx-auto w-full min-w-0 max-w-6xl space-y-4 p-4 font-sans sm:p-6">
      <div>
        <PageHeader
          title="New emergency cost request"
          size="compact"
          backHref={emergencyCostScopedListPath(
            audience,
            query.validId ? incidentId! : undefined,
          )}
          backLabel="Emergency costs"
        />
        <p className="mt-1 mb-0 text-xs text-slate-500 sm:text-sm">
          Request a review of necessary emergency expenses. This form does not
          approve spending.
        </p>
      </div>
      <EmergencyCostModeNotice />
      {!query.allowed ? (
        <ErrorState message="Only an authorized Driver, Escort or Fleet & Route Coordinator can create a request." />
      ) : !query.validId ? (
        <ErrorState message="Provide a valid incidentReportId UUID in the URL. No context or create request is sent." />
      ) : error && !incident ? (
        <ErrorState
          message={error.message}
          onRetry={error.retryable ? () => void query.refetch() : undefined}
        />
      ) : incident ? (
        <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <aside className="min-w-0 lg:sticky lg:top-16 lg:order-2">
            <section
              aria-label="Incident context"
              className="rounded-xs border border-[#e5e2d9] bg-white p-4 shadow-[0_1px_2px_rgb(23_25_28/0.035),0_5px_18px_rgb(63_49_27/0.025)] [overflow-wrap:anywhere]"
            >
              <p className="m-0 text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500">
                For incident
              </p>
              <p className="m-0 mt-0.5 font-heading text-base font-semibold text-slate-900">
                {incident.incidentCode}
              </p>
              <p className="m-0 mt-1 text-sm text-slate-700">{incident.title}</p>
              {/* No raw incident ID here: the code identifies it, and UUIDs are not shown to users. */}
              <dl className="m-0 mt-3 grid gap-1.5 border-t border-[#eceae3] pt-3 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Transport</dt>
                  <dd className="m-0 font-medium text-slate-800">{incident.transport.transportCode}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Incident status</dt>
                  <dd className="m-0 font-medium text-slate-800">{humanize(incident.status)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Transport status</dt>
                  <dd className="m-0 font-medium text-slate-800">{humanize(incident.transport.status)}</dd>
                </div>
              </dl>
            </section>
          </aside>
          <div className="min-w-0 space-y-3 lg:order-1">
            {error ? (
              <p role="alert" className="m-0 rounded-xs border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error.message}
              </p>
            ) : null}
            <EmergencyCostForm
              key={`${scope}:${source}:${incident.incidentReportId}`}
              audience={audience}
              incident={incident}
              contextUnavailable={
                query.isFetching || query.isError || !query.isEnabled
              }
            />
          </div>
        </div>
      ) : (
        <div role="status" aria-label="Loading incident context">
          <Skeleton className="h-24 w-full rounded-xs" />
          <Skeleton className="mt-3 h-80 w-full rounded-xs" />
        </div>
      )}
    </main>
  );
}
